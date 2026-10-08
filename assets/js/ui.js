/* =====================================================================
 * 智选云 AI 电商在线售货系统 (AI-ECP) —— 公共 UI 组件
 * 头部 / 底部 / 移动端导航 / Toast / 商品卡片 / AI 客服悬浮组件
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;

  /* ------------------------------ 工具 ------------------------------ */
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const q = (name) => new URLSearchParams(location.search).get(name);
  const money = (n) => S.money(n);
  const num = (n) => S.num(n);

  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3h2.2l2.3 12.2a1.6 1.6 0 0 0 1.6 1.3h9.1a1.6 1.6 0 0 0 1.6-1.2L21 7H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7M9 16h7"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 13.8 8 18.5 9.8 13.8 11.6 12 16.1 10.2 11.6 5.5 9.8 10.2 8z"/><path d="M18 16.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 7.5v9L12 21l9-4.5v-9z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/></svg>'
  };

  const NAVS = [
    { key: 'home', text: '首页', href: 'index.html', icon: ICONS.home },
    { key: 'products', text: '全部商品', href: 'products.html', icon: ICONS.grid },
    { key: 'cart', text: '购物车', href: 'cart.html', icon: ICONS.cart },
    { key: 'orders', text: '我的订单', href: 'orders.html', icon: ICONS.orders },
    { key: 'user', text: '个人中心', href: 'user.html', icon: ICONS.user }
  ];

  /* ------------------------------ Toast ------------------------------ */
  let toastWrap = null;
  function toast(msg, type, ms) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      document.body.appendChild(toastWrap);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = (type === 'ai' ? '✨ ' : '') + esc(msg);
    toastWrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = '.25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 260);
    }, ms || 2200);
  }

  /* ------------------------------ 头部 ------------------------------ */
  function renderHeader(active) {
    const el = document.getElementById('header-root');
    if (!el) return;
    _active = active || _active; // 供移动端底部导航同步高亮
    const tree = S.Cat.tree();
    const kw = q('keyword') || '';
    const cartCount = S.Cart.count();

    el.innerHTML = `
      <header class="site-header">
        <div class="container">
          <div class="header-topbar">
            <a class="logo" href="index.html" title="智选云 AI 电商在线售货系统">
              <span class="logo-mark">智选</span>
              <span class="logo-text"><b>智选云 AI</b><span>AI-ECP · 智能电商</span></span>
            </a>
            <nav class="nav-links">
              ${NAVS.filter((n) => n.key !== 'cart' && n.key !== 'user')
                .map((n) => `<a href="${n.href}" class="${active === n.key ? 'active' : ''}">${n.text}</a>`)
                .join('')}
              <a href="category-import.html" class="${active === 'import' ? 'active' : ''}">品类自定义</a>
            </nav>
            <div class="search-box" id="searchBox">
              <form onsubmit="return AIECP.UI.doSearch(event)">
                <input id="searchInput" type="search" placeholder="搜索商品 / 品牌 / 场景，如「扫地机器人」" value="${esc(kw)}" autocomplete="off">
                <button type="submit">${ICONS.search} 搜索</button>
              </form>
              <div class="search-tips hide" id="searchTips"></div>
            </div>
            <div class="header-actions">
              <a class="icon-btn" href="cart.html" title="购物车">
                ${ICONS.cart}<span>购物车</span>
                <em class="cart-badge" id="cartBadge" style="${cartCount ? '' : 'display:none'}">${cartCount}</em>
              </a>
              <a class="icon-btn" href="user.html" title="个人中心">${ICONS.user}<span>我的</span></a>
            </div>
          </div>
        </div>
        <div class="cat-bar">
          <div class="container">
            <div class="cat-bar-inner">
              <a href="products.html" class="${!q('cat') && active === 'products' ? 'active' : ''}">全部商品</a>
              ${tree.roots
                .map(
                  (r) => `<a href="products.html?cat=${r.code}" class="${q('cat') === r.code ? 'active' : ''}">${r.icon} ${esc(r.name)}</a>`
                )
                .join('')}
            </div>
          </div>
        </div>
      </header>`;

    bindSearchTips();
  }

  function bindSearchTips() {
    const input = document.getElementById('searchInput');
    const tips = document.getElementById('searchTips');
    if (!input || !tips) return;
    const show = () => {
      const v = input.value.trim();
      const tree = S.Cat.tree();
      let html = '';
      if (v) {
        const r = S.Product.search({ keyword: v, pageSize: 6 });
        html += `<div class="tip-title">相关商品（${r.total}）</div>`;
        html += r.list.length
          ? r.list.map((p) => `<div class="tip-item" data-kw="${esc(p.title)}">${esc(p.title)}</div>`).join('')
          : '<div class="tip-item">没有找到相关商品</div>';
      } else {
        html += '<div class="tip-title">热搜榜</div>';
        html += NS.DATA.HOT_KEYWORDS.map((k) => `<div class="tip-item" data-kw="${esc(k)}">${esc(k)}</div>`).join('');
        html += '<div class="tip-title">热门品类</div>';
        html += tree.roots.map((r) => `<div class="tip-item" data-kw="${esc(r.name)}">${r.icon} ${esc(r.name)}</div>`).join('');
      }
      tips.innerHTML = html;
      tips.classList.remove('hide');
      tips.querySelectorAll('.tip-item').forEach((it) => {
        it.onclick = () => {
          input.value = it.dataset.kw;
          doSearch(null, it.dataset.kw);
        };
      });
    };
    input.addEventListener('focus', show);
    input.addEventListener('input', show);
    document.addEventListener('click', (e) => {
      if (!document.getElementById('searchBox').contains(e.target)) tips.classList.add('hide');
    });
  }

  function doSearch(e, kw) {
    if (e) e.preventDefault();
    const input = document.getElementById('searchInput');
    const v = kw != null ? kw : input ? input.value.trim() : '';
    location.href = 'products.html?keyword=' + encodeURIComponent(v);
    return false;
  }

  function setCartBadge() {
    const b = document.getElementById('cartBadge');
    if (!b) return;
    const c = S.Cart.count();
    b.textContent = c;
    b.style.display = c ? '' : 'none';
    const m = document.getElementById('mtCartBadge');
    if (m) {
      m.textContent = c;
      m.style.display = c ? '' : 'none';
    }
  }

  /* ------------------------------ 底部 ------------------------------ */
  function renderFooter() {
    const el = document.getElementById('footer-root');
    if (!el) return;
    const tree = S.Cat.tree();
    el.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-main">
            <div>
              <div class="logo" style="margin-bottom:12px">
                <span class="logo-mark">智选</span>
                <span class="logo-text"><b>智选云 AI</b><span>AI-ECP · AI E-Commerce Platform</span></span>
              </div>
              <p class="small text-3" style="line-height:1.8;max-width:320px">
                面向中小型品牌商与垂直品类商家的在线售货平台。品类结构由 JSON 自定义，
                智能客服 / 智能选品 / 智能组货三项 AI 能力内建为能力中台。
              </p>
              <div class="row gap8 mt16 wrap">
                <span class="tag tag-ai">JSON 品类自定义</span>
                <span class="tag tag-brand">AI 能力中台</span>
                <span class="tag tag-success">链路可降级</span>
              </div>
            </div>
            <div>
              <div class="footer-title">商品品类</div>
              <ul class="footer-list">
                ${tree.roots.map((r) => `<li><a href="products.html?cat=${r.code}">${r.icon} ${esc(r.name)}</a></li>`).join('')}
                <li><a href="products.html">全部商品</a></li>
              </ul>
            </div>
            <div>
              <div class="footer-title">购物指南</div>
              <ul class="footer-list">
                <li><a href="cart.html">购物车</a></li>
                <li><a href="orders.html">订单查询</a></li>
                <li><a href="orders.html?status=PENDING_PAY">待支付订单</a></li>
                <li><a href="user.html">个人中心</a></li>
              </ul>
            </div>
            <div>
              <div class="footer-title">商家服务</div>
              <ul class="footer-list">
                <li><a href="category-import.html">JSON 品类定义导入</a></li>
                <li><a href="category-import.html">属性 Schema 预览</a></li>
                <li><a href="category-import.html">动态表单生成</a></li>
                <li><a href="index.html#ai">AI 能力说明</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <span>AIECP-SRS-001 / AIECP-SDD-001 · 依据 UML 2.5 需求与设计文档实现的静态演示站点</span>
            <span>本站为纯静态演示，数据均为本地模拟，不涉及真实交易</span>
          </div>
        </div>
      </footer>`;

    const mt = document.getElementById('mt-root');
    if (mt) {
      const c = S.Cart.count();
      mt.innerHTML = `
        <nav class="mobile-tabbar">
          <a href="index.html" class="${isActive('home')}">${ICONS.home}<span>首页</span></a>
          <a href="products.html" class="${isActive('products')}">${ICONS.grid}<span>分类</span></a>
          <a href="cart.html" class="${isActive('cart')}">${ICONS.cart}<span>购物车</span><em class="mt-badge" id="mtCartBadge" style="${c ? '' : 'display:none'}">${c}</em></a>
          <a href="orders.html" class="${isActive('orders')}">${ICONS.orders}<span>订单</span></a>
          <a href="user.html" class="${isActive('user')}">${ICONS.user}<span>我的</span></a>
        </nav>`;
    }
  }

  let _active = '';
  function isActive(k) {
    return _active === k ? 'active' : '';
  }

  /* ------------------------------ 卡片渲染 ------------------------------ */
  /**
   * @param {Object} p 商品
   * @param {Object} opt { reason, recallSource, score, tag, showCart }
   */
  function productCard(p, opt) {
    opt = opt || {};
    const flags = (p.tags || []).slice(0, 2).map((t) => `<span class="tag tag-price">${esc(t)}</span>`).join('');
    const reason = opt.reason
      ? `<div class="p-card-reason"><span>✨</span><span>${esc(opt.reason)}</span></div>`
      : '';
    const recall = opt.recallSource ? `<span class="p-card-recall">${esc(opt.recallSource)}</span>` : '';
    return `
      <div class="p-card">
        <a class="p-card-media" href="product.html?id=${p.id}">
          <img src="${p.images[0]}" alt="${esc(p.title)}" loading="lazy">
          <div class="p-card-flag">${flags}</div>
          ${recall}
        </a>
        <div class="p-card-body">
          <a class="p-card-title clamp2" href="product.html?id=${p.id}">${esc(p.title)}</a>
          <div class="p-card-tags">
            <span class="tag tag-muted">${esc(p.brand)}</span>
            ${p.rating >= 4.8 ? '<span class="tag tag-success">高分好评</span>' : ''}
            ${p.stock > 0 ? '' : '<span class="tag tag-muted">暂时缺货</span>'}
          </div>
          <div class="p-card-price">
            <span class="price"><span class="sym">¥</span>${p.salePrice}</span>
            <del>¥${p.marketPrice}</del>
          </div>
          <div class="p-card-meta">
            <span>已售 ${num(p.sales)}</span>
            <span>★ ${p.rating}</span>
          </div>
          ${reason}
          <div class="p-card-actions">
            <a class="btn btn-sm" href="product.html?id=${p.id}">查看详情</a>
            <button class="btn btn-sm btn-primary" onclick="AIECP.UI.addToCart('${p.id}')">加入购物车</button>
          </div>
        </div>
      </div>`;
  }

  function addToCart(productId) {
    const p = S.Product.get(productId);
    if (!p) return toast('商品不存在', 'error');
    const sku = p.skus.find((s) => s.stock > 0) || p.skus[0];
    if (!sku) return toast('该商品暂无可售规格', 'error');
    S.Cart.add(p.id, sku.skuId, 1);
    setCartBadge();
    toast('已加入购物车：' + p.title.slice(0, 14) + '…', 'success');
  }

  /* --------------------------- 组货方案卡片 --------------------------- */
  /**
   * 渲染一张组货方案卡片（首页场景位与商品详情页共用）
   * @param {Object} b Bundle.compose 输出的方案
   * @param {Boolean} withBuy 是否显示「立即购买」
   */
  function bundleCard(b, withBuy) {
    const items = b.items
      .map(
        (it) => `<div class="bc-item">
          <a href="product.html?id=${it.productId}"><img src="${it.image}" alt=""></a>
          <div class="bci-name">
            <a href="product.html?id=${it.productId}">${esc(it.title)}</a>
            <span>${esc(it.specText)} · ${it.role === 'MAIN' ? '主商品' : it.role === 'CORE' ? '核心配套' : '配件'} × ${it.quantity}</span>
          </div>
          <div class="bci-price">${S.money(it.unitPrice * it.quantity)}</div>
        </div>`
      )
      .join('<div class="bc-plus" style="width:100%;text-align:center;font-size:12px">＋</div>');

    return `<div class="bundle-card ${b.isMain ? 'is-main' : ''}">
      <div class="bc-head">
        <span style="font-size:20px">${b.icon}</span>
        <span class="bc-name">${esc(b.name)}</span>
        ${b.isMain ? '<span class="tag tag-ai">主推方案</span>' : ''}
        <span class="tag tag-muted" style="margin-left:auto">搭配分 ${b.score}</span>
      </div>
      <div class="bc-items">${items}</div>
      <div class="bc-reason"><span>🤖</span><span>${esc(b.reason)}</span></div>
      <div class="bc-foot">
        <div class="bc-price">
          <div>
            <span class="text-3 small">组合价 </span>
            <span class="price"><span class="sym">¥</span>${b.bundlePrice}</span>
            <del style="margin-left:8px">¥${b.originTotal}</del>
          </div>
          <div class="bc-metrics">
            <span>立省 ${S.money(b.savings)}（${((1 - b.discountRate) * 100).toFixed(1)}% off）</span>
            <span>组合毛利率 ${(b.grossRate * 100).toFixed(1)}%（${esc(b.grossLevel)}）</span>
            <span>主商品单品毛利率 ${((b.mainGrossRate || 0) * 100).toFixed(1)}%</span>
            <span>库存 / 履约 / 价格 / 毛利四维已校验</span>
          </div>
          ${b.marginCapped
            ? `<div class="small" style="color:var(--warning);margin-top:4px">⚠ 折扣已按毛利红线自动收敛：再低就会跌破主商品单品毛利率（BR-12）</div>`
            : ''}
        </div>
        <div class="row gap8">
          <button class="btn btn-ai" data-bundle="${b.bundleId}">一键加购整套</button>
          ${withBuy ? `<button class="btn" data-bundle-buy="${b.bundleId}">立即购买</button>` : ''}
        </div>
      </div>
    </div>`;
  }

  /** 绑定组货卡片上的按钮（加入购物车 / 立即购买） */
  function bindBundle(root, bundles, withBuy) {
    root.querySelectorAll('[data-bundle]').forEach((btn) => {
      btn.onclick = () => {
        const b = bundles.find((x) => x.bundleId === btn.dataset.bundle);
        if (!b) return;
        S.Cart.addBundle(b);
        setCartBadge();
        toast(`已加入 ${b.items.length} 件商品（组合 ${b.bundleId}），结算时保留组合标识用于归因`, 'ai', 3000);
      };
    });
    if (!withBuy) return;
    root.querySelectorAll('[data-bundle-buy]').forEach((btn) => {
      btn.onclick = () => {
        const b = bundles.find((x) => x.bundleId === btn.dataset.bundleBuy);
        if (!b) return;
        S.Cart.addBundle(b);
        sessionStorage.setItem('aiecp_buynow', JSON.stringify(b.items.map((i) => [i.productId, i.skuId, b.bundleId].join('|'))));
        location.href = 'checkout.html';
      };
    });
  }

  /** 快速加购：弹出 SKU 选择（商品卡无规格时使用默认规格） */
  function crumb(items) {
    return `<div class="crumb">${items
      .map((it, i) => (i ? '<span class="sep">/</span>' : '') + (it.href ? `<a href="${it.href}">${esc(it.text)}</a>` : `<span>${esc(it.text)}</span>`))
      .join('')}</div>`;
  }

  /* --------------------------- AI 客服悬浮组件 --------------------------- */
  let chatOpen = false;
  function mountAI() {
    if (document.getElementById('ai-fab')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <button class="ai-fab" id="ai-fab" title="AI 智能客服">${ICONS.ai}</button>
      <div class="ai-chat hide" id="ai-chat">
        <div class="ai-chat-head">
          <div class="ach-avatar">🤖</div>
          <div>
            <b>小智 · AI 智能客服</b>
            <span id="aiChatSub">意图识别 · 知识检索增强 · 业务工具调用</span>
          </div>
          <button class="ach-close" id="aiChatClose">×</button>
        </div>
        <div class="ai-chat-body" id="aiChatBody"></div>
        <div class="ai-chat-tools">
          <button class="t" id="aiDownToggle">模拟大模型故障（看降级）</button>
          <button class="t" id="aiReset">清空会话</button>
        </div>
        <div class="ai-chat-quick" id="aiQuick"></div>
        <div class="ai-chat-input">
          <textarea id="aiInput" placeholder="问问物流、退换货、保修或商品推荐…"></textarea>
          <button id="aiSend" title="发送">➤</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const fab = document.getElementById('ai-fab');
    const chat = document.getElementById('ai-chat');
    const body = document.getElementById('aiChatBody');
    const input = document.getElementById('aiInput');

    const toggle = () => {
      chatOpen = !chatOpen;
      chat.classList.toggle('hide', !chatOpen);
      if (chatOpen && !body.dataset.init) {
        body.dataset.init = '1';
        greet();
      }
      if (chatOpen) input.focus();
    };
    fab.onclick = toggle;
    document.getElementById('aiChatClose').onclick = () => {
      chatOpen = false;
      chat.classList.add('hide');
    };
    document.getElementById('aiSend').onclick = send;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    const downBtn = document.getElementById('aiDownToggle');
    const syncDown = () => {
      const down = NS.AI.Health.isDown();
      downBtn.classList.toggle('on', down);
      downBtn.textContent = down ? '✓ 大模型故障中（点此恢复）' : '模拟大模型故障（看降级）';
    };
    downBtn.onclick = () => {
      NS.AI.Health.set(!NS.AI.Health.isDown());
      syncDown();
      toast(NS.AI.Health.isDown() ? '已模拟大模型不可用，AI 能力将按降级契约响应' : '大模型服务已恢复', NS.AI.Health.isDown() ? 'error' : 'success');
    };
    syncDown();
    document.getElementById('aiReset').onclick = () => {
      NS.AI.CustomerService.reset();
      body.innerHTML = '';
      greet();
      toast('会话已清空', 'success');
    };

    // 常见问题快捷入口（冷启动 / 降级兜底展示）
    const quick = document.getElementById('aiQuick');
    quick.innerHTML = NS.DATA.FAQ.slice(0, 4)
      .map((f) => `<button class="q">${esc(f)}</button>`)
      .join('');
    quick.querySelectorAll('.q').forEach((b) => {
      b.onclick = () => {
        input.value = b.textContent;
        send();
      };
    });

    function greet() {
      pushMsg(
        'assistant',
        '你好，我是小智 👋\n我可以帮你查询订单与物流、解答退换货与保修政策，也可以根据场景给你推荐商品。\n试试下面这些问题，或直接输入订单号（如 AIECP20260928001）。'
      );
    }

    function pushMsg(role, text, meta) {
      const div = document.createElement('div');
      div.className = 'msg ' + (role === 'user' ? 'user' : '');
      div.innerHTML = `
        <div class="msg-avatar">${role === 'user' ? '我' : '🤖'}</div>
        <div>
          <div class="msg-bubble">${esc(text)}</div>
          ${meta ? `<div class="msg-meta">${meta}</div>` : ''}
        </div>`;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      return div;
    }

    function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      pushMsg('user', text);
      const typing = document.createElement('div');
      typing.className = 'msg';
      typing.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble msg-typing"><span></span><span></span><span></span></div>`;
      body.appendChild(typing);
      body.scrollTop = body.scrollHeight;

      NS.AI.CustomerService.chatStream(
        text,
        () => {},
        (res) => {
          typing.remove();
          const meta = [];
          meta.push(`<span class="meta-chip ai">意图：${esc(res.intent)}</span>`);
          meta.push(`<span class="meta-chip">置信度 ${res.confidence}</span>`);
          if (res.citations && res.citations.length)
            meta.push(`<span class="meta-chip">引用 ${res.citations.map((c) => esc(c.id)).join('、')}</span>`);
          if (res.tools && res.tools.length)
            meta.push(`<span class="meta-chip">工具 ${res.tools.map((t) => esc(t.name)).join('、')}</span>`);
          if (res.degraded) meta.push(`<span class="meta-chip warn">降级：${esc(res.degradeReason)}</span>`);
          meta.push(`<span class="mm-item">traceId ${esc(res.traceId)}</span>`);
          pushMsg('assistant', res.answer, meta.join(''));
          if (res.transferToAgent) {
            pushMsg('assistant', '已为你生成工单并转接人工坐席（演示环境不会真的接入坐席），会话摘要：\n· 用户问题：' + text + '\n· 识别意图：' + res.intent + '（置信度 ' + res.confidence + '）');
          }
          if (res.degraded && res.faq) {
            const d = document.createElement('div');
            d.className = 'msg';
            d.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble">常见问题：\n${res.faq.map((f, i) => i + 1 + '. ' + esc(f)).join('\n')}</div>`;
            body.appendChild(d);
            body.scrollTop = body.scrollHeight;
          }
        }
      );
    }

    NS.UI._aiSend = send;
    NS.UI._aiOpen = () => {
      if (!chatOpen) toggle();
    };
  }

  /* ------------------------------ 面包屑 ------------------------------ */
  function catCrumb(code) {
    const names = S.Cat.breadcrumb(code);
    const items = [{ text: '首页', href: 'index.html' }];
    names.forEach((n, i) => {
      items.push({ text: n, href: i < names.length - 1 ? 'products.html?cat=' + S.Cat.get(code).path[i] : null });
    });
    return crumb(items);
  }

  /** 在 body 末尾调用：底部 + 移动端导航 + AI 组件 + 购物车角标 */
  function tail() {
    renderFooter();
    mountAI();
    setCartBadge();
  }

  function init(active) {
    _active = active || '';
    renderHeader(active);
    tail();
  }

  NS.UI = {
    ICONS, NAVS, esc, q, toast, tail,
    renderHeader, renderFooter, mountAI, init, setCartBadge,
    productCard, addToCart, bundleCard, bindBundle, crumb, catCrumb, doSearch, isActive
  };
})(window.AIECP = window.AIECP || {});
