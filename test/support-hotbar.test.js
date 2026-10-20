const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { loadCombatEngine } = require('./helpers/combat-engine');
const supportFile = 'src/client/gameplay/shop-and-books-01.js';
const uiFile = 'src/client/ui/legacy-panels-and-audio-03.js';
function declaration(s, file, name) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const node = acorn.parse(source, { ecmaVersion: 'latest' }).body.find(node =>
    node.type === 'VariableDeclaration' && node.declarations.some(item => item.id.name === name));
  assert.ok(node, name); vm.runInContext(source.slice(node.start, node.end), s);
}
function game() {
  const attr = (effect, value, duration) => ({ [effect]: [[value, duration, 0]], skill_cost_v: [[10, 0, 0]] });
  const skills = {
    1: { id: 1, n: 'Attack', attack: true, req: 10, attr: {} },
    2: { id: 2, n: 'Buff', attr: attr('allres_p', 10, 180) },
    3: { id: 3, n: 'Heal', attr: attr('lifereplenish_v', 5, 36) },
    4: { id: 4, n: 'Curse', enemy: 1, attr: attr('physicsres_p', -10, 180) },
    5: { id: 5, n: 'Aura', aura: 1, attr: { fastwalkrun_p: [[5, 18, 0]] } },
    6: { id: 6, n: 'Passive', attr: {} },
    7: { id: 7, n: '120 support', tier: 120, attr: attr('allres_p', 10, 180) },
  };
  const s = vm.createContext({ Math, Set, Map, T: skills, Yn: {}, k7: 18, k4: 0,
    o: { fac: 'test', ctrl: 'manual', sk: Object.fromEntries(Object.keys(skills).map(id => [id, 1])), slots: [1, -1, -1, -1], main: 1, mainLock: true, trapV: 1 },
    l: { clock: 1, P: { life: 100, mana: 100, main: { id: 1 } }, life: 50, mana: 100, enemies: [], fx: [], zoneShown: 1 },
    v: { x: 0, y: 0 }, Y: {}, messages: [], contacts: [], saved: [],
    UA: skill => !!skill?.attack, zi: id => s.o.sk[id] || 0, i4: skill => skill.cost === 2,
    b0: (skill, key, level) => skill.attr[key]?.[level - 1] || null,
    te: () => false, hA: () => s.o.ctrl === 'manual', v7() {},
    k: message => s.messages.push(message), qA() {}, D0() {}, D: String, o0() {},
    $: () => s.saved.push(JSON.stringify(s.o)),
    za: amount => { s.l.life = Math.min(s.l.P.life, s.l.life + amount); },
    q0: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    _1: () => s.l.enemies.filter(actor => !actor.dead && actor.hp > 0),
    queueSkillContact: (actor, target, skill, hit) => s.contacts.push({ actor, target, skill, hit }),
  });
  const combat = loadCombatEngine(s, { bridge: false });
  for (const name of ['beginActorCast', 'actorActionLocked', 'advanceActorActions']) s[name] = combat[name];
  for (const name of ['B7', 'wn', 'ae', 'M7', 'ba', 'ya', 'b4', 'Ui', 'o6', '_7', 'canSlotSkill', 'castSupportSkill', 'A6']) declaration(s, supportFile, name);
  for (const name of ['nh', 'tn', 'th', 'Ac']) declaration(s, uiFile, name);
  return s;
}

test('slot picker includes implemented supports; assignment and swapping preserve main attack and auto preferences', () => {
  const s = game(); assert.deepEqual(Array.from(s.nh()), [1, 2, 3, 4, 5]);
  s.th(1, 2); s.th(2, 5); s.th(0, 2);
  assert.deepEqual(Array.from(s.o.slots), [2, 1, 5, -1]);
  assert.equal(s.o.main, 1); assert.equal(s.o.mainLock, true);
  assert.equal(s.o.supportAutoOff, undefined); assert.equal(s.o.autoBuff, undefined);
  s.th(3, 6); s.th(3, 7); s.th(3, 999); s.th(10, 2);
  assert.deepEqual(Array.from(s.o.slots), [2, 1, 5, -1]);
  s.o.sk[2] = 0; s.tn(); assert.equal(s.o.slots[0], 0);
  const restored = game(); restored.o = JSON.parse(s.saved[0]); restored.tn(); assert.equal(restored.o.slots[1], 2);
});

