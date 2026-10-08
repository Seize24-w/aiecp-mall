/* 真实 DOM 冒烟测试：用 jsdom 逐个加载页面，捕获运行期 JS 错误并校验关键渲染结果
 * 运行：NODE_PATH=<workspace>/node_modules node tools/dom_test.js
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const BASE = path.join(__dirname, '..');
const PAGES = [
  ['index.html', '首页'],
  ['products.html', '商品列表'],
  ['products.html?cat=HOME_APPLIANCE&sort=sales', '品类筛选列表'],
  ['product.html?id=P1004', '商品详情'],
  ['product.html?id=P9999', '商品详情（不存在）'],
  ['cart.html', '购物车'],
  ['checkout.html', '结算页（空车）'],
  ['pay.html?no=AIECP20260928001', '支付页'],
  ['orders.html', '订单列表'],
  ['orders.html?status=PENDING_PAY', '订单列表（待支付）'],
  ['order-detail.html?no=AIECP20260928001', '订单详情'],
  ['user.html', '个人中心'],
  ['user.html#profile', '个人中心 · AI 画像'],
  ['category-import.html', '品类 JSON 导入'],
  ['login.html', '登录页']
];

let pass = 0, fail = 0;
const log = (ok, name, extra) => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}${extra ? '  =>  ' + extra : ''}`);
};

const http = require('http');

/* 启动一个本地静态服务器，让 jsdom 拥有真实 origin（localStorage 才可用），
 * 并以浏览器一致的方式加载 CSS / JS 资源。 */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/^\/+/, '');
  const file = path.join(BASE, rel || 'index.html');
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

/** 以真实资源加载方式打开页面（jsdom 会同步加载 <script src>，与浏览器一致） */
/** @param {Object} [seed] 预置到 localStorage 的键值，用于跨页流程测试 */
async function load(file, seed) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(e.message + (e.detail && e.detail.stack ? '\n' + e.detail.stack : '')));
  vc.on('error', (m) => errors.push('console.error: ' + m));
  const dom = await JSDOM.fromURL(`http://127.0.0.1:${PORT}/${file}`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      win.scrollTo = () => {};
      win.confirm = () => true;
      win.prompt = () => '测试原因';
      win.alert = () => {};
      if (seed) Object.keys(seed).forEach((k) => win.localStorage.setItem(k, seed[k]));
    }
  });
  await new Promise((r) => setTimeout(r, 300));
  return { dom, win: dom.window, doc: dom.window.document, errors };
}

let PORT = 0;
console.log('\n========== 页面加载与渲染冒烟测试 ==========\n');

