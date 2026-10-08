/**
 * 通过 GitHub REST API 发布静态站点（github.com 端口不可达时的替代方案）
 *
 * 用法：
 *   GH_TOKEN=<your_pat> node tools/publish.js
 *
 * 说明：
 *   - token 仅从环境变量读取，绝不落盘、不写入 .git/config
 *   - 采用 Git Data API（blob → tree → commit → ref）一次性提交，避免 103 次单文件提交
 *   - 仓库已存在时自动复用（幂等重跑）
 */
const fs = require('fs');
const path = require('path');

const OWNER = 'Seize24-w';
const REPO = 'aiecp-mall';
const BRANCH = 'main';
const BASE = path.resolve(__dirname, '..');
const API = 'https://api.github.com';

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  console.error('缺少 GH_TOKEN 环境变量');
  process.exit(1);
}

let reqCount = 0;
async function api(method, urlPath, body, opts) {
  opts = opts || {};
  reqCount++;
  const res = await fetch(API + urlPath, {
    method,
    headers: Object.assign(
      {
        Authorization: 'Bearer ' + TOKEN,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'aiecp-publish-script'
      },
      body ? { 'Content-Type': 'application/json' } : {}
    ),
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    /* 非 JSON 响应 */
  }
  if (!res.ok && !opts.allowFail) {
    throw new Error(`${method} ${urlPath} → ${res.status}\n${text.slice(0, 600)}`);
  }
  return { status: res.status, json, text };
}

/** 需要排除的文件 */
const EXCLUDE = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini', '.blobcache.json']);

function walk(dir, rel, out) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const abs = path.join(dir, name);
    const r = rel ? rel + '/' + name : name;
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, r, out);
    else if (!EXCLUDE.has(name)) out.push(r);
  }
  return out;
}

