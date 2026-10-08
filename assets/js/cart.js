/* =====================================================================
 * 购物车页 —— 分组展示（保留组货组合标识）/ 数量修改 / 勾选结算 / 失效提示
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const esc = UI.esc;
  const P = (NS.Pages = NS.Pages || {});

  function render() {
    const items = S.Cart.all();
    const body = document.getElementById('cartBody');

    if (!items.length) {
      body.innerHTML = `<div class="empty">
        <div class="empty-icon">🛒</div>
        <div class="empty-title">购物车还是空的</div>
        <div class="small">去挑几件心仪的商品吧</div>
        <a class="btn btn-primary mt16" href="products.html">去逛逛</a></div>`;
      document.getElementById('clearInvalidBtn').style.display = 'none';
      updateSummary();
      renderRec([]);
      return;
    }

    const invalidCount = items.filter((x) => x.invalid).length;
    document.getElementById('clearInvalidBtn').style.display = invalidCount ? '' : 'none';

    let html = '';
    S.Cart.groups().forEach((g) => {
      if (g.bundleId) {
        html += `<div class="cart-group-title">
          <span>🧩</span><span>组货方案：${esc(g.name)}</span>
          <span class="tag tag-ai" style="margin-left:auto">组合标识 ${esc(g.bundleId)}</span>
        </div>`;
      }
      g.items.forEach((it) => {
        html += itemHtml(it);
      });
    });
    body.innerHTML = html;
    bind();
    updateSummary();
    renderRec(items.map((x) => x.productId));
  }

  function itemHtml(it) {
    const p = it.product || {};
    const s = it.sku || {};
    return `
      <div class="cart-item ${it.invalid ? 'invalid' : ''}">
        <div class="ci-chk"><input type="checkbox" data-chk="${esc(it.key)}" ${it.checked && !it.invalid ? 'checked' : ''} ${it.invalid ? 'disabled' : ''}></div>
        <div class="ci-product">
          <a href="product.html?id=${it.productId}"><img src="${p.images ? p.images[0] : ''}" alt=""></a>
          <div style="min-width:0">
            <a class="ci-name clamp2" href="product.html?id=${it.productId}">${esc(p.title || '商品已下架')}</a>
            <div class="ci-spec">${esc(s.specText || '')} ${it.bundleId ? '· <span class="tag tag-ai">组货</span>' : ''}</div>
            ${it.invalid ? `<div class="tag tag-muted">失效：${esc(it.invalidReason)}</div>` : ''}
          </div>
        </div>
        <div class="ci-price">${s.salePrice ? S.money(s.salePrice) : '—'}</div>
        <div class="ci-qty">
          <div class="qty-box">
            <button data-step="-1" data-key="${esc(it.key)}" ${it.invalid ? 'disabled' : ''}>−</button>
            <input type="text" value="${it.quantity}" data-qty="${esc(it.key)}" ${it.invalid ? 'disabled' : ''}>
            <button data-step="1" data-key="${esc(it.key)}" ${it.invalid ? 'disabled' : ''}>＋</button>
          </div>
        </div>
        <div class="ci-amount"><span class="price">${S.money(it.lineAmount)}</span></div>
        <div><button class="btn btn-sm btn-ghost" data-del="${esc(it.key)}">删除</button></div>
      </div>`;
  }

  function bind() {
    document.querySelectorAll('#cartBody [data-chk]').forEach((el) => {
      el.onchange = () => {
        S.Cart.setChecked(el.dataset.chk, el.checked);
        render();
      };
    });
    document.querySelectorAll('#cartBody [data-step]').forEach((el) => {
      el.onclick = () => {
        const key = el.dataset.key;
        const it = S.Cart.all().find((x) => x.key === key);
        S.Cart.setQty(key, it.quantity + Number(el.dataset.step));
        render();
      };
    });
    document.querySelectorAll('#cartBody [data-qty]').forEach((el) => {
      el.onchange = () => {
        S.Cart.setQty(el.dataset.qty, parseInt(el.value, 10) || 1);
        render();
      };
    });
    document.querySelectorAll('#cartBody [data-del]').forEach((el) => {
      el.onclick = () => {
        S.Cart.remove(el.dataset.del);
        UI.setCartBadge();
        render();
        UI.toast('已移出购物车', 'success');
      };
    });
    const all = S.Cart.all().filter((x) => !x.invalid);
    const allChecked = all.length && all.every((x) => x.checked);
    ['chkAllTop', 'chkAllBottom'].forEach((id) => {
      const c = document.getElementById(id);
      if (!c) return;
      c.checked = !!allChecked;
      c.onchange = () => {
        S.Cart.checkAll(c.checked);
        render();
      };
    });
  }

  function updateSummary() {
    const sum = S.Cart.summary();
    document.getElementById('selCount').textContent = sum.totalQty;
    document.getElementById('goodsAmount').textContent = S.money(sum.goodsAmount);
    document.getElementById('totalAmount').textContent = S.money(sum.goodsAmount);
  }

  /** 购物车页的智能选品补充推荐 */
  function renderRec(exclude) {
    const res = NS.AI.Selection.recommend({ scene: 'CART', limit: 5, exclude });
    document.getElementById('cartRecGrid').innerHTML = res.items
      .map((it) => UI.productCard(it.product, { reason: it.reason, recallSource: it.recallSource }))
      .join('');
    document.getElementById('cartRecSub').textContent = res.degraded
      ? '降级：' + res.degradeReason
      : '画像构建 → 多路召回 → 精排打分 → 业务规则过滤 → 多样性重排';
    document.getElementById('cartRecTrace').textContent = `traceId ${res.traceId} · ${res.strategyCode}`;
  }

  function checkout() {
    const checked = S.Cart.checked();
    if (!checked.length) return UI.toast('请先勾选要结算的商品', 'error');
    sessionStorage.removeItem('aiecp_buynow');
    location.href = 'checkout.html';
  }

  P.cart = {
    render,
    checkout,
    removeChecked() {
      S.Cart.removeChecked();
      UI.setCartBadge();
      render();
      UI.toast('已删除选中商品', 'success');
    },
    clearInvalid() {
      S.Cart.clearInvalid();
      UI.setCartBadge();
      render();
      UI.toast('已清除失效商品', 'success');
    }
  };

  document.addEventListener('DOMContentLoaded', render);
})(window.AIECP = window.AIECP || {});