test('pressing a support slot casts once without replacing main attack; active buffs reject duplicate spending', () => {
  const s = game(); s.th(1, 2); s.Ac(1);
  assert.equal(s.l.mana, 90); assert.equal(s.ba().buff[2], 11); assert.equal(s.o.main, 1);
  s.advanceActorActions(1); s.Ac(1); assert.equal(s.l.mana, 90);
  assert.match(s.messages.at(-1), /vẫn còn hiệu lực/);
});

test('manual healing works without enemies or the auto HP threshold and shares the automatic cooldown', () => {
  const s = game(); s.o.sk = { 3: 1 }; s.l.life = 90; assert.equal(s.castSupportSkill(3), true);
  assert.equal(s.l.life, 100); assert.equal(s.ba().cd[3], 9); assert.equal(s.l.mana, 90);
  s.advanceActorActions(1); s.l.life = 10; s.A6(.5);
  assert.equal(s.ba().buff[3], undefined); assert.equal(s.l.life, 10);
  assert.equal(s.castSupportSkill(3), false);
  s.l.clock = 9; assert.equal(s.castSupportSkill(3), true); assert.equal(s.l.life, 30);
});

test('manual curses require a live selected target in range and apply effects only on contact', () => {
  const s = game(), enemy = { x: 100, y: 0, hp: 100 };
  s.l.enemies = [enemy]; assert.equal(s.castSupportSkill(4), false); assert.equal(s.l.mana, 100);
  s.l.manTgt = enemy; enemy.x = 500; assert.equal(s.castSupportSkill(4), false);
  enemy.x = 100; assert.equal(s.castSupportSkill(4), true); assert.equal(s.l.mana, 90);
  assert.equal(s.contacts[0].target, enemy); assert.equal(enemy.curse, undefined);
  s.contacts[0].hit(enemy); assert.equal(enemy.curse[4], 11);
  s.advanceActorActions(1); assert.equal(s.castSupportSkill(4), false); assert.equal(s.l.mana, 90);
});

test('support casts respect death, town, stun, hurt, cast locks, mana and life-cost reserve', () => {
  for (const setup of [s => s.l.town = true, s => s.l.deadT = 1, s => s.l.stunT = 1,
    s => s.v.hurtT = .5, s => s.v.castT = .5, s => s.l.mana = 9]) {
    const s = game(); setup(s); const mana = s.l.mana;
    assert.equal(s.castSupportSkill(2), false); assert.equal(s.l.mana, mana); assert.equal(s.ba().buff[2], undefined);
  }
  const s = game(); s.T[2].cost = 2; s.l.life = 30;
  assert.equal(s.castSupportSkill(2), false); s.l.life = 50;
  assert.equal(s.castSupportSkill(2), true); assert.equal(s.l.life, 40); assert.equal(s.l.mana, 100);
});

test('aura slots toggle their existing persisted state without changing main attack or consuming mana', () => {
  const s = game(); s.th(1, 5); assert.equal(s.o6(5), true);
  s.Ac(1); assert.equal(s.o6(5), false); assert.equal(s.o.auraOff[5], 1);
  s.Ac(1); assert.equal(s.o6(5), true); assert.equal(s.o.main, 1); assert.equal(s.l.mana, 100);
});

test('per-skill auto switches and global auto switches do not prevent pressing a support manually', () => {
  const s = game(); s.o.sk = { 2: 1 }; s.o.supportAutoOff = { 2: true }; s.A6(.5);
  assert.equal(s.l.mana, 100); assert.equal(s.ba().buff[2], undefined);
  s.o.autoBuff = false; assert.equal(s.castSupportSkill(2), true); assert.equal(s.l.mana, 90);
  const automatic = game(); automatic.o.sk = { 2: 1 }; automatic.A6(.5);
  assert.equal(automatic.ba().buff[2], 11); assert.equal(automatic.l.mana, 90);
});

