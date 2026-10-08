/* =====================================================================
 * 个人中心 —— 账户概览 / AI 画像 / 足迹 / 收藏 / 地址 / 优惠券 / AI 设置
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const esc = UI.esc;
  const P = (NS.Pages = NS.Pages || {});

  let tab = 'overview';

  function init() {
    const u = S.User.get();
    document.getElementById('ucAvatar').textContent = u.avatarText || u.nickname.slice(0, 1);
    document.getElementById('ucName').textContent = u.nickname;
    document.getElementById('ucLevel').textContent = `${u.memberName} · ${u.mobile}`;
    document.getElementById('ucOrders').textContent = S.Orders.all().length;
    document.getElementById('ucCoupons').textContent = S.Coupon.all().length;
    document.getElementById('ucPoints').textContent = S.num(u.points);

    const h = (location.hash || '').replace('#', '');
    if (h) tab = h;

    document.querySelectorAll('.side-nav a').forEach((a) => {
      a.onclick = () => {
        tab = a.dataset.tab;
        document.querySelectorAll('.side-nav a').forEach((x) => x.classList.remove('active'));
        a.classList.add('active');
        render();
      };
    });
    render();
  }

  function render() {
    const box = document.getElementById('profileMain');
    box.innerHTML = ({ overview, profile, footprint, fav, address, coupon, aisetting })[tab]();
    if (tab === 'address') bindAddress();
    if (tab === 'aisetting') bindAi();
  }

  /* ------------------------------ 概览 ------------------------------ */
  function overview() {
    const orders = S.Orders.all();
    const count = (st) => orders.filter((o) => o.status === st).length;
    const spent = orders
      .filter((o) => ['PAID', 'SHIPPING', 'SHIPPED', 'COMPLETED'].indexOf(o.status) >= 0)
      .reduce((a, o) => a + o.payAmount, 0);
    const u = S.User.get();
    return `
      <div class="stat-grid mb16">
        <div class="stat-card"><b>${count('PENDING_PAY')}</b><span>待支付</span></div>
        <div class="stat-card"><b>${count('SHIPPING') + count('SHIPPED')}</b><span>待收货</span></div>
        <div class="stat-card"><b>${count('COMPLETED')}</b><span>已完成</span></div>
        <div class="stat-card"><b>${S.money(spent)}</b><span>累计消费</span></div>
      </div>
      <div class="card card-pad mb16">
        <div class="block-title">🧾 最近订单</div>
        ${orders
          .slice(0, 3)
          .map((o) => {
            const st = S.Orders.statusOf(o);
            return `<div class="row between center wrap" style="padding:10px 0;border-bottom:1px dashed var(--line-2)">
              <div style="min-width:0">
                <div class="mono small">${o.orderNo}</div>
                <div class="small text-2 clamp2">${esc(o.items[0].title)}${o.items.length > 1 ? ' 等 ' + o.items.length + ' 件' : ''}</div>
              </div>
              <div class="row center gap12">
                <span class="tag ${st.tone === 'success' ? 'tag-success' : st.tone === 'warning' ? 'tag-warning' : 'tag-brand'}">${st.label}</span>
                <span class="price">${S.money(o.payAmount)}</span>
                <a class="btn btn-sm" href="order-detail.html?no=${o.orderNo}">详情</a>
              </div>
            </div>`;
          })
          .join('')}
        <a class="btn btn-sm btn-block mt12" href="orders.html">查看全部订单</a>
      </div>
      <div class="card card-pad">
        <div class="block-title">👤 账户信息</div>
        <table class="param-table">
          <tr><td>昵称</td><td>${esc(u.nickname)}</td></tr>
          <tr><td>手机号</td><td>${esc(u.mobile)}</td></tr>
          <tr><td>会员等级</td><td>${esc(u.memberName)}（Lv.${u.memberLevel}）</td></tr>
          <tr><td>积分</td><td>${S.num(u.points)} 分（结算时可抵扣，100 积分 = 1 元）</td></tr>
          <tr><td>账户余额</td><td>${S.money(u.balance)}</td></tr>
          <tr><td>注册时间</td><td>${u.createdAt}</td></tr>
        </table>
      </div>`;
  }

  /* ---------------------------- AI 画像 ---------------------------- */
  function profile() {
    const { profile, coldStart } = S.Track.profile();
    const behaviors = S.Track.all();
    const byType = {};
    behaviors.forEach((b) => (byType[b.type] = (byType[b.type] || 0) + 1));
    const maxScore = Math.max(1, ...profile.preferCategories.map((c) => c.score));
    return `
      <div class="card card-pad mb16">
        <div class="block-title">🧠 我的 AI 画像
          <button class="btn btn-sm btn-ghost" style="margin-left:auto" onclick="AIECP.Pages.user.clearBehavior()">清空行为数据</button>
        </div>
        <p class="small text-3 mb12">画像由浏览 / 加购 / 成交埋点回流构建（FR-17），用于智能选品的多路召回与精排打分。
          行为数据不足时会触发冷启动兜底策略。</p>
        ${
          coldStart
            ? `<div class="degrade-note"><span>⚠</span><div>当前处于<b>冷启动</b>状态：行为数据不足（${behaviors.length} 条），
              智能选品已降级为<b>热门榜兜底</b>。浏览几件商品后推荐会更精准。</div></div>`
            : ''
        }
        <div class="mt16">
          <div class="small text-3 mb8">偏好品类（按加权得分）</div>
          ${
            profile.preferCategories.length
              ? profile.preferCategories
                  .map((c) => {
                    const cat = S.Cat.get(c.code);
                    const name = cat ? cat.pathName.slice(-1)[0] : c.code;
                    const w = Math.round((c.score / maxScore) * 100);
                    return `<div class="row center gap12" style="padding:6px 0">
                      <span style="width:96px" class="small">${esc(name)}</span>
                      <div style="flex:1;height:10px;background:var(--bg-2);border-radius:999px;overflow:hidden">
                        <div style="width:${w}%;height:100%;background:var(--ai-grad)"></div></div>
                      <span class="small text-3" style="width:80px;text-align:right">得分 ${c.score}</span>
                    </div>`;
                  })
                  .join('')
              : '<div class="small text-3">暂无偏好数据</div>'
          }
        </div>
        <div class="row gap16 wrap mt16">
          <div class="card card-pad" style="flex:1;box-shadow:none;border:1px solid var(--line)">
            <div class="small text-3">活跃度</div><div style="font-size:20px;color:var(--ai)">${profile.activityScore.toFixed(1)}</div>
          </div>
          <div class="card card-pad" style="flex:1;box-shadow:none;border:1px solid var(--line)">
            <div class="small text-3">价格带</div>
            <div style="font-size:20px;color:var(--brand)">${
              profile.priceBand ? `${profile.priceBand.low} - ${profile.priceBand.high}` : '未形成'
            }</div>
          </div>
          <div class="card card-pad" style="flex:1;box-shadow:none;border:1px solid var(--line)">
            <div class="small text-3">行为条数</div><div style="font-size:20px">${behaviors.length}</div>
          </div>
        </div>
        <div class="mt16">
          <div class="small text-3 mb8">埋点分布（FR-20：曝光 / 点击 / 加购 / 成交）</div>
          <div class="row gap8 wrap">
            <span class="pill">浏览 ${byType.view || 0}</span>
            <span class="pill">加购 ${byType.cart || 0}</span>
            <span class="pill">成交 ${byType.purchase || 0}</span>
            <span class="pill">搜索 ${byType.search || 0}</span>
          </div>
        </div>
      </div>`;
  }

  /* ---------------------------- 浏览足迹 ---------------------------- */
  function footprint() {
    const list = S.Track.history(20);
    if (!list.length) return empty('还没有浏览记录', '去看看商品，AI 会据此生成推荐');
    return `<div class="card card-pad">
      <div class="block-title">👣 浏览足迹（${list.length}）</div>
      ${list
        .map((b) => {
          const p = S.Product.get(b.productId);
          if (!p) return '';
          return `<a class="hist-item" href="product.html?id=${p.id}">
            <img src="${p.images[0]}" alt="">
            <div style="flex:1;min-width:0">
              <div class="clamp2" style="font-size:13px">${esc(p.title)}</div>
              <div class="small text-3">${new Date(b.ts).toLocaleString('zh-CN')}</div>
            </div>
            <div class="price">${S.money(p.salePrice)}</div>
            <button class="btn btn-sm btn-primary" onclick="event.preventDefault();AIECP.UI.addToCart('${p.id}')">加购</button>
          </a>`;
        })
        .join('')}
    </div>`;
  }

  /* ------------------------------ 收藏 ------------------------------ */
  function fav() {
    const ids = S.User.favorites();
    if (!ids.length) return empty('收藏夹是空的', '在商品详情页点击「收藏」即可加入');
    return `<div class="card card-pad">
      <div class="block-title">❤️ 我的收藏（${ids.length}）</div>
      <div class="product-grid" style="grid-template-columns:repeat(3,1fr)">
        ${ids.map((id) => S.Product.get(id)).filter(Boolean).map((p) => UI.productCard(p)).join('')}
      </div>
    </div>`;
  }

  /* ------------------------------ 地址 ------------------------------ */
  function address() {
    const list = S.User.addresses();
    return `<div class="card card-pad">
      <div class="block-title">📍 地址管理
        <button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="AIECP.Pages.user.toggleAddrForm()">+ 新增地址</button>
      </div>
      <div class="card hide mb16" id="uAddrForm" style="box-shadow:none;border:1px solid var(--line)">
        <div class="card-pad">
          <div class="form-grid">
            <div class="field"><label>收货人</label><input id="ufName"></div>
            <div class="field"><label>手机号</label><input id="ufMobile"></div>
          </div>
          <div class="field"><label>所在地区</label><input id="ufRegion"></div>
          <div class="field"><label>详细地址</label><input id="ufDetail"></div>
          <div class="row gap8"><button class="btn btn-primary btn-sm" onclick="AIECP.Pages.user.saveAddr()">保存</button>
            <button class="btn btn-sm" onclick="AIECP.Pages.user.toggleAddrForm()">取消</button></div>
        </div>
      </div>
      ${list
        .map(
          (a) => `<div class="row between center wrap" style="padding:12px 0;border-bottom:1px dashed var(--line-2)">
          <div>
            <div><b>${esc(a.name)}</b> <span class="text-3 small">${esc(a.mobile)}</span>
              <span class="tag tag-brand">${esc(a.tag || '地址')}</span>
              ${a.isDefault ? '<span class="tag tag-success">默认</span>' : ''}</div>
            <div class="small text-2 mt8">${esc(a.region)} ${esc(a.detail)}</div>
          </div>
          <div class="row gap8">
            ${a.isDefault ? '' : `<button class="btn btn-sm" data-default="${a.id}">设为默认</button>`}
            <button class="btn btn-sm" data-deladdr="${a.id}">删除</button>
          </div>
        </div>`
        )
        .join('')}
    </div>`;
  }

  function bindAddress() {
    document.querySelectorAll('[data-default]').forEach((b) => {
      b.onclick = () => {
        const list = S.User.addresses().map((a) => Object.assign(a, { isDefault: a.id === b.dataset.default }));
        S.User.saveAddresses(list);
        UI.toast('已设为默认地址', 'success');
        render();
      };
    });
    document.querySelectorAll('[data-deladdr]').forEach((b) => {
      b.onclick = () => {
        S.User.saveAddresses(S.User.addresses().filter((a) => a.id !== b.dataset.deladdr));
        UI.toast('地址已删除', 'success');
        render();
      };
    });
  }

  /* ----------------------------- 优惠券 ----------------------------- */
  function coupon() {
    const list = S.Coupon.all();
    if (!list.length) return empty('暂无可用优惠券', '参与平台活动可获得更多优惠券');
    return `<div class="card card-pad">
      <div class="block-title">🎟️ 我的优惠券（${list.length}）</div>
      <div class="coupon-list">
        ${list
          .map(
            (c) => `<div class="coupon-item">
          <div class="ci-amount"><b>${c.type === 'discount' ? (c.value * 10).toFixed(1) + ' 折' : '¥' + c.value}</b></div>
          <div class="ci-info">${esc(c.name)}　<span class="tag tag-muted">${esc(c.scope)}</span>
            <div class="cii-sub">${esc(c.desc)} · 有效期至 ${c.expire}</div></div>
        </div>`
          )
          .join('')}
      </div>
    </div>`;
  }

  /* --------------------------- AI 能力设置 --------------------------- */
  function aisetting() {
    const down = NS.AI.Health.isDown();
    return `<div class="card card-pad mb16">
      <div class="block-title">⚙️ AI 能力与降级策略</div>
      <p class="small text-3 mb12">三项 AI 能力内建于能力中台，共享大模型网关、向量检索、提示词管理与安全护栏。
        下方开关用于演示 NFR-07 的降级契约：大模型不可用时，AI 能力回落规则策略，且不影响交易主流程。</p>
      <div class="row between center wrap card card-pad" style="box-shadow:none;border:1px solid var(--line)">
        <div>
          <div><b>模拟大模型服务故障</b></div>
          <div class="small text-3">开启后：智能客服降级为知识库精确匹配 + 常见问题列表；智能选品降级为热门榜；智能组货降级为同品类单品推荐</div>
        </div>
        <button class="btn ${down ? 'btn-danger' : 'btn-primary'}" id="downBtn">${down ? '恢复服务' : '模拟故障'}</button>
      </div>
      <div class="mt16">
        <div class="block-title">降级契约（NFR-06 / NFR-07）</div>
        <table class="param-table">
          <tr><td>智能客服</td><td>降级为知识库精确匹配 + 常见问题列表，置信度不足时建议转人工</td></tr>
          <tr><td>智能选品</td><td>降级为热门榜（冷启动亦走此路径）</td></tr>
          <tr><td>智能组货</td><td>降级为同品类单品推荐，不输出毛利不达标的组合（BR-12）</td></tr>
          <tr><td>交易链路</td><td>完全不受影响，AI 异常绝不阻断下单与支付</td></tr>
        </table>
      </div>
    </div>
    <div class="card card-pad">
      <div class="block-title">📚 知识库片段（智能客服 RAG 检索源）</div>
      <table class="param-table">
        ${NS.DATA.KNOWLEDGE.map(
          (k) => `<tr><td>${esc(k.topic)}</td><td>${esc(k.content)}<div class="small text-3 mt8">关键词：${esc(k.keywords.join(' / '))}</div></td></tr>`
        ).join('')}
      </table>
    </div>`;
  }

  function bindAi() {
    const b = document.getElementById('downBtn');
    if (!b) return;
    b.onclick = () => {
      NS.AI.Health.set(!NS.AI.Health.isDown());
      UI.toast(NS.AI.Health.isDown() ? '已模拟大模型不可用' : '大模型服务已恢复', NS.AI.Health.isDown() ? 'error' : 'success');
      render();
    };
  }

  function empty(title, sub) {
    return `<div class="card"><div class="empty">
      <div class="empty-icon">📭</div><div class="empty-title">${esc(title)}</div>
      <div class="small">${esc(sub)}</div>
      <a class="btn btn-primary mt16" href="products.html">去逛逛</a></div></div>`;
  }

  P.user = {
    render,
    clearBehavior() {
      if (!confirm('清空行为埋点后画像将回到冷启动状态，确定继续？')) return;
      S.Track.clear();
      UI.toast('行为数据已清空，画像回到冷启动', 'success');
      render();
    },
    toggleAddrForm() {
      document.getElementById('uAddrForm').classList.toggle('hide');
    },
    saveAddr() {
      const name = document.getElementById('ufName').value.trim();
      const mobile = document.getElementById('ufMobile').value.trim();
      const region = document.getElementById('ufRegion').value.trim();
      const detail = document.getElementById('ufDetail').value.trim();
      if (!name || !mobile || !region || !detail) return UI.toast('请填写完整地址', 'error');
      const list = S.User.addresses();
      list.push({ id: 'A' + Date.now().toString().slice(-6), name, mobile, region, detail, tag: '自定义', isDefault: false });
      S.User.saveAddresses(list);
      UI.toast('地址已保存', 'success');
      render();
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})(window.AIECP = window.AIECP || {});
