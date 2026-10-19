const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');
function game(arena = false) {
  const s = { document: { currentScript: null, createElement: () => ({}), head: { appendChild() {} } }, Math: Object.create(Math) };
  s.window = s;
  vm.createContext(s);
  for (const file of ['public/data.js', 'public/setvi.js', 'src/client/core/item-sets-01.js', 'src/client/data/equipment-and-zone-patches-01.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), s);
  s.S = s.JX;
  s.vA = s.S.factions.filter(f => f.skills?.length);
  s.I = Object.fromEntries(s.vA.map(f => [f.key, f]));
  s.g0 = s.S.series;
  const nodes = new Map();
  s.m = selector => {
    if (selector === '#arena') return { addEventListener(type, fn) { s.tap = fn; }, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
    if (selector === '#combat-sandbox') return { appendChild(button) { s.shortcut = button; } };
    if (!nodes.has(selector)) nodes.set(selector, { querySelector: () => ({ focus() {} }), innerHTML: '' });
    return nodes.get(selector);
  };
  s.o = { fac: 'shaolin', sex: 0, inv: [], uid: 10 };
  s.l = {}; s.INV_MAX = 100; s.O0 = { w: 1000, h: 1000 };
  s.combatSandbox = arena ? {} : null;
  s.D = String; s.F0 = () => 0; s.Zi = line => `${line.a}: ${line.p}`;
  s.$8 = () => 1; s.B0 = { x: 0, y: 0 };
  s.J = (html, mount) => { s.html = html; mount(); };
  s.k = message => { s.toast = message; };
  s.$ = () => { s.saved = JSON.parse(JSON.stringify(s.o)); };
  s.V = () => {}; s.x1 = () => false;
  for (const [file, names] of [
    ['src/client/gameplay/equipment-01.js', ['k6']],
    ['src/client/core/helpers-and-config-01.js', ['un', 'Wr']],
    ['src/client/combat/skills-01.js', ['V2', 'G5', 's4']],
    ['src/client/core/attributes-01.js', ['Y2', 'Dt']],
    ['src/client/gameplay/equipment-02.js', ['Mp', 'Hp', '$a']],
    ['src/client/gameplay/crafting-01.js', ['K1', 'V6', 'F6', 'cA']],
  ]) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = acorn.parse(source, { ecmaVersion: 'latest' });
    for (const name of names) {
      const node = ast.body.find(n => n.type === 'VariableDeclaration' && n.declarations.some(d => d.id.name === name));
      if (node) vm.runInContext(source.slice(node.start, node.end), s);
    }
  }
  for (const template of s.S.sets.gold) s.cA(template); // Warm the existing family cache.
  vm.runInContext(fs.readFileSync('src/client/gameplay/equipment-trader-01.js', 'utf8'), s);
  return s;
}
function selection(s, item = s.equipmentTrader.blueCatalog(0)[0], series = 0) {
  const lines = [], used = new Set();
  for (let i = 0; i < 6; i++) {
    const entry = s.equipmentTrader.affixes(item, series, i).find(entry => !used.has(entry.a));
    if (!entry) break;
    lines.push(entry.a); used.add(entry.a);
  }
  return { kind: 'blue', sex: 0, item: item.key, series, lines };
}
function inRange(actual, ranges) {
  actual.forEach((value, i) => {
    const [a, b] = ranges[i];
    const max = Math.max(a, b), min = a === b ? a : Math.max(Math.min(a, b), Math.ceil(max * .9));
    assert.ok(value >= min && value <= max, `${value} outside ${min}..${max}`);
  });
}
test('blue catalog contains eight equipment slots and both weapon groups at level 10, respects sex and allows all five elements', () => {
  const s = game(), trader = s.equipmentTrader;
  for (const sex of [0, 1]) {
    const catalog = trader.blueCatalog(sex);
    assert.deepEqual([...new Set(catalog.map(item => item.d))].sort(), [0,1,2,3,4,5,6,7,8,9]);
    assert.ok(catalog.every(item => item.lvl === 10 && (!item.req.some(([id, value]) => id === 38 && value >= 0 && value !== sex))));
    for (const item of catalog) for (let series = 0; series < 5; series++) {
      const pick = { ...selection(s, item, series), sex };
      const uid = s.o.uid;
      const [preview] = trader.preview(pick);
      assert.equal(s.o.uid, uid);
      assert.equal(preview.s, series);
      assert.equal(preview.mag.length, pick.lines.length);
      preview.mag.forEach((line, i) => {
        const entry = trader.affixes(item, series, i).find(entry => entry.a === line.a);
        assert.equal(line.pre, i % 2 ? 0 : 1);
        inRange(line.p, entry.p);
      });
    }
  }
});
test('blue trades roll the selected lines within 90–100%, preserve templates, lock and persist independently', () => {
  const s = game(), t = s.equipmentTrader, pick = selection(s);
  const before = JSON.stringify(s.S.items);
  for (const random of [0, .3, .999999999]) {
    s.Math.random = () => random;
    const [item] = t.trade(pick);
    item.mag.forEach((line, i) => inRange(line.p, t.affixes(t.blueCatalog(0)[0], 0, i).find(e => e.a === line.a).p));
    assert.equal(item.lock, true);
  }
  assert.equal(s.o.inv.length, 3);
  assert.equal(new Set(s.o.inv.map(i => i.uid)).size, 3);
  assert.equal(s.saved.inv.length, 3);
  assert.equal(JSON.stringify(s.S.items), before);
  s.o.inv[0].base[0][1] = 99999;
  assert.notEqual(s.o.inv[0].base[0][1], s.o.inv[1].base[0][1]);
});
test('invalid selections and full inventories never award partial items or consume UIDs', () => {
  const s = game(), t = s.equipmentTrader, pick = selection(s), uid = s.o.uid;
  for (const bad of [{ ...pick, kind: 'bad' }, { ...pick, sex: 2 }, { ...pick, series: 5 }, { ...pick, item: '10:0' }, { ...pick, lines: [] }, { ...pick, lines: [999999] }, { ...pick, lines: [pick.lines[0], pick.lines[0]] }]) assert.throws(() => t.trade(bad));
  s.INV_MAX = 0;
  assert.throws(() => t.trade(pick), /ô trống/);
  assert.equal(s.o.inv.length, 0);
  assert.equal(s.o.uid, uid);
});
test('every faction offers complete original HKMP sets and rolls both normal and set bonus lines', () => {
  const s = game(), t = s.equipmentTrader;
  const original = JSON.stringify(s.S.sets.gold);
  for (const faction of Object.keys(s.I)) {
    const sets = t.goldCatalog(faction);
    assert.ok(sets.length, faction);
    for (const set of sets) {
      const pick = { kind: 'gold', faction, set: set.key };
      for (const random of [0, .999999999]) {
        s.o.inv = []; s.Math.random = () => random;
        const items = t.trade(pick);
        assert.equal(items.length, set.items.length);
        assert.equal(t.preview(pick).length, items.length);
        items.forEach((item, i) => {
          const template = set.items[i];
          assert.equal(item.set.grp, template.grp);
          assert.equal(item.set.sid, template.sid);
          assert.ok(item.req.some(([id, value]) => id === 39 && value === s.I[faction].id));
          for (const key of ['mag', 'ext']) item[key].forEach((line, j) => inRange(line.p, s.S.ge[template[key][j]].p));
        });
      }
      s.o.inv = []; s.INV_MAX = set.items.length - 1;
      const uid = s.o.uid;
      assert.throws(() => t.trade(pick), /trọn bộ/);
      assert.equal(s.o.inv.length, 0); assert.equal(s.o.uid, uid);
      s.INV_MAX = 100;
    }
  }
  assert.equal(JSON.stringify(s.S.sets.gold), original);
});
test('NPC can be placed, hidden and removed; arena mounts it and its shortcut; taps do not move or attack', () => {
  const s = game(true), t = s.equipmentTrader;
  assert.equal(t.entities().length, 1);
  assert.ok(s.shortcut);
  s.shortcut.onclick();
  assert.match(s.html, /Thần Trang Sứ Giả/);
  const root = s.m('#mBody .equipment-trader');
  root.onclick({ target: { closest: () => ({ dataset: { traderKind: 'gold' } }) } });
  assert.match(s.html, /Xem trước trọn bộ/);
  assert.equal((s.html.match(/data-trader-inspect=/g) || []).length, t.goldCatalog('shaolin')[0].items.length);
  let visible = false;
  const npc = t.place({ x: 25, y: 200, visible: () => visible });
  assert.equal(t.entities().length, 1);
  visible = true;
  assert.equal(t.entities().length, 2);
  let prevented = false, stopped = false;
  s.tap({ clientX: 25, clientY: 180, preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; } });
  assert.ok(prevented && stopped);
  npc.remove(); assert.equal(t.entities().length, 1);
  assert.equal(game().equipmentTrader.entities().length, 0);
});
test('NPC keeps its fixed boss019 sprite independently of player equipment and appearance', () => {
  const s = game(), draws = [];
  s.Jn = 1.35;
  s.Va = (...args) => draws.push(args);
  s.Jt = s.kf = s.bA = () => { throw new Error('NPC must not use player appearance or merchant image'); };
  const context = new Proxy({ drawImage: (...args) => draws.push(args) }, { get: (obj, key) => obj[key] || (() => {}) });
  const npc = s.equipmentTrader.place({ x: 300, y: 400 });
  s.equipmentTrader.draw(context, npc);
  s.o.sex = 1; s.o.fac = 'wudang'; s.o.eq = { armor: { n: 'New armor' }, weapon: { n: 'New weapon' } };
  s.equipmentTrader.draw(context, npc);
  assert.equal(draws.length, 2);
  assert.deepEqual(draws[0], draws[1]);
  assert.equal(draws[0][0], 'boss019');
  assert.equal(draws[0][1], 'st');
});
test('all level-10 weapons build ten pieces that satisfy the real elemental activation rules', () => {
  const s = game(), t = s.equipmentTrader;
  for (const sex of [0, 1]) for (const weapon of t.blueCatalog(sex).filter(item => item.d <= 1)) for (let series = 0; series < 5; series++) {
    const pick = { ...selection(s, weapon, series), sex };
    const uid = s.o.uid;
    const preview = t.compatiblePreview(pick);
    assert.equal(s.o.uid, uid);
    assert.equal(preview.length, 10);
    const eq = Object.fromEntries(preview.map(entry => [entry.slot, entry.item]));
    assert.equal(Object.keys(eq).length, 10);
    assert.equal(eq.weapon.k, weapon.k); assert.equal(eq.weapon.d, weapon.d); assert.equal(eq.weapon.s, series);
    for (const item of Object.values(eq)) {
      assert.equal(item.lvl, 10);
      assert.ok(item.req.every(([kind, value]) => kind !== 38 || value < 0 || value === sex));
      assert.ok(item.req.every(([kind, value]) => kind !== 39 || value < 0 || value === s.I[s.o.fac].id));
      assert.ok(s.Dt(item, eq) >= 2, `${item.n} / ${item.s}`);
    }
    s.o.inv = [];
    const items = t.tradeCompatible(pick);
    assert.equal(items.length, 10); assert.equal(s.saved.inv.length, 10);
    assert.equal(new Set(items.map(item => item.uid)).size, 10);
    const receivedEq = Object.fromEntries(preview.map((entry, i) => [entry.slot, items[i]]));
    for (const item of items) {
      assert.ok(s.Dt(item, receivedEq) >= 2);
      assert.ok(item.lock);
      const source = t.blueCatalog(sex).find(template => template.key === `${item.d}:${item.k}`);
      item.mag.forEach((line, index) => inRange(line.p, t.affixes(source, item.s, index).find(entry => entry.a === line.a).p));
    }
    assert.deepEqual(Array.from(items[0].mag, line => line.a), Array.from(pick.lines));
  }
});
test('compatible kits require a blue weapon and enough space, without partial rewards or UID consumption', () => {
  const s = game(), t = s.equipmentTrader;
  const weapon = t.blueCatalog(0).find(item => item.d === 0);
  const pick = selection(s, weapon, 3);
  s.INV_MAX = 9;
  const uid = s.o.uid;
  assert.throws(() => t.tradeCompatible(pick), /10 ô trống/);
  assert.equal(s.o.uid, uid); assert.equal(s.o.inv.length, 0);
  assert.throws(() => t.tradeCompatible(selection(s)), /vũ khí/);
  assert.throws(() => t.tradeCompatible({ ...pick, kind: 'gold' }), /vũ khí/);
  s.o.fac = null;
  assert.throws(() => t.tradeCompatible(pick), /vào game/);
});
test('NPC grants two independent original Can Khon rings with +2 all skills and handles full inventory', () => {
  const s = game(), t = s.equipmentTrader;
  const items = t.grantRings();
  assert.equal(items.length, 2); assert.notEqual(items[0].uid, items[1].uid);
  for (const item of items) {
    assert.equal(item.n, 'Càn Khôn Giới Chỉ'); assert.equal(item.ic, 'img/i/g44.png');
    assert.equal(item.mag.find(line => line.a === 139).p[0], 2);
    assert.equal(item.set.kind, 'gold'); assert.equal(item.lock, true);
  }
  assert.notEqual(items[0].mag, items[1].mag);
  assert.equal(s.saved.inv.length, 2);
  s.INV_MAX = 3;
  const uid = s.o.uid;
  assert.throws(() => t.grantRings(), /2 ô trống/);
  assert.equal(s.o.uid, uid); assert.equal(s.o.inv.length, 2);
});
test('compatible action is visible only for blue weapons and rings are always offered by the NPC', () => {
  const s = game(), t = s.equipmentTrader;
  t.open();
  assert.doesNotMatch(s.html, /data-trader-compatible/); assert.match(s.html, /data-trader-rings/);
  const click = dataset => s.m('#mBody .equipment-trader').onclick({ target: { closest: () => ({ dataset }) } });
  click({ traderChoice: 'slot', value: '0' });
  assert.match(s.html, /data-trader-compatible/); assert.match(s.html, /Bộ ngũ hành tương thích/);
  click({ traderKind: 'gold' });
  assert.doesNotMatch(s.html, /data-trader-compatible/); assert.match(s.html, /data-trader-rings/);
});
