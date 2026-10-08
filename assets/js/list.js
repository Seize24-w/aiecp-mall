/* =====================================================================
 * 商品分类与列表页 —— 品类树浏览 / 关键词检索 / 属性筛选 / 排序 / 分页
 * 筛选维度由所属品类的属性 Schema（filterable=true）动态生成（FR-01 / FR-10）
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const esc = UI.esc;
  const P = (NS.Pages = NS.Pages || {});

  const state = {
    cat: '',
    keyword: '',
    sort: 'default',
    page: 1,
    pageSize: 12,
    minPrice: null,
    maxPrice: null,
    inStock: false,
    filters: {}
  };

  /* ------------------------------ 参数读写 ------------------------------ */
  function readUrl() {
    const sp = new URLSearchParams(location.search);
    state.cat = sp.get('cat') || '';
    state.keyword = sp.get('keyword') || '';
    state.sort = sp.get('sort') || 'default';
    state.page = parseInt(sp.get('page') || '1', 10);
    state.minPrice = sp.get('min') != null && sp.get('min') !== '' ? Number(sp.get('min')) : null;
    state.maxPrice = sp.get('max') != null && sp.get('max') !== '' ? Number(sp.get('max')) : null;
    state.inStock = sp.get('stock') === '1';
    state.filters = {};
    sp.forEach((v, k) => {
      if (k.indexOf('f_') === 0) state.filters[k.slice(2)] = v.split(',').filter(Boolean);
    });
  }

  function writeUrl() {
    const sp = new URLSearchParams();
    if (state.cat) sp.set('cat', state.cat);
    if (state.keyword) sp.set('keyword', state.keyword);
    if (state.sort && state.sort !== 'default') sp.set('sort', state.sort);
    if (state.page > 1) sp.set('page', String(state.page));
    if (state.minPrice != null) sp.set('min', String(state.minPrice));
    if (state.maxPrice != null) sp.set('max', String(state.maxPrice));
    if (state.inStock) sp.set('stock', '1');
    Object.keys(state.filters).forEach((k) => {
      if (state.filters[k] && state.filters[k].length) sp.set('f_' + k, state.filters[k].join(','));
    });
    const q = sp.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }

  /* ------------------------------ 面包屑 ------------------------------ */
  function renderCrumb() {
    const box = document.getElementById('crumbBox');
    const items = [{ text: '首页', href: 'index.html' }, { text: '全部商品', href: 'products.html' }];
    if (state.cat) {
      const names = S.Cat.breadcrumb(state.cat);
      const path = S.Cat.get(state.cat).path;
      names.forEach((n, i) =>
        items.push({ text: n, href: i < names.length - 1 ? 'products.html?cat=' + path[i] : null })
      );
    }
    if (state.keyword) items.push({ text: '搜索「' + state.keyword + '」' });
    box.innerHTML = UI.crumb(items);
  }

  /* ------------------------------ 品类树 ------------------------------ */
  function renderCatTree() {
    const tree = S.Cat.tree();
    const countOf = (code) => S.Product.byCategory(S.Cat.leaves(code)).length;
    let html = `<div class="cat-node ${!state.cat ? 'active' : ''}" data-cat="">
        <span>全部商品</span><span class="cn-count">${S.Product.all().length}</span></div>`;
    tree.roots.forEach((r) => {
      html += `<div class="cat-node ${state.cat === r.code ? 'active' : ''}" data-cat="${r.code}">
        <span>${r.icon} ${esc(r.name)}</span><span class="cn-count">${countOf(r.code)}</span></div>`;
      if (state.cat && state.cat.indexOf(r.code) === 0) {
        r.children.forEach((c) => {
          html += `<div class="cat-node child ${state.cat === c.code ? 'active' : ''}" data-cat="${c.code}">
            <span>${esc(c.name)}</span><span class="cn-count">${countOf(c.code)}</span></div>`;
          if (state.cat && state.cat.indexOf(c.code) === 0) {
            c.children.forEach((l) => {
              html += `<div class="cat-node leaf ${state.cat === l.code ? 'active' : ''}" data-cat="${l.code}">
                <span>${l.icon} ${esc(l.name)}</span><span class="cn-count">${countOf(l.code)}</span></div>`;
            });
          }
        });
      }
    });
    const el = document.getElementById('catTree');
    el.innerHTML = html;
    el.querySelectorAll('.cat-node').forEach((n) => {
      n.onclick = () => {
        state.cat = n.dataset.cat;
        state.page = 1;
        state.filters = {};
        apply();
      };
    });
  }

  /* --------------------- 筛选栏（由属性 Schema 驱动） --------------------- */
  function renderFilters() {
    const bar = document.getElementById('filterBar');
    const rows = [];

    // 价格区间（通用维度）
    rows.push(`
      <div class="filter-row">
        <div class="filter-label">价格</div>
        <div class="filter-values">
          <div class="price-range">
            <input type="number" id="minPrice" placeholder="最低" value="${state.minPrice == null ? '' : state.minPrice}">
            <span class="text-3">—</span>
            <input type="number" id="maxPrice" placeholder="最高" value="${state.maxPrice == null ? '' : state.maxPrice}">
            <button class="btn btn-sm btn-primary" onclick="AIECP.Pages.list.applyPrice()">确定</button>
          </div>
          <div class="row gap8" style="margin-left:8px">
            ${[['', ''], ['0', '500'], ['500', '1500'], ['1500', '3000'], ['3000', '']]
              .map(
                ([a, b]) =>
                  `<span class="fv ${String(state.minPrice || '') === a && String(state.maxPrice || '') === b ? 'active' : ''}"
                     onclick="AIECP.Pages.list.setPrice('${a}','${b}')">${
                    !a && !b ? '全部' : !b ? a + ' 以上' : !a ? '到 ' + b : a + ' - ' + b
                  }</span>`
              )
              .join('')}
          </div>
        </div>
      </div>`);

    // 由品类属性 Schema 动态生成的筛选维度
    if (state.cat) {
      const defs = S.Cat.filters(state.cat);
      defs.forEach((a) => {
        const options = a.options || enumValuesOf(a.code);
        if (!options.length) return;
        const chosen = state.filters[a.code] || [];
        rows.push(`
          <div class="filter-row">
            <div class="filter-label">${esc(a.name)}</div>
            <div class="filter-values">
              <span class="fv ${chosen.length ? '' : 'active'}" data-attr="${a.code}" data-val="">全部</span>
              ${options
                .map(
                  (o) =>
                    `<span class="fv ${chosen.indexOf(String(o)) >= 0 ? 'active' : ''}" data-attr="${a.code}" data-val="${esc(o)}">${esc(o)}</span>`
                )
                .join('')}
            </div>
          </div>`);
      });
    }
    // 评分
    rows.push(`
      <div class="filter-row">
        <div class="filter-label">评分</div>
        <div class="filter-values">
          <span class="fv ${!state.filters._rating ? 'active' : ''}" data-rating="">全部</span>
          ${['4.8', '4.6']
            .map(
              (r) =>
                `<span class="fv ${state.filters._rating && state.filters._rating[0] === r ? 'active' : ''}" data-rating="${r}">${r} 分以上</span>`
            )
            .join('')}
        </div>
      </div>`);

    bar.innerHTML = rows.join('');
    bar.querySelectorAll('.fv[data-attr]').forEach((el) => {
      el.onclick = () => {
        const code = el.dataset.attr;
        const val = el.dataset.val;
        if (!val) delete state.filters[code];
        else {
          const cur = state.filters[code] || [];
          const i = cur.indexOf(val);
          if (i >= 0) cur.splice(i, 1);
          else cur.push(val);
          if (cur.length) state.filters[code] = cur;
          else delete state.filters[code];
        }
        state.page = 1;
        apply();
      };
    });
    bar.querySelectorAll('.fv[data-rating]').forEach((el) => {
      el.onclick = () => {
        if (el.dataset.rating) state.filters._rating = [el.dataset.rating];
        else delete state.filters._rating;
        state.page = 1;
        apply();
      };
    });
    const cbx = document.getElementById('inStockOnly');
    if (cbx) {
      cbx.checked = state.inStock;
      cbx.onchange = () => {
        state.inStock = cbx.checked;
        state.page = 1;
        apply();
      };
    }
  }

  /** 枚举型属性：从实际商品取值中聚合出可选项（模拟检索索引的 facet 统计） */
  function enumValuesOf(code) {
    const pool = state.cat
      ? S.Product.byCategory(S.Cat.descendants(state.cat))
      : S.Product.all();
    const set = {};
    pool.forEach((p) => {
      const v = p.attrs[code];
      if (v === true || v === false) {
        set['支持'] = 1;
        set['不支持'] = 1;
      } else if (v != null && v !== '') set[String(v)] = 1;
    });
    return Object.keys(set).sort();
  }

  /* ------------------------------ 已选条件 ------------------------------ */
  function renderChosen() {
    const box = document.getElementById('chosenBox');
    const chips = [];
    if (state.cat) chips.push({ text: S.Cat.get(state.cat).name, clear: 'cat' });
    if (state.keyword) chips.push({ text: '搜索：' + state.keyword, clear: 'keyword' });
    Object.keys(state.filters).forEach((c) => {
      (state.filters[c] || []).forEach((v) => chips.push({ text: v, clear: 'f:' + c + ':' + v }));
    });
    if (state.minPrice != null || state.maxPrice != null)
      chips.push({ text: `${state.minPrice || 0} - ${state.maxPrice || '∞'}`, clear: 'price' });
    box.innerHTML = chips.length
      ? chips
          .map(
            (c) =>
              `<span class="pill clickable" data-clear="${esc(c.clear)}">${esc(c.text)} ×</span>`
          )
          .join('')
      : '<span class="small text-3">未选择筛选条件</span>';
    box.querySelectorAll('[data-clear]').forEach((el) => {
      el.onclick = () => {
        const v = el.dataset.clear;
        if (v === 'cat') state.cat = '';
        else if (v === 'keyword') state.keyword = '';
        else if (v === 'price') {
          state.minPrice = null;
          state.maxPrice = null;
        } else if (v.indexOf('f:') === 0) {
          const [, code, val] = v.split(':');
          const arr = (state.filters[code] || []).filter((x) => x !== val);
          if (arr.length) state.filters[code] = arr;
          else delete state.filters[code];
        }
        state.page = 1;
        apply();
      };
    });
  }

  /* ------------------------------ 排序栏 ------------------------------ */
  function renderSort() {
    document.querySelectorAll('.sort-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.sort === state.sort);
      el.onclick = () => {
        state.sort = el.dataset.sort;
        state.page = 1;
        apply();
      };
    });
  }

  /* ------------------------------ 列表 ------------------------------ */
  function renderList() {
    const q = {
      cat: state.cat,
      keyword: state.keyword,
      filters: Object.assign({}, state.filters),
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      inStock: state.inStock,
      sort: state.sort,
      page: state.page,
      pageSize: state.pageSize
    };
    delete q.filters._rating;
    if (state.filters._rating) q.minRating = Number(state.filters._rating[0]);

    const res = S.Product.search(q);
    document.getElementById('totalText').innerHTML =
      `共 <b>${res.total}</b> 件商品　第 ${res.page} / ${res.pages} 页`;

    const grid = document.getElementById('productGrid');
    if (!res.list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">没有找到符合条件的商品</div>
        <div class="small">试试减少筛选条件，或换个关键词</div>
        <button class="btn btn-sm mt16" onclick="AIECP.Pages.list.resetAll()">清空条件</button>
      </div>`;
    } else {
      grid.innerHTML = res.list.map((p) => UI.productCard(p)).join('');
    }

    // 分页
    const pager = document.getElementById('pager');
    let ph = `<button ${res.page <= 1 ? 'disabled' : ''} data-page="${res.page - 1}">上一页</button>`;
    const maxBtn = 7;
    let start = Math.max(1, res.page - 3);
    let end = Math.min(res.pages, start + maxBtn - 1);
    start = Math.max(1, end - maxBtn + 1);
    for (let i = start; i <= end; i++) {
      ph += `<button class="${i === res.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    ph += `<button ${res.page >= res.pages ? 'disabled' : ''} data-page="${res.page + 1}">下一页</button>`;
    pager.innerHTML = ph;
    pager.querySelectorAll('button[data-page]').forEach((b) => {
      b.onclick = () => {
        state.page = Number(b.dataset.page);
        apply();
        window.scrollTo({ top: 160, behavior: 'smooth' });
      };
    });
  }

  /* --------------------------- AI 选品位 --------------------------- */
  function renderAiRec() {
    const panel = document.getElementById('aiRecPanel');
    const show = !!state.keyword || location.search.indexOf('scene=ai') >= 0;
    panel.classList.toggle('hide', !show);
    if (!show) return;
    const res = NS.AI.Selection.recommend({ scene: 'LIST', limit: 5 });
    document.getElementById('aiRecGrid').innerHTML = res.items
      .map((it) => UI.productCard(it.product, { reason: it.reason, recallSource: it.recallSource }))
      .join('');
    document.getElementById('aiRecSub').textContent = res.degraded
      ? '降级：' + res.degradeReason
      : '画像构建 → 多路召回 → 精排打分 → 业务规则过滤 → 多样性重排';
    document.getElementById('aiRecTrace').textContent = `traceId ${res.traceId} · ${res.strategyCode}`;
  }

  /* ------------------------------ 应用 ------------------------------ */
  function apply() {
    writeUrl();
    renderCrumb();
    renderCatTree();
    renderFilters();
    renderChosen();
    renderSort();
    renderList();
    renderAiRec();
  }

  P.list = {
    apply,
    applyPrice() {
      const a = document.getElementById('minPrice').value;
      const b = document.getElementById('maxPrice').value;
      state.minPrice = a === '' ? null : Number(a);
      state.maxPrice = b === '' ? null : Number(b);
      state.page = 1;
      apply();
    },
    setPrice(a, b) {
      state.minPrice = a === '' ? null : Number(a);
      state.maxPrice = b === '' ? null : Number(b);
      state.page = 1;
      apply();
    },
    resetAll() {
      state.cat = '';
      state.keyword = '';
      state.filters = {};
      state.minPrice = null;
      state.maxPrice = null;
      state.inStock = false;
      state.page = 1;
      state.sort = 'default';
      apply();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    readUrl();
    apply();
  });
})(window.AIECP = window.AIECP || {});
