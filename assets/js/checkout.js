/* =====================================================================
 * 结算下单页 —— 地址 / 优惠券 / 优惠计算 / 提交订单（FR-04）
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const esc = UI.esc;
  const P = (NS.Pages = NS.Pages || {});

  let items = [];          // 本次结算的购物车条目
  let addressId = null;
  let couponId = null;
  let payChannel = '微信支付';
  let usePoints = false;

  function init() {
    const buyNow = sessionStorage.getItem('aiecp_buynow');
    if (buyNow) {
      const keys = JSON.parse(buyNow);
      const all = S.Cart.all();
      items = keys.map((k) => all.find((x) => x.key === k)).filter(Boolean);
    } else {
      items = S.Cart.checked();
    }
    if (!items.length) {
      document.querySelector('.container').innerHTML = `<div class="empty" style="padding:120px 0">
        <div class="empty-icon">🛒</div><div class="empty-title">没有可结算的商品</div>
        <a class="btn btn-primary mt16" href="cart.html">返回购物车</a></div>`;
      return;
    }
    const def = S.User.defaultAddress();
    addressId = def ? def.id : null;

    renderAddr();
    renderItems();
    renderCoupons();
    renderPay();
    renderSummary();
  }

  /* ------------------------------ 地址 ------------------------------ */
  function renderAddr() {
    const list = S.User.addresses();
    document.getElementById('addrList').innerHTML = list
      .map(
        (a) => `<div class="addr-card ${a.id === addressId ? 'active' : ''}" data-addr="${a.id}">
          <div class="row between center">
            <div class="ac-name">${esc(a.name)} <span class="text-3 small">${esc(a.mobile)}</span></div>
            <span class="tag tag-brand">${esc(a.tag || '地址')}</span>
          </div>
          <div class="ac-detail">${esc(a.region)} ${esc(a.detail)}</div>
        </div>`
      )
      .join('');
    document.querySelectorAll('[data-addr]').forEach((el) => {
      el.onclick = () => {
        addressId = el.dataset.addr;
        renderAddr();
      };
    });
  }

  function toggleAddrForm() {
    const f = document.getElementById('addrForm');
    f.classList.toggle('hide');
  }

  function saveAddr() {
    const name = document.getElementById('afName').value.trim();
    const mobile = document.getElementById('afMobile').value.trim();
    const region = document.getElementById('afRegion').value.trim();
    const detail = document.getElementById('afDetail').value.trim();
    if (!name || !mobile || !region || !detail) return UI.toast('请填写完整的地址信息', 'error');
    const list = S.User.addresses();
    const a = { id: 'A' + Date.now().toString().slice(-6), name, mobile, region, detail, tag: '自定义', isDefault: false };
    list.push(a);
    S.User.saveAddresses(list);
    addressId = a.id;
    ['afName', 'afMobile', 'afRegion', 'afDetail'].forEach((id) => (document.getElementById(id).value = ''));
    toggleAddrForm();
    renderAddr();
    UI.toast('地址已保存', 'success');
  }

  /* ---------------------------- 商品清单 ---------------------------- */
  function renderItems() {
    document.getElementById('itemCountText').textContent = `共 ${items.reduce((a, x) => a + x.quantity, 0)} 件`;
    const groups = {};
    items.forEach((it) => {
      const g = it.bundleId || 'NORMAL';
      if (!groups[g]) groups[g] = { name: it.bundleName, items: [] };
      groups[g].items.push(it);
    });
    let html = '';
    Object.keys(groups).forEach((k) => {
      const g = groups[k];
      if (k !== 'NORMAL')
        html += `<div class="small" style="color:var(--ai);padding:8px 0">🧩 组货方案：${esc(g.name)}（组合标识 ${esc(k)}，结算时保留用于归因）</div>`;
      g.items.forEach((it) => {
        html += `<div class="co-item">
          <img src="${it.product.images[0]}" alt="">
          <div class="coi-name">
            <a href="product.html?id=${it.productId}">${esc(it.product.title)}</a>
            <span>${esc(it.sku.specText)} × ${it.quantity}</span>
          </div>
          <div class="text-2">${S.money(it.sku.salePrice)}</div>
          <div class="price" style="min-width:90px;text-align:right">${S.money(it.lineAmount)}</div>
        </div>`;
      });
    });
    document.getElementById('coItems').innerHTML = html;
  }

  /* ----------------------------- 优惠券 ----------------------------- */
  function renderCoupons() {
    const list = S.Coupon.all();
    document.getElementById('couponList').innerHTML =
      `<div class="coupon-item ${!couponId ? 'active' : ''}" data-coupon="">
        <div class="ci-amount"><b>不使用</b></div>
        <div class="ci-info">不使用优惠券<div class="cii-sub">可享受平台满减活动</div></div>
      </div>` +
      list
        .map((c) => {
          const r = S.Coupon.apply(c, items);
          const amount = c.type === 'discount' ? `${(c.value * 10).toFixed(1)} 折` : `¥${c.value}`;
          return `<div class="coupon-item ${couponId === c.id ? 'active' : ''} ${r.ok ? '' : 'disabled'}" data-coupon="${c.id}">
            <div class="ci-amount"><b>${amount}</b><div class="small">${c.type === 'discount' ? '最高减 80' : '满' + c.threshold + '可用'}</div></div>
            <div class="ci-info">
              ${esc(c.name)}　<span class="tag tag-muted">${esc(c.scope)}</span>
              <div class="cii-sub">${esc(c.desc)} · 有效期至 ${c.expire}</div>
              ${r.ok ? '' : `<div class="cii-sub text-danger">不可用：${esc(r.reason)}</div>`}
            </div>
          </div>`;
        })
        .join('');
    document.querySelectorAll('[data-coupon]').forEach((el) => {
      el.onclick = () => {
        if (el.classList.contains('disabled')) return;
        couponId = el.dataset.coupon || null;
        renderCoupons();
        renderSummary();
      };
    });
  }

  /* ---------------------------- 支付方式 ---------------------------- */
  function renderPay() {
    document.querySelectorAll('[data-pay]').forEach((el) => {
      el.classList.toggle('active', el.dataset.pay === payChannel);
      el.onclick = () => {
        payChannel = el.dataset.pay;
        renderPay();
      };
    });
  }

  /* ---------------------------- 金额计算 ---------------------------- */
  function calc() {
    const goods = items.reduce((a, x) => a + x.lineAmount, 0);
    const coupon = couponId ? S.Coupon.get(couponId) : null;
    const cr = coupon ? S.Coupon.apply(coupon, items) : { ok: false, amount: 0 };
    const couponAmount = cr.ok ? cr.amount : 0;
    const fr = S.Freight.calc(items);
    const u = S.User.get();
    const pointsAmount = usePoints ? Math.min(u.points / 100, Math.max(0, goods - couponAmount)) : 0;
    const payAmount = Math.max(0, goods - couponAmount - pointsAmount) + fr.fee;
    return { goods, couponAmount, freight: fr.fee, freeReason: fr.freeReason, pointsAmount, payAmount, couponText: coupon ? `${coupon.name} -${couponAmount}` : '无' };
  }

  function renderSummary() {
    const c = calc();
    document.getElementById('sumGoods').textContent = S.money(c.goods);
    document.getElementById('sumCoupon').textContent = '-' + S.money(c.couponAmount);
    document.getElementById('sumFreight').textContent = c.freight ? S.money(c.freight) : '包邮';
    document.getElementById('sumPoints').textContent = '-' + S.money(c.pointsAmount);
    document.getElementById('sumTotal').innerHTML = `<span class="sym">¥</span>${c.payAmount.toFixed(2)}`;
    document.getElementById('saveText').textContent =
      `已为你节省 ${S.money(c.couponAmount + c.pointsAmount)}　·　${c.freeReason}`;
  }

  /* ---------------------------- 提交订单 ---------------------------- */
  function submit() {
    if (!addressId) return UI.toast('请先选择收货地址', 'error');
    const addr = S.User.addresses().find((a) => a.id === addressId);
    const c = calc();
    const bundleId = items.find((x) => x.bundleId) ? items.find((x) => x.bundleId).bundleId : null;
    const bundleName = items.find((x) => x.bundleId) ? items.find((x) => x.bundleId).bundleName : '';

    const order = S.Orders.create({
      items: items.map((it) => ({
        productId: it.productId,
        skuId: it.skuId,
        title: it.product.title,
        image: it.product.images[0],
        specText: it.sku.specText,
        unitPrice: it.sku.salePrice,
        quantity: it.quantity,
        category: it.product.category
      })),
      bundleId,
      bundleName,
      address: addr,
      couponId,
      couponText: c.couponText,
      couponAmount: c.couponAmount,
      freight: c.freight,
      goodsAmount: c.goods,
      payAmount: c.payAmount,
      remark: document.getElementById('remarkInput').value.trim()
    });

    // 从购物车移除已结算条目
    const keys = items.map((x) => x.key);
    S.Cart.save(S.Cart.raw().filter((x) => keys.indexOf(x.key) < 0));
    if (couponId) S.Coupon.consume(couponId);
    sessionStorage.removeItem('aiecp_buynow');
    UI.setCartBadge();
    location.href = 'pay.html?no=' + order.orderNo;
  }

  P.checkout = { init, toggleAddrForm, saveAddr, submit };
  document.addEventListener('DOMContentLoaded', init);
})(window.AIECP = window.AIECP || {});
