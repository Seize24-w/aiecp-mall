/* =====================================================================
 * JSON 品类定义导入（商家端）—— 本系统最具特色的能力（FR-07 ~ FR-10）
 * 实现规范 v1.0 的 12 条校验规则：全量校验、一次反馈；dry-run 与提交分离。
 * 校验通过后生成：品类树 / 属性 Schema / 动态商品发布表单 / 检索索引映射。
 * ===================================================================== */
(function (NS) {
  'use strict';

  const S = NS.S;
  const UI = NS.UI;
  const esc = UI.esc;
  const P = (NS.Pages = NS.Pages || {});

  const DATA_TYPES = ['string', 'integer', 'decimal', 'boolean', 'enum', 'multiEnum', 'date', 'text', 'image'];
  const NUMERIC = ['integer', 'decimal'];
  const CODE_RE = /^[A-Z][A-Z0-9_]{1,63}$/;
  const SUPPORTED_VERSIONS = ['1.0'];
  const MAX_NODES = 2000;
  const MAX_ATTRS = 20000;
  const MAX_BYTES = 2 * 1024 * 1024;

  let lastValid = null; // 最近一次通过校验的解析结果

  /* ------------------------------ 示例模板 ------------------------------ */
  const SAMPLES = {
    appliance: NS.DATA.CATEGORY_JSON,
    custom: {
      schemaVersion: '1.0',
      category: {
        code: 'OUTDOOR_CAMPING',
        name: '户外露营',
        sort: 40,
        icon: '⛺',
        attributes: [
          { code: 'brand', name: '品牌', dataType: 'string', required: true, filterable: true, searchable: true },
          { code: 'waterproof', name: '防水等级', dataType: 'enum', options: ['IPX3', 'IPX4', 'IPX6', 'IPX8'], required: true, filterable: true }
        ],
        children: [
          {
            code: 'OUTDOOR_CAMPING_TENT',
            name: '帐篷',
            sort: 10,
            attributes: [
              { code: 'capacity', name: '容纳人数', dataType: 'integer', unit: '人', range: [1, 12], required: true, filterable: true },
              { code: 'season', name: '适用季节', dataType: 'multiEnum', options: ['春季', '夏季', '秋季', '冬季'], filterable: true },
              { code: 'weightKg', name: '重量', dataType: 'decimal', unit: 'kg', range: [0.5, 30], filterable: true }
            ]
          },
          {
            code: 'OUTDOOR_CAMPING_LIGHT',
            name: '营地灯',
            sort: 20,
            attributes: [
              { code: 'brightness', name: '亮度', dataType: 'integer', unit: '流明', range: [50, 5000], filterable: true },
              { code: 'rechargeable', name: '可充电', dataType: 'boolean', filterable: true },
              { code: 'releaseDate', name: '上市日期', dataType: 'date', required: false }
            ]
          }
        ]
      }
    },
    bad: {
      schemaVersion: '0.9',
      category: {
        code: 'bad-code',
        name: '示例反例',
        attributes: [
          { code: 'brand', name: '品牌', dataType: 'string' },
          { code: 'brand', name: '品牌重复', dataType: 'string' },
          { code: 'level', name: '等级', dataType: 'enumeration', options: [] },
          { code: 'size', name: '尺寸', dataType: 'integer', range: [10, 5] }
        ],
        children: [
          { code: 'bad-code', name: '编码重复', children: [] },
          { code: 'BAD_CHILD_2', name: '', attributes: [{ code: 'x', name: 'X', dataType: 'string' }] }
        ]
      }
    }
  };

  /* ------------------------------ 编辑器操作 ------------------------------ */
  function setJson(obj) {
    document.getElementById('jsonEditor').value = JSON.stringify(obj, null, 2);
    document.getElementById('editorStatus').textContent = '未校验';
    document.getElementById('commitBtn').disabled = true;
  }
  function loadSample(k) {
    setJson(SAMPLES[k]);
    UI.toast('已加载示例：' + (k === 'bad' ? '含多处错误的反例' : '品类定义 JSON'), 'success');
    validate();
  }
  function clearJson() {
    document.getElementById('jsonEditor').value = '';
    document.getElementById('editorStatus').textContent = '未校验';
    document.getElementById('commitBtn').disabled = true;
    document.getElementById('resultPane').innerHTML = emptyPane();
  }
  function formatJson() {
    const t = document.getElementById('jsonEditor');
    try {
      t.value = JSON.stringify(JSON.parse(t.value), null, 2);
      UI.toast('已格式化', 'success');
    } catch (e) {
      UI.toast('格式化失败：JSON 语法不合法', 'error');
    }
  }

  /* --------------------------- 工具：定位行号列号 --------------------------- */
  function posToLineCol(text, pos) {
    const before = text.slice(0, pos);
    const line = before.split('\n').length;
    const col = pos - before.lastIndexOf('\n');
    return { line, column: col };
  }
  function parsePos(msg) {
    const m = msg.match(/position\s+(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  /* ============================== 校验器 ==============================
   * 全量校验：收集全部错误后统一返回（errors + warnings）
   * ==================================================================== */
  function validateJson(text) {
    const errors = [];
    const warnings = [];
    const push = (rule, path, detail) => errors.push({ rule, path, detail });
    const warn = (rule, path, detail) => warnings.push({ rule, path, detail });

    // ---- V-01：JSON 语法 ----
    let doc;
    try {
      doc = JSON.parse(text);
    } catch (e) {
      const pos = parsePos(e.message);
      const lc = pos != null ? posToLineCol(text, pos) : { line: 1, column: 1 };
      return {
        ok: false,
        stage: 'syntax',
        syntaxError: { line: lc.line, column: lc.column, path: '（语法层）', detail: e.message },
        errors,
        warnings
      };
    }

    // ---- V-02：规范版本 ----
    if (doc.schemaVersion == null) push('V-02', 'schemaVersion', '缺少 schemaVersion 字段');
    else if (SUPPORTED_VERSIONS.indexOf(String(doc.schemaVersion)) < 0)
      push('V-02', 'schemaVersion', `不受支持的规范版本 ${doc.schemaVersion}，当前支持 ${SUPPORTED_VERSIONS.join(' / ')}`);

    // ---- V-11：结构完整性 ----
    if (!doc.category || typeof doc.category !== 'object') {
      push('V-11', 'category', 'category 必填且必须为对象');
      return { ok: false, stage: 'structure', errors, warnings };
    }
    if (!doc.category.code) push('V-11', 'category.code', '根节点 code 必填且非空');
    if (!doc.category.name) push('V-11', 'category.name', '根节点 name 必填且非空');

    // ---- V-12：容量约束 ----
    const bytes = new Blob([text]).size;
    if (bytes > MAX_BYTES) push('V-12', '（全文）', `JSON 文本 ${bytes} 字节，超过 2 MB 上限`);

    // ---- 遍历整棵树，收集全部可判定错误 ----
    const codeMap = {};        // code -> 路径，用于 V-03
    const nodes = [];
    let attrCount = 0;

    const walk = (node, path, depth, inheritedAttrs, stack) => {
      nodes.push({ node, path, depth });

      // V-04：编码格式
      if (!node.code) push('V-11', path + '.code', 'code 必填');
      else if (!CODE_RE.test(node.code))
        push('V-04', path + '.code', `编码「${node.code}」不匹配 ^[A-Z][A-Z0-9_]{1,63}$（建议大写下划线风格）`);

      // V-03：编码唯一性（整棵品类树）
      if (node.code) {
        if (codeMap[node.code]) push('V-03', path + '.code', `品类编码「${node.code}」重复，与 ${codeMap[node.code]} 冲突`);
        else codeMap[node.code] = path;
      }

      // V-05：层级深度
      if (depth > 5) push('V-05', path, `品类树层级深度 ${depth} 超过上限 5 层`);

      // V-10：循环引用（深度优先遍历时访问到已在栈中的编码即判失败）
      if (node.code && stack.indexOf(node.code) >= 0)
        push('V-10', path, `检测到循环引用：编码「${node.code}」在其自身的祖先路径中重复出现`);

      if (!node.name) push('V-11', path + '.name', 'name 必填且非空');

      // ---- 属性校验 ----
      const ownCodes = {};
      const attrs = node.attributes || [];
      attrs.forEach((a, i) => {
        attrCount++;
        const ap = `${path}.attributes[${i}]`;
        if (!a.code) push('V-11', ap + '.code', '属性编码必填');
        if (!a.name) push('V-11', ap + '.name', '属性名称必填');

        // V-06：同一品类内属性编码唯一
        if (a.code) {
          if (ownCodes[a.code]) push('V-06', ap + '.code', `同一品类内属性编码「${a.code}」重复`);
          else ownCodes[a.code] = 1;
          // 与继承属性冲突 → 视为覆盖意图，仅警告
          if (inheritedAttrs[a.code]) warn('V-06', ap + '.code', `属性「${a.code}」与继承自父品类的同名属性冲突，将按覆盖处理`);
        }

        // V-07：数据类型白名单
        if (!a.dataType) push('V-07', ap + '.dataType', 'dataType 必填');
        else if (DATA_TYPES.indexOf(a.dataType) < 0)
          push('V-07', ap + '.dataType', `数据类型「${a.dataType}」不在白名单内（${DATA_TYPES.join(' / ')}）`);

        // V-08：枚举完备性
        if ((a.dataType === 'enum' || a.dataType === 'multiEnum') && (!Array.isArray(a.options) || !a.options.length))
          push('V-08', ap + '.options', `${a.dataType} 类型必须提供非空 options`);

        // V-09：数值区间合法性
        if (NUMERIC.indexOf(a.dataType) >= 0 && a.range) {
          if (!Array.isArray(a.range) || a.range.length !== 2)
            push('V-09', ap + '.range', 'range 须为两元素数组 [min, max]');
          else if (Number(a.range[0]) > Number(a.range[1]))
            push('V-09', ap + '.range', `range 的 min(${a.range[0]}) 大于 max(${a.range[1]})`);
        }
        if (a.unit != null && typeof a.unit !== 'string') warn('V-06', ap + '.unit', 'unit 应为字符串');
      });

      // 容量
      if (nodes.length > MAX_NODES) push('V-12', path, `品类节点总数超过 ${MAX_NODES} 上限`);
      if (attrCount > MAX_ATTRS) push('V-12', path, `属性总数超过 ${MAX_ATTRS} 上限`);

      const nextInherited = Object.assign({}, inheritedAttrs);
      attrs.forEach((a) => a.code && (nextInherited[a.code] = node.code));

      (node.children || []).forEach((c, i) => walk(c, `${path}.children[${i}]`, depth + 1, nextInherited, stack.concat([node.code])));
    };

    walk(doc.category, 'category', 1, {}, []);

    const ok = !errors.length;
    return { ok, stage: ok ? 'ok' : 'structure', errors, warnings, doc, nodes, attrCount, bytes };
  }

  /* ============================ 衍生能力生成 ============================
   * 品类树构建 → 属性 Schema 抽取（含继承）→ 动态表单 → 索引映射
   * ==================================================================== */
  function buildTree(root) {
    const index = {};
    const walk = (node, parent, depth, inherited) => {
      const attrs = inherited.slice();
      (node.attributes || []).forEach((a) => {
        const i = attrs.findIndex((x) => x.code === a.code);
        if (i >= 0) attrs[i] = a;
        else attrs.push(a);
      });
      const item = {
        code: node.code,
        name: node.name,
        icon: node.icon || '📦',
        sort: node.sort || 0,
        depth,
        parent: parent ? parent.code : null,
        ownAttrs: node.attributes || [],
        attrs,
        children: [],
        isLeaf: !(node.children && node.children.length)
      };
      index[node.code] = item;
      if (parent) parent.children.push(item);
      (node.children || []).forEach((c) => walk(c, item, depth + 1, attrs));
      item.children.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      return item;
    };
    const rootItem = walk(root, null, 1, []);
    return { root: rootItem, index };
  }

  const formControl = (a) => {
    const req = a.required ? '<span class="text-danger">*</span>' : '';
    const hint = [];
    if (a.unit) hint.push('单位：' + a.unit);
    if (a.range) hint.push(`取值 ${a.range[0]} ~ ${a.range[1]}`);
    let ctrl = '';
    switch (a.dataType) {
      case 'string':
        ctrl = '<input type="text" placeholder="请输入">';
        break;
      case 'integer':
      case 'decimal':
        ctrl = `<input type="number" placeholder="${a.range ? a.range[0] + ' ~ ' + a.range[1] : '0'}">`;
        break;
      case 'boolean':
        ctrl = '<label class="row center gap4"><input type="checkbox"> 是</label>';
        break;
      case 'enum':
        ctrl = `<select>${(a.options || []).map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
        break;
      case 'multiEnum':
        ctrl = (a.options || []).map((o) => `<label class="pill"><input type="checkbox"> ${esc(o)}</label>`).join(' ');
        break;
      case 'date':
        ctrl = '<input type="date">';
        break;
      case 'text':
        ctrl = '<textarea rows="2" placeholder="富文本"></textarea>';
        break;
      case 'image':
        ctrl = '<div style="border:1px dashed var(--line);border-radius:8px;padding:14px;text-align:center;color:var(--text-3);font-size:12px">点击上传图片</div>';
        break;
      default:
        ctrl = '<input type="text">';
    }
    return `<div class="field">
      <label>${esc(a.name)} ${req} <span class="text-4 small">${a.code}</span></label>
      ${ctrl}
      ${hint.length ? `<div class="f-hint">${esc(hint.join('　'))}</div>` : ''}
    </div>`;
  };

  /* ------------------------------ 渲染结果 ------------------------------ */
  function emptyPane() {
    return `<div class="card"><div class="empty">
      <div class="empty-icon">🧾</div><div class="empty-title">等待校验</div>
      <div class="small">点击左侧「校验」查看结果</div></div></div>`;
  }

  function renderResult(res) {
    const pane = document.getElementById('resultPane');
    const st = document.getElementById('editorStatus');
    const commit = document.getElementById('commitBtn');

    if (res.stage === 'syntax') {
      st.innerHTML = '<span class="text-danger">✗ JSON 语法错误</span>';
      commit.disabled = true;
      pane.innerHTML = `
        <div class="card card-pad">
          <div class="block-title text-danger">✗ V-01 JSON 语法校验未通过</div>
          <div class="degrade-note" style="border-color:var(--danger);color:var(--danger);background:var(--danger-soft)">
            <span>✗</span><div>
              <b>第 ${res.syntaxError.line} 行，第 ${res.syntaxError.column} 列</b><br>
              ${esc(res.syntaxError.detail)}<br>
              <span class="small">规范要求：不合法时返回 HTTP 400，并给出可定位的错误行号与字符偏移（V-01）。</span>
            </div>
          </div>
        </div>`;
      return;
    }

    const { errors, warnings } = res;
    st.innerHTML = errors.length
      ? `<span class="text-danger">✗ ${errors.length} 项校验错误</span>`
      : warnings.length
      ? `<span class="text-warning">⚠ 通过（${warnings.length} 项警告）</span>`
      : '<span class="text-success">✓ 校验通过</span>';
    commit.disabled = !!errors.length;

    if (errors.length) {
      pane.innerHTML = `
        <div class="card card-pad">
          <div class="block-title text-danger">✗ 品类结构校验未通过（${errors.length} 项）</div>
          <div class="small text-3 mb8">解析器「全量校验、一次反馈」：下列错误一次性全部返回，便于一次修改通过。</div>
          ${errors
            .slice(0, 30)
            .map(
              (e) => `<div class="err-item">
                <span class="err-rule">${esc(e.rule)}</span>
                <div>
                  <div>${esc(e.detail)}</div>
                  <div class="err-path">${esc(e.path)}</div>
                </div>
              </div>`
            )
            .join('')}
          ${errors.length > 30 ? `<div class="small text-3 mt8">另有 ${errors.length - 30} 项错误未展示</div>` : ''}
        </div>`;
      return;
    }

    // ---- 校验通过：展示衍生能力 ----
    const tree = buildTree(res.doc.category);
    const leaves = Object.keys(tree.index).filter((c) => tree.index[c].isLeaf);
    const filterable = tree.root.attrs;
    const idxFields = filterable.filter((a) => a.filterable || a.searchable);

    pane.innerHTML = `
      <div class="card card-pad mb16">
        <div class="block-title text-success">✓ 校验通过 —— 衍生能力预览</div>
        <div class="row gap8 wrap mt8">
          <span class="tag tag-success">品类节点 ${res.nodes.length}</span>
          <span class="tag tag-brand">属性总数 ${res.attrCount}</span>
          <span class="tag tag-ai">索引字段 ${idxFields.length}</span>
          <span class="tag tag-muted">文本 ${(res.bytes / 1024).toFixed(1)} KB</span>
        </div>
        ${warnings.length
          ? `<div class="degrade-note mt12"><span>⚠</span><div>
              ${warnings.map((w) => `${esc(w.rule)}｜${esc(w.detail)}<span class="err-path">${esc(w.path)}</span>`).join('<br>')}
            </div></div>`
          : ''}
      </div>

      <div class="result-block">
        <div class="rb-head">🌳 品类树构建结果</div>
        <div class="rb-body tree-view">${treeHtml(tree.root)}</div>
      </div>

      <div class="result-block">
        <div class="rb-head">🧬 属性 Schema（含父品类继承，BR-03）</div>
        <div class="rb-body">
          <table class="kv-table">
            <tr><td colspan="2" style="background:#f5f7fa"><b>${esc(tree.root.name)}</b>　${esc(tree.root.code)}　根品类属性 ${tree.root.ownAttrs.length} 项</td></tr>
            ${tree.root.ownAttrs
              .map(
                (a) => `<tr><td>${esc(a.name)}</td><td>
                  <span class="tag tag-muted">${a.dataType}</span>
                  ${a.required ? '<span class="tag tag-price">必填</span>' : ''}
                  ${a.filterable ? '<span class="tag tag-brand">可筛选</span>' : ''}
                  ${a.searchable ? '<span class="tag tag-ai">可检索</span>' : ''}
                  ${a.options ? `<span class="small text-3">${esc(a.options.join(' / '))}</span>` : ''}
                  ${a.range ? `<span class="small text-3">区间 ${a.range[0]}~${a.range[1]}${a.unit || ''}</span>` : ''}
                </td></tr>`
              )
              .join('')}
          </table>
          <div class="small text-3 mt8">叶子品类（可挂载商品）：${leaves.map((c) => esc(tree.index[c].name)).join('、')}</div>
        </div>
      </div>

      <div class="result-block">
        <div class="rb-head">📝 动态商品发布表单（自动生成，无需开发页面）</div>
        <div class="rb-body">
          <div class="small text-3 mb8">为叶子品类「${esc(tree.index[leaves[0]].name)}」自动生成的表单（属性含继承）：</div>
          ${tree.index[leaves[0]].attrs.map((a) => formControl(a)).join('')}
        </div>
      </div>

      <div class="result-block">
        <div class="rb-head">🔍 检索索引映射（filterable / searchable → 索引字段）</div>
        <div class="rb-body">
          <table class="kv-table">
            ${idxFields
              .map(
                (a) => `<tr><td>${esc(a.code)}</td><td>
                  <span class="tag tag-muted">${a.dataType}</span>
                  ${a.filterable ? '<span class="tag tag-brand">筛选维度</span>' : ''}
                  ${a.searchable ? '<span class="tag tag-ai">全文检索</span>' : ''}
                  <div class="small text-3">索引字段 index_${esc(a.code.toLowerCase())}　${a.unit ? '单位 ' + esc(a.unit) : ''}</div>
                </td></tr>`
              )
              .join('')}
          </table>
        </div>
      </div>`;
  }

  function treeHtml(node) {
    const tag = node.isLeaf ? '<span class="tag tag-success">叶子</span>' : '<span class="tag tag-muted">分类</span>';
    const own = node.ownAttrs.length ? `<span class="tv-code">（属性 ${node.ownAttrs.length}）</span>` : '';
    return `<div>
      <div>${node.icon || '📦'} <b>${esc(node.name)}</b> <span class="tv-code">${esc(node.code)}</span> ${tag} ${own}</div>
      ${node.children.length ? `<div class="tv-node">${node.children.map(treeHtml).join('')}</div>` : ''}
    </div>`;
  }

  /* ------------------------------ 动作 ------------------------------ */
  function validate() {
    const text = document.getElementById('jsonEditor').value;
    if (!text.trim()) {
      UI.toast('请先粘贴或加载品类 JSON', 'error');
      return;
    }
    const res = validateJson(text);
    lastValid = res.ok ? res : null;
    renderResult(res);
    if (res.ok) UI.toast('校验通过，可正式导入', 'success');
    else UI.toast(res.stage === 'syntax' ? 'JSON 语法错误' : `发现 ${res.errors.length} 项结构校验错误`, 'error');
  }

  function commit() {
    if (!lastValid) return UI.toast('请先通过校验', 'error');
    const def = JSON.parse(JSON.stringify(lastValid.doc));
    S.Cat.saveCustom(def);
    renderImported();
    UI.toast(`品类「${def.category.name}」导入成功，已生成 ${lastValid.nodes.length} 个节点 / ${lastValid.attrCount} 个属性`, 'ai', 3200);
    setTimeout(() => UI.toast('前台品类导航已刷新，可直接访问该品类', 'success'), 1400);
  }

  function renderImported() {
    const list = S.Cat.customDefs();
    const box = document.getElementById('importedList');
    if (!list.length) {
      box.innerHTML = '<div class="small text-3">尚未导入自定义品类。</div>';
      return;
    }
    box.innerHTML = list
      .map(
        (d) => `<div class="row between center wrap" style="padding:10px 0;border-bottom:1px dashed var(--line-2)">
          <div>
            <div><b>${esc(d.category.name)}</b> <span class="mono small text-3">${esc(d.category.code)}</span>
              <span class="tag tag-ai">v${esc(d.schemaVersion)}</span></div>
            <div class="small text-3">${countNodes(d.category)} 个节点</div>
          </div>
          <div class="row gap8">
            <a class="btn btn-sm" href="products.html?cat=${encodeURIComponent(d.category.code)}">前台查看</a>
            <button class="btn btn-sm" data-del="${esc(d.category.code)}">删除</button>
          </div>
        </div>`
      )
      .join('');
    box.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => {
        S.Cat.removeCustom(b.dataset.del);
        renderImported();
        UI.toast('已删除该自定义品类', 'success');
      };
    });
  }

  function countNodes(n) {
    return 1 + (n.children || []).reduce((a, c) => a + countNodes(c), 0);
  }

  /* --------------------------- 规范说明表格 --------------------------- */
  const SPEC_FIELDS = [
    ['schemaVersion', '字符串 · 必填', '规范版本号，当前支持 1.0；解析器按版本选择兼容策略'],
    ['category.code', '字符串 · 必填', '品类编码，大写下划线风格，商家范围内唯一'],
    ['category.name', '字符串 · 必填', '品类显示名称，不超过 64 字符'],
    ['category.sort', '整数 · 选填', '同级排序值，升序排列，缺省 0'],
    ['category.icon', '字符串 · 选填', '品类图标（本演示扩展字段，用于前台展示）'],
    ['attributes[].code', '字符串 · 必填', '属性编码，同一品类内唯一，作为表单与索引字段名'],
    ['attributes[].name', '字符串 · 必填', '属性显示名称'],
    ['attributes[].dataType', '枚举 · 必填', 'string / integer / decimal / boolean / enum / multiEnum / date / text / image'],
    ['attributes[].required', '布尔 · 选填', '是否必填，缺省 false'],
    ['attributes[].filterable', '布尔 · 选填', '是否作为检索筛选维度，缺省 false'],
    ['attributes[].searchable', '布尔 · 选填', '是否参与全文检索，缺省 false'],
    ['attributes[].options', '数组 · 条件必填', 'enum / multiEnum 时必填，枚举取值列表'],
    ['attributes[].unit', '字符串 · 选填', '数值型属性的单位'],
    ['attributes[].range', '数组 · 选填', '数值型属性的合法区间 [min, max]'],
    ['category.children[]', '数组 · 选填', '子品类列表，递归同构；缺省表示该节点为叶子品类']
  ];

  const RULES = [
    ['V-01', 'JSON 语法：不合法时返回 400 并给出行号与字符偏移'],
    ['V-02', '规范版本：schemaVersion 必须为受支持版本'],
    ['V-03', '编码唯一性：整棵品类树中 code 不得重复，冲突时指出路径'],
    ['V-04', '编码格式：须匹配 ^[A-Z][A-Z0-9_]{1,63}$'],
    ['V-05', '层级深度：品类树深度不超过 5 层'],
    ['V-06', '属性编码唯一性：同品类内唯一；与继承属性冲突视为覆盖并警告'],
    ['V-07', '数据类型白名单：dataType 必须属于白名单集合'],
    ['V-08', '枚举完备性：enum / multiEnum 必须提供非空 options'],
    ['V-09', '数值区间合法性：range 为两元素数组且 min ≤ max'],
    ['V-10', '循环引用：DFS 遍历时访问到已在栈中的节点即判失败'],
    ['V-11', '结构完整性：category 必填且提供非空 code 与 name'],
    ['V-12', '容量约束：节点 ≤ 2000，属性 ≤ 20000，文本 ≤ 2 MB']
  ];

  function renderSpec() {
    document.getElementById('specTable').innerHTML = SPEC_FIELDS.map(
      (f) => `<tr><td>${esc(f[0])}</td><td>${esc(f[2])}<div class="small text-3">${esc(f[1])}</div></td></tr>`
    ).join('');
    document.getElementById('ruleTable').innerHTML = RULES.map(
      (r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`
    ).join('');
  }

  P.import = { loadSample, clearJson, formatJson, validate, commit };

  document.addEventListener('DOMContentLoaded', () => {
    renderSpec();
    renderImported();
    setJson(SAMPLES.appliance);
  });
})(window.AIECP = window.AIECP || {});
