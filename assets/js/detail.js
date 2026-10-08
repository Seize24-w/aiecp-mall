/* =====================================================================
 * 商品详情页 —— 规格选择（属性 Schema 驱动）/ 智能组货 / 加购与立即购买
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const esc = UI.esc;
  const P = (NS.Pages = NS.Pages || {});

  let product = null;
  let selected = {}; // { 规格组名: 选项值 }
  let qty = 1;
  let curSku = null;
  let bundles = [];

  /* ------------------------------ 初始化 ------------------------------ */
  function init() {
    const id = UI.q('id');
    product = S.Product.get(id);
    const box = document.querySelector('.container');
    if (!product) {
      box.innerHTML = `<div class="empty" style="padding:120px 0">
        <div class="empty-icon">📦</div><div class="empty-title">商品不存在或已下架</div>
        <a class="btn btn-primary mt16" href="products.html">返回商品列表</a></div>`;
      return;
    }
    document.title = product.title + ' · 智选云 AI';

    // 埋点：浏览（回流为智能选品画像，FR-17 / FR-20）
    S.Track.log('view', { productId: product.id, category: product.category, price: product.salePrice });

    // 默认规格：取第一个有库存的 SKU
    const first = product.skus.find((s) => s.stock > 0) || product.skus[0];
    selected = Object.assign({}, first.specs);
    curSku = first;

    renderCrumb();
    renderGallery();
    renderInfo();
    renderSku();
    renderQty();
    renderTabs();
    renderSimilar();
    renderBundle();
  }

  function renderCrumb() {
    document.getElementById('crumbBox').innerHTML = UI.catCrumb(product.category);
  }

  function renderGallery() {
    document.getElementById('mainImg').src = product.images[0];
    document.getElementById('mainImg').alt = product.title;
    document.getElementById('thumbs').innerHTML = product.images
      .map((src, i) => `<div class="gt ${i === 0 ? 'active' : ''}" data-i="${i}"><img src="${src}" alt=""></div>`)
      .join('');
    document.querySelectorAll('#thumbs .gt').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('#thumbs .gt').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        document.getElementById('mainImg').src = product.images[Number(t.dataset.i)];
      };
    });
  }

  function renderInfo() {
    document.getElementById('dTitle').textContent = product.title;
    document.getElementById('dSub').textContent = product.subTitle;
    document.getElementById('dMeta').innerHTML = `
      <span>品牌：${esc(product.brand)}</span>
      <span>品类：${esc((S.Cat.get(product.category) || {}).name || '')}</span>
      <span>商品编号：${product.id}</span>`;
    document.getElementById('dSales').textContent = S.num(product.sales);
    document.getElementById('dRating').textContent = product.rating;
    document.getElementById('dReviews').textContent = S.num(product.reviews);
    const fav = S.User.isFav(product.id);
    const fb = document.getElementById('favBtn');
    fb.textContent = fav ? '★ 已收藏' : '☆ 收藏';
    fb.classList.toggle('btn-primary', fav);
    updatePrice();
  }

  function updatePrice() {
    document.getElementById('dPrice').innerHTML = `<span class="sym">¥</span>${curSku.salePrice}`;
    document.getElementById('dMarket').textContent = '¥' + curSku.marketPrice;
    const off = Math.round((1 - curSku.salePrice / curSku.marketPrice) * 100);
    document.getElementById('dDiscount').textContent = off > 0 ? `省 ${off}%` : '新品价';
    document.getElementById('dStock').innerHTML =
      curSku.stock > 0 ? `现货 <b class="text-success">${curSku.stock}</b> 件` : '<b class="text-danger">暂时缺货</b>';
  }

  /* --------------------------- 规格选择区 --------------------------- */
  function renderSku() {
    const groups = [];
    product.skus.forEach((s) => {
      Object.keys(s.specs).forEach((k) => {
        if (!groups.find((g) => g.name === k)) groups.push({ name: k, options: [] });
        const g = groups.find((x) => x.name === k);
        if (g.options.indexOf(s.specs[k]) < 0) g.options.push(s.specs[k]);
      });
    });

    const specArea = document.getElementById('skuArea');
    // 先渲染规格，再渲染「品类属性」只读信息
    specArea.innerHTML =
      groups
        .map((g) => {
          const opts = g.options
            .map((o) => {
              const disabled = !hasStock(g.name, o);
              const active = selected[g.name] === o;
              return `<span class="sku-opt ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}"
                data-g="${esc(g.name)}" data-v="${esc(o)}">${esc(o)}${disabled ? '（缺货）' : ''}</span>`;
            })
            .join('');
          return `<div class="sku-group">
            <div class="sku-group-label">${esc(g.name)}</div>
            <div class="sku-options">${opts}</div></div>`;
        })
        .join('') + attrInfoHtml();

    specArea.querySelectorAll('.sku-opt').forEach((el) => {
      if (el.classList.contains('disabled')) return;
      el.onclick = () => {
        selected[el.dataset.g] = el.dataset.v;
        syncSku(true);
        renderSku();
        renderQty();
      };
    });
  }

  /** 属性 Schema 驱动的只读参数（详情页展示必填/可筛选属性） */
  function attrInfoHtml() {
    const cat = S.Cat.get(product.category);
    if (!cat) return '';
    const rows = cat.attrs
      .filter((a) => product.attrs[a.code] != null)
      .map((a) => {
        let v = product.attrs[a.code];
        if (typeof v === 'boolean') v = v ? '支持' : '不支持';
        else v = String(v) + (a.unit || '');
        return `<span class="tag tag-muted">${esc(a.name)}：${esc(v)}</span>`;
      })
      .join('');
    return `<div class="sku-group"><div class="sku-group-label">品类属性（由 JSON Schema 生成）</div>
      <div class="row gap4 wrap">${rows}</div></div>`;
  }

  function hasStock(groupName, value) {
    return product.skus.some((s) => s.specs[groupName] === value && s.stock > 0);
  }

  function syncSku(resetQty) {
    const sku = product.skus.find((s) => Object.keys(s.specs).every((k) => s.specs[k] === selected[k]));
    if (!sku) return;
    curSku = sku;
    if (resetQty) qty = 1;
    qty = Math.min(qty, Math.max(1, curSku.stock));
    updatePrice();
  }

  function renderQty() {
    document.getElementById('qtyInput').value = qty;
    document.getElementById('qtyHint').textContent = curSku.stock > 0 ? `限购 99 件，当前规格可售 ${curSku.stock} 件` : '该规格暂时缺货，请更换规格';
  }

  function stepQty(d) {
    const v = qty + d;
    setQty(v);
  }
  function setQty(v) {
    v = parseInt(v, 10) || 1;
    qty = Math.max(1, Math.min(99, Math.min(v, curSku.stock || 1)));
    renderQty();
  }

  /* ------------------------------ 操作 ------------------------------ */
  function addCart(silent) {
    if (!curSku.stock) return UI.toast('该规格暂时缺货', 'error');
    S.Cart.add(product.id, curSku.skuId, qty);
    UI.setCartBadge();
    if (!silent) UI.toast(`已加入购物车 ×${qty}`, 'success');
  }

  function buyNow() {
    if (!curSku.stock) return UI.toast('该规格暂时缺货', 'error');
    const key = [product.id, curSku.skuId, ''].join('|');
    addCart(true);
    sessionStorage.setItem('aiecp_buynow', JSON.stringify([key]));
    location.href = 'checkout.html';
  }

  function toggleFav() {
    const on = S.User.toggleFav(product.id);
    const fb = document.getElementById('favBtn');
    fb.textContent = on ? '★ 已收藏' : '☆ 收藏';
    fb.classList.toggle('btn-primary', on);
    UI.toast(on ? '已加入收藏' : '已取消收藏', 'success');
  }

  /* ------------------------------ Tab ------------------------------ */
  function renderTabs() {
    const cat = S.Cat.get(product.category);
    const paramRows = (cat ? cat.attrs : [])
      .filter((a) => product.attrs[a.code] != null)
      .map((a) => {
        let v = product.attrs[a.code];
        if (typeof v === 'boolean') v = v ? '支持' : '不支持';
        else v = String(v) + (a.unit || '');
        return `<tr><td>${esc(a.name)}</td><td>${esc(v)}</td></tr>`;
      })
      .join('');

    const tabs = {
      detail: `
        <div class="mb16">
          <div class="block-title">核心卖点</div>
          <ul class="highlight-list">${product.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        </div>
        <div>
          <div class="block-title">商品图文</div>
          <div class="row wrap gap12">
            ${product.images.map((s) => `<img src="${s}" style="width:calc(50% - 8px);border-radius:12px" alt="">`).join('')}
          </div>
          <p class="text-2 mt16" style="line-height:1.9">${esc(product.title)}——${esc(product.subTitle)}。
            ${esc(product.highlights[0] || '')}。本商品由商家通过 JSON 品类定义发布，所属品类「${esc((cat || {}).name || '')}」的
            属性 Schema 自动生成了本页的规格选择与参数展示，新增同类商品无需改动任何页面代码。</p>
        </div>`,
      param: `<table class="param-table">
          <tr><td>商品编号</td><td>${product.id}</td></tr>
          <tr><td>品牌</td><td>${esc(product.brand)}</td></tr>
          <tr><td>所属品类</td><td>${esc((cat || {}).name || '')}（${product.category}）</td></tr>
          <tr><td>可选规格</td><td>${product.skus.length} 种</td></tr>
          <tr><td>总库存</td><td>${product.stock} 件</td></tr>
          ${paramRows}
        </table>`,
      service: `<ul class="highlight-list">
          <li>7 天无理由退换（自签收次日起算，需保持商品及包装完好）</li>
          <li>家电整机保修以详情页标注为准，保修期内非人为损坏免费维修</li>
          <li>大家电提供免费上门安装（打孔、加长管线等辅材费用另计）</li>
          <li>支持开具电子普通发票，订单完成后 24 小时内发送至预留邮箱</li>
          <li>全场包邮，48 小时内发货；支付回调验签且幂等，重复回调只产生一次状态变更</li>
        </ul>`
    };

    const body = document.getElementById('tabBody');
    body.innerHTML = tabs.detail;
    document.querySelectorAll('.tab').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        body.innerHTML = tabs[t.dataset.tab];
      };
    });
  }

  /* --------------------------- 侧边推荐位 --------------------------- */
  function renderSimilar() {
    document.getElementById('similarBox').innerHTML = S.Product.similar(product, 4)
      .map(
        (p) => `<a class="hist-item" href="product.html?id=${p.id}">
          <img src="${p.images[0]}" alt="">
          <div style="flex:1;min-width:0">
            <div class="clamp2" style="font-size:13px">${esc(p.title)}</div>
            <div class="price" style="font-size:14px">${S.money(p.salePrice)}</div>
          </div></a>`
      )
      .join('');

    const res = NS.AI.Selection.recommend({ scene: 'DETAIL', limit: 3, exclude: [product.id], sceneProduct: product.id });
    document.getElementById('crossBox').innerHTML = res.items
      .map(
        (it) => `<a class="hist-item" href="product.html?id=${it.product.id}">
          <img src="${it.product.images[0]}" alt="">
          <div style="flex:1;min-width:0">
            <div class="clamp2" style="font-size:13px">${esc(it.product.title)}</div>
            <div class="small" style="color:var(--ai)">✨ ${esc(it.reason)}</div>
            <div class="price" style="font-size:14px">${S.money(it.product.salePrice)}</div>
          </div></a>`
      )
      .join('');
  }

  /* --------------------------- 智能组货 --------------------------- */
  function renderBundle() {
    const res = NS.AI.Bundle.compose(product.id, { limit: 2 });
    bundles = res.bundles || [];
    const rule = NS.DATA.BUNDLE_SCENES[product.scene] || { name: '搭配推荐', icon: '🧩' };
    document.getElementById('bundleSub').textContent =
      `主商品：${product.title}　搭配场景「${rule.name}」→ 配套召回 → 可行性校验 → 组合定价`;
    document.getElementById('bundleTrace').textContent = `traceId ${res.traceId} · ${res.strategyCode || 'BUNDLE_DEGRADE'}`;

    const body = document.getElementById('bundleBody');
    if (res.degraded) {
      body.innerHTML = `<div class="degrade-note"><span>⚠</span><div>
        <b>未输出组货方案（降级）</b><br>${esc(res.degradeReason)}。<br>
        依据 BR-12：组合毛利率不得低于主商品单品毛利率；依据 BR-11：方案须含至少 2 个可售 SKU 且均可送达。
        约束不满足时系统宁可降级为单品推荐，也不输出不可售的搭配。</div></div>
        <div class="product-grid mt16">${(res.fallbackProducts || []).map((p) => UI.productCard(p)).join('')}</div>`;
      return;
    }

    body.innerHTML = bundles.map((b) => UI.bundleCard(b, true)).join('');
    UI.bindBundle(body, bundles, true);
  }

  P.detail = { addCart, buyNow, toggleFav, stepQty, setQty };

  document.addEventListener('DOMContentLoaded', init);
})(window.AIECP = window.AIECP || {});