test('configured cooldowns use game ticks, including horseback values, and auto cannot bypass a manual cast cooldown', () => {
  const s = game(); s.o.sk = { 2: 1 };
  s.T[2].attr.skill_mintimepercast_v = [[270, 0, 0]];
  assert.equal(s.castSupportSkill(2), true); assert.equal(s.ba().cd[2], 16);
  s.advanceActorActions(20); s.l.clock = 12; s.A6(.5);
  assert.equal(s.ba().buff[2], 0); assert.equal(s.l.mana, 90);
  s.l.clock = 16; s.A6(.5); assert.equal(s.l.mana, 80);
  const mounted = game(); mounted.l.mounted = true;
  mounted.T[2].attr.skill_mintimepercast_v = [[90, 0, 0]];
  mounted.T[2].attr.skill_mintimepercastonhorse_v = [[144, 0, 0]];
  assert.equal(mounted.castSupportSkill(2), true); assert.equal(mounted.ba().cd[2], 9);
});

test('automatic curses have a shared five-second cooldown even with fresh crowded targets or missing contacts',()=>{
  const s=game();s.o.sk={4:1};
  s.l.enemies=Array.from({length:12},(_,index)=>({x:50+index*20,y:0,hp:100,cls:'normal'}));
  s.A6(.5);assert.equal(s.contacts.length,1);assert.equal(s.ba().cd[4],6);
  // Leave the contact unresolved: pending/missed effects must not permit spam.
  for(let time=1.5;time<6;time+=.5) {
    s.advanceActorActions(.5);s.l.clock=time;s.A6(.5);
    assert.equal(s.contacts.length,1);assert.equal(s.l.mana,90);
  }
  s.l.manTgt=s.l.enemies[1];assert.equal(s.castSupportSkill(4),false,'manual cannot bypass automatic cooldown');
  s.advanceActorActions(1);s.l.clock=6;s.A6(.5);assert.equal(s.contacts.length,2);
  s.advanceActorActions(1);s.l.clock=6.5;s.A6(.5);assert.equal(s.contacts.length,2);
});

test('automatic supports respect configured and mounted cooldowns, and reject zero-duration effects',()=>{
  for(const mounted of [false,true]) {
    const s=game();s.o.sk={4:1};s.l.mounted=mounted;
    s.T[4].attr.skill_mintimepercast_v=[[180,0,0]];
    s.T[4].attr.skill_mintimepercastonhorse_v=[[270,0,0]];
    s.l.enemies=[{x:50,y:0,hp:100,cls:'boss'}];
    s.A6(.5);assert.equal(s.ba().cd[4],mounted?16:11);
  }
  const s=game();s.o.sk={4:1};s.T[4].attr.physicsres_p=[[0,0,0]];
  s.l.enemies=[{x:50,y:0,hp:100,cls:'boss'}];s.A6(.5);
  assert.equal(s.contacts.length,0);assert.equal(s.l.mana,100);
});

test('hotbar shows remaining heal cooldown and clears it at expiry, and reflects aura state', () => {
  const s = game(); s.o.slots = [3, 5, -1, -1]; s.castSupportSkill(3);
  function button(index) {
    const styles = {}, classes = {}, label = { textContent: '' };
    return { dataset: { i: index }, styles, classes, label,
      classList: { toggle: (name, on) => { classes[name] = on; } },
      querySelector: selector => selector === '.cd' ? { style: { setProperty: (name, value) => { styles[name] = value; } } } : label };
  }
  const buttons = [button(0), button(1)];
  Object.assign(s, { document: { querySelectorAll: () => buttons }, m: () => null, ao: .3, ih: .3,
    E: (value, low, high) => Math.max(low, Math.min(high, value)) });
  declaration(s, uiFile, 'Kv'); s.Kv();
  assert.equal(buttons[0].label.textContent, 8); assert.equal(buttons[0].styles['--p'], '100%');
  assert.equal(buttons[1].classes['support-on'], true);
  s.l.clock = 5; s.Kv(); assert.equal(buttons[0].label.textContent, 4);
  s.l.clock = 9; s.o.auraOff = { 5: 1 }; s.Kv();
  assert.equal(buttons[0].label.textContent, ''); assert.equal(buttons[0].styles['--p'], '0%');
  assert.equal(buttons[1].classes['support-on'], false);
});
