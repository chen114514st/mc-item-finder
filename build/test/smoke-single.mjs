import { JSDOM, VirtualConsole } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const f = path.join(root, 'dist/mc-item-finder.html');
const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push(e.message || String(e)));
const dom = JSDOM.fromFile(f, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'file://' + f, resources: 'usable' });
const w = (await dom).window, d = w.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(100); } return false; };
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('PASS', n, x); } else { fail++; console.log('FAIL', n, x); } };
const stat = () => d.getElementById('stat').textContent;
const setQ = async v => { const q = d.getElementById('q'); q.value = v; q.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(320); };

check('单文件 卡片', await waitFor(() => d.querySelectorAll('.card').length >= 90), `cards=${d.querySelectorAll('.card').length}`);
const img = d.querySelector('.card img');
check('内联图标 data URI', !!img && img.src.startsWith('data:image/png;base64,'), img ? img.src.slice(0, 30) : 'none');
check('10 个版本数据', Object.keys(w.MCDATA.versions).length === 10, Object.keys(w.MCDATA.versions).join(','));
check('21 种语言包', Object.keys(w.MCDATA.langs).length === 21, `n=${Object.keys(w.MCDATA.langs).length}`);
check('状态栏 Java 汇总', /Java 26\.1/.test(stat()) && /物品 1506 \+ 变体 210/.test(stat()), stat());

await setQ('diamond');
check('单文件 英文搜索', d.querySelectorAll('.card').length > 0, stat());

await setQ('夜视药水');
const vcards = d.querySelectorAll('.card.is-variant').length;
check('单文件 变体搜索', vcards > 0, `variant=${vcards}`);
d.querySelector('.card.is-variant').click();
await wait(200);
check('单文件 变体组件 /give', /potion_contents=\{potion:"minecraft:night_vision"\}/.test(d.getElementById('sheetContent').textContent));
d.querySelector('.sheet-close').click();
await wait(100);

await setQ('oak_stairs');
d.querySelector('.card').click();
await wait(200);
check('单文件 方块状态', /方块状态属性/.test(d.getElementById('sheetContent').textContent));
d.querySelector('.sheet-close').click();
await wait(100);

const vs = d.getElementById('verSel');
vs.value = 'be:1.26.60';
vs.dispatchEvent(new w.Event('change', { bubbles: true }));
check('单文件 基岩版切换', await waitFor(() => /基岩版 1\.26\.60/.test(stat()) && /2080/.test(stat()), 12000), stat());

const real = errs.filter(e => !/Not implemented/.test(e));
check('无 JS 错误', real.length === 0, real.slice(0, 3).join(' | '));
console.log(`\n结果: ${ok} 通过, ${fail} 失败`);
w.close(); process.exit(fail ? 1 : 0);
