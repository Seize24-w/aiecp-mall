/* =====================================================================
 * 订单列表页 —— 状态筛选 / 订单号与商品名检索 / 订单操作（FR-05）
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const esc = UI.esc;
  const P = (NS.Pages = NS.Pages || {});

  const TABS = [
    { key: 'ALL', label: '全部' },
    { key: 'PENDING_PAY', label: '待支付' },
    { key: 'SHIPPING', label: '待发货' },
    { key: 'SHIPPED', label: '已发货' },
    { key: 'COMPLETED', label: '已完成' },
    { key: 'REFUNDING', label: '退款中' },
    { key: 'CLOSED', label: '已关闭' }
  ];

  let status = 'ALL';

  function init() {
    const sp = new URLSearchParams(location.search);
    if (sp.get('status')) status = sp.get('status');
    renderTabs();
    render();
    const input = document.getElementById('orderSearch');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') render();
    });
  }

  function renderTabs() {
    const counts = {};
    S.Orders.all().forEach((o) => (counts[o.status] = (counts[o.status] || 0) + 1));
    document.getElementById('statusTabs').innerHTML = TABS.map(
      (t) => `<div class="st ${status === t.key ? 'active' : ''}" data-st="${t.key}">${t.label}${
        t.key !== 'ALL' && counts[t.key] ? `（${counts[t.key]}）` : ''
      }</div>`
    ).join('');
    document.querySelectorAll('[data-st]').forEach((el) => {
      el.onclick = () => {
        status = el.dataset.st;
        renderTabs();
        render();
      };
    });
  }

  function render() {
    const kw = (document.getElementById('orderSearch').value || '').trim().toLowerCase();
    let list = S.Orders.byStatus(status);
    if (kw) {
      list = list.filter(
        (o) =>
          o.orderNo.toLowerCase().indexOf(kw) >= 0 ||
          o.items.some((i) => i.title.toLowerCase().indexOf(kw) >= 0)
      );
    }
    list = list.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const box = document.getElementById('orderList');
    if (!list.length) {
      box.innerHTML = `<div class="card"><div class="empty">
        <div class="empty-icon">🧾</div><div class="empty-title">暂无符合条件的订单</div>
        <div class="small">换个状态筛选，或去挑几件商品</div>
        <a class="btn btn-primary mt16" href="products.html">去逛逛</a></div></div>`;
      return;
    }
    box.innerHTML = list.map((o) => orderCard(o)).join('');
    bind(list);
  }

  function orderCard(o) {
    const st = S.Orders.statusOf(o);
    const tone = { warning: 'text-warning', success: 'text-success', primary: 'text-brand', info: 'text-brand', muted: 'text-3' }[st.tone] || '';
    return `
      <div class="order-card">
        <div class="oc-head">
          <span>${o.createdAt}</span>
          <span class="oc-no">${o.orderNo}</span>
          ${o.bundleId ? `<span class="tag tag-ai">🧩 ${esc(o.bundleName)}</span>` : ''}
          <span class="oc-status ${tone}">${st.label}</span>
        </div>
        <div class="oc-body">
          <div class="oc-goods">
            ${o.items
              .slice(0, 3)
              .map(
                (it) => `<div class="og-item">
                  <img src="${it.image}" alt="">
                  <div class="ogi-name"><a href="product.html?id=${it.productId}">${esc(it.title)}</a>
                    <span>${esc(it.specText)} × ${it.quantity}</span></div>
                  <div class="text-2">${S.money(it.unitPrice)}</div>
                </div>`
              )
              .join('')}
            ${o.items.length > 3 ? `<div class="small text-3">等 ${o.items.length} 件商品</div>` : ''}
          </div>
          <div class="oc-amount">
            <div>共 ${o.itemCount} 件</div>
            <div class="price" style="font-size:17px">${S.money(o.payAmount)}</div>
            <div class="small text-3">${esc(o.payChannel || '未支付')}</div>
          </div>
        </div>
        <div class="oc-actions">
          ${actionsHtml(o)}
        </div>
      </div>`;
  }

  function actionsHtml(o) {
    const a = [`<a class="btn btn-sm" href="order-detail.html?no=${o.orderNo}">订单详情</a>`];
    if (o.status === 'PENDING_PAY') {
      a.push(`<a class="btn btn-sm btn-primary" href="pay.html?no=${o.orderNo}">去支付</a>`);
      a.push(`<button class="btn btn-sm" data-act="cancel" data-no="${o.orderNo}">取消订单</button>`);
    }
    if (o.status === 'SHIPPED') {
      a.push(`<button class="btn btn-sm btn-primary" data-act="confirm" data-no="${o.orderNo}">确认收货</button>`);
      a.push(`<button class="btn btn-sm" data-act="refund" data-no="${o.orderNo}">申请退款</button>`);
    }
    if (o.status === 'SHIPPING') {
      a.push(`<button class="btn btn-sm" data-act="advance" data-no="${o.orderNo}">模拟发货</button>`);
      a.push(`<button class="btn btn-sm" data-act="refund" data-no="${o.orderNo}">申请退款</button>`);
    }
    if (o.status === 'COMPLETED') {
      a.push(`<button class="btn btn-sm" data-act="refund" data-no="${o.orderNo}">申请退货</button>`);
      a.push(`<a class="btn btn-sm" href="product.html?id=${o.items[0].productId}">再次购买</a>`);
    }
    if (o.status === 'REFUNDING') {
      a.push(`<button class="btn btn-sm btn-primary" data-act="finishRefund" data-no="${o.orderNo}">模拟退款完成</button>`);
    }
    if (o.logistics) a.push(`<a class="btn btn-sm" href="order-detail.html?no=${o.orderNo}#logistics">查看物流</a>`);
    return a.join('');
  }

  function bind(list) {
    document.querySelectorAll('#orderList [data-act]').forEach((btn) => {
      btn.onclick = () => {
        const no = btn.dataset.no;
        switch (btn.dataset.act) {
          case 'cancel':
            if (confirm('确定取消该订单？')) {
              S.Orders.cancel(no);
              UI.toast('订单已取消，库存已释放', 'success');
            }
            break;
          case 'confirm':
            S.Orders.confirm(no);
            UI.toast('已确认收货，订单完成', 'success');
            break;
          case 'refund': {
            const reason = prompt('请填写退款原因', '7 天无理由退货');
            if (reason === null) return;
            S.Orders.refund(no, reason || '未填写原因');
            UI.toast('退款申请已提交，等待商家处理', 'success');
            break;
          }
          case 'finishRefund':
            S.Orders.completeRefund(no);
            UI.toast('退款成功，金额已原路退回', 'success');
            break;
          case 'advance':
            S.Orders.advance(no);
            UI.toast('商家已发货', 'ai');
            break;
        }
        renderTabs();
        render();
      };
    });
  }

  P.orders = { render };
  document.addEventListener('DOMContentLoaded', init);
})(window.AIECP = window.AIECP || {});
