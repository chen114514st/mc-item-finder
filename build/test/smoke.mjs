import { JSDOM, VirtualConsole } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push('jsdomError: ' + (e.message || e)));
vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));

const dom = await JSDOM.fromFile(path.join(root, 'index.html'), {
  resources: 'usable', runScripts: 'dangerously', pretendToBeVisual: true,
  virtualConsole: vc, url: 'file://' + path.join(root, 'index.html'),
});
const w = dom.window, d = w.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (fn, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await wait(100); }
  return false;
};

let ok = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { ok++; console.log('PASS', name, extra); }
  else { fail++; console.log('FAIL', name, extra); }
};
const stat = () => d.getElementById('stat').textContent;
const setQ = async v => {
  const q = d.getElementById('q');
  q.value = v; q.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wait(320);
};
const openFirst = async () => {
  d.querySelector('.card').click(); await wait(150);
};
const closeSheet = async () => { d.querySelector('.sheet-close').click(); await wait(80); };
const sheetText = () => d.getElementById('sheetContent').textContent;

check('meta 加载', await waitFor(() => !!w.MCDATA?.meta?.versions?.length), `versions=${w.MCDATA?.meta?.versions?.length}`);
check('卡片渲染', await waitFor(() => d.querySelectorAll('.card').length > 0));
const cards0 = d.querySelectorAll('.card').length;
check('首屏卡片数量>=90', cards0 >= 90, `cards=${cards0}`);
check('分类 chips', d.querySelectorAll('.chip').length >= 8, `chips=${d.querySelectorAll('.chip').length}`);
check('状态栏 Java 汇总', await waitFor(() => /Java 26\.1/.test(stat()) && /物品 1506/.test(stat()) && /变体 210/.test(stat())), stat());
const vs = d.getElementById('verSel');
check('版本下拉 10 项', vs.options.length === 10, `n=${vs.options.length}`);
check('版本分两组 optgroup', vs.querySelectorAll('optgroup').length === 2,
  [...vs.querySelectorAll('optgroup')].map(g => g.label).join(','));
check('语言下拉 22 项', d.getElementById('langSel').options.length === 22, `n=${d.getElementById('langSel').options.length}`);
const zhName = d.querySelector('.card .nm')?.textContent;
check('中文名显示', /[\u4e00-\u9fff]/.test(zhName || ''), `first=${zhName}`);

// 拼音搜索
const py = w.MCDATA.langs['zh_cn'].py;
const sampleName = Object.keys(py).find(n => py[n][2].length >= 3);
await setQ(py[sampleName][2]);
check('拼音首字母搜索', d.querySelectorAll('.card').length > 0, `query=${py[sampleName][2]}(${sampleName})`);
await setQ(py[sampleName][1]);
check('中文全拼搜索', d.querySelectorAll('.card').length > 0, `query=${py[sampleName][1]}`);

// 变体搜索
await setQ('夜视药水');
const vcards = d.querySelectorAll('.card.is-variant').length;
check('变体搜索命中', d.querySelectorAll('.card').length > 0 && vcards > 0, `cards=${d.querySelectorAll('.card').length} variant=${vcards}`);
await openFirst();
check('变体详情：variant 标签', /变体/.test(sheetText()));
check('变体详情：组件语法 /give', /potion_contents=\{potion:"minecraft:night_vision"\}/.test(sheetText()), sheetText().slice(0, 120));
check('变体详情：基础物品跳转', !!d.querySelector('[data-jump]'));
await closeSheet();

// 基础物品的「相关变体」
await setQ('potion');
await waitFor(() => [...d.querySelectorAll('.card .en')].some(e => e.textContent === 'Potion'));
[...d.querySelectorAll('.card')].find(c => c.querySelector('.nm').textContent.includes('药水') && !c.classList.contains('is-variant'))?.click();
await wait(150);
check('基础物品显示相关变体', d.querySelectorAll('.jump-chip').length >= 5, `chips=${d.querySelectorAll('.jump-chip').length}`);
await closeSheet();

// 方块状态
await setQ('oak_stairs');
const enNames = [...d.querySelectorAll('.card .en')].map(e => e.textContent);
check('英文搜索 oak_stairs', enNames.includes('Oak Stairs'), enNames.slice(0, 3).join(','));
await openFirst();
check('方块状态属性区块', /方块状态属性/.test(sheetText()) && /朝向/.test(sheetText()), sheetText().slice(0, 140));
check('方块状态组合数', /\d+ 种组合/.test(sheetText()));
await closeSheet();

// 英文搜索
await setQ('diamond');
check('英文搜索 diamond', d.querySelectorAll('.card').length > 0, stat());
await setQ('zzzzqqq');
check('空态显示', !d.getElementById('empty').hidden, stat());

// 分类筛选
d.getElementById('clearBtn').click(); await wait(220);
[...d.querySelectorAll('.chip')].find(c => c.textContent.includes('工具')).click();
await wait(220);
check('分类筛选 工具', !/^0 条/.test(stat()), stat());

// 切英文
const ls = d.getElementById('langSel');
ls.value = 'en_us'; ls.dispatchEvent(new w.Event('change', { bubbles: true }));
await wait(400);
check('切英文后为英文名', !/[\u4e00-\u9fff]/.test(d.querySelector('.card .nm')?.textContent || ''));
ls.value = 'zh_cn'; ls.dispatchEvent(new w.Event('change', { bubbles: true }));
await wait(400);

// Java 旧版本 NBT 语法
vs.value = '1.20.1'; vs.dispatchEvent(new w.Event('change', { bubbles: true }));
await waitFor(() => /1\.20\.1/.test(stat()) && /1255/.test(stat()), 8000);
check('切 Java 1.20.1', /Java 1\.20\.1/.test(stat()) && /物品 1255/.test(stat()), stat());

[...d.querySelectorAll('.chip')].find(c => c.textContent.startsWith('全部')).click();
await wait(200);
await setQ('夜视药水');
check('1.20.1 仍可搜变体', d.querySelectorAll('.card.is-variant').length > 0);
await openFirst();
check('旧版 NBT /give', /Potion:"minecraft:night_vision"/.test(sheetText()), sheetText().slice(0, 120));
await closeSheet();

// 基岩版
vs.value = 'be:1.26.60'; vs.dispatchEvent(new w.Event('change', { bubbles: true }));
await waitFor(() => /基岩版 1\.26\.60/.test(stat()) && /2080/.test(stat()), 12000);
check('切基岩版 1.26.60', /基岩版 1\.26\.60/.test(stat()) && /2080/.test(stat()), stat());
check('基岩版无变体条目', d.querySelectorAll('.card.is-variant').length === 0);
await setQ('oak_stairs');
await openFirst();
check('基岩版详情 ID 字段', /基岩版 ID/.test(sheetText()));
check('基岩版 /give', /^\/give @p /.test(sheetText().match(/\/give @p [^\s]+/) ? sheetText().match(/\/give @p [^\s]+/)[0] : ''));
check('基岩版方块状态已中文化', /连接角/.test(sheetText()) && !/minecraft:corner/.test(sheetText()), sheetText().slice(0, 140));
await closeSheet();

const realErrs = errs.filter(e => !/Not implemented/.test(e));
check('无 JS 错误', realErrs.length === 0, realErrs.slice(0, 4).join(' | '));
console.log(`\n结果: ${ok} 通过, ${fail} 失败`);
dom.window.close();
process.exit(fail ? 1 : 0);