(async () => {
await new Promise((r) => server.listen(0, '127.0.0.1', r));
PORT = server.address().port;

for (const [file, name] of PAGES) {
  const { doc, win, errors } = await load(file);
  const NS = win.AIECP;
  const okPage = !!NS && !!NS.UI;
  const headerOk = !!doc.querySelector('.site-header');
  const footerOk = !!doc.querySelector('.site-footer');
  const aiOk = !!doc.getElementById('ai-fab');
  log(errors.length === 0 && okPage && headerOk && footerOk && aiOk, name,
    errors.length ? errors.slice(0, 2).join(' | ').split('\n')[0] : (okPage ? '' : 'AIECP 未初始化'));

  // 页级关键内容校验
  if (file.startsWith('index.html')) {
    const grid = doc.getElementById('selectionGrid');
    log(!!grid && grid.children.length > 0, '　首页智能选品位已渲染', grid ? grid.children.length + ' 张卡' : '无');
    log(!!doc.getElementById('bundleBody').innerHTML.trim(), '　首页智能组货位已渲染');
    log(doc.getElementById('catGrid').children.length === 3, '　首页品类导航 3 个根品类');
    log(doc.getElementById('hotGrid').children.length === 8, '　首页热销榜 8 件');
  }
  if (file.startsWith('products.html')) {
    const grid = doc.getElementById('productGrid');
    log(!!grid && grid.children.length > 0, '　列表页商品已渲染', grid ? grid.children.length + ' 件' : '');
    log(doc.getElementById('filterBar').innerHTML.indexOf('filter-row') >= 0, '　筛选栏已渲染');
    log(doc.getElementById('catTree').children.length > 0, '　品类树已渲染');
  }
  if (file === 'product.html?id=P1004') {
    log(doc.getElementById('dTitle').textContent.indexOf('星尘') >= 0, '　详情标题正确');
    log(doc.getElementById('skuArea').innerHTML.indexOf('sku-opt') >= 0, '　SKU 规格项已渲染');
    log(doc.getElementById('bundleBody').innerHTML.indexOf('bundle-card') >= 0, '　AI 组货方案已渲染');
    log(doc.getElementById('thumbs').children.length === 3, '　图集 3 张');
  }
  if (file === 'product.html?id=P9999') {
    log(doc.querySelector('.container').innerHTML.indexOf('商品不存在') >= 0, '　不存在商品显示空态');
  }
  if (file === 'orders.html') {
    log(doc.getElementById('orderList').children.length === 4, '　订单列表 4 张种子订单');
    log(doc.getElementById('statusTabs').children.length === 7, '　状态筛选 7 个页签');
  }
  if (file.startsWith('order-detail.html')) {
    const box = doc.getElementById('detailBox').innerHTML;
    log(box.indexOf('logi-trace') >= 0, '　物流轨迹已渲染');
    log(box.indexOf('tl-item') >= 0, '　流转时间线已渲染');
  }
  if (file === 'user.html') {
    log(doc.getElementById('profileMain').innerHTML.indexOf('stat-card') >= 0, '　概览统计卡已渲染');
  }
  if (file === 'user.html#profile') {
    log(doc.getElementById('profileMain').innerHTML.indexOf('偏好品类') >= 0, '　AI 画像已渲染');
  }
  if (file === 'category-import.html') {
    log(doc.getElementById('jsonEditor').value.indexOf('HOME_APPLIANCE') >= 0, '　默认示例已加载');
    log(doc.getElementById('specTable').children.length > 0, '　规范字段表已渲染');
    log(doc.getElementById('ruleTable').innerHTML.indexOf('V-12') >= 0, '　校验规则表已渲染');
  }
}

console.log('\n---- 交互流程（模拟点击）----');
const { win: w0, doc: d0 } = await load('product.html?id=P1004');
{
  const NS = w0.AIECP;
  NS.S.Cart.save([]);
  // 加入购物车
  NS.Pages.detail.addCart();
  log(NS.S.Cart.count() === 1, '详情页加入购物车', '车内 ' + NS.S.Cart.count() + ' 件');
  // 一键加购组货
  const btn = d0.querySelector('#bundleBody [data-bundle]');
  if (btn) {
    btn.click();
    log(NS.S.Cart.count() >= 3, '组货一键加购整套', '车内 ' + NS.S.Cart.count() + ' 件');
  } else log(false, '组货一键加购整套', '未找到按钮');
  log(d0.getElementById('cartBadge').textContent === String(NS.S.Cart.count()), '购物车角标已同步');

  // 购物车页（预置同一份购物车数据，模拟跨页流转）
  const cartSeed = {
    aiecp_cart: JSON.stringify([
      { key: 'P1004|P1004-01|', productId: 'P1004', skuId: 'P1004-01', quantity: 1, checked: true, bundleId: null, bundleName: '', scene: '', addedAt: new Date().toISOString() },
      { key: 'P1006|P1006-01|B-CLEANING-P1004-1', productId: 'P1006', skuId: 'P1006-01', quantity: 1, checked: true, bundleId: 'B-CLEANING-P1004-1', bundleName: '全屋清洁套装', scene: 'CLEANING', addedAt: new Date().toISOString() }
    ])
  };
  const cart2 = await load('cart.html', cartSeed);
  log(cart2.doc.getElementById('cartBody').innerHTML.indexOf('cart-item') >= 0, '购物车条目渲染');
  log(cart2.doc.getElementById('cartBody').innerHTML.indexOf('组货方案') >= 0, '购物车按组货方案分组');
  log(cart2.doc.getElementById('totalAmount').textContent !== '¥0.00', '购物车合计金额已计算', cart2.doc.getElementById('totalAmount').textContent);

  // 结算页 + 下单
  const co = await load('checkout.html', cartSeed);
  log(co.doc.getElementById('addrList').children.length === 3, '结算页地址列表');
  const submitBtn = [...co.doc.querySelectorAll('button')].find((b) => b.textContent.indexOf('提交订单') >= 0);
  const before = co.win.AIECP.S.Orders.all().length;
  submitBtn.click();
  log(co.win.AIECP.S.Orders.all().length === before + 1, '提交订单成功生成新订单');
  const newNo = co.win.AIECP.S.Orders.all()[0].orderNo;
  log(/^AIECP\d{18}$/.test(newNo), '新订单号格式', newNo);

  // 支付页（使用种子数据中的待支付订单）
  const pay = await load('pay.html?no=AIECP20261007012');
  const payBtn = [...pay.doc.querySelectorAll('button')].find((b) => b.textContent.indexOf('确认支付') >= 0);
  log(!!payBtn, '收银台渲染');
  if (payBtn) {
    pay.win.AIECP.S.Orders.pay('AIECP20261007012', '微信支付');
    log(pay.win.AIECP.S.Orders.get('AIECP20261007012').status === 'SHIPPING', '支付后进入待发货');
  }

  // AI 客服
  const r = w0.AIECP.AI.CustomerService.chat('我的快递什么时候到？');
  log(r.intent.indexOf('物流') >= 0 && r.citations.length > 0, 'AI 客服物流问答');

  // 品类导入校验
  const imp = await load('category-import.html');
  imp.doc.getElementById('jsonEditor').value = '{ bad json';
  imp.win.AIECP.Pages.import.validate();
  log(imp.doc.getElementById('editorStatus').innerHTML.indexOf('语法错误') >= 0, '反例 JSON 触发语法错误提示');
  imp.win.AIECP.Pages.import.loadSample('appliance');
  log(imp.doc.getElementById('editorStatus').innerHTML.indexOf('校验通过') >= 0, '合法 JSON 校验通过');
  imp.doc.getElementById('commitBtn').click();
  log(imp.win.AIECP.S.Cat.customDefs().length === 1, '正式导入写入品类定义');
}

console.log(`\n================  通过 ${pass} 项，失败 ${fail} 项  ================\n`);
server.close();
process.exit(fail ? 1 : 0);
})();
