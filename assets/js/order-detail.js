/* =====================================================================
 * 订单详情页 —— 状态流转时间线 / 物流轨迹 / 售后操作（FR-05 / FR-06）
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const esc = UI.esc;
  const P = (NS.Pages = NS.Pages || {});

  // 订单状态机主路径（图 4-7）
  const FLOW = ['PENDING_PAY', 'PAID', 'SHIPPING', 'SHIPPED', 'COMPLETED'];

  function init() {
    const no = UI.q('no');
    const o = S.Orders.get(no);
    const box = document.getElementById('detailBox');
    if (!o) {
      box.innerHTML = `<div class="empty" style="padding:120px 0">
        <div class="empty-icon">🧾</div><div class="empty-title">订单不存在</div>
        <a class="btn btn-primary mt16" href="orders.html">返回我的订单</a></div>`;
      return;
    }
    render(o);
    if (location.hash === '#logistics') {
      const el = document.getElementById('logistics');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }

  function render(o) {
    const st = S.Orders.statusOf(o);
    const box = document.getElementById('detailBox');

    // 进度条：异常状态（关闭/退款）不走主路径
    const abnormal = ['CLOSED', 'REFUNDING', 'REFUNDED', 'AFTER_SALE'].indexOf(o.status) >= 0;
    const curStep = abnormal ? 0 : FLOW.indexOf(o.status) + 1;

    box.innerHTML = `
      <!-- ==================== 状态头 ==================== -->
      <div class="card card-pad mb16" style="background:linear-gradient(120deg,#eef3ff,#f6f2ff)">
        <div class="row between center wrap">
          <div>
            <div style="font-size:20px;font-weight:700">${abnormal ? '⚠️' : st.step >= 4 ? '🚚' : '⏳'} ${st.label}</div>
            <div class="small text-2 mt8">订单号 <span class="mono">${o.orderNo}</span> · 下单时间 ${o.createdAt}</div>
            ${o.status === 'PENDING_PAY' ? '<div class="small text-warning mt8">请在 30 分钟内完成支付，超时订单将自动关闭</div>' : ''}
            ${o.status === 'SHIPPED' ? '<div class="small text-2 mt8">商品已出库，收到货后请确认收货</div>' : ''}
            ${o.status === 'REFUNDING' ? '<div class="small text-warning mt8">退款申请处理中，商家收货质检通过后 1-3 个工作日原路退回</div>' : ''}
          </div>
          <div class="row gap8 wrap">
            ${abnormal ? '' : `<a class="btn btn-primary btn-sm" href="pay.html?no=${o.orderNo}" style="${o.status === 'PENDING_PAY' ? '' : 'display:none'}">去支付</a>`}
            <button class="btn btn-sm" onclick="AIECP.Pages.orderDetail.ask()">💬 问 AI 客服</button>
          </div>
        </div>
        ${
          abnormal
            ? ''
            : `<div class="row center mt20" style="gap:0">
          ${FLOW.map((k, i) => {
            const node = S.Cat ? NS.DATA.ORDER_STATUS[k] : null;
            const done = i + 1 <= curStep;
            return `<div style="flex:1;text-align:center;position:relative">
              <div style="width:26px;height:26px;border-radius:50%;margin:0 auto;background:${done ? 'var(--brand)' : '#fff'};
                color:${done ? '#fff' : 'var(--text-4)'};line-height:26px;font-size:12px;border:2px solid ${done ? 'var(--brand)' : 'var(--line)'}">${i + 1}</div>
              <div class="small mt8" style="color:${done ? 'var(--brand)' : 'var(--text-4)'}">${node.label}</div>
              ${i < FLOW.length - 1 ? `<div style="position:absolute;top:13px;left:calc(50% + 18px);right:calc(-50% + 18px);height:2px;background:${i + 1 < curStep ? 'var(--brand)' : 'var(--line)'}"></div>` : ''}
            </div>`;
          }).join('')}
        </div>`
        }
      </div>

      <div class="checkout-layout">
        <div>
          <!-- ==================== 物流 ==================== -->
          <div class="card card-pad mb16" id="logistics">
            <div class="block-title">🚚 物流信息</div>
            ${
              o.logistics
                ? `<div class="row gap16 wrap mb12">
                    <span>承运商：<b>${esc(o.logistics.carrier)}</b></span>
                    <span>运单号：<span class="mono">${esc(o.logistics.no)}</span></span>
                    <button class="btn btn-sm btn-ghost" style="margin-left:auto" onclick="AIECP.UI.toast('运单号已复制','success')">复制</button>
                  </div>
                  <div class="logi-trace">
                    ${o.logistics.traces
                      .slice()
                      .reverse()
                      .map(
                        (t) => `<div class="lt-item"><div>${esc(t.text)}</div><div class="lt-time">${t.time}</div></div>`
                      )
                      .join('')}
                  </div>`
                : '<div class="small text-3">暂无物流信息，商家发货后可在查看轨迹。</div>'
            }
          </div>

          <!-- ==================== 商品 ==================== -->
          <div class="card card-pad mb16">
            <div class="block-title">🛍️ 商品清单
              ${o.bundleId ? `<span class="tag tag-ai" style="margin-left:8px">🧩 ${esc(o.bundleName)}</span>` : ''}</div>
            ${o.items
              .map(
                (it) => `<div class="co-item">
                  <a href="product.html?id=${it.productId}"><img src="${it.image}" alt=""></a>
                  <div class="coi-name"><a href="product.html?id=${it.productId}">${esc(it.title)}</a>
                    <span>${esc(it.specText)} × ${it.quantity}</span></div>
                  <div class="text-2">${S.money(it.unitPrice)}</div>
                  <div class="price" style="min-width:90px;text-align:right">${S.money(it.unitPrice * it.quantity)}</div>
                  <a class="btn btn-sm" href="product.html?id=${it.productId}">再次购买</a>
                </div>`
              )
              .join('')}
          </div>

          <!-- ==================== 时间线 ==================== -->
          <div class="card card-pad">
            <div class="block-title">🕐 订单流转记录</div>
            <div class="timeline">
              ${o.timeline
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
          </div>
        </div>

        <aside>
          <div class="card card-pad mb16">
            <div class="block-title">💰 金额明细</div>
            <div class="summary-line"><span>商品金额</span><span>${S.money(o.goodsAmount)}</span></div>
            <div class="summary-line"><span>优惠券</span><span class="text-price">-${S.money(o.couponAmount)}</span></div>
            <div class="summary-line"><span>运费</span><span>${o.freight ? S.money(o.freight) : '包邮'}</span></div>
            <div class="summary-line total"><span>实付</span><span class="price"><span class="sym">¥</span>${o.payAmount.toFixed(2)}</span></div>
          </div>

          <div class="card card-pad mb16">
            <div class="block-title">📍 收货信息</div>
            <div class="small" style="line-height:1.9">
              <div>${esc(o.address.name)}　${esc(o.address.mobile)}</div>
              <div class="text-2">${esc(o.address.region)} ${esc(o.address.detail)}</div>
              ${o.remark ? `<div class="text-3 mt8">备注：${esc(o.remark)}</div>` : ''}
            </div>
          </div>

          <div class="card card-pad">
            <div class="block-title">⚙️ 操作</div>
            <div class="col gap8">
              ${o.status === 'PENDING_PAY' ? `<a class="btn btn-primary btn-block" href="pay.html?no=${o.orderNo}">去支付</a>
                <button class="btn btn-block" onclick="AIECP.Pages.orderDetail.cancel()">取消订单</button>` : ''}
              ${o.status === 'SHIPPED' ? `<button class="btn btn-primary btn-block" onclick="AIECP.Pages.orderDetail.confirm()">确认收货</button>
                <button class="btn btn-block" onclick="AIECP.Pages.orderDetail.refund()">申请退货退款</button>` : ''}
              ${o.status === 'SHIPPING' ? `<button class="btn btn-block" onclick="AIECP.Pages.orderDetail.advance()">模拟商家发货</button>
                <button class="btn btn-block" onclick="AIECP.Pages.orderDetail.refund()">申请退款</button>` : ''}
              ${o.status === 'COMPLETED' ? `<button class="btn btn-block" onclick="AIECP.Pages.orderDetail.refund()">申请售后</button>
                <button class="btn btn-block" onclick="AIECP.UI.toast('评价已提交，感谢你的反馈','success')">评价商品</button>` : ''}
              ${o.status === 'REFUNDING' ? `<button class="btn btn-primary btn-block" onclick="AIECP.Pages.orderDetail.finishRefund()">模拟退款完成</button>` : ''}
              <button class="btn btn-block" onclick="AIECP.Pages.orderDetail.ask()">💬 咨询 AI 客服</button>
            </div>
          </div>
        </aside>
      </div>`;
  }

  const no = () => UI.q('no');

  P.orderDetail = {
    cancel() {
      if (!confirm('确定取消该订单？库存将被释放。')) return;
      S.Orders.cancel(no());
      UI.toast('订单已取消', 'success');
      render(S.Orders.get(no()));
    },
    confirm() {
      S.Orders.confirm(no());
      UI.toast('已确认收货', 'success');
      render(S.Orders.get(no()));
    },
    refund() {
      const reason = prompt('请填写退款/售后原因', '7 天无理由退货');
      if (reason === null) return;
      S.Orders.refund(no(), reason);
      UI.toast('售后申请已提交', 'success');
      render(S.Orders.get(no()));
    },
    finishRefund() {
      S.Orders.completeRefund(no());
      UI.toast('退款成功', 'success');
      render(S.Orders.get(no()));
    },
    advance() {
      S.Orders.advance(no());
      UI.toast('商家已发货', 'ai');
      render(S.Orders.get(no()));
    },
    ask() {
      UI._aiOpen();
      const inp = document.getElementById('aiInput');
      if (inp) {
        inp.value = '我的订单 ' + no() + ' 现在什么状态？';
        setTimeout(() => NS.UI._aiSend && NS.UI._aiSend(), 260);
      }
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})(window.AIECP = window.AIECP || {});
