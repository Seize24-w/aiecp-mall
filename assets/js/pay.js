/* =====================================================================
 * 模拟支付页 —— 收银台 / 支付结果回调（验签 + 幂等）/ 支付成功
 * 演示图 4-10「消费者下单与支付时序」与 BR-08「回调须验签且幂等」
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const esc = UI.esc;
  const P = (NS.Pages = NS.Pages || {});

  let order = null;
  let channel = '微信支付';
  let paid = false;

  function init() {
    const no = UI.q('no');
    order = S.Orders.get(no);
    const box = document.getElementById('payBox');
    if (!order) {
      box.innerHTML = `<div class="empty" style="padding:120px 0">
        <div class="empty-icon">🧾</div><div class="empty-title">订单不存在</div>
        <a class="btn btn-primary mt16" href="orders.html">返回我的订单</a></div>`;
      return;
    }
    if (order.status !== 'PENDING_PAY') {
      renderDone();
      return;
    }
    renderCashier();
    startCountdown();
  }

  function renderCashier() {
    const st = S.Orders.statusOf(order);
    document.getElementById('payBox').innerHTML = `
      <div class="checkout-layout">
        <div>
          <div class="card card-pad mb16">
            <div class="block-title">💳 收银台</div>
            <div class="row between center wrap" style="padding:12px 0;border-bottom:1px dashed var(--line-2)">
              <div>
                <div class="small text-3">订单号</div>
                <div class="mono">${order.orderNo}</div>
              </div>
              <div>
                <div class="small text-3">订单状态</div>
                <div class="text-warning">${st.label}</div>
              </div>
              <div>
                <div class="small text-3">支付剩余时间</div>
                <div class="text-danger mono" id="countdown">30:00</div>
              </div>
            </div>
            <div class="pay-methods mt16">
              ${['微信支付', '支付宝', '云闪付', '银行卡']
                .map(
                  (c) => `<div class="pay-method ${c === channel ? 'active' : ''}" data-pay="${c}">
                    ${c === '微信支付' ? '🟢' : c === '支付宝' ? '🔵' : c === '云闪付' ? '🟡' : '💳'} ${c}
                    ${c === '微信支付' || c === '支付宝' ? '<span class="tag tag-brand" style="margin-left:auto">支持分期</span>' : ''}
                  </div>`
                )
                .join('')}
            </div>
            <div class="degrade-note mt16" style="border-color:var(--brand);color:var(--brand);background:var(--brand-soft)">
              <span>ℹ</span>
              <div>本页模拟第三方支付网关：点击「确认支付」后，系统会模拟支付成功回调。
                回调需<b>验签</b>且<b>幂等</b>——同一支付单重复回调只允许产生一次状态变更（BR-08）。</div>
            </div>
          </div>

          <div class="card card-pad">
            <div class="block-title">🛍️ 订单商品</div>
            ${order.items
              .map(
                (it) => `<div class="co-item">
                  <img src="${it.image}" alt="">
                  <div class="coi-name"><a href="product.html?id=${it.productId}">${esc(it.title)}</a>
                    <span>${esc(it.specText)} × ${it.quantity}</span></div>
                  <div class="price">${S.money(it.unitPrice * it.quantity)}</div>
                </div>`
              )
              .join('')}
          </div>
        </div>

        <aside class="card card-pad summary-box">
          <div class="block-title">💰 支付金额</div>
          <div class="summary-line"><span>商品金额</span><span>${S.money(order.goodsAmount)}</span></div>
          <div class="summary-line"><span>优惠券</span><span class="text-price">-${S.money(order.couponAmount)}</span></div>
          <div class="summary-line"><span>运费</span><span>${order.freight ? S.money(order.freight) : '包邮'}</span></div>
          <div class="summary-line total"><span>应付</span><span class="price"><span class="sym">¥</span>${order.payAmount.toFixed(2)}</span></div>
          <div class="small text-3 mt8">收货地址：${esc(order.address.region)} ${esc(order.address.detail)}（${esc(order.address.name)} ${esc(order.address.mobile)}）</div>
          <button class="btn btn-lg btn-danger btn-block mt16" onclick="AIECP.Pages.pay.doPay()">确认支付 ${S.money(order.payAmount)}</button>
          <button class="btn btn-block mt8" onclick="AIECP.Pages.pay.cancel()">取消订单</button>
        </aside>
      </div>`;
    document.querySelectorAll('[data-pay]').forEach((el) => {
      el.onclick = () => {
        channel = el.dataset.pay;
        renderCashier();
      };
    });
  }

  /** 模拟 30 分钟支付倒计时 */
  function startCountdown() {
    let left = 30 * 60;
    const el = () => document.getElementById('countdown');
    const t = setInterval(() => {
      if (paid) return clearInterval(t);
      left--;
      const m = String(Math.floor(left / 60)).padStart(2, '0');
      const s = String(left % 60).padStart(2, '0');
      if (el()) el().textContent = `${m}:${s}`;
      if (left <= 0) {
        clearInterval(t);
        UI.toast('支付超时，订单已自动关闭并释放库存', 'error', 3000);
        S.Orders.cancel(order.orderNo);
        setTimeout(() => (location.href = 'order-detail.html?no=' + order.orderNo), 1200);
      }
    }, 1000);
  }

  function doPay() {
    const btn = document.querySelector('#payBox .btn-danger');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '支付处理中…';
    }
    UI.toast('已发起支付，等待支付网关回调…', '', 1500);
    setTimeout(() => {
      paid = true;
      S.Orders.pay(order.orderNo, channel);
      // 幂等校验演示：重复回调不产生二次状态变更
      S.Orders.pay(order.orderNo, channel);
      renderDone();
      UI.toast('支付成功', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  }

  function renderDone() {
    order = S.Orders.get(UI.q('no'));
    const st = S.Orders.statusOf(order);
    const cancelled = order.status === 'CLOSED';
    document.getElementById('payBox').innerHTML = `
      <div class="card card-pad" style="text-align:center;padding:48px 24px">
        <div style="font-size:56px">${cancelled ? '🚫' : '✅'}</div>
        <h2 style="font-size:22px;margin:12px 0 6px">${cancelled ? '订单已关闭' : '支付成功'}</h2>
        <p class="text-2">${cancelled ? '库存已释放，你可以重新下单' : `实付 <b class="price">${S.money(order.payAmount)}</b>　支付方式：${esc(order.payChannel || '—')}`}</p>
        <div class="mono small text-3 mt8">订单号 ${order.orderNo} · 当前状态 ${st.label} · traceId ${NS.AI.traceId()}</div>
        <div class="row gap12 center mt24" style="justify-content:center;flex-wrap:wrap">
          <a class="btn btn-primary" href="order-detail.html?no=${order.orderNo}">查看订单详情</a>
          <a class="btn" href="orders.html">我的订单</a>
          <a class="btn" href="products.html">继续逛逛</a>
        </div>
      </div>

      <div class="card card-pad mt16">
        <div class="block-title">📦 订单进度</div>
        <div class="timeline">
          ${order.timeline
            .slice()
            .reverse()
            .map(
              (t) => `<div class="tl-item">
                <div class="tl-dot"></div>
                <div><div class="tl-content">${esc(t.text)}</div><div class="tl-time">${t.time}</div></div>
              </div>`
            )
            .join('')}
        </div>
        <div class="row gap8 mt16 wrap">
          <span class="text-3 small">演示订单状态流转：</span>
          <button class="btn btn-sm" onclick="AIECP.Pages.pay.advance()">模拟商家发货推进</button>
          <span class="text-3 small">（待发货 → 已发货 → 已完成）</span>
        </div>
      </div>`;
  }

  function cancel() {
    if (!confirm('确定取消这笔订单吗？库存将被释放。')) return;
    S.Orders.cancel(order.orderNo);
    renderDone();
    UI.toast('订单已取消', 'success');
  }

  function advance() {
    S.Orders.advance(order.orderNo);
    renderDone();
    UI.toast('订单状态已推进', 'ai');
  }

  P.pay = { doPay, cancel, advance };
  document.addEventListener('DOMContentLoaded', init);
})(window.AIECP = window.AIECP || {});
