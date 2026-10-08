/* =====================================================================
 * 智选云 AI 电商在线售货系统 (AI-ECP) —— 本地状态与领域服务
 * ---------------------------------------------------------------------
 * 以 localStorage 模拟持久化：购物车、订单、地址、行为埋点、自定义品类。
 * 对应设计文档中的应用层/领域层职责：品类树构建、商品检索、购物车、
 * 订单状态机、用户画像。
 * ===================================================================== */
(function (NS) {
  'use strict';

  const D = NS.DATA;
  const LS = {
    CART: 'aiecp_cart',
    ORDERS: 'aiecp_orders',
    BEHAVIOR: 'aiecp_behavior',
    FAV: 'aiecp_favorites',
    CUSTOM_CAT: 'aiecp_custom_categories',
    USER: 'aiecp_user',
    ADDRESSES: 'aiecp_addresses',
    COUPONS: 'aiecp_my_coupons'
  };

  /* ----------------------------- 基础工具 ----------------------------- */
  const read = (k, def) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : def;
    } catch (e) {
      return def;
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      /* 隐私模式下静默失败，页面仍可正常使用 */
    }
  };
  const money = (n) => '¥' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
  const num = (n) => (Number(n) || 0).toLocaleString('zh-CN');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (p) => p + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(-3);

  /* ============================== 品类域 ==============================
   * 依据 JSON 定义构建品类树与属性 Schema（继承父品类属性，BR-03）
   * ==================================================================== */
  const Cat = {
    /** 当前生效的品类定义（内置 + 商家端导入） */
    defs() {
      return D.CATEGORY_DEFS.concat(read(LS.CUSTOM_CAT, []));
    },
    /** 构建扁平索引：code -> { node, parent, level, path, attrs, isLeaf, children[] } */
    build() {
      const index = {};
      const roots = [];
      const walk = (node, parent, level, path, inheritedAttrs) => {
        const own = node.attributes || [];
        // 子品类自动继承父品类属性；同名属性视为覆盖意图（仅警告，V-06）
        const attrs = inheritedAttrs.slice();
        own.forEach((a) => {
          const i = attrs.findIndex((x) => x.code === a.code);
          if (i >= 0) attrs[i] = a;
          else attrs.push(a);
        });
        const item = {
          code: node.code,
          name: node.name,
          icon: node.icon || '📦',
          sort: node.sort || 0,
          parent: parent ? parent.code : null,
          level,
          path: path.concat([node.code]),
          pathName: (path.length ? path.map((c) => (index[c] ? index[c].name : c)) : []).concat([node.name]),
          attrs,
          ownAttrs: own,
          children: [],
          isLeaf: !(node.children && node.children.length)
        };
        index[node.code] = item;
        if (parent) parent.children.push(item);
        else roots.push(item);
        (node.children || []).forEach((c) => walk(c, item, level + 1, item.path, attrs));
      };
      this.defs().forEach((def) => def.category && walk(def.category, null, 1, [], []));
      const sortRec = (arr) => {
        arr.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        arr.forEach((x) => sortRec(x.children));
      };
      sortRec(roots);
      return { index, roots };
    },
    _cache: null,
    tree() {
      if (!this._cache) this._cache = this.build();
      return this._cache;
    },
    invalidate() {
      this._cache = null;
    },
    get(code) {
      return this.tree().index[code] || null;
    },
    /** 取某品类（含继承）的可筛选属性定义 —— 列表页筛选项由 Schema 驱动（FR-01/FR-10） */
    filters(code) {
      const c = this.get(code);
      if (!c) return [];
      return c.attrs.filter((a) => a.filterable);
    },
    /** 详情页规格/参数展示用的属性（必填或可筛选） */
    specAttrs(code) {
      const c = this.get(code);
      if (!c) return [];
      return c.attrs;
    },
    /** 该品类及其所有后代的 code 列表（用于按品类检索） */
    descendants(code) {
      const c = this.get(code);
      if (!c) return [code];
      const out = [];
      const walk = (n) => {
        out.push(n.code);
        n.children.forEach(walk);
      };
      walk(c);
      return out;
    },
    leaves(code) {
      return this.descendants(code).filter((c) => this.get(c) && this.get(c).isLeaf);
    },
    breadcrumb(code) {
      const c = this.get(code);
      return c ? c.pathName.slice() : [];
    },
    /** 保存商家端导入的自定义品类 */
    saveCustom(def) {
      const list = read(LS.CUSTOM_CAT, []);
      const i = list.findIndex((x) => x.category.code === def.category.code);
      if (i >= 0) list[i] = def;
      else list.push(def);
      write(LS.CUSTOM_CAT, list);
      this.invalidate();
    },
    customDefs() {
      return read(LS.CUSTOM_CAT, []);
    },
    removeCustom(code) {
      write(LS.CUSTOM_CAT, read(LS.CUSTOM_CAT, []).filter((x) => x.category.code !== code));
      this.invalidate();
    }
  };

  /* ============================== 商品域 ============================== */
  const Product = {
    all() {
      return D.PRODUCTS;
    },
    get(id) {
      return D.PRODUCTS.find((p) => p.id === id) || null;
    },
    sku(productId, skuId) {
      const p = this.get(productId);
      return p ? p.skus.find((s) => s.skuId === skuId) || null : null;
    },
    byCategory(codes) {
      return D.PRODUCTS.filter((p) => codes.indexOf(p.category) >= 0);
    },
    /**
     * 商品检索与筛选（FR-01）
     * @param {Object} q { cat, keyword, filters:{attrCode:[values]}, minPrice, maxPrice, sort, page, pageSize }
     */
    search(q) {
      q = q || {};
      let list = D.PRODUCTS.slice();
      const kw = (q.keyword || '').trim().toLowerCase();

      if (q.cat) {
        const codes = Cat.descendants(q.cat);
        list = list.filter((p) => codes.indexOf(p.category) >= 0);
      }
      if (kw) {
        const cat = q.cat ? Cat.get(q.cat) : null;
        const searchable = cat ? cat.attrs.filter((a) => a.searchable).map((a) => a.code) : [];
        list = list.filter((p) => {
          if (p.title.toLowerCase().indexOf(kw) >= 0) return true;
          if ((p.subTitle || '').toLowerCase().indexOf(kw) >= 0) return true;
          if ((p.brand || '').toLowerCase().indexOf(kw) >= 0) return true;
          if ((p.tags || []).some((t) => t.toLowerCase().indexOf(kw) >= 0)) return true;
          if ((p.highlights || []).some((t) => t.toLowerCase().indexOf(kw) >= 0)) return true;
          const allSearchable = searchable.length
            ? searchable
            : (Cat.get(p.category) ? Cat.get(p.category).attrs.filter((a) => a.searchable).map((a) => a.code) : []);
          return allSearchable.some((c) => String(p.attrs[c] == null ? '' : p.attrs[c]).toLowerCase().indexOf(kw) >= 0);
        });
      }
      // 按品类属性筛选（筛选项由 filterable 属性动态生成）
      const f = q.filters || {};
      Object.keys(f).forEach((code) => {
        const vals = f[code];
        if (!vals || !vals.length) return;
        list = list.filter((p) => {
          const v = p.attrs[code];
          return vals.some((x) => {
            if (typeof v === 'boolean') return (x === 'true' || x === '支持') === v;
            return String(v) === String(x);
          });
        });
      });
      if (q.minPrice != null) list = list.filter((p) => p.salePrice >= q.minPrice);
      if (q.maxPrice != null) list = list.filter((p) => p.salePrice <= q.maxPrice);
      if (q.minRating) list = list.filter((p) => p.rating >= q.minRating);
      if (q.inStock) list = list.filter((p) => p.stock > 0);

      switch (q.sort) {
        case 'sales':
          list.sort((a, b) => b.sales - a.sales);
          break;
        case 'priceAsc':
          list.sort((a, b) => a.salePrice - b.salePrice);
          break;
        case 'priceDesc':
          list.sort((a, b) => b.salePrice - a.salePrice);
          break;
        case 'new':
          list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
          break;
        case 'rating':
          list.sort((a, b) => b.rating - a.rating);
          break;
        default:
          list.sort((a, b) => b.sales - a.sales);
      }

      const total = list.length;
      const pageSize = q.pageSize || 12;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(Math.max(1, q.page || 1), pages);
      return { total, pages, page, pageSize, list: list.slice((page - 1) * pageSize, page * pageSize) };
    },
    /** 同类商品（按销量取，用于详情页「看了又看」） */
    similar(product, limit) {
      const codes = Cat.descendants(Cat.get(product.category) ? Cat.get(product.category).parent || product.category : product.category);
      return this.byCategory(codes)
        .filter((p) => p.id !== product.id)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, limit || 6);
    },
    /** 热门榜（冷启动兜底 / 人工运营位） */
    hot(limit) {
      return D.PRODUCTS.slice().sort((a, b) => b.sales - a.sales).slice(0, limit || 8);
    },
    newest(limit) {
      return D.PRODUCTS.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit || 8);
    }
  };

  /* ============================== 行为埋点 ==============================
   * 记录曝光/点击/加购/成交（FR-20），回流为智能选品的用户画像（FR-17）
   * ==================================================================== */
  const Track = {
    all() {
      return read(LS.BEHAVIOR, []);
    },
    log(type, payload) {
      const list = this.all();
      list.push(Object.assign({ type, time: new Date().toISOString(), ts: Date.now() }, payload || {}));
      write(LS.BEHAVIOR, list.slice(-500));
    },
    /** 最近 N 条浏览记录（去重） */
    history(limit) {
      const seen = {};
      return this.all()
        .filter((b) => b.type === 'view')
        .reverse()
        .filter((b) => (seen[b.productId] ? false : (seen[b.productId] = 1)))
        .slice(0, limit || 12);
    },
    /**
     * 构建用户画像（FR-17）：长期偏好 = 各品类加权得分，价格带 = 浏览商品价格分布
     * @returns {{profile:Object, coldStart:boolean}}
     */
    profile() {
      const list = this.all();
      const weight = { view: 1, cart: 3, purchase: 6, search: 1 };
      const catScore = {};
      const prices = [];
      let total = 0;
      list.forEach((b) => {
        const w = weight[b.type] || 1;
        if (b.category) catScore[b.category] = (catScore[b.category] || 0) + w;
        if (b.price) prices.push(b.price);
        total += w;
      });
      const cats = Object.keys(catScore)
        .map((c) => ({ code: c, score: catScore[c], ratio: total ? catScore[c] / total : 0 }))
        .sort((a, b) => b.score - a.score);
      prices.sort((a, b) => a - b);
      const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
      // 行为条数少于 3 视为冷启动，推荐链路降级为热门榜（NFR-07 / BR 冷启动兜底）
      const coldStart = list.length < 3;
      return {
        profile: {
          preferCategories: cats.slice(0, 4),
          priceBand: median ? { low: Math.round(median * 0.6), high: Math.round(median * 1.8), median } : null,
          activityScore: Math.min(99.99, total * 1.5),
          behaviorCount: list.length
        },
        coldStart
      };
    },
    clear() {
      write(LS.BEHAVIOR, []);
    }
  };

  /* ============================== 购物车 ============================== */
  const Cart = {
    all() {
      const list = read(LS.CART, []);
      // 与商品主数据对账：下架 / 无库存 / 规格失效 标记为 invalid（FR-03 失效商品提示）
      return list.map((it) => {
        const p = Product.get(it.productId);
        const s = p ? p.skus.find((x) => x.skuId === it.skuId) : null;
        const invalid = !p || !s || s.stock <= 0 || p.status !== 1;
        return Object.assign({}, it, {
          product: p,
          sku: s,
          invalid,
          invalidReason: !p ? '商品已下架' : !s ? '规格已失效' : s.stock <= 0 ? '库存不足' : '',
          lineAmount: s ? s.salePrice * it.quantity : 0
        });
      });
    },
    raw() {
      return read(LS.CART, []);
    },
    save(list) {
      write(LS.CART, list.map((it) => ({
        key: it.key, productId: it.productId, skuId: it.skuId, quantity: it.quantity,
        checked: it.checked, bundleId: it.bundleId || null, bundleName: it.bundleName || '',
        scene: it.scene || '', addedAt: it.addedAt
      })));
    },
    /** 加入购物车，支持单品与组货方案整单加入（FR-03 / FR-23） */
    add(productId, skuId, qty, bundle) {
      const list = this.raw();
      const key = [productId, skuId, (bundle && bundle.bundleId) || ''].join('|');
      const exist = list.find((x) => x.key === key);
      if (exist) exist.quantity += qty || 1;
      else
        list.unshift({
          key,
          productId,
          skuId,
          quantity: qty || 1,
          checked: true,
          bundleId: (bundle && bundle.bundleId) || null,
          bundleName: (bundle && bundle.bundleName) || '',
          scene: (bundle && bundle.scene) || '',
          addedAt: new Date().toISOString()
        });
      this.save(list);
      const p = Product.get(productId);
      const s = p && p.skus.find((x) => x.skuId === skuId);
      Track.log('cart', {
        productId,
        skuId,
        category: p ? p.category : '',
        price: s ? s.salePrice : 0,
        bundleId: (bundle && bundle.bundleId) || null
      });
      return key;
    },
    addBundle(bundle) {
      (bundle.items || []).forEach((it) => {
        this.add(it.productId, it.skuId, it.quantity || 1, {
          bundleId: bundle.bundleId,
          bundleName: bundle.name,
          scene: bundle.scene
        });
      });
    },
    setQty(key, qty) {
      const list = this.raw();
      const it = list.find((x) => x.key === key);
      if (it) {
        it.quantity = Math.max(1, Math.min(99, qty));
        this.save(list);
      }
    },
    setChecked(key, checked) {
      const list = this.raw();
      const it = list.find((x) => x.key === key);
      if (it) {
        it.checked = !!checked;
        this.save(list);
      }
    },
    checkAll(checked) {
      this.save(this.raw().map((x) => Object.assign(x, { checked: !!checked })));
    },
    remove(key) {
      this.save(this.raw().filter((x) => x.key !== key));
    },
    removeChecked() {
      this.save(this.raw().filter((x) => !x.checked));
    },
    clearInvalid() {
      this.save(this.all().filter((x) => !x.invalid).map((x) => ({
        key: x.key, productId: x.productId, skuId: x.skuId, quantity: x.quantity,
        checked: x.checked, bundleId: x.bundleId, bundleName: x.bundleName, scene: x.scene, addedAt: x.addedAt
      })));
    },
    count() {
      return this.raw().reduce((a, x) => a + x.quantity, 0);
    },
    /** 已勾选且有效的条目 */
    checked() {
      return this.all().filter((x) => x.checked && !x.invalid);
    },
    summary() {
      const checked = this.checked();
      const goods = checked.reduce((a, x) => a + x.lineAmount, 0);
      return { itemCount: checked.length, totalQty: checked.reduce((a, x) => a + x.quantity, 0), goodsAmount: goods };
    },
    /** 按组货方案分组（结算时保留组合标识用于归因，FR-23） */
    groups() {
      const map = {};
      this.all().forEach((it) => {
        const g = it.bundleId || 'NORMAL';
        if (!map[g]) map[g] = { bundleId: it.bundleId, name: it.bundleName || '普通商品', items: [] };
        map[g].items.push(it);
      });
      return Object.keys(map).map((k) => map[k]);
    }
  };

  /* ============================== 优惠与金额 ============================== */
  const Coupon = {
    myCoupons() {
      return read(LS.COUPONS, D.COUPONS.map((c) => c.id));
    },
    all() {
      const ids = this.myCoupons();
      return D.COUPONS.filter((c) => ids.indexOf(c.id) >= 0);
    },
    get(id) {
      return D.COUPONS.find((c) => c.id === id) || null;
    },
    consume(id) {
      write(LS.COUPONS, this.myCoupons().filter((x) => x !== id));
    },
    /** 计算券对一车商品的作用金额；返回 null 表示不可用 */
    apply(coupon, items) {
      if (!coupon) return { ok: false, amount: 0, reason: '未选择优惠券' };
      let base = 0;
      items.forEach((it) => {
        const p = Product.get(it.productId);
        if (!p) return;
        const root = Cat.get(p.category) ? Cat.get(p.category).path[0] : '';
        const rootName = (Cat.get(root) || {}).name || '';
        if (coupon.scope === '全平台' || rootName === coupon.scope) base += (it.sku ? it.sku.salePrice : 0) * it.quantity;
      });
      if (!base) return { ok: false, amount: 0, reason: '该券不适用于当前商品' };
      if (base < coupon.threshold) return { ok: false, amount: 0, reason: `未满 ${money(coupon.threshold)} 门槛` };
      const amount = coupon.type === 'discount' ? Math.min(base * (1 - coupon.value), 80) : coupon.value;
      return { ok: true, amount: Math.round(amount * 100) / 100, base: Math.round(base * 100) / 100 };
    }
  };

  const Freight = {
    /** 模拟运费规则：单店满 99 包邮，否则 12 元；大家电免运费 */
    calc(items) {
      const hasLarge = items.some((it) => {
        const p = Product.get(it.productId);
        return p && (p.category === 'HOME_APPLIANCE_LARGE_FRIDGE' || p.category === 'HOME_APPLIANCE_LARGE_AC');
      });
      if (hasLarge) return { fee: 0, freeReason: '大家电免运费' };
      return { fee: 0, freeReason: '全场包邮' };
    }
  };

  /* ============================== 订单域 ==============================
   * 状态机严格遵循图 4-7：待支付 → 已支付 → 待发货 → 已发货 → 已完成
   *                         ↘ 已关闭 / 退款中 → 已退款 / 售后中
   * ==================================================================== */
  const Orders = {
    all() {
      const seeded = read(LS.ORDERS, null);
      if (seeded === null) {
        write(LS.ORDERS, clone(D.SEED_ORDERS));
        return clone(D.SEED_ORDERS);
      }
      return seeded;
    },
    _save(list) {
      write(LS.ORDERS, list);
    },
    get(no) {
      return this.all().find((o) => o.orderNo === no) || null;
    },
    byStatus(status) {
      const list = this.all();
      return status && status !== 'ALL' ? list.filter((o) => o.status === status) : list;
    },
    statusOf(o) {
      return D.ORDER_STATUS[o.status] || D.ORDER_STATUS.PENDING_PAY;
    },
    push(o) {
      const list = this.all();
      list.unshift(o);
      this._save(list);
    },
    nextNo() {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      // 末尾附加持久化自增序号，避免同一秒内创建多笔订单时订单号重复
      const seq = (read('aiecp_order_seq', 0) || 0) + 1;
      write('aiecp_order_seq', seq);
      return (
        'AIECP' +
        d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
        p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) +
        String(seq % 10000).padStart(4, '0')
      );
    },
    nowText() {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    },
    log(o, text, status) {
      o.timeline.push({ time: this.nowText(), text, status: status || o.status });
    },
    /** 创建订单（FR-04）：锁定库存 → 生成订单号 → 待支付 */
    create(payload) {
      const no = this.nextNo();
      const o = {
        orderNo: no,
        status: 'PENDING_PAY',
        createdAt: this.nowText(),
        items: payload.items,
        bundleId: payload.bundleId || null,
        bundleName: payload.bundleName || '',
        address: payload.address,
        couponText: payload.couponText || '无',
        couponId: payload.couponId || null,
        freight: payload.freight || 0,
        goodsAmount: payload.goodsAmount,
        couponAmount: payload.couponAmount || 0,
        payAmount: payload.payAmount,
        itemCount: payload.items.reduce((a, i) => a + i.quantity, 0),
        payChannel: '',
        remark: payload.remark || '',
        timeline: [{ time: this.nowText(), text: '订单提交成功，库存已锁定，请在 30 分钟内完成支付', status: 'PENDING_PAY' }],
        logistics: null
      };
      // 扣减模拟库存
      payload.items.forEach((it) => {
        const s = Product.sku(it.productId, it.skuId);
        if (s) s.stock = Math.max(0, s.stock - it.quantity);
      });
      payload.items.forEach((it) => {
        Track.log('purchase', { productId: it.productId, category: it.category, price: it.unitPrice });
      });
      this.push(o);
      return o;
    },
    pay(no, channel) {
      const list = this.all();
      const o = list.find((x) => x.orderNo === no);
      if (!o || o.status !== 'PENDING_PAY') return null;
      o.status = 'PAID';
      o.payChannel = channel || '微信支付';
      this.log(o, `支付成功（${o.payChannel}），等待商家确认`, 'PAID');
      // 模拟支付回调 + 自动审核：进入待发货
      o.status = 'SHIPPING';
      this.log(o, '商家已接单，分配至杭州 2 号仓', 'SHIPPING');
      this._save(list);
      return o;
    },
    cancel(no) {
      const list = this.all();
      const o = list.find((x) => x.orderNo === no);
      if (!o || o.status !== 'PENDING_PAY') return null;
      o.status = 'CLOSED';
      this.log(o, '用户取消订单，库存已释放', 'CLOSED');
      o.items.forEach((it) => {
        const s = Product.sku(it.productId, it.skuId);
        if (s) s.stock += it.quantity;
      });
      this._save(list);
      return o;
    },
    refund(no, reason) {
      const list = this.all();
      const o = list.find((x) => x.orderNo === no);
      if (!o) return null;
      o.status = 'REFUNDING';
      this.log(o, `用户申请退款：${reason || '未填写原因'}`, 'REFUNDING');
      this._save(list);
      return o;
    },
    completeRefund(no) {
      const list = this.all();
      const o = list.find((x) => x.orderNo === no);
      if (!o) return null;
      o.status = 'REFUNDED';
      this.log(o, '退款成功，金额已原路退回', 'REFUNDED');
      o.items.forEach((it) => {
        const s = Product.sku(it.productId, it.skuId);
        if (s) s.stock += it.quantity;
      });
      this._save(list);
      return o;
    },
    confirm(no) {
      const list = this.all();
      const o = list.find((x) => x.orderNo === no);
      if (!o || o.status !== 'SHIPPED') return null;
      o.status = 'COMPLETED';
      this.log(o, '用户确认收货，订单完成', 'COMPLETED');
      this._save(list);
      return o;
    },
    /** 模拟商家发货推进（演示状态流转） */
    advance(no) {
      const list = this.all();
      const o = list.find((x) => x.orderNo === no);
      if (!o) return null;
      if (o.status === 'SHIPPING') {
        o.status = 'SHIPPED';
        o.logistics = {
          carrier: '顺丰速运',
          no: 'SF' + Math.floor(Math.random() * 1e12).toString().padStart(12, '0'),
          traces: [{ time: this.nowText(), text: '【杭州集散中心】已发货，等待揽收' }]
        };
        this.log(o, '商品已出库，等待揽收', 'SHIPPED');
      } else if (o.status === 'SHIPPED') {
        o.status = 'COMPLETED';
        this.log(o, '超时自动确认收货，订单完成', 'COMPLETED');
      }
      this._save(list);
      return o;
    }
  };

  /* ============================== 用户与地址 ============================== */
  const User = {
    get() {
      return Object.assign({}, D.USER, read(LS.USER, {}));
    },
    save(patch) {
      const u = Object.assign(this.get(), patch);
      write(LS.USER, u);
      return u;
    },
    addresses() {
      return read(LS.ADDRESSES, D.ADDRESSES);
    },
    saveAddresses(list) {
      write(LS.ADDRESSES, list);
    },
    defaultAddress() {
      const a = this.addresses();
      return a.find((x) => x.isDefault) || a[0] || null;
    },
    favorites() {
      return read(LS.FAV, []);
    },
    toggleFav(productId) {
      const list = this.favorites();
      const i = list.indexOf(productId);
      if (i >= 0) list.splice(i, 1);
      else list.unshift(productId);
      write(LS.FAV, list);
      return list.indexOf(productId) >= 0;
    },
    isFav(productId) {
      return this.favorites().indexOf(productId) >= 0;
    }
  };

  NS.S = {
    LS, read, write, money, num, clone, uid,
    Cat, Product, Track, Cart, Coupon, Freight, Orders, User
  };
  NS.util = { money, num, clone, uid };
})(window.AIECP = window.AIECP || {});