/** 并发受控的 map */
async function pmap(list, limit, fn) {
  const ret = new Array(list.length);
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const idx = i++;
      ret[idx] = await fn(list[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return ret;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`目标仓库：${OWNER}/${REPO}（public，分支 ${BRANCH}）\n`);

  /* ---------- 1. 确认身份 ---------- */
  const me = await api('GET', '/user');
  console.log(`[1/7] 身份：${me.json.login}（${me.json.name || '—'}）`);
  if (me.json.login.toLowerCase() !== OWNER.toLowerCase()) {
    console.warn(`  ⚠ token 属于 ${me.json.login}，与预期的 ${OWNER} 不一致，仍继续`);
  }

  /* ---------- 2. 创建仓库（幂等） ---------- */
  let created = false;
  const cr = await api(
    'POST',
    '/user/repos',
    {
      name: REPO,
      description: '智选云 AI 电商在线售货系统 —— 纯静态演示站点（品类 JSON 驱动 · 智能选品/组货/客服）',
      homepage: `https://${OWNER}.github.io/${REPO}/`,
      private: false,
      auto_init: false,
      has_issues: true,
      has_wiki: false
    },
    { allowFail: true }
  );
  if (cr.status === 201) {
    created = true;
    console.log('[2/7] 仓库创建成功');
  } else if (cr.status === 422) {
    console.log('[2/7] 仓库已存在，复用之');
  } else {
    throw new Error('建仓失败：' + cr.text.slice(0, 300));
  }

  /* ---------- 3. 收集文件 ---------- */
  const files = walk(BASE, '', []).sort();
  console.log(`[3/7] 待上传 ${files.length} 个文件`);

  /* ---------- 3.5 空仓库引导 ----------
   * GitHub 对完全空的仓库调用 git/blobs 会返回 409 "Git Repository is empty"，
   * 因此先用 contents API 种入 README 完成初始化（产生第一个 commit 与默认分支）。 */
  const probe = await api('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`, null, { allowFail: true });
  if (probe.status !== 200) {
    console.log('      仓库为空，先用 contents API 初始化…');
    const readmePath = path.join(BASE, 'README.md');
    const boot = await api(
      'PUT',
      `/repos/${OWNER}/${REPO}/contents/README.md`,
      {
        message: 'chore: initialize repository',
        content: fs.readFileSync(readmePath).toString('base64')
      },
      { allowFail: true }
    );
    if (boot.status !== 201 && boot.status !== 200) {
      throw new Error('仓库初始化失败：' + boot.status + ' ' + boot.text.slice(0, 300));
    }
    console.log('      初始化完成');
  }

  /* ---------- 4. 逐个创建 blob ---------- */
  const blobs = new Array(files.length);
  let done = 0;
  let reused = 0;

  // 断点续跑：把已成功的 blob sha 缓存到本地，重跑时跳过（避免重复消耗限流额度）
  const cacheFile = path.join(BASE, 'tools', '.blobcache.json');
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    } catch (e) {
      cache = {};
    }
  }
  const CACHE_KEY = OWNER + '/' + REPO;

  files.forEach((rel, i) => {
    const sha = cache[CACHE_KEY] && cache[CACHE_KEY][rel];
    if (sha) {
      blobs[i] = sha;
      reused++;
    }
  });
  if (reused) console.log(`      断点续跑：复用已上传 blob ${reused} 个`);

  await pmap(files, 3, async (rel, idx) => {
    if (blobs[idx]) {
      done++;
      return;
    }
    const buf = fs.readFileSync(path.join(BASE, rel));
    const isText = /\.(html|js|css|md|json|svg|txt|py|yml|yaml)$/i.test(rel);
    let lastErr = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await api(
        'POST',
        `/repos/${OWNER}/${REPO}/git/blobs`,
        {
          content: isText ? buf.toString('utf8') : buf.toString('base64'),
          encoding: isText ? 'utf-8' : 'base64'
        },
        { allowFail: true }
      );
      if ((r.status === 201 || r.status === 200) && r.json && r.json.sha) {
        blobs[idx] = r.json.sha;
        cache[CACHE_KEY] = cache[CACHE_KEY] || {};
        cache[CACHE_KEY][rel] = r.json.sha;
        done++;
        if (done % 10 === 0 || done === files.length) {
          fs.writeFileSync(cacheFile, JSON.stringify(cache));
          process.stdout.write(`      已上传 blob ${done}/${files.length}\n`);
        }
        return;
      }
      lastErr = `${r.status} ${(r.text || '').slice(0, 200)}`;
      // 限流（403/429）或服务端错误才退避重试，其它错误直接放弃
      if (r.status === 403 || r.status === 429 || r.status >= 500) {
        await sleep(1500 * Math.pow(2, attempt) + Math.random() * 800);
        continue;
      }
      break;
    }
    fs.writeFileSync(cacheFile, JSON.stringify(cache));
    throw new Error(`blob 创建失败：${rel} → ${lastErr}`);
  });
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  console.log(`[4/7] blob 上传完成（${files.length} 个，API 调用 ${reqCount} 次）`);

  /* ---------- 5. 建 tree ---------- */
  const tree = files.map((rel, i) => ({
    path: rel.split(path.sep).join('/'),
    mode: '100644',
    type: 'blob',
    sha: blobs[i]
  }));
  const tr = await api('POST', `/repos/${OWNER}/${REPO}/git/trees`, { tree });
  console.log('[5/7] tree 已构建：' + tr.json.sha);

  /* ---------- 6. 建 commit ---------- */
  let parent = null;
  const ref = await api('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`, null, { allowFail: true });
  if (ref.status === 200) parent = ref.json.object.sha;

  const commit = await api('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message: 'feat: 智选云 AI 电商在线售货系统静态站点\n\n' +
      '- 11 个页面：首页/分类列表/商品详情/购物车/结算/收银台/订单列表/订单详情/个人中心/品类导入/登录\n' +
      '- 品类 JSON 驱动：品类树、筛选项、规格、动态表单均由属性 Schema 动态生成\n' +
      '- 三项 AI 能力：智能选品（多路召回+多样性重排）、智能组货（毛利约束下求解折扣）、智能客服（意图识别+RAG）\n' +
      '- 纯静态无后端，商品/购物车/订单均由本地模拟数据驱动',
    tree: tr.json.sha,
    parents: parent ? [parent] : []
  });
  console.log('[6/7] commit 已创建：' + commit.json.sha.slice(0, 8));

  if (parent) {
    await api('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.json.sha });
    console.log('      分支已更新');
  } else {
    await api('POST', `/repos/${OWNER}/${REPO}/git/refs`, {
      ref: `refs/heads/${BRANCH}`,
      sha: commit.json.sha
    });
    console.log('      分支已创建');
  }
  // 保险：把默认分支显式设为 main
  await api('PATCH', `/repos/${OWNER}/${REPO}`, { default_branch: BRANCH }, { allowFail: true });

  /* ---------- 7. 开启 GitHub Pages ---------- */
  let pages = await api('POST', `/repos/${OWNER}/${REPO}/pages`, {
    source: { branch: BRANCH, path: '/' }
  }, { allowFail: true });
  if (pages.status === 201 || pages.status === 204) {
    console.log('[7/7] GitHub Pages 已开启');
  } else if (pages.status === 409) {
    console.log('[7/7] GitHub Pages 已开启（已存在，改用 PATCH 校正源）');
    await api('PUT', `/repos/${OWNER}/${REPO}/pages`, {
      source: { branch: BRANCH, path: '/' }
    }, { allowFail: true });
  } else {
    console.log(`[7/7] Pages 开启返回 ${pages.status}：${pages.text.slice(0, 200)}`);
  }

  console.log('\n等待 Pages 构建…');
  let siteUrl = `https://${OWNER}.github.io/${REPO}/`;
  for (let i = 0; i < 30; i++) {
    await sleep(4000);
    const st = await api('GET', `/repos/${OWNER}/${REPO}/pages`, null, { allowFail: true });
    if (st.status === 200) {
      const j = st.json;
      if (j.html_url) siteUrl = j.html_url;
      console.log(`  状态：${j.status || '—'}  ${j.html_url || ''}`);
      if (j.status === 'built') {
        console.log('\n✅ 构建完成');
        break;
      }
    } else {
      console.log(`  查询返回 ${st.status}`);
    }
  }

  console.log('\n========================================');
  console.log(`仓库：   https://github.com/${OWNER}/${REPO}`);
  console.log(`在线站点：${siteUrl}`);
  console.log(`分支：   ${BRANCH} · 提交 ${commit.json.sha.slice(0, 8)} · ${files.length} 个文件`);
  console.log('========================================');
})().catch((e) => {
  console.error('\n❌ 发布失败：' + e.message);
  process.exit(1);
});
