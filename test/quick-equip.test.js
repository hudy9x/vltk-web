const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');

function fixture() {
  const listeners = {};
  const s = vm.createContext({
    o: { fac: 'test', inv: [], eq: {} }, l: {}, R: false, INV_MAX: 20,
    rA: ['weapon', 'weapon', 'armor', 'ring', 'amulet', 'boot', 'belt', 'helm', 'cuff', 'pendant', 'horse'],
    p0: (item) => !item.unwearable, vt: () => ['cấp chưa đủ'], K0: (item) => item.score || 0,
    messages: [], sounds: [], refreshes: 0, closed: 0, hiddenTips: 0,
    k(message) { s.messages.push(message); }, o0(sound) { s.sounds.push(sound); },
    n0() { s.closed++; }, V() { s.refreshes++; }, S2() { s.hiddenTips++; },
    m: () => ({ classList: { contains: () => !s.modalOpen } }),
    window: { addEventListener() {} },
    document: { addEventListener(name, handler) { (listeners[name] ||= []).push(handler); } },
  });
  for (const [file, names] of [
    ['gameplay/equipment-01.js', ['JA']],
    ['ui/legacy-panels-and-audio-01.js', ['J1', 'Dv']],
    ['ui/world-panels-02.js', ['quickEquipContextMenu', 'xm']],
  ]) {
    const source = fs.readFileSync(path.join(__dirname, '../src/client', file), 'utf8');
    for (const node of acorn.parse(source, { ecmaVersion: 'latest' }).body) {
      if (node.type === 'VariableDeclaration' && names.includes(node.declarations[0].id.name))
        vm.runInContext(source.slice(node.start, node.end), s);
    }
  }
  s.xm(); s.xm();
  assert.equal(listeners.contextmenu.length, 1, 'register once');
  s.rightClick = (item, { slot, bag = true, nested = true } = {}) => {
    const button = {
      dataset: { uid: String(item.uid) },
      closest(selector) {
        if (selector === '#t-char .slot[data-slot]') return slot ? { dataset: { slot } } : null;
        return bag ? {} : null;
      },
    };
    const event = {
      target: nested ? { closest: () => button } : { closest: () => button },
      prevented: false, stopped: false,
      preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; },
    };
    listeners.contextmenu[0](event);
    return event;
  };
  return s;
}

test('right click equips every gear type and returns replaced equipment to inventory', () => {
  for (let d = 0; d <= 10; d++) {
    const s = fixture(), item = { uid: 1, d }, old = { uid: 2, d };
    const slot = d === 3 ? 'ring1' : s.rA[d];
    s.o.eq[slot] = old;
    if (d === 3) s.o.eq.ring2 = { uid: 3, d, score: 100 };
    s.o.inv.push(item);
    const e = s.rightClick(item);
    assert.equal(s.o.eq[slot], item);
    assert.ok(s.o.inv.includes(old));
    assert.ok(!s.o.inv.includes(item));
    assert.ok(e.prevented && e.stopped && s.l.dirty && s.R);
    assert.equal(s.refreshes, 1);
  }
});

test('right click removes the exact worn slot, including the second ring', () => {
  const s = fixture(), item = { uid: 1, d: 3 }, first = { uid: 2, d: 3 };
  s.o.eq = { ring1: first, ring2: item };
  s.rightClick(item, { slot: 'ring2', bag: false });
  assert.equal(s.o.eq.ring1, first);
  assert.equal(s.o.eq.ring2, undefined);
  assert.equal(s.o.inv[0], item);
  assert.equal(s.refreshes, 1);
});

test('requirements and full inventory still prevent invalid equip/unequip', () => {
  const s = fixture(), item = { uid: 1, d: 2, unwearable: true };
  s.o.inv.push(item); s.rightClick(item);
  assert.equal(s.o.eq.armor, undefined);
  assert.match(s.messages[0], /Chưa mặc được/);
  s.o.eq.armor = item;
  s.o.inv = Array.from({ length: s.INV_MAX }, (_, uid) => ({ uid: uid + 2 }));
  s.rightClick(item, { slot: 'armor', bag: false });
  assert.equal(s.o.eq.armor, item);
  assert.equal(s.o.inv.length, s.INV_MAX);
  assert.equal(s.messages.at(-1), 'Túi đầy');
  assert.equal(s.refreshes, 0);
});

test('ignores consumables, stale items, other panels and clicks behind modals', () => {
  const s = fixture();
  for (const item of [{ uid: 1, d: 2, pack: {} }, { uid: 2, d: 2, ktc: {} }, { uid: 3, d: 99 }]) {
    s.o.inv.push(item); assert.equal(s.rightClick(item).prevented, false);
  }
  const item = { uid: 4, d: 2 };
  assert.equal(s.rightClick(item).prevented, false);
  s.o.inv.push(item);
  assert.equal(s.rightClick(item, { bag: false }).prevented, false);
  s.modalOpen = true;
  assert.equal(s.rightClick(item).prevented, false);
  assert.equal(s.refreshes, 0);
});
