/* MC 物品查询器 —— 界面逻辑 */
(function () {
  'use strict';
  var Core = window.MCItemCore;
  var META = (window.MCDATA && window.MCDATA.meta) || { versions: [], langs: [] };
  var PAGE = 96;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    subline: $('subline'), q: $('q'), clear: $('clearBtn'), chips: $('chips'),
    stat: $('stat'), grid: $('grid'), sentinel: $('sentinel'), empty: $('empty'),
    verSel: $('verSel'), langSel: $('langSel'), sheet: $('sheet'), sheetContent: $('sheetContent'),
    toast: $('toast'), themeBtn: $('themeBtn'), built: $('built')
  };

  var GLYPH = { '方块': '🧱', '工具': '⛏️', '武器': '⚔️', '护甲': '🛡️', '食物': '🍖', '药水': '🧪', '刷怪蛋': '🥚', '杂项': '📦' };

  var S = {
    version: '', lang: 'zh_cn', q: '', cat: '全部',
    items: [], index: [], shown: [], shownCount: 0, byBase: {},
    packs: {}, counts: {}, io: null, loading: false, vmeta: null
  };

  /* ---------- 工具 ---------- */
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem('mcq.' + key);
      localStorage.setItem('mcq.' + key, val);
    } catch (e) { return null; }
  }
  function iconOf(it) {
    if (!it.ic) return null;
    var inline = window.MCQ_ICONS;
    if (inline && inline[it.ic]) return inline[it.ic];
    return 'assets/icons/' + it.ic;
  }
  function nameOf(it) { return Core.nameOf(it, S.packs[S.lang], S.lang); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 1600);
  }
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      toast(ok ? '已复制' : '复制失败，请手动选择');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制'); }, fallback);
    } else fallback();
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('加载失败：' + src)); };
      document.head.appendChild(s);
    });
  }

  /* ---------- 主题 ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    els.themeBtn.textContent = t === 'dark' ? '🌙' : '☀️';
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = t === 'dark' ? '#12161d' : '#ffffff';
    store('theme', t);
  }

  /* ---------- 数据加载 ---------- */
  function verMeta(id) {
    for (var i = 0; i < META.versions.length; i++) if (META.versions[i].id === id) return META.versions[i];
    return null;
  }
  function dataSrc(id) {
    var v = verMeta(id);
    var file = id.indexOf('be:') === 0 ? 'be-items-' + id.slice(3) : 'items-' + id;
    return { src: 'data/' + file + '.js', family: v ? v.family : 'java' };
  }

  function loadPack(code) {
    if (code === 'en_us') return Promise.resolve(null);
    if (S.packs[code]) return Promise.resolve(S.packs[code]);
    var pre = window.MCDATA && window.MCDATA.langs && window.MCDATA.langs[code];
    if (pre) { S.packs[code] = pre; return Promise.resolve(pre); }
    return loadScript('data/lang-' + code + '.js').then(function () {
      var p = window.MCDATA && window.MCDATA.langs && window.MCDATA.langs[code];
      if (p) S.packs[code] = p;
      return p || null;
    });
  }

  function loadVersion(id) {
    if (S.loading) return Promise.resolve();
    S.loading = true;
    var info = dataSrc(id);
    var have = !!(window.MCDATA && window.MCDATA.versions && window.MCDATA.versions[id]);
    var prep = have ? Promise.resolve() : loadScript(info.src);
    return prep.then(function () {
      var v = window.MCDATA.versions[id];
      if (!v) throw new Error('版本数据缺失：' + id);
      S.version = id;
      S.vmeta = verMeta(id) || { id: id, label: id, family: info.family };
      S.items = v.items;
      S.counts = Core.countByCat(S.items);
      S.byBase = {};
      for (var i = 0; i < S.items.length; i++) {
        var it = S.items[i];
        if (it.b) (S.byBase[it.b] = S.byBase[it.b] || []).push(it);
      }
      return loadPack(S.lang);
    }).then(function () {
      S.loading = false;
      rebuild();
    }).catch(function (e) {
      S.loading = false;
      els.subline.textContent = '数据加载失败';
      toast(e.message || '数据加载失败');
    });
  }

  function rebuild() {
    S.index = Core.buildIndex(S.items, S.packs[S.lang]);
    applyFilter(true);
  }

  /* ---------- 渲染 ---------- */
  function applyFilter(resetScroll) {
    S.shown = Core.filter(S.index, S.q, S.cat);
    S.shownCount = 0;
    els.grid.innerHTML = '';
    els.empty.hidden = S.shown.length > 0;
    renderChips();
    renderMore();
    if (resetScroll) { try { window.scrollTo(0, 0); } catch (e) {} }
  }

  function renderChips() {
    var c = S.counts, html = '';
    Core.CATS.forEach(function (cat) {
      var n = c[cat] || 0;
      if (cat !== '全部' && !n) return;
      html += '<button class="chip' + (S.cat === cat ? ' on' : '') + '" data-cat="' + esc(cat) + '">' +
        esc(cat) + '<b>' + n + '</b></button>';
    });
    els.chips.innerHTML = html;
  }

  function cardHTML(it) {
    var ic = iconOf(it);
    var glyph = GLYPH[it.cat] || '📦';
    var img = ic
      ? '<img src="' + esc(ic) + '" alt="" loading="lazy" decoding="async">'
      : '<span class="glyph">' + glyph + '</span>';
    var badge = it.s !== 64 ? '<span class="badge">x' + it.s + '</span>' : '';
    var nm = nameOf(it);
    var dir = (S.lang === 'ar_sa') ? ' dir="rtl"' : '';
    return '<button class="card' + (it.b ? ' is-variant' : '') + '" data-n="' + esc(it.n) + '">' +
      '<span class="ico">' + img + badge + (it.b ? '<span class="vmark">变体</span>' : '') + '</span>' +
      '<span class="nm"' + dir + '>' + esc(nm) + '</span>' +
      '<span class="en">' + esc(it.en) + '</span>' +
      '</button>';
  }

  function renderMore() {
    var total = S.shown.length;
    if (S.shownCount >= total) { updateStat(); return; }
    var end = Math.min(S.shownCount + PAGE, total);
    var html = '';
    for (var i = S.shownCount; i < end; i++) html += cardHTML(S.shown[i]);
    els.grid.insertAdjacentHTML('beforeend', html);
    S.shownCount = end;
    updateStat();
  }

  function updateStat() {
    var total = S.shown.length;
    if (S.loading) { els.stat.textContent = '加载中…'; return; }
    var vm = S.vmeta || {};
    var fam = vm.family === 'bedrock' ? '基岩版 ' : 'Java ';
    var split = vm.variants ? '（物品 ' + vm.items + ' + 变体 ' + vm.variants + '）' : '';
    els.stat.textContent = total + ' 条' + (total > S.shownCount ? '（已显示 ' + S.shownCount + '）' : '') +
      ' · ' + fam + vm.label + ' 共 ' + S.items.length + ' 条' + split;
    els.subline.textContent = fam + vm.label + ' · ' + total + ' 命中' + (S.q ? ' · “' + S.q + '”' : '');
  }

  /* ---------- 详情 ---------- */
  function findItem(n) {
    for (var i = 0; i < S.items.length; i++) if (S.items[i].n === n) return S.items[i];
    return null;
  }

  function jumpChips(list, label) {
    if (!list || !list.length) return '';
    var html = '<div class="d-sec"><h3>' + esc(label) + ' <span class="cnt">' + list.length + '</span></h3><div class="jumps">';
    list.forEach(function (v) {
      html += '<button class="jump-chip" data-jump="' + esc(v.n) + '">' + esc(nameOf(v)) + '</button>';
    });
    return html + '</div></div>';
  }

  function openDetail(it) {
    var ic = iconOf(it);
    var glyph = GLYPH[it.cat] || '📦';
    var imgBig = ic ? '<img src="' + esc(ic) + '" alt="">' : '<span class="glyph">' + glyph + '</span>';
    var nm = nameOf(it);
    var sub = nm !== it.en ? it.en : it.n;
    var dir = (S.lang === 'ar_sa') ? ' dir="rtl"' : '';
    var tags = '<span class="tag hot">' + esc(it.cat) + '</span>';
    if (it.b) tags += '<span class="tag vtag">' + esc(Core.VKIND[it.c[0]] || '变体') + '</span>';
    (it.tags || []).forEach(function (t) {
      if (t !== it.cat) tags += '<span class="tag">' + esc(t) + '</span>';
    });

    var rows = Core.details(it, S.packs[S.lang], S.lang, S.version).map(function (r) {
      var val = esc(r[1]);
      if (r[0] === 'ID' || r[0] === '贴图') val = '<code>' + val + '</code>';
      return '<div class="d-row"><span class="k">' + esc(r[0]) + '</span><span class="v">' + val + '</span></div>';
    }).join('');

    var cmd = Core.giveCommand(it, S.version);
    var note = it.b ? Core.variantNote(it) : '';
    var cmdHTML;
    if (cmd) {
      cmdHTML = '<div class="d-cmd"><div class="lbl">获取命令' + (it.b && !Core.isBedrock(S.version) ? '（' + (Core.vge(S.version, '1.20.5') ? '1.20.5+ 组件语法' : '旧版 NBT 语法') + '）' : '') + '</div><code>' + esc(cmd) + '</code>' +
        '<div class="btns"><button class="btn primary" data-copy="' + esc(cmd) + '">复制命令</button>' +
        '<button class="btn" data-copy="' + esc(it.b ? it.b : it.n) + '">复制 ID</button></div></div>';
    } else {
      cmdHTML = '<div class="d-cmd"><div class="lbl">获取命令</div><p class="d-note">' + esc(note || '该条目没有直接对应的 /give 命令。') + '</p>' +
        '<div class="btns"><button class="btn" data-copy="' + esc(it.b ? it.b : it.n) + '">复制 ID</button></div></div>';
    }

    var stRows = Core.stateRows(it, S.lang);
    var stateHTML = '';
    if (stRows.length) {
      var stHtml = stRows.map(function (r) {
        return '<div class="d-row"><span class="k">' + esc(r[0]) + '</span><span class="v mono">' + esc(r[1]) + '</span></div>';
      }).join('');
      stateHTML = '<div class="d-sec"><h3>方块状态属性 <span class="cnt">' + (it.sc ? it.sc + ' 种组合' : stRows.length + ' 个属性') + '</span></h3>' +
        '<div class="d-table">' + stHtml + '</div></div>';
    }

    var baseHTML = '';
    if (it.b) {
      var bIt = findItem(it.b);
      if (bIt) baseHTML = '<div class="d-sec"><button class="btn wide" data-jump="' + esc(bIt.n) + '">查看基础物品：' + esc(nameOf(bIt)) + '</button></div>';
    } else {
      baseHTML = jumpChips(S.byBase[it.n], '相关变体');
    }

    els.sheetContent.innerHTML =
      '<div class="d-head"><div class="big">' + imgBig + '</div><div class="d-title">' +
      '<h2' + dir + '>' + esc(nm) + '</h2><p>' + esc(sub) + '</p></div></div>' +
      '<div class="d-tags">' + tags + '</div>' +
      (note && cmd ? '<p class="d-note">' + esc(note) + '</p>' : '') +
      cmdHTML +
      baseHTML +
      stateHTML +
      '<div class="d-sec"><h3>属性</h3><div class="d-table">' + rows + '</div></div>';
    els.sheet.hidden = false;
    document.body.style.overflow = 'hidden';
    els.sheet.querySelector('.sheet-body').scrollTop = 0;
  }
  function closeDetail() {
    els.sheet.hidden = true;
    els.sheetContent.innerHTML = '';
    document.body.style.overflow = '';
  }

  /* ---------- 事件 ---------- */
  var qTimer = null;
  els.q.addEventListener('input', function () {
    var v = els.q.value;
    els.clear.hidden = !v;
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      S.q = v;
      applyFilter();
    }, 110);
  });
  els.clear.addEventListener('click', function () {
    els.q.value = ''; els.clear.hidden = true; S.q = '';
    applyFilter(); els.q.focus();
  });

  els.chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b) return;
    S.cat = b.getAttribute('data-cat');
    applyFilter(true);
  });

  els.grid.addEventListener('click', function (e) {
    var b = e.target.closest('.card');
    if (!b) return;
    var it = findItem(b.getAttribute('data-n'));
    if (it) openDetail(it);
  });

  els.sheetContent.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]');
    if (c) { copyText(c.getAttribute('data-copy')); return; }
    var j = e.target.closest('[data-jump]');
    if (j) {
      var it = findItem(j.getAttribute('data-jump'));
      if (it) openDetail(it);
    }
  });
  els.sheet.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeDetail();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!els.sheet.hidden) closeDetail(); return; }
    if (e.key === '/' && document.activeElement !== els.q) {
      e.preventDefault(); els.q.focus();
    }
  });

  els.themeBtn.addEventListener('click', function () {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t);
  });

  els.verSel.addEventListener('change', function () {
    store('version', els.verSel.value);
    els.subline.textContent = '加载中…';
    loadVersion(els.verSel.value);
  });
  els.langSel.addEventListener('change', function () {
    S.lang = els.langSel.value;
    store('lang', S.lang);
    els.subline.textContent = '加载语言…';
    loadPack(S.lang).then(rebuild).catch(function () { toast('语言包加载失败'); });
  });

  /* 滚动加载 */
  function observeSentinel() {
    if (!('IntersectionObserver' in window)) {
      window.addEventListener('scroll', function () {
        if (window.innerHeight + window.scrollY > document.body.offsetHeight - 600) renderMore();
      });
      return;
    }
    S.io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) renderMore(); });
    }, { rootMargin: '600px' });
    S.io.observe(els.sentinel);
  }

  /* ---------- 初始化 ---------- */
  function fillSelects() {
    var groups = { java: 'Java 版', bedrock: '基岩版（Bedrock）' };
    var html = '', cur = null;
    META.versions.forEach(function (v) {
      var fam = v.family || 'java';
      if (fam !== cur) {
        if (cur) html += '</optgroup>';
        html += '<optgroup label="' + esc(groups[fam] || fam) + '">';
        cur = fam;
      }
      html += '<option value="' + esc(v.id) + '">' + esc(v.label) + '（' + v.count + '）</option>';
    });
    if (cur) html += '</optgroup>';
    els.verSel.innerHTML = html;
    var langs = [{ code: 'en_us', label: 'English' }].concat(META.langs);
    els.langSel.innerHTML = langs.map(function (l) {
      return '<option value="' + esc(l.code) + '">' + esc(l.label) + '</option>';
    }).join('');
  }

  function init() {
    applyTheme(store('theme') || 'dark');
    var v0 = store('version');
    var l0 = store('lang');
    var okv = META.versions.some(function (v) { return v.id === v0; });
    var firstJava = null;
    META.versions.forEach(function (v) { if (!firstJava && (v.family || 'java') === 'java') firstJava = v.id; });
    var vStart = okv ? v0 : (firstJava || (META.versions[0] && META.versions[0].id));
    if (l0 === 'en_us') S.lang = 'en_us';
    else if (META.langs.some(function (l) { return l.code === l0; })) S.lang = l0;
    fillSelects();
    els.verSel.value = vStart;
    els.langSel.value = S.lang;
    if (els.built) {
      els.built.textContent = '构建时间 ' + (META.built || '') + ' · 图标 ' + (META.iconCount || '') + ' 张 · 变体 ' + (META.variantCount || '') + ' 条';
    }
    observeSentinel();
    els.subline.textContent = '加载中…';
    loadVersion(vStart);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
