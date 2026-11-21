/* MC 物品查询器 —— 纯数据逻辑（可在 node 中测试，不依赖 DOM） */
(function (root) {
  'use strict';

  var CATS = ['全部', '方块', '工具', '武器', '护甲', '食物', '药水', '刷怪蛋', '杂项'];
  /* 注意：分类 chips 的顺序以 CATS 为准，细节里沿用 */

  var VKIND = {
    potion: '药水', splash: '喷溅药水', lingering: '滞留药水', arrow: '药箭',
    book: '附魔书', horn: '山羊角', paint: '画作', rocket: '烟花火箭', shape: '烟火之星'
  };

  /* 方块状态属性名中文（zh_cn 下显示） */
  var PROP_CN = {
    facing: '朝向', half: '半砖位置', shape: '形状', axis: '轴向', age: '生长阶段',
    power: '红石强度', level: '液面高度', waterlogged: '含水', up: '上方连接', down: '下方连接',
    north: '北侧', south: '南侧', east: '东侧', west: '西侧', side: '侧面',
    rotation: '旋转', rotation_16: '旋转', powered: '已充能', lit: '点燃', open: '打开',
    occupied: '占用中', part: '部位', attachment: '连接方式', mode: '模式', type: '类型',
    snowy: '积雪', distance: '距离', persistent: '常驻', leaves: '叶子类型', bites: '咬痕',
    moisture: '湿度', hatch: '孵化进度', instrument: '乐器', note: '音高', eye: '眼状',
    hinge: '铰链', conditional: '条件', delay: '延迟', locked: '上锁', orientation: '朝向',
    vertical_direction: '垂直方向', thickness: '厚度', tilt: '倾斜', vertical: '垂直',
    dusted: '洒落', cracks: '裂纹', honey_level: '蜂蜜量', candles: '蜡烛数', stage: '阶段',
    drag: '阻力', bottom: '底部', hat: '帽', eggs: '蛋数', pickles: '泡菜数', berries: '浆果',
    bloom: '开花', can_summon: '可召唤', ominous: '凶兆', signal_fire: '信号火',
    has_record: '有唱片', has_book: '有书', in_wall: '嵌墙', unattached: '未连接',
    sculk_sensor_phase: '判定阶段', natural: '自然生成', flower_amount: '花数量',
    segment_amount: '节数', tip: '尖端', powered_state: '供电', tilted: '倾斜'
  };
  /* 方块状态枚举值中文 */
  /* 基岩版属性中文名 */
  var PROP_CN2 = {
    weirdo_direction: '朝向', cardinal_direction: '朝向', direction: '朝向', upside_down_bit: '倒置',
    corner: '连接角', candles: '蜡烛数量', candle: '蜡烛', growth: '生长值', stage: '阶段',
    moisture: '湿度', redstone_signal: '红石信号强度', button_pressed_bit: '按下', toggle_bit: '开关',
    occupied_bit: '占用', powered_bit: '已充能', open_bit: '已打开', hanging: '悬挂', extinguished: '熄灭',
    pillar_axis: '柱轴', rail_direction: '朝向', rail_data_bit: '坡道', repeater_delay: '延迟',
    hydrated_bit: '含水', coral_hang_type_bit: '珊瑚朝向', dead_bit: '死亡', color_bit: '颜色',
    flammable: '可燃', strike: '雷击', tips: '尖端', trained: '已驯服', active: '激活', lever_direction: '朝向'
  };
  var BOOL_PROPS = {
    lit: 1, waterlogged: 1, persistent: 1, snowy: 1, hanging: 1, extinguished: 1, upside_down_bit: 1,
    button_pressed_bit: 1, toggle_bit: 1, occupied_bit: 1, powered_bit: 1, open_bit: 1, powered: 1,
    conditional: 1, in_wall: 1, rail_data_bit: 1, hydrated_bit: 1, flammable: 1, active: 1, dead_bit: 1
  };
  var DIR_CN = ['南', '西', '北', '东'];

  var VAL_CN = {
    north: '北', south: '南', east: '东', west: '西', up: '上', down: '下',
    top: '上', bottom: '下', double: '双层', straight: '直', inner_left: '内左',
    inner_right: '内右', outer_left: '外左', outer_right: '外右', none: '无',
    true: '是', false: '否', x: 'X 轴', y: 'Y 轴', z: 'Z 轴', floor: '地面',
    ceiling: '天花板', wall: '墙面', single: '单个', left: '左', right: '右',
    up_east_west: '上·东西', down_east_west: '下·东西', up_north_south: '上·南北', down_north_south: '下·南北',
    up_east: '上·东', up_west: '上·西', up_north: '上·北', up_south: '上·南', down_east: '下·东', down_west: '下·西', down_north: '下·北', down_south: '下·南',
    both: '双', head: '床头', foot: '床尾', small: '小', large: '大', normal: '普通',
    ascending: '上升', descending: '下降', open: '开', closed: '关', side: '侧面'
  };

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[\s_\-]/g, '');
  }

  function isVariant(it) { return !!(it && it.b); }

  function baseName(it) { return it && it.b ? it.b : null; }

  function locName(n, pack) {
    if (!pack) return null;
    var v = pack.i && pack.i[n];
    if (v == null && pack.b) v = pack.b[n];
    return v == null ? null : v;
  }

  /* 取一个物品 / 变体在指定语言下的显示名 */
  function nameOf(item, pack, lang) {
    if (!item) return '';
    if (!pack || lang === 'en_us') return item.en || item.n;
    if (item.b && pack.vn && pack.vn[item.n]) return pack.vn[item.n];
    var v = locName(item.n, pack);
    return v != null ? v : (item.en || item.n);
  }

  /* 构建搜索索引：hay 为可命中字符串 */
  function buildIndex(items, pack) {
    var out = new Array(items.length);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var parts = [it.n, it.en || '', it.n.replace(/_/g, ' ').replace(/#/g, ' ')];
      if (it.b) parts.push(it.b);
      var py = pack && pack.py && pack.py[it.n];
      if (py) parts.push(py[0], py[1], py[2]);
      var vpy = pack && pack.vp && pack.vp[it.n];
      if (vpy) parts.push(vpy[0], vpy[1], vpy[2]);
      var loc = locName(it.n, pack);
      if (loc && loc !== it.n) parts.push(loc);
      if (it.b && pack && pack.vn && pack.vn[it.n]) parts.push(pack.vn[it.n]);
      out[i] = { it: it, hay: norm(parts.join('\u0001')) };
    }
    return out;
  }

  /* 过滤：q 支持空格分词（AND），cat 为分类名或 '全部' */
  function filter(index, q, cat) {
    var tokens = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean).map(norm).filter(Boolean);
    var res = [];
    for (var i = 0; i < index.length; i++) {
      var e = index[i];
      var it = e.it;
      if (cat && cat !== '全部') {
        var hit = it.cat === cat || (it.tags && it.tags.indexOf(cat) >= 0);
        if (!hit) continue;
      }
      var ok = true;
      for (var k = 0; k < tokens.length; k++) {
        if (e.hay.indexOf(tokens[k]) < 0) { ok = false; break; }
      }
      if (ok) res.push(it);
    }
    return res;
  }

  /* 分类计数 */
  function countByCat(items) {
    var c = {};
    CATS.forEach(function (k) { c[k] = 0; });
    items.forEach(function (it) {
      c[it.cat] = (c[it.cat] || 0) + 1;
      if (it.tags) it.tags.forEach(function (t) { c[t] = (c[t] || 0) + 1; });
    });
    c['全部'] = items.length;
    return c;
  }

  /* ---------- 版本 ---------- */
  function isBedrock(ver) { return String(ver || '').indexOf('be:') === 0; }
  function vnum(ver) {
    var s = String(ver || '').replace(/^be:/, '').split('-')[0];
    var p = s.split('.');
    return [parseInt(p[0], 10) || 0, parseInt(p[1], 10) || 0, parseInt(p[2], 10) || 0];
  }
  function vge(ver, other) {
    var a = vnum(ver), b = vnum(other);
    for (var i = 0; i < 3; i++) {
      if (a[i] > b[i]) return true;
      if (a[i] < b[i]) return false;
    }
    return true;
  }

  /* /give 命令：java 1.20.5+ 用组件语法，更早用 NBT；基岩版直接给 ID */
  function giveCommand(it, ver) {
    var name = it.n;
    if (isBedrock(ver)) {
      return '/give @p ' + (it.b ? it.b : name);
    }
    if (!it.b) return '/give @p ' + name + ' 1';
    var c = it.c || [];
    var k = c[0];
    var comp = vge(ver || '26.1', '1.20.5');
    if (k === 'potion' || k === 'splash' || k === 'lingering' || k === 'arrow') {
      var base = { potion: 'potion', splash: 'splash_potion', lingering: 'lingering_potion', arrow: 'tipped_arrow' }[k];
      return comp
        ? '/give @p ' + base + '[potion_contents={potion:"minecraft:' + c[1] + '"}]'
        : '/give @p ' + base + '{Potion:"minecraft:' + c[1] + '"}';
    }
    if (k === 'book') {
      return comp
        ? '/give @p enchanted_book[stored_enchantments={levels:{"minecraft:' + c[1] + '":' + c[2] + '}}]'
        : '/give @p enchanted_book{StoredEnchantments:[{id:"minecraft:' + c[1] + '",lvl:' + c[2] + '}]}';
    }
    if (k === 'horn') {
      return comp
        ? '/give @p goat_horn[instrument="minecraft:' + c[1] + '"]'
        : '/give @p goat_horn{instrument:"minecraft:' + c[1] + '"}';
    }
    if (k === 'rocket') {
      return comp
        ? '/give @p firework_rocket[fireworks={flight_duration:' + c[1] + '}]'
        : '/give @p firework_rocket{Fireworks:{Flight:' + c[1] + '}}';
    }
    return '';
  }

  /* 变体自带说明（没有命令时显示） */
  function variantNote(it) {
    var k = it && it.c ? it.c[0] : null;
    if (k === 'paint') return '画作的具体图案由放置位置 / 随机决定，游戏内无法用一条命令稳定指定（不同版本机制不同），这里只列出画作名称与作者。';
    if (k === 'shape') return '烟火之星的形状由合成配方决定（火球=大型球状、金粒=星形、羽毛=喷发状、头颅=苦力怕状、默认=小型球状），/give 要连颜色一起写进 fireworks 组件，这里仅列出形状名称。';
    return '';
  }

  /* 解析方块状态字符串 "facing=north|south" */
  function parseStates(it) {
    var out = [];
    (it && it.bs || []).forEach(function (s) {
      var i = s.indexOf('=');
      if (i < 0) return;
      out.push([s.slice(0, i), s.slice(i + 1).split('|')]);
    });
    return out;
  }

  /* 方块状态行（zh_cn 下翻译常见属性与枚举值） */
  function propCn(raw) {
    var n = raw.indexOf('minecraft:') === 0 ? raw.slice(10) : raw;
    return PROP_CN[n] || PROP_CN2[n] || n;
  }
  function valCn(raw, v) {
    var n = raw.indexOf('minecraft:') === 0 ? raw.slice(10) : raw;
    if (BOOL_PROPS[n]) {
      if (v === '1' || v === 'true') return '是';
      if (v === '0' || v === 'false') return '否';
    }
    if (n === 'weirdo_direction' || n === 'direction' || n === 'cardinal_direction' || n === 'rail_direction') {
      var i = parseInt(v, 10);
      if (!isNaN(i) && DIR_CN[i]) return DIR_CN[i];
    }
    if (n === 'redstone_signal' || n === 'moisture' || n === 'growth' || n === 'stage' || n === 'repeater_delay') {
      if (/^\d+$/.test(v)) return v;
    }
    return VAL_CN[v] || v;
  }
  function stateRows(it, lang) {
    var zh = lang === 'zh_cn';
    return parseStates(it).map(function (p) {
      var k = zh ? propCn(p[0]) : p[0].replace(/^minecraft:/, '');
      var vals = p[1].map(function (v) { return zh ? valCn(p[0], v) : v; });
      return [k, vals.join(' / ')];
    });
  }

  /* 详情字段，返回 [[k,v]]，v 为空则跳过 */
  function details(it, pack, lang, ver) {
    var rows = [];
    function add(k, v) { if (v !== undefined && v !== null && v !== '' && v !== false) rows.push([k, v]); }
    add('ID', it.n);
    add('英文名', it.en);
    var loc = locName(it.n, pack);
    if (it.b && pack && pack.vn && pack.vn[it.n]) loc = pack.vn[it.n];
    if (loc && lang !== 'en_us') add('当前语言名', loc);
    var py = (pack && pack.py && pack.py[it.n]) || (pack && pack.vp && pack.vp[it.n]);
    if (py && py[1] && lang === 'zh_cn') add('拼音', py[1]);
    if (it.b) {
      add('类型', '变体（' + (VKIND[it.c[0]] || '变体') + '）');
      var bn = pack ? locName(it.b, pack) : null;
      add('基础物品', bn ? bn + '（' + it.b + '）' : it.b);
      add('变体参数', it.c.slice(1).join(' / '));
    }
    add(isBedrock(ver) ? '基岩版 ID' : '数字 ID', it.id);
    add('最大堆叠', it.s);
    if (it.d) add('耐久', it.d);
    if (it.food) add('饥饿值 / 饱和度', it.food[0] + ' / ' + it.food[1]);
    var b = it.blk;
    if (b) {
      add('硬度', b.h);
      add('抗爆值', b.r);
      if (b.l) add('亮度', b.l);
      add('可采掘', b.dig ? '是' : '否');
      add('采掘工具', b.tool);
      add('透明', b.tr ? '是' : '否');
      if (it.sc) add('方块状态数', it.sc + ' 种');
      if (it.ds !== undefined) add('默认状态 ID', it.ds);
    }
    if (it.tags) add('分类', it.tags.join('、'));
    else add('分类', it.cat);
    add('贴图', it.ic);
    return rows;
  }

  var api = {
    CATS: CATS,
    VKIND: VKIND,
    norm: norm,
    isVariant: isVariant,
    baseName: baseName,
    nameOf: nameOf,
    buildIndex: buildIndex,
    filter: filter,
    countByCat: countByCat,
    giveCommand: giveCommand,
    variantNote: variantNote,
    parseStates: parseStates,
    stateRows: stateRows,
    details: details,
    isBedrock: isBedrock,
    vge: vge
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MCItemCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
