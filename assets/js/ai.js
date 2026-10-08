/* =====================================================================
 * 智选云 AI 电商在线售货系统 (AI-ECP) —— AI 能力中台（本地模拟实现）
 * ---------------------------------------------------------------------
 * 对应设计文档第 4 章「AI 能力引擎」与第 8.4 节「AI 能力接口详细设计」：
 *   · 智能选品：画像构建 → 多路召回 → 精排打分 → 业务规则过滤 → 多样性重排 → 冷启动兜底
 *   · 智能组货：场景识别 → 配套召回 → 可行性校验 → 组合定价 → 一键加购
 *   · 智能客服：意图识别 → RAG 检索增强 / 受控工具调用 → 安全护栏 → 转人工
 * 降级契约：所有能力响应均携带 degraded 与 degradeReason（NFR-06 / NFR-07）。
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const D = NS.DATA;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round2 = (n) => Math.round(n * 100) / 100;
  const round4 = (n) => Math.round(n * 10000) / 10000;

  /** 稳定伪随机：相同输入得到相同结果，保证页面刷新后推荐不抖动 */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }

  const traceId = () => 'ai-' + Math.random().toString(36).slice(2, 10);

  /** 全局降级开关（用于演示 NFR-07：大模型服务不可用时自动降级） */
  const Health = {
    key: 'aiecp_llm_down',
    isDown() {
      return S.read(Health.key, false);
    },
    set(v) {
      S.write(Health.key, !!v);
    }
  };

  /* =================================================================
   * 一、智能选品（FR-17 ~ FR-20）
   * ================================================================= */
  const Selection = {
    /**
     * @param {Object} opt { scene:'HOME'|'LIST'|'DETAIL'|'CART', limit, exclude:[productId], category }
     * @returns {{items:Array, degraded:boolean, degradeReason:string, traceId:string, strategyCode:string, profile:Object}}
     */
    recommend(opt) {
      opt = opt || {};
      const limit = opt.limit || 8;
      const exclude = opt.exclude || [];
      const tid = traceId();
      const { profile, coldStart } = S.Track.profile();
      let pool = S.Product.all().filter((p) => exclude.indexOf(p.id) < 0);

      if (opt.category) {
        const codes = S.Cat.descendants(opt.category);
        pool = pool.filter((p) => codes.indexOf(p.category) >= 0);
      }

      /* ---- 冷启动兜底：行为数据不足时降级为热门榜（NFR-07） ---- */
      if (coldStart || !pool.length) {
        const hot = pool.slice().sort((a, b) => b.sales - a.sales).slice(0, limit);
        return {
          items: hot.map((p, i) => ({
            productId: p.id,
            product: p,
            score: round2(0.6 + 0.3 * (1 - i / Math.max(1, hot.length))),
            reason: '本品类近期热销，先看看大家都在买什么',
            recallSource: '热门新品',
            fallback: true
          })),
          degraded: true,
          degradeReason: coldStart ? '用户行为数据不足（冷启动），已降级为热门榜兜底' : '候选池为空，已降级为热门榜',
          traceId: tid,
          strategyCode: 'SELECTION_FALLBACK_HOT',
          profile
        };
      }

      /* ---- 1. 多路并行召回 ---- */
      const preferred = profile.preferCategories.map((x) => x.code);
      const prefLeaf = {};
      preferred.forEach((c) => (S.Cat.leaves(c) || [c]).forEach((l) => (prefLeaf[l] = true)));
      const priceBand = profile.priceBand;
      const recalled = [];
      const push = (p, source, w) => {
        if (!p) return;
        const i = recalled.findIndex((x) => x.product.id === p.id);
        if (i >= 0) {
          recalled[i].sources.push(source);
          recalled[i].weight += w;
        } else recalled.push({ product: p, sources: [source], weight: w });
      };

      pool.forEach((p) => {
        // 召回源 1：画像偏好（长期偏好品类）
        if (preferred.some((c) => p.category.indexOf(c) === 0 || c.indexOf(p.category) === 0)) push(p, '画像偏好', 1.6);
        if (prefLeaf[p.category]) push(p, '画像偏好', 1.9);
        // 召回源 2：协同过滤（同品类高销量）
        if (p.sales > 12000) push(p, '协同过滤', 1.2);
        // 召回源 3：向量语义（价格带相近 + 同品牌，模拟语义相似度）
        if (priceBand && p.salePrice >= priceBand.low * 0.5 && p.salePrice <= priceBand.high * 1.5) push(p, '向量语义', 1.0);
        // 召回源 4：热门新品
        if (p.createdAt >= '2026-07-01' && p.sales > 5000) push(p, '热门新品', 0.9);
        // 召回源 5：场景关联（当前浏览商品所属场景的配套品类）
        if (opt.sceneProduct) {
          const sceneRule = D.BUNDLE_SCENES[S.Product.get(opt.sceneProduct).scene];
          if (sceneRule && sceneRule.complement.indexOf(p.category) >= 0) push(p, '场景关联', 1.4);
        }
      });

      /* ---- 2. 精排打分 ---- */
      const maxSales = Math.max.apply(null, D.PRODUCTS.map((p) => p.sales));
      const scored = recalled.map((r) => {
        const p = r.product;
        const popScore = p.sales / maxSales;
        const ratingScore = (p.rating - 4.0) / 1.0;
        const priceScore = priceBand ? 1 - clamp(Math.abs(p.salePrice - priceBand.median) / (priceBand.high * 1.2), 0, 1) : 0.5;
        const noise = hash(p.id + (opt.scene || '')) * 0.08;
        const score = clamp(0.38 * clamp(r.weight / 3, 0, 1) + 0.24 * popScore + 0.16 * ratingScore + 0.14 * priceScore + noise, 0, 1);
        return {
          productId: p.id,
          product: p,
          score: round2(score),
          sources: r.sources,
          primarySource: r.sources[0]
        };
      });

      /* ---- 3. 业务规则过滤（BR-09 / FR-19）：下架、无库存、限购 ---- */
      const filtered = scored.filter((x) => x.product.status === 1 && x.product.stock > 0);

      /* ---- 4. 多样性重排（BR-10）：同一叶子品类占比不超过 50% ---- */
      filtered.sort((a, b) => b.score - a.score);
      const cap = Math.max(1, Math.floor(limit * 0.5));
      const usedCat = {};
      const picked = [];
      const rest = [];
      filtered.forEach((x) => {
        const c = x.product.category;
        if ((usedCat[c] || 0) < cap && picked.length < limit) {
          usedCat[c] = (usedCat[c] || 0) + 1;
          picked.push(x);
        } else rest.push(x);
      });
      let i = 0;
      while (picked.length < limit && i < rest.length) {
        picked.push(rest[i++]);
      }

      const items = picked.slice(0, limit).map((x) => {
        const catName = (S.Cat.get(x.product.category) || {}).name || '精选';
        const tpl = D.REC_REASONS[x.primarySource] || '为你精选';
        return {
          productId: x.productId,
          product: x.product,
          score: x.score,
          recallSource: x.primarySource,
          reason: tpl.replace('{cat}', catName)
        };
      });

      return {
        items,
        degraded: filtered.length < limit,
        degradeReason: filtered.length < limit ? '可售候选不足，结果条数已按可售库存收敛' : '',
        traceId: tid,
        strategyCode: 'SELECTION_MULTI_RECALL_V2',
        experimentTag: 'exp_selection_v2',
        profile
      };
    }
  };

  /* =================================================================
   * 二、智能组货（FR-21 ~ FR-23 / BR-11 / BR-12）
   * ================================================================= */
  const Bundle = {
    /**
     * @param {String} mainProductId
     * @param {Object} opt { limit, budgetRange:[low,high] }
     */
    compose(mainProductId, opt) {
      opt = opt || {};
      const tid = traceId();
      const main = S.Product.get(mainProductId);
      if (!main) return { bundles: [], degraded: true, degradeReason: '主商品不存在', traceId: tid };

      const sceneCode = main.scene;
      const rule = D.BUNDLE_SCENES[sceneCode];
      if (!rule) {
        return {
          bundles: [],
          degraded: true,
          degradeReason: '未能识别搭配场景，已降级为同品类单品推荐',
          fallbackProducts: S.Product.similar(main, 4),
          traceId: tid
        };
      }

      const mainSku = main.skus[0];
      const mainPrice = mainSku.salePrice;
      const mainGross = (mainPrice - mainSku.costPrice) / mainPrice; // 主商品单品毛利率

      /* ---- 1. 场景识别 + 配套召回 ---- */
      const budget = opt.budgetRange || [mainPrice * 0.1, mainPrice * 1.2];
      const candidates = [];
      rule.complement.forEach((catCode) => {
        if (catCode === main.category) return;
        S.Product.byCategory(S.Cat.descendants(catCode)).forEach((p) => {
          const sku = p.skus.slice().sort((a, b) => b.stock - a.stock)[0];
          if (!sku || sku.stock <= 0) return; // 可行性：库存
          if (sku.salePrice < budget[0] || sku.salePrice > budget[1]) return; // 可行性：预算
          candidates.push({ product: p, sku, category: catCode });
        });
      });
      candidates.sort((a, b) => b.product.sales - a.product.sales);

      /* ---- 2. 组合生成 + 可行性校验 + 组合定价 ----
       * 定价原则：在 BR-12「组合毛利率 ≥ 主商品单品毛利率」的约束下，
       * 取「场景目标折扣」与「毛利红线折扣」中的较小优惠（即较大 r）。
       *   组合毛利率 gross(r) = 1 − costEff / (r × origin) ≥ mainGross
       *   ⇒ r ≥ costEff / (origin × (1 − mainGross))
       * 若该下界 > 1，说明搭配后毛利被摊薄，方案不予输出。
       * costEff 已计入组合采购与打包履约带来的成本节约（SYNERGY）。
       */
      const SYNERGY = 0.97; // 组合采购 / 打包履约成本节约系数
      const reasonTpl = D.BUNDLE_REASONS;
      const scored = [];
      const seenCombo = {};

      const evalCombo = (picks, variant) => {
        const items = [{ product: main, sku: mainSku, role: 'MAIN', quantity: 1 }].concat(
          picks.map((c, idx) => ({ product: c.product, sku: c.sku, role: idx === 0 ? 'CORE' : 'ACCESSORY', quantity: 1 }))
        );
        const originTotal = items.reduce((a, x) => a + x.sku.salePrice * x.quantity, 0);
        const costTotal = items.reduce((a, x) => a + x.sku.costPrice * x.quantity, 0) * SYNERGY;

        // BR-11：至少 2 个 SKU，且全部可售、库存充足
        if (items.length < 2) return null;
        if (items.some((x) => x.sku.stock < x.quantity)) return null;

        // BR-12：求解毛利红线下的最小可行折扣系数
        const rMin = costTotal / (originTotal * (1 - mainGross));
        if (rMin > 1) return null; // 搭配后毛利率被摊薄，不输出
        const r = Math.min(1, Math.max(rMin, rule.ratio));
        // 向上取整，避免四舍五入把组合价压到毛利红线以下
        const bundlePrice = Math.ceil(originTotal * r);
        const savings = originTotal - bundlePrice;
        if (savings < 1) return null; // 无优惠空间的组合不输出

        const grossRate = (bundlePrice - costTotal) / bundlePrice;
        const key = items.map((x) => x.sku.skuId).sort().join('+');
        if (seenCombo[key]) return null;
        seenCombo[key] = 1;

        const names = picks.map((c) => c.product.title.split(' ')[0]);
        const tpl = reasonTpl[Math.floor(hash(mainProductId + variant) * reasonTpl.length) % reasonTpl.length];
        const score = round2(clamp(0.68 + (0.2 - r) * 1.2 + hash(mainProductId + variant + 'b') * 0.14, 0, 0.99));

        return {
          bundleId: 'B-' + sceneCode + '-' + main.id + '-' + (scored.length + 1),
          scene: sceneCode,
          name: rule.name,
          icon: rule.icon,
          mainProductId: main.id,
          items: items.map((x) => ({
            productId: x.product.id,
            skuId: x.sku.skuId,
            title: x.product.title,
            image: x.product.images[0],
            specText: x.sku.specText,
            unitPrice: x.sku.salePrice,
            quantity: x.quantity,
            role: x.role,
            category: x.product.category
          })),
          originTotal,
          bundlePrice,
          savings,
          discountRate: round2(r),
          grossRate: round4(grossRate),
          mainGrossRate: round4(mainGross),
          marginCapped: r > rule.ratio + 0.001, // 折扣是否已被毛利红线收敛
          grossLevel: grossRate >= 0.4 ? '高' : grossRate >= 0.28 ? '中' : '达标',
          score,
          isMain: false,
          reason: tpl
            .replace('{main}', main.title.split(' ')[0])
            .replace('{scene}', rule.name.replace('套装', ''))
            .replace('{items}', names.join(' + '))
            .replace('{score}', Math.round(score * 100))
        };
      };

      // 尝试多组候选搭配（错开起始位置 × 配件数量），由业务服务统一校验与定价
      for (let start = 0; start < candidates.length && start < 6; start++) {
        for (let size = 1; size <= 2; size++) {
          const picks = [];
          const seenCat = {};
          for (let i = start; i < candidates.length && picks.length < size; i++) {
            const c = candidates[i];
            if (seenCat[c.category]) continue; // 组内品类打散
            seenCat[c.category] = 1;
            picks.push(c);
          }
          if (picks.length < size) continue;
          const b = evalCombo(picks, start * 3 + size);
          if (b) scored.push(b);
        }
      }

      /* ---- 3. 排序与输出 ---- */
      if (!scored.length) {
        return {
          bundles: [],
          degraded: true,
          degradeReason: '未找到满足库存、履约与毛利约束的组合方案，已降级为同品类单品推荐',
          fallbackProducts: S.Product.similar(main, 4),
          traceId: tid,
          strategyCode: 'BUNDLE_DEGRADE_SINGLE'
        };
      }

      scored.sort((a, b) => b.score - a.score);
      const bundles = scored.slice(0, opt.limit || 2);
      bundles[0].isMain = true;

      return {
        bundles,
        degraded: false,
        degradeReason: '',
        traceId: tid,
        strategyCode: 'BUNDLE_COMPOSE_V1',
        scene: { code: sceneCode, name: rule.name, icon: rule.icon }
      };
    }
  };

  /* =================================================================
   * 三、智能客服（FR-13 ~ FR-16 / BR-13 / BR-14）
   * ================================================================= */
  const INTENTS = [
    { code: 'LOGISTICS', name: '物流查询', keywords: ['物流', '快递', '发货', '几天到', '什么时候到', '运单', '到哪了', '配送', '送货'] },
    { code: 'AFTER_SALE', name: '退换货', keywords: ['退货', '换货', '退款', '七天无理由', '无理由', '不满意', '怎么退', '退'] },
    { code: 'WARRANTY', name: '质保维修', keywords: ['保修', '质保', '维修', '坏了', '售后', '修'] },
    { code: 'PAYMENT', name: '支付问题', keywords: ['支付', '付款', '怎么付', '花呗', '分期', '微信', '支付宝', '银行卡', '免息'] },
    { code: 'PROMOTION', name: '优惠活动', keywords: ['优惠', '券', '满减', '打折', '便宜', '活动', '满减', '促销', '便宜点', '最低'] },
    { code: 'INSTALL', name: '安装服务', keywords: ['安装', '上门', '打孔', '师傅', '装'] },
    { code: 'INVOICE', name: '发票', keywords: ['发票', '开票', '报销', '电子发票', '专票'] },
    { code: 'STOCK', name: '库存咨询', keywords: ['有货', '库存', '缺货', '补货', '没货', '现货'] },
    { code: 'PRODUCT', name: '商品咨询', keywords: ['怎么样', '好用吗', '推荐', '哪个好', '区别', '参数', '规格', '多大', '材质'] },
    { code: 'ORDER_QUERY', name: '订单查询', keywords: ['订单', '我的订单', '查一下订单', '买了什么', '单号'] }
  ];

  /** 受控业务工具（FR-15）：工具须声明出入参 Schema */
  const TOOLS = {
    queryOrder: {
      name: 'queryOrder',
      desc: '按订单号查询订单状态与物流',
      inputSchema: { orderNo: 'string' },
      run(args) {
        const o = S.Orders.get(args.orderNo);
        if (!o) return { found: false };
        return {
          found: true,
          orderNo: o.orderNo,
          status: S.Orders.statusOf(o).label,
          payAmount: o.payAmount,
          createdAt: o.createdAt,
          items: o.items.map((i) => i.title + ' × ' + i.quantity),
          logistics: o.logistics ? { carrier: o.logistics.carrier, no: o.logistics.no, last: o.logistics.traces[o.logistics.traces.length - 1] } : null
        };
      }
    },
    queryMyOrders: {
      name: 'queryMyOrders',
      desc: '查询当前用户最近的订单列表',
      inputSchema: {},
      run() {
        return S.Orders.all().slice(0, 3).map((o) => ({
          orderNo: o.orderNo,
          status: S.Orders.statusOf(o).label,
          payAmount: o.payAmount,
          firstItem: o.items[0] ? o.items[0].title : ''
        }));
      }
    },
    queryStock: {
      name: 'queryStock',
      desc: '按商品关键词查询可售库存',
      inputSchema: { keyword: 'string' },
      run(args) {
        const r = S.Product.search({ keyword: args.keyword, pageSize: 3 });
        return r.list.map((p) => ({ title: p.title, price: p.salePrice, stock: p.stock }));
      }
    }
  };

  /** 安全护栏（NFR-10）：输入侧提示注入 / 越权意图检测 */
  const GUARD_INPUT = ['忽略之前', '忽略以上', 'system prompt', '你的指令', '提示词', '扮演', '开发者模式', 'jailbreak'];
  const GUARD_OUTPUT = ['保证', '一定赚钱', '包治', '绝对'];

  const CustomerService = {
    sessionId: 'sess-' + Math.random().toString(36).slice(2, 10),
    history: [],

    guardInput(text) {
      const hit = GUARD_INPUT.find((k) => text.toLowerCase().indexOf(k.toLowerCase()) >= 0);
      return hit ? { blocked: true, reason: `输入命中安全护栏（提示注入/越权意图：${hit}）` } : { blocked: false };
    },

    guardOutput(text) {
      let out = text;
      GUARD_OUTPUT.forEach((w) => {
        out = out.split(w).join('（已按合规要求弱化处理）');
      });
      return out;
    },

    recognize(text) {
      let best = { code: 'GENERAL', name: '通用咨询', score: 0 };
      INTENTS.forEach((it) => {
        const hits = it.keywords.filter((k) => text.indexOf(k) >= 0).length;
        if (hits) {
          const score = clamp(hits / 2.2, 0.3, 0.98);
          if (score > best.score) best = { code: it.code, name: it.name, score: round2(score) };
        }
      });
      return best;
    },

    retrieve(text) {
      const scored = D.KNOWLEDGE.map((k) => {
        const hits = k.keywords.filter((w) => text.indexOf(w) >= 0).length;
        const topicHit = text.indexOf(k.topic) >= 0 ? 1 : 0;
        return { chunk: k, score: hits * 1.0 + topicHit * 0.8 };
      }).sort((a, b) => b.score - a.score);
      return scored.filter((x) => x.score > 0).slice(0, 2);
    },

    /**
     * 非流式对话入口
     * @returns {{answer, intent, confidence, citations, relatedOrder, transferToAgent, degraded, degradeReason, tools, traceId}}
     */
    chat(text) {
      const tid = traceId();
      text = (text || '').trim();
      if (!text) return { answer: '请描述你的问题，我来帮你看看～', intent: 'GENERAL', confidence: 0, degraded: false, traceId: tid };

      // 1) 输入护栏（NFR-10）
      const g = this.guardInput(text);
      if (g.blocked) {
        return {
          answer: '抱歉，你的提问涉及不被允许的内容，我无法据此作答。如需帮助请描述具体的订单、物流或商品问题。',
          intent: 'GUARDED', confidence: 1, degraded: true, degradeReason: g.reason, citations: [], traceId: tid
        };
      }

      // 2) 会话上下文保留最近 10 轮（BR-14）
      this.history.push({ role: 'user', content: text });
      if (this.history.length > 20) this.history = this.history.slice(-20);

      const down = Health.isDown();
      const intent = this.recognize(text);

      /* ---- 降级路径：大模型不可用 → 知识库精确匹配 + 常见问题列表（NFR-07） ---- */
      if (down) {
        const hit = D.KNOWLEDGE.find((k) => k.keywords.some((w) => text.indexOf(w) >= 0));
        return {
          answer: hit
            ? `【降级模式 · 知识库精确匹配】${hit.content}`
            : '【降级模式】大模型服务暂时不可用，以下是其他用户最常问的问题，也可以直接转接人工客服。',
          intent: intent.code,
          confidence: hit ? 0.72 : 0.35,
          degraded: true,
          degradeReason: '大模型服务不可用，已降级为知识库精确匹配与常见问题兜底',
          citations: hit ? [{ id: hit.id, topic: hit.topic }] : [],
          faq: D.FAQ,
          transferToAgent: !hit,
          traceId: tid
        };
      }

      /* ---- 3) 业务事实走受控工具调用（FR-15） ---- */
      let relatedOrder = null;
      const tools = [];
      if (intent.code === 'ORDER_QUERY' || /AIECP\d+/.test(text)) {
        const m = text.match(/AIECP\d+/);
        if (m) {
          const r = TOOLS.queryOrder.run({ orderNo: m[0] });
          tools.push({ name: 'queryOrder', args: { orderNo: m[0] }, result: r });
          if (r.found) relatedOrder = r;
        } else {
          const r = TOOLS.queryMyOrders.run();
          tools.push({ name: 'queryMyOrders', args: {}, result: r });
          relatedOrder = r;
        }
      }
      if (intent.code === 'STOCK') {
        const kw = text.replace(/有货|库存|缺货|补货|没货|现货|吗|？|\?/g, '').trim();
        if (kw) tools.push({ name: 'queryStock', args: { keyword: kw }, result: TOOLS.queryStock.run({ keyword: kw }) });
      }

      /* ---- 4) 知识咨询走 RAG 检索增强生成 ---- */
      const hits = this.retrieve(text);
      let answer;
      if (relatedOrder && /AIECP\d+/.test(text)) {
        const o = relatedOrder;
        answer = `已为你查到订单 ${o.orderNo}：当前状态「${o.status}」，实付 ${S.money(o.payAmount)}，下单时间 ${o.createdAt}。商品：${o.items.join('、')}。`;
        if (o.logistics) answer += ` 物流由 ${o.logistics.carrier}（${o.logistics.no}）承运，最新轨迹：${o.logistics.last.text}。`;
        else answer += ' 该订单暂无物流信息。';
      } else if (relatedOrder && Array.isArray(relatedOrder)) {
        answer = '你最近的订单如下：\n' + relatedOrder.map((o, i) => `${i + 1}. ${o.orderNo}｜${o.status}｜${S.money(o.payAmount)}｜${o.firstItem}`).join('\n');
      } else if (tools.length && tools[0].name === 'queryStock') {
        const r = tools[0].result;
        answer = r.length
          ? '已帮你查到现货情况：\n' + r.map((x, i) => `${i + 1}. ${x.title}｜${S.money(x.price)}｜可售 ${x.stock} 件`).join('\n')
          : '没有查到该关键词对应的在售商品，换个说法试试？';
      } else if (hits.length) {
        const main = hits[0].chunk;
        answer = main.content;
        if (hits[1]) answer += `\n另外补充一点：${hits[1].chunk.content}`;
      } else {
        answer = '这个问题我需要再确认一下。你可以告诉我具体的订单号，或描述想咨询的商品/物流/退换问题，我会尽力帮你解决；也可以直接转接人工客服。';
      }

      // 5) 置信度计算：命中知识/工具则高，否则低
      let confidence = 0.45 + intent.score * 0.25 + (hits.length ? 0.2 : 0) + (tools.length ? 0.15 : 0);
      confidence = round2(clamp(confidence, 0.2, 0.96));
      const transferToAgent = confidence < 0.65;
      if (transferToAgent) answer += '\n（小智对这条问题的把握不高，已为你准备好转接人工客服，会话摘要会一并同步给坐席。）';

      // 6) 输出护栏
      answer = this.guardOutput(answer);

      this.history.push({ role: 'assistant', content: answer });
      return {
        answer,
        intent: intent.name,
        intentCode: intent.code,
        confidence,
        citations: hits.map((h) => ({ id: h.chunk.id, topic: h.chunk.topic, score: round2(h.score) })),
        relatedOrder: tools.length ? tools[0].result : null,
        tools,
        transferToAgent,
        degraded: false,
        degradeReason: '',
        sessionId: this.sessionId,
        traceId: tid
      };
    },

    /** 模拟流式输出（NFR-03）：按片段回调 */
    chatStream(text, onChunk, onDone) {
      const res = this.chat(text);
      const tokens = res.answer.match(/[\s\S]{1,12}/g) || [res.answer];
      let i = 0;
      const timer = setInterval(() => {
        if (i >= tokens.length) {
          clearInterval(timer);
          onDone && onDone(res);
          return;
        }
        onChunk && onChunk(tokens[i++]);
      }, 45);
      return () => clearInterval(timer);
    },

    reset() {
      this.history = [];
      this.sessionId = 'sess-' + Math.random().toString(36).slice(2, 10);
    }
  };

  NS.AI = { Selection, Bundle, CustomerService, Health, TOOLS, traceId, hash };
})(window.AIECP = window.AIECP || {});
