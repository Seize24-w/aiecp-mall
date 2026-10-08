/* =====================================================================
 * 首页 —— 智能选品推荐位 / 品类导航 / 智能组货场景位 / 热销与新品
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const AI = NS.AI;
  const P = (NS.Pages = NS.Pages || {});

  let selectionOffset = 0;
  let sceneIndex = 0;

  /* --------------------------- 运营 Banner --------------------------- */
  function renderBanners() {
    const el = document.getElementById('banners');
    el.innerHTML = NS.DATA.BANNERS.map(
      (b) => `<a class="hero-card t-${b.theme}" href="${b.link}">
        <span class="hc-tag">${UI.esc(b.tag)}</span>
        <b>${UI.esc(b.title)}</b>
        <span>${UI.esc(b.sub)}</span>
      </a>`
    ).join('');
  }

  /* ------------------------ AI 能力状态提示条 ------------------------ */
  function renderAiStatus() {
    const down = AI.Health.isDown();
    const { profile, coldStart } = S.Track.profile();
    const t = document.getElementById('aiStatusText');
    t.innerHTML = down
      ? '<span class="text-warning">⚠ 大模型服务不可用，智能客服 / 选品 / 组货已按降级契约回落规则策略（交易链路不受影响）</span>'
      : '<span class="text-success">● 正常</span> · 智能客服在线 · 智能选品已加载画像 · 智能组货可执行可行性校验';
    document.getElementById('profileText').textContent = coldStart
      ? '画像：冷启动中（浏览几件商品后推荐会更准）'
      : `画像：偏好 ${(profile.preferCategories[0] && S.Cat.get(profile.preferCategories[0].code) || {}).name || '综合'} · 活跃度 ${profile.activityScore.toFixed(1)}`;
  }

  /* ---------------------------- 品类导航 ---------------------------- */
  function renderCategories() {
    const tree = S.Cat.tree();
    const html = tree.roots
      .map((r) => {
        const leaves = S.Cat.leaves(r.code);
        const count = S.Product.byCategory(leaves).length;
        const subs = r.children.map((c) => `<span class="tag tag-muted">${UI.esc(c.name)}</span>`).join('');
        return `
        <div class="p-card" style="padding:16px">
          <a href="products.html?cat=${r.code}" class="row between center">
            <div class="row center gap8">
              <span style="font-size:26px">${r.icon}</span>
              <b style="font-size:15px">${UI.esc(r.name)}</b>
            </div>
            <span class="text-3 small">${count} 件 →</span>
          </a>
          <div class="row gap4 wrap" style="margin-top:10px">${subs}</div>
        </div>`;
      })
      .join('');
    document.getElementById('catGrid').innerHTML = html;
  }

  /* --------------------------- 智能选品位 --------------------------- */
  function renderSelection() {
    const res = AI.Selection.recommend({ scene: 'HOME', limit: 8, exclude: [] });
    // 换一批：轮换起始位置，模拟不同实验分桶
    const items = res.items.slice(selectionOffset % 4).concat(res.items.slice(0, selectionOffset % 4));
    document.getElementById('selectionGrid').innerHTML = items
      .map((it) => UI.productCard(it.product, { reason: it.reason, recallSource: it.recallSource, score: it.score }))
      .join('');

    const sub = document.getElementById('selectionSub');
    const meta = [];
    meta.push(`策略 ${res.strategyCode}`);
    if (res.experimentTag) meta.push(`实验分桶 ${res.experimentTag}`);
    meta.push(`traceId ${res.traceId}`);
    sub.innerHTML =
      `多路召回 + 精排打分 + 多样性重排（同品类占比 ≤ 50%）　<span class="text-3">${meta.join(' · ')}</span>` +
      (res.degraded ? `<br><span class="text-warning">⚠ 降级：${UI.esc(res.degradeReason)}</span>` : '');
  }

  function refreshSelection() {
    selectionOffset++;
    // 轮换"看过的"商品，让埋点影响画像，形成推荐闭环
    const first = AI.Selection.recommend({ scene: 'HOME', limit: 1 }).items[0];
    if (first) {
      S.Track.log('view', { productId: first.productId, category: first.product.category, price: first.product.salePrice });
    }
    renderSelection();
    renderAiStatus();
    UI.toast('已刷新推荐结果（埋点已回流画像）', 'ai');
  }

  /* --------------------------- 智能组货位 --------------------------- */
  function renderBundle() {
    const scenes = Object.keys(NS.DATA.BUNDLE_SCENES);
    const code = scenes[sceneIndex % scenes.length];
    const rule = NS.DATA.BUNDLE_SCENES[code];
    // 在该场景下按销量取主商品，并优先选择能产出可行组合方案的那个
    // （无法产出方案的商品说明其组合毛利率不满足 BR-12，此时会走降级展示）
    const pool = S.Product.all().filter((p) => p.scene === code).sort((a, b) => b.sales - a.sales);
    let main = pool[0];
    let res = main ? AI.Bundle.compose(main.id, { limit: 2 }) : null;
    for (let i = 1; res && res.degraded && i < pool.length; i++) {
      main = pool[i];
      res = AI.Bundle.compose(main.id, { limit: 2 });
    }

    document.getElementById('bundleSceneName').textContent = `${rule.icon} ${rule.name}`;

    if (!main) {
      document.getElementById('bundleBody').innerHTML = '<div class="empty">该场景暂无主商品</div>';
      return;
    }

    document.getElementById('bundleSceneSub').textContent =
      `主商品：${main.title}　场景识别 → 配套召回 → 可行性校验 → 组合定价`;
    document.getElementById('bundleTrace').textContent = `traceId ${res.traceId} · ${res.strategyCode || 'BUNDLE_DEGRADE'}`;

    const body = document.getElementById('bundleBody');
    if (res.degraded) {
      body.innerHTML =
        `<div class="degrade-note"><span>⚠</span><div><b>方案未输出，已降级</b><br>${UI.esc(res.degradeReason)}。` +
        `根据 BR-12，组合毛利率不得低于主商品单品毛利率，因此宁可不输出组合，也不输出「看似合理但不可售」的方案。</div></div>` +
        `<div class="product-grid mt16">${(res.fallbackProducts || []).map((p) => UI.productCard(p)).join('')}</div>`;
      return;
    }

    body.innerHTML = res.bundles.map((b) => UI.bundleCard(b, false)).join('');
    UI.bindBundle(body, res.bundles, false);
  }

  function switchScene() {
    sceneIndex++;
    renderBundle();
  }

  /* ---------------------------- 榜单渲染 ---------------------------- */
  function renderLists() {
    document.getElementById('hotGrid').innerHTML = S.Product.hot(8).map((p) => UI.productCard(p)).join('');
    document.getElementById('newGrid').innerHTML = S.Product.newest(8).map((p) => UI.productCard(p)).join('');
  }

  P.home = { renderSelection, refreshSelection, renderBundle, switchScene };

  document.addEventListener('DOMContentLoaded', () => {
    renderBanners();
    renderAiStatus();
    renderSelection();
    renderCategories();
    renderBundle();
    renderLists();
  });
})(window.AIECP = window.AIECP || {});
