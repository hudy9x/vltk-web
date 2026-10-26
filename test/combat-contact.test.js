const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const { loadCombatEngine } = require('./helpers/combat-engine');
const { compileTypeScriptEntry } = require('../tools/build-app');
const ROOT = path.resolve(__dirname, '..');
function load(sandbox, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}
function declaration(sandbox, file, name) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const node = acorn.parse(source, { ecmaVersion: 'latest' }).body.find(node =>
    node.type === 'VariableDeclaration' && node.declarations.some(item => item.id.name === name));
  assert.ok(node, `${file}: ${name}`);
  vm.runInContext(source.slice(node.start, node.end), sandbox);
}
function world(options = {}) {
  const s = {
    Math, Set, Map,
    performance: { now: () => 1000 }, setTimeout: () => {},
    E: (n, lo, hi) => Math.max(lo, Math.min(hi, n)), Z: (lo, hi) => (lo + hi) / 2,
    l: { fx: [], enemies: [], P: {}, life: 100, zoneShown: 1, quiet: false, clock: 0 },
    o: { lowFx: false, sk: {}, mode: 'farm' }, v: { x: 0, y: 0 },
    Z0: { g: false }, R2: () => true, mt: () => true, Hi: { phys: '#fff' }, QA: 0.81,
    Ya: () => {}, x8: () => {}, yn: () => 0.4, b0: () => null, h4: {},
    Df: {}, B8: () => false, Jt: () => null, G8: () => {}, W3: () => {}, j3: 60,
    hs: (skill, target) => {
      target.hp -= 10;
      if (skill.parts.poison) target.poison = 3;
      return 10;
    }, Ls: () => {}, $1: () => false, hA: () => false, iD: enemies => enemies[0],
    Z9: () => s.skill, jm: () => 0, aD: () => 0, S3: () => false, tP: () => false,
    o4: () => {}, nD: () => [], l8: () => 0, tD: () => { s.procCount++; }, procCount: 0, gs: -1,
  };
  s.window = s;
  s._1 = () => s.l.enemies.filter(enemy => !enemy.dead && enemy.hp > 0);
  s.q0 = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 2) / s.QA;
  vm.createContext(s);
  load(s, 'public/data.js');
  load(s, 'src/client/data/projectile-effects-01.js');
  load(s, 'src/client/data/projectile-effects-02.js');
  s.A0 = s.JFX; s.T = s.JX.skills;
  for (const name of ['t7', 'U2', 'r4', 'Y5', 'e7', 'a7']) declaration(s, 'src/client/combat/skills-01.js', name);
  declaration(s, 'src/client/core/attributes-01.js', 'N5');
  loadCombatEngine(s);
  load(s, 'src/client/render/projectiles-01.js');
  for (const name of ['TP', 'Ya', 'x8']) declaration(s, 'src/client/render/arena-01.js', name);
  declaration(s, 'src/client/core/state-and-save-01.js', 'oD');
  Object.assign(s.l, options.state); Object.assign(s.o, options.preferences);
  return s;
}
function enemy(s, x = 180, y = 0) {
  const target = { x, y, hp: 100, max: 100, r: 17, cls: 'normal' };
  s.l.enemies.push(target);
  return target;
}
function run(s, seconds, dt = 1 / 60) {
  for (let time = 0; time < seconds - 1e-8; time += dt) s.advanceSkillContacts(dt);
}
// Contact/geometry assertions below start at projectile release, after the attack pose.
function finishAttackPose(s, actor=s.v) {
  if (actor.speedCastDuration > 0) s.advanceSkillContacts(actor.castT);
}
function launch(s) { const wait=s.oD(); finishAttackPose(s); return wait; }
function contact(s, ...args) { const cast=s.queueSkillContact(...args); finishAttackPose(s,args[0]); return cast; }
function shaolin(s, overrides = {}) {
  s.skill = { id: 10, L: 1, parts: { phys: 10 }, rad: 300, rate: 1, melee: false, targets: 1, ...overrides };
  return s.skill;
}
function ray(s, target, overrides = {}) {
  const skill = { parts: { phys: 10 }, melee: false, rad: 600, geo: { k: 'line' }, ...overrides };
  s.A0.m[9999] = { fly: { w: 32 }, hit: null, spd: 360 };
  s.A0.k = { 9999: [1, 12, 250, 0, 0, 0, 1, 1, 0, 1] };
  s.queueSkillContact(s.v, target, skill, hit => s.hs(skill, hit), {
    windup: 0, maxTargets: Infinity,
    visual: () => s.Wn(9999, 0, -14, 0, target),
  });
}

test('Shaolin launch does not damage or apply poison before the flying skill contacts a monster', () => {
  const s = world(), target = enemy(s);
  shaolin(s, { parts: { phys: 10, poison: 1 }, ev: true });
  launch(s);
  assert.equal(target.hp, 100);
  assert.equal(target.poison, undefined);
  assert.equal(s.procCount, 0);
  run(s, 0.2);
  assert.equal(target.hp, 100);
  run(s, 0.8);
  assert.equal(target.hp, 90);
  assert.equal(target.poison, 3);
  assert.equal(s.procCount, 1);
});

test('a monster can dodge a non-homing Shaolin projectile; missed effects never apply damage', () => {
  const s = world(), target = enemy(s);
  shaolin(s); launch(s);
  target.y = 150;
  run(s, 2);
  assert.equal(target.hp, 100);
  assert.equal(s.l.combatProjectiles.length, 0);
});

test('Vo Tuong Tram also waits for its real flying effects before damaging a stationary monster', () => {
  const s = world(), target = enemy(s, 240);
  shaolin(s, { id: 321, L: 25, nMis: 3 }); launch(s);
  assert.equal(target.hp, 100);
  run(s, 0.2); assert.equal(target.hp, 100);
  run(s, 1.5); assert.equal(target.hp, 90);
});

test('stationary AoE contacts every overlapping body once during its active window', () => {
  const s = world(), a = enemy(s, 25), b = enemy(s, 45), far = enemy(s, 180);
  const skill = { melee: false, parts: { phys: 10 }, geo: { k: 'self', r: 80, pierce: true } };
  contact(s, s.v, s.v, skill, target => s.hs(skill, target), { maxTargets: 3, visual: () => {} });
  assert.equal(a.hp, 100); assert.equal(b.hp, 100);
  run(s, 0.1); assert.equal(a.hp, 90); assert.equal(b.hp, 90);
  run(s, 0.4);
  assert.equal(a.hp, 90); assert.equal(b.hp, 90); assert.equal(far.hp, 100);
});

test('a swept fast missile hits the closest body between simulation steps, then stops', () => {
  const s = world(), far = enemy(s, 200), near = enemy(s, 100);
  ray(s, far);
  s.advanceSkillContacts(0.1);
  assert.equal(near.hp, 90);
  assert.equal(far.hp, 100);
  assert.equal(s.l.combatProjectiles.length, 0);
});

test('piercing missiles hit each intersected body once and never hit a monster beside the path', () => {
  const s = world(), a = enemy(s, 100), b = enemy(s, 200), beside = enemy(s, 150, 70);
  ray(s, b, { geo: { k: 'line', pierce: true } });
  run(s, 1);
  assert.equal(a.hp, 90);
  assert.equal(b.hp, 90);
  assert.equal(beside.hp, 100);
});

test('terrain blocks a missile even when one step would cross the whole obstacle', () => {
  const s = world(), target = enemy(s, 200);
  s.Z0.g = true;
  s.mt = (x0, y0, x1) => !(x0 < 80 && x1 >= 80);
  ray(s, target); run(s, 1);
  assert.equal(target.hp, 100);
  assert.equal(s.l.combatProjectiles.length, 0);
});

test('FX cap, low-FX preference and offline simulation do not change collision damage', () => {
  for (const preferences of [{}, { lowFx: true }]) {
    for (const quiet of [false, true]) {
      const s = world({ preferences, state: { quiet } }), target = enemy(s);
      s.l.fx = Array.from({ length: 170 }, () => ({ k: 'ring', life: 10 }));
      shaolin(s, { nMis: 5 }); launch(s);
      assert.equal(s.l.combatProjectiles.length, 5);
      assert.equal(target.hp, 100);
      run(s, 1);
      assert.equal(target.hp, 90);
    }
  }
});

test('melee damage waits for windup and fails when the target leaves the striking area', () => {
  const s = world(), target = enemy(s, 35);
  const skill = { melee: true, rad: 65, parts: { phys: 10 } };
  contact(s, s.v, target, skill, hit => s.hs(skill, hit), { visual: () => {} });
  run(s, 0.1); assert.equal(target.hp, 100);
  target.x = 180; run(s, 0.3); assert.equal(target.hp, 100);
  target.x = 35;
  contact(s, s.v, target, skill, hit => s.hs(skill, hit), { visual: () => {} });
  run(s, 0.2); assert.equal(target.hp, 90);
});

test('stationary spells remain at their cast position and do not teleport after a moving target', () => {
  const s = world(), target = enemy(s, 35);
  s.A0.m[9999] = { fly: { w: 32 }, spd: 0 };
  s.A0.k = { 9999: [0, 10, 0, 0, 0, 0, 1, 0, 0, 1] };
  const skill = { melee: false, parts: { phys: 10 }, geo: { k: 'spot', r: 20 } };
  contact(s, s.v, target, skill, hit => s.hs(skill, hit), {
    visual: () => s.Wn(9999, target.x, -14, 0, target),
  });
  target.x = 180; run(s, 1);
  assert.equal(target.hp, 100);
});

test('changing zones or dying clears in-flight damage before a later hit', () => {
  for (const state of [{ zoneShown: 2 }, { deadT: 1 }, { town: true }]) {
    const s = world(), target = enemy(s);
    shaolin(s); launch(s); Object.assign(s.l, state); run(s, 1);
    assert.equal(target.hp, 100);
    assert.equal(s.l.combatProjectiles.length, 0);
  }
});

test('contacts advance without rendering and give the same result at different tick sizes', () => {
  for (const dt of [1 / 60, 1 / 30, 0.05]) {
    const s = world(), target = enemy(s);
    shaolin(s); launch(s); run(s, 1, dt);
    assert.equal(target.hp, 90);
  }
});

test('secondary rays wait for their own physical contact instead of applying damage on emission', () => {
  const s = world(), target = enemy(s);
  for (const name of ['LP', 'qP', 'Ds']) declaration(s, 'src/client/render/arena-02.js', name);
  for (const name of ['$P', 'B8', 'Be']) declaration(s, 'src/client/render/arena-01.js', name);
  declaration(s, 'src/client/core/state-and-save-01.js', 'eD');
  s.Qi = () => 1; s.S5 = () => ({ cold: 10 });
  const skill = shaolin(s, { id: 380, L: 20 });
  s.eD(skill, target, s.l.enemies, [target], { rays: () => 1, sid: 331, max: 1 });
  assert.equal(target.hp, 100);
  run(s, 0.2); assert.equal(target.hp, 100);
  run(s, 3); assert.equal(target.hp, 90);
});

test('an enemy ranged attack also waits for contact and can be dodged by the player', () => {
  const s = world(), attacker = enemy(s, 180);
  Object.assign(attacker, { ar: 10, reach: 300, ranged: true, dmg: 10, atkCd: 0, cd: 1, spd: 0, tid: 1 });
  s.r0 = { 1: { anim: 'monster' } }; s.Qa = 0.5; s.Mw = () => {};
  s.U9 = () => { s.l.life -= 10; }; s.hB = () => {};
  declaration(s, 'src/client/core/state-and-save-01.js', '$d');
  s.$d(attacker, 1 / 60);
  assert.equal(s.l.life, 100);
  run(s, 0.2); assert.equal(s.l.life, 100);
  finishAttackPose(s,attacker);s.v.y = 100; run(s, 2); assert.equal(s.l.life, 100);
  s.v.y = 0; attacker.atkCd = 0; s.$d(attacker, 1 / 60);
  run(s, 1.6); assert.equal(s.l.life, 90);
});

function standardSkill(s, id) {
  for (let i = 1; i <= 59; i++) load(s, `src/client/data/skill-tables-${String(i).padStart(2, '0')}.js`);
  for (const [key, std] of Object.entries(s.SK_STD)) {
    if (s.T[key]) Object.assign(s.T[key], std.m, { attr: std.a });
  }
  s.b0 = (skill, key, level) => {
    const values = skill.attr && skill.attr[key];
    if (!values) return null;
    const value = values[Math.min(values.length - 1, Math.max(0, level - 1))];
    return Array.isArray(value) ? value : [value, 0, 0];
  };
  const data = s.T[id], level = 20;
  const rad = (s.b0(data, 'skill_attackradius', level) || [data.radius])[0];
  return { id, L: level, parts: { phys: 10 }, melee: false, rad, targets: 100,
    nMis: s.r4(data, level), geo: s.N5(data, level, rad), rate: 1 };
}

test('Phi Long Tai Thien and Thien Ha Vo Cau use homing metadata and curve toward a moving monster', () => {
  for (const id of [357, 359]) {
    const s = world(), target = enemy(s, 220), skill = standardSkill(s, id);
    contact(s, s.v, target, skill, hit => s.hs(skill, hit));
    assert.ok(s.l.combatProjectiles.every(effect => effect.kind === 5));
    run(s, 0.2); assert.equal(target.hp, 100);
    target.y = 65;
    run(s, 0.15);
    assert.ok(s.l.combatProjectiles.some(effect => Math.abs(effect.ang) > 0.1));
    run(s, 2); assert.equal(target.hp, 90);
  }
});

test('Thien Dia Vo Cuc stays at its cast point and only pulses on live occupants before expiry', () => {
  const s = world(), target = enemy(s, 80), inside = enemy(s, 120), outside = enemy(s, 260);
  const skill = standardSkill(s, 365);
  contact(s, s.v, target, skill, hit => s.hs(skill, hit));
  const field = s.l.combatProjectiles[0];
  assert.equal(field.kind, 0); assert.equal(field.age, 0);
  const origin = [field.x, field.y];
  target.x = 350; s.v.x = 400;
  run(s, 0.1);
  assert.deepEqual([field.x, field.y], origin);
  assert.equal(target.hp, 100); assert.equal(inside.hp, 90); assert.equal(outside.hp, 100);
  outside.x = 100; run(s, 0.25); assert.equal(outside.hp, 90);assert.equal(inside.hp,80);
  run(s, 1.5);
  target.x = 80; run(s, 0.1); assert.equal(target.hp, 100);
});

test('Thien Ngoai Luu Tinh secondary explosion ignores terrain, hits nearby bodies within its area and excludes distant ones', () => {
  const s = world(), center = enemy(s, 200), nearby = enemy(s, 270), outside = enemy(s, 400);
  s.Z0.g = true; s.mt = () => false; s.R2 = () => false;
  const skill = standardSkill(s, 362);
  for (const name of ['LP', 'qP', 'Ds']) declaration(s, 'src/client/render/arena-02.js', name);
  for (const name of ['$P', 'B8', 'Be']) declaration(s, 'src/client/render/arena-01.js', name);
  declaration(s, 'src/client/core/state-and-save-01.js', 'eD');
  s.Qi = () => 5; s.S5 = () => ({ fire: 10 });
  s.eD(skill, center, s.l.enemies, [center], { sid: 363, max: 5, el: 'fire' });
  assert.equal(nearby.hp, 100);
  run(s, 0.5);
  assert.equal(center.hp, 90); assert.equal(nearby.hp, 90); assert.equal(outside.hp, 100);
});

test('homing missiles expire at their configured range instead of following an unreachable enemy forever', () => {
  const s = world(), target = enemy(s, 2200), skill = standardSkill(s, 357);
  contact(s, s.v, target, skill, hit => s.hs(skill, hit));
  const missiles = s.l.combatProjectiles.slice();
  const limit = s.t7[166][1] * s.QA;
  assert.ok(missiles.every(effect => effect.travelLimit === limit));
  run(s, 5);
  assert.equal(target.hp, 100);
  assert.equal(s.l.combatProjectiles.length, 0);
  assert.ok(missiles.every(effect => effect.traveled <= limit + 1e-8));
});

test('a stationary fallback field uses its chosen cast coordinate rather than the caster current coordinate', () => {
  const s = world(), target = enemy(s, 200), atCaster = enemy(s, 10);
  const skill = { melee: false, parts: { phys: 10 }, geo: { k: 'spot', r: 40 } };
  contact(s, s.v, target, skill, hit => s.hs(skill, hit), { visual: () => {}, maxTargets: Infinity });
  s.v.x = 400;
  run(s, 0.1);
  assert.equal(target.hp, 90); assert.equal(atCaster.hp, 100);
});

test('an enemy entering the Thien Ngoai explosion before activation is hit even if it was outside on cast', () => {
  const s = world(), center = enemy(s, 200), entering = enemy(s, 450);
  const skill = standardSkill(s, 362);
  for (const name of ['LP', 'qP', 'Ds']) declaration(s, 'src/client/render/arena-02.js', name);
  for (const name of ['$P', 'B8', 'Be']) declaration(s, 'src/client/render/arena-01.js', name);
  declaration(s, 'src/client/core/state-and-save-01.js', 'eD');
  s.Qi = () => 5; s.S5 = () => ({ fire: 10 });
  s.eD(skill, center, s.l.enemies, [center], { sid: 363, max: 5, el: 'fire' });
  entering.x = 270;
  run(s, 0.5);
  assert.equal(entering.hp, 90);
});

test('the terrain-independent spells cast and contact through obstacles but still require range', () => {
  for (const id of [302, 362, 365, 375, 380, 1066, 1070, 1078, 1081]) {
    const s = world(), target = enemy(s, 80);
    if (id >= 1000) load(s, 'src/client/data/advanced-skills-01.js');
    s.skill = standardSkill(s, id);
    s.Z0.g = true;
    s.mt = () => false;
    s.R2 = () => false;
    launch(s);
    assert.equal(s.l.moveTo, null, `skill ${id} must cast without approaching an obstacle`);
    assert.ok(s.l.combatProjectiles.length > 0, `skill ${id} emitted`);
    assert.ok(s.l.combatProjectiles.every(effect => effect.combat.ignoreTerrain));
    run(s, 2);
    assert.ok(target.hp <= 90, `skill ${id} must contact through terrain`);
    const far = world(), outside = enemy(far, 2000);
    if (id >= 1000) load(far, 'src/client/data/advanced-skills-01.js');
    far.skill = standardSkill(far, id);
    far.Z0.g = true; far.mt = () => false; far.R2 = () => false;
    launch(far); run(far, 2);
    assert.equal(outside.hp, 100);
    assert.equal(far.l.combatProjectiles.length, 0);
  }
});

test('ordinary flying attacks remain blocked when casting across terrain', () => {
  const s = world(), target = enemy(s, 80);
  shaolin(s); s.mt = () => false;
  launch(s); run(s, 2);
  assert.equal(target.hp, 100);
  assert.equal(s.l.combatProjectiles.length, 0);
});

test('Phong Suong secondary rays ignore terrain and still wait for physical contact', () => {
  const s = world(), target = enemy(s, 180), missed = enemy(s, 180, 180);
  for (const name of ['LP', 'qP', 'Ds']) declaration(s, 'src/client/render/arena-02.js', name);
  for (const name of ['$P', 'B8', 'Be']) declaration(s, 'src/client/render/arena-01.js', name);
  declaration(s, 'src/client/core/state-and-save-01.js', 'eD');
  s.Qi = () => 1; s.S5 = () => ({ cold: 10 });
  s.Z0.g = true; s.mt = () => false; s.R2 = () => false;
  const skill = standardSkill(s, 380);
  s.eD(skill, target, s.l.enemies, [target], { rays: () => 1, sid: 331, max: 1 });
  run(s, 0.05);
  assert.equal(target.hp, 100);
  run(s, 3);
  assert.equal(target.hp, 90);
  assert.equal(missed.hp, 100);
});

test('cast range widens symmetrically north/south to 60 percent while east/west stays unchanged', () => {
  for (const [dx, dy, inRange] of [[0, 143, true], [0, -143, true], [0, 151, false], [0, -151, false], [240, 0, true], [-240, 0, true], [250, 0, false], [-250, 0, false]]) {
    const s = world(), target = enemy(s, dx, dy);
    target.r = 1;
    s.skill = { ...standardSkill(s, 380), rad: 300, geo: { k: 'spot', r: 40 } };
    launch(s);
    assert.equal((s.l.combatProjectiles || []).length > 0, inRange, `target at ${dx},${dy}`);
  }
});

test('self-centered skill field covers its widened north/south ellipse but excludes targets beyond it', () => {
  const s = world(), north = enemy(s, 0, -52), south = enemy(s, 0, 52), outside = enemy(s, 0, 85);
  const skill = { parts: { phys: 10 }, geo: { k: 'self', r: 100 }, melee: false };
  contact(s, s.v, s.v, skill, hit => s.hs(skill, hit), { visual: () => {}, maxTargets: Infinity });
  run(s, 0.1);
  assert.equal(north.hp, 90); assert.equal(south.hp, 90); assert.equal(outside.hp, 100);
});

test('Van Long Kich uses a forward narrow rectangle and hits every stacked body without circular side splash', () => {
  const s=world(), target=enemy(s,100), packed=Array.from({length:25},()=>enemy(s,100)),side=enemy(s,100,45),behind=enemy(s,-60);
  const skill=standardSkill(s,361);
  contact(s, s.v,target,skill,hit=>s.hs(skill,hit),{maxTargets:1});
  run(s,.2);
  assert.equal(target.hp,90);assert.ok(packed.every(e=>e.hp===90));assert.equal(side.hp,100);assert.equal(behind.hp,100);
});
test('Nhan Kiem Hop Nhat sweeps narrow piercing rectangles through all packed bodies and misses off-path bodies', () => {
  const s=world(),target=enemy(s,80),packed=Array.from({length:25},()=>enemy(s,80)),side=enemy(s,80,70);
  const skill=standardSkill(s,368);
  contact(s, s.v,target,skill,hit=>s.hs(skill,hit),{maxTargets:1});
  run(s,1);
  assert.equal(target.hp,70);assert.ok(packed.every(e=>e.hp===70));assert.equal(side.hp,100);
});
test('the Van Long rectangle keeps its initial heading when the caster and target move after casting',()=>{
  const s=world(),target=enemy(s,0,-60),onPath=enemy(s,0,-80),side=enemy(s,80,-80);
  const skill=standardSkill(s,361);
  contact(s, s.v,target,skill,hit=>s.hs(skill,hit));
  s.v.x=500;target.x=500;
  run(s,.2);
  assert.equal(onPath.hp,90);assert.equal(side.hp,100);assert.equal(target.hp,100);
});
test('Thien Ngoai fields pulse every 300ms, deduplicate visual effects, and inspect live occupants on each pulse',()=>{
  const s=world(),target=enemy(s,200),packed=Array.from({length:25},()=>enemy(s,200)),entering=enemy(s,500);
  const skill={id:362,parts:{fire:10},melee:false,geo:{k:'spot',r:60,pierce:true}};
  contact(s, s.v,target,skill,hit=>s.hs(skill,hit),{
    maxTargets:1,visual:()=>{
      for(let i=0;i<3;i++)s.l.fx.push({k:'boom',x:200,y:-14,t:0,life:1});
    },windup:0,
  });
  run(s,.02);assert.equal(target.hp,90);assert.ok(packed.every(e=>e.hp===90));
  run(s,.2);assert.equal(target.hp,90);
  entering.x=200;target.x=500;
  run(s,.05);assert.equal(entering.hp,100);
  run(s,.05);assert.equal(entering.hp,90);assert.equal(target.hp,90);assert.ok(packed.every(e=>e.hp===80));
  run(s,.3);assert.equal(entering.hp,80);assert.ok(packed.every(e=>e.hp===70));
  run(s,1);const hp=entering.hp;run(s,1);assert.equal(entering.hp,hp);
});
test('Thien Ngoai world renderer completes the fall and one landing explosion without pulse rewinds',()=>{
 for(const dt of [1/60,1/30,.05]) {
  const s=world(),target=enemy(s,200);target.hp=1000;
  const skill=standardSkill(s,362),draws=[];
  s.Fa=(sprite,dir,time)=>draws.push({sprite,time});s.CP=()=>{};
  contact(s, s.v,target,skill,hit=>s.hs(skill,hit));
  const meteor=s.l.combatProjectiles.find(effect=>effect.mid===171);assert.ok(meteor);
  const realYP=s.YP;s.YP=effect=>{if(effect.mid===171)realYP(effect);};
  const source=fs.readFileSync(path.join(ROOT,'src/client/render/arena-02.js'),'utf8');
  const np=acorn.parse(source,{ecmaVersion:'latest'}).body.find(node=>node.type==='VariableDeclaration'&&
    node.declarations.some(item=>item.id.name==='NP')).declarations[0].init;
  const loop=np.body.body.find(node=>node.type==='ForOfStatement'&&source.slice(node.start,node.end).includes('const repeating'));
  for(let time=0;time<2;time+=dt){s.advanceSkillContacts(dt);vm.runInContext(source.slice(loop.start,loop.end),s);}
  const fall=draws.filter(draw=>draw.sprite===meteor.m.fly);
  assert.ok(fall.length>0);
  assert.ok(fall.every((draw,index)=>!index||draw.time>=fall[index-1].time),'the real world draw loop must never rewind the fall');
  assert.equal(new Set(fall.map(draw=>Math.floor(draw.time*1000/meteor.m.fly.ms))).size,meteor.m.fly.n,'display every falling frame');
  const landing=draws.filter(draw=>draw.sprite===meteor.m.hit);
  assert.ok(landing.length>0,'the fireball must reach its landing animation');
  assert.equal(new Set(landing.map(draw=>Math.floor(draw.time*1000/meteor.m.hit.ms))).size,meteor.m.hit.n,'complete the landing explosion');
  assert.ok(!s.l.combatProjectiles.includes(meteor));assert.ok(!s.l.fx.includes(meteor));
  assert.equal(target.hp,960,'retain four original damage pulses independently of the visual');
 }
});

test('Thien Ngoai logical pulses remain active with quiet or missing visual effects',()=>{
  for(const quiet of [true,false]){
    const s=world(),target=enemy(s,200);s.l.quiet=quiet;
    const skill={id:362,parts:{fire:10},melee:false,geo:{k:'spot',r:60,pierce:true}};
    contact(s, s.v,target,skill,hit=>s.hs(skill,hit),{visual:()=>{}});
    run(s,.7);assert.equal(target.hp,70);
  }
});

test('a non-piercing narrow impact hits all overlapping bodies but stops before a separate farther pack',()=>{
  const s=world(),target=enemy(s,80),packed=Array.from({length:25},()=>enemy(s,80)),farther=enemy(s,180);
  ray(s,target,{geo:{k:'line',pierce:false}});
  run(s,1);
  assert.equal(target.hp,90);assert.ok(packed.every(e=>e.hp===90));assert.equal(farther.hp,100);
});

test('the player combat log is written only after physical skill contact',()=>{
  const s=world(),target=enemy(s,180);s.m0=0;Object.assign(s.o,{fac:'shaolin',name:'Tester'});s.U9=()=>{};s.$d=()=>{};
  load(s,'src/client/ui/combat-log-01.js');shaolin(s);launch(s);
  assert.equal(s.combatLog.entries().length,0);run(s,.1);assert.equal(s.combatLog.entries().length,0);
  run(s,1);assert.equal(s.combatLog.entries('out').length,1);assert.equal(s.combatLog.entries()[0].amount,10);
});

function secondaryWorld(s) {
 load(s,'src/client/data/status-effects-01.js');
 for(const name of ['LP','qP','Ds'])declaration(s,'src/client/render/arena-02.js',name);
 for(const name of ['$P','B8','Be','showNhiepHonImpact'])declaration(s,'src/client/render/arena-01.js',name);
 declaration(s,'src/client/core/state-and-save-01.js','eD');
 s.Qi=(skill,event)=>event.rays?event.rays(skill.L):event.max;s.S5=()=>({phys:10});
}
test('Phong Suong primary contact then four real homing rays each damage the same monster once',()=>{
 const s=world(),target=enemy(s,100);secondaryWorld(s);
 const skill=standardSkill(s,380);skill.ev=true;s.skill=skill;
 s.tD=(skill,target,live,hit)=>s.eD(skill,target,live,hit,{rays:()=>4,sid:331,max:4});
 launch(s);assert.equal(s.l.combatProjectiles.length,1);run(s,5);
 assert.equal(target.hp,50);
});
test('Beggar skills suppress self damage while Phi Long impact field and Tang skills shrink to one third',()=>{
 for(const id of [357,359,302,339,342]){
  const s=world(),target=enemy(s,200),near=enemy(s,220),far=enemy(s,300),casterNear=enemy(s,-20);secondaryWorld(s);
  const skill=standardSkill(s,id);
  if([357,359].includes(id)){s.eD(skill,target,s.l.enemies,[target],{self:true,max:3,noFx:true});assert.equal((s.l.combatProjectiles||[]).length,0);}
  s.eD(skill,target,s.l.enemies,[target],{col:true,max:5,noFx:true});run(s,.2);
  assert.equal(target.hp,90);assert.equal(near.hp,90);assert.equal(far.hp,id===359?90:100);assert.equal(casterNear.hp,100);
 }
});
test('Thien Ngoai secondary sprite stays at its original coordinate throughout its duration',()=>{
 const s=world(),target=enemy(s,100);secondaryWorld(s);const skill=standardSkill(s,362);
 s.eD(skill,target,s.l.enemies,[target],{sid:363,max:5});
 const positions=s.l.combatProjectiles.map(e=>[e,e.x,e.y]);assert.ok(positions.length);
 run(s,.5);for(const [effect,x,y]of positions){assert.equal(effect.x,x);assert.equal(effect.y,y);}
});
test('Loi Dong field lasts three seconds with one hit every 300ms and checks live occupants',()=>{
 const s=world(),target=enemy(s,200),entering=enemy(s,1000),skill=standardSkill(s,375);
 contact(s, s.v,target,skill,hit=>s.hs(skill,hit));
 run(s,.05);assert.equal(target.hp,90);run(s,.1);assert.equal(target.hp,90);
 run(s,.1);assert.equal(target.hp,90);run(s,.1);assert.equal(target.hp,80);
 entering.x=200;target.x=1000;run(s,.3);assert.equal(entering.hp,90);assert.equal(target.hp,80);
 run(s,3);assert.equal(entering.hp,20);const hp=entering.hp;run(s,1);assert.equal(entering.hp,hp);
});
test('Loi Dong lightning falls in six frames then renders its explosion instead of looping',()=>{
 const s=world();declaration(s,'src/client/render/projectiles-01.js','YP');s.Ds=()=>0;
 const draw=[];s.Fa=(sprite,dir,time,x,y)=>draw.push({sprite,time,x,y});
 const missile=s.A0.m[181],effect={age:0,lf:54,loop:true,m:missile,combat:{skill:{id:375}},
  x:200,y:86,z:0,hz:10,lightningDelay:2/18};
 s.YP(effect);assert.equal(draw.length,0,'do not draw before the bolt delay');
 effect.age=(2/18+3/18)*18;s.YP(effect);
 assert.equal(draw.at(-1).sprite,missile.fly);assert.ok(Math.abs(draw.at(-1).time-3*missile.fly.ms/1000)<1e-9);
 effect.age=(2/18+6/18+.05)*18;s.YP(effect);
 assert.equal(draw.at(-1).sprite,missile.hit);assert.ok(Math.abs(draw.at(-1).time-.05)<1e-9);
 assert.equal(draw.at(-1).y,81,'explosion and bolt use the same ground anchor');
 const count=draw.length;effect.age=54;s.YP(effect);assert.equal(draw.length,count,'never loop or pin the final bolt frame');
 assert.equal(effect.age,54,'animation must not advance the damage clock');
});
test('Loi Dong staggers the full lightning field and keeps ten damage pulses at different frame rates',()=>{
 for(const dt of [1/60,1/30,.05]) {
  const s=world(),target=enemy(s,200),skill=standardSkill(s,375);target.hp=1000;
  const cast=contact(s, s.v,target,skill,hit=>s.hs(skill,hit));
  const bolts=s.l.combatProjectiles.filter(effect=>effect.combat===cast);
  assert.equal(bolts.length,16);assert.equal(new Set(bolts.map(effect=>effect.lightningDelay)).size,16);
  assert.ok(Math.max(...bolts.map(effect=>effect.lightningDelay))+6/18+8*.056<3,'all explosions finish within the field duration');
  run(s,3.5,dt);assert.equal(target.hp,900,'visual acceleration must retain ten hits');
 }
});
test('Loi Dong waits for its visual landing before exploding while other missiles retain impact FX',()=>{
 const s=world(),effect={m:s.A0.m[181],combat:{skill:{id:375}}};
 s.gf(effect,100,100);assert.equal((s.l.fxQ||[]).length,0);
 effect.combat.skill.id=182;s.gf(effect,100,100);assert.equal(s.l.fxQ.length,1);
});
test('Thien Dia animation advances twice as fast without changing simulation age',()=>{
 const s=world();declaration(s,'src/client/render/projectiles-01.js','YP');s.Ds=()=>0;
 let time;s.Fa=(sprite,dir,t)=>{time=t;};
 const effect={age:2,lf:18,loop:true,m:{fly:{n:10,ms:100,d:1}},combat:{skill:{id:365}},x:0,y:0,z:0,hz:0};
 s.YP(effect);assert.equal(time,.25);assert.equal(effect.age,2);
 effect.combat.skill.id=380;s.YP(effect);assert.equal(time,.15);
});
test('Nhan Kiem registers three sword contacts plus its existing secondary hit, with no duplicated secondary',()=>{
 const s=world(),target=enemy(s,80);secondaryWorld(s);const skill=standardSkill(s,368);skill.ev=true;s.skill=skill;
 s.tD=(skill,target,live,hit)=>s.eD(skill,target,live,hit,{sid:162,col:true,max:3,castFx:'176'});
 launch(s);run(s,2);assert.equal(target.hp,60);
});
test('Nhiep Hon secondary shows an actual cosmetic sprite at each damaged body, excluding targets outside its area',()=>{
 const s=world(),target=enemy(s,200),near=enemy(s,220),far=enemy(s,300);secondaryWorld(s);const skill=standardSkill(s,339);
 const emitted=[];s.l.fxQ=[];s.l.fxQ.push=function(...effects){emitted.push(...effects);return Array.prototype.push.apply(this,effects);};
 s.eD(skill,target,s.l.enemies,[target],{sid:340,col:true,max:3});run(s,1);
 assert.equal(target.hp,90);assert.equal(near.hp,90);assert.equal(far.hp,100);
 const impacts=emitted.filter(e=>e.cosmetic&&e.s===s.A0.m[150].fly);
 assert.equal(impacts.length,2);assert.ok(impacts.some(e=>e.x===target.x));assert.ok(impacts.some(e=>e.x===near.x));assert.ok(!impacts.some(e=>e.x===far.x));
});
test('Ngu Doc level 90 impact fields shrink from 150 to 100 without changing cast range or missing packed mobs',()=>{
 for(const id of [353,355]){
  const s=world(),target=enemy(s,200),near=enemy(s,280),far=enemy(s,310),packed=Array.from({length:20},()=>enemy(s,200));secondaryWorld(s);
  const skill=standardSkill(s,id),range=skill.rad;
  s.eD(skill,target,s.l.enemies,[target],{col:true,max:3,noFx:true});
  assert.equal(s.l.combatProjectiles[0].combat.skill.geo.r,100);assert.equal(s.l.combatProjectiles[0].combat.skill.rad,range);
  run(s,.2);assert.equal(target.hp,90);assert.equal(near.hp,90);assert.equal(far.hp,100);assert.ok(packed.every(mob=>mob.hp===90));
  const splash=contact(s, s.v,target,{...skill,geo:{...skill.geo,area:150}},()=>{}, {visual:()=>{}});
  assert.equal(splash.skill.geo.area,100);assert.equal(splash.skill.rad,range);assert.equal(skill.geo.area||0,0);
 }
});
test('Vo Tuong and Dat Ma impact fields shrink to one third and exclude distant mobs',()=>{
 for(const id of [318,321]){
  const s=world(),target=enemy(s,200),near=enemy(s,220),far=enemy(s,300);secondaryWorld(s);
  const skill=standardSkill(s,id);s.eD(skill,target,s.l.enemies,[target],{col:true,max:3,noFx:true});
  assert.equal(s.l.combatProjectiles[0].combat.skill.geo.r,50);run(s,.2);
  assert.equal(target.hp,90);assert.equal(near.hp,90);assert.equal(far.hp,100);
 }
});
test('Hoanh Tao secondary damage is centered on the caster rather than its distant impact target',()=>{
 const s=world(),target=enemy(s,250),casterNear=enemy(s,-70),impactNear=enemy(s,290);secondaryWorld(s);
 const skill=standardSkill(s,319);
 s.eD(skill,target,s.l.enemies,[target],{col:true,max:3,noFx:true});
 assert.equal(s.l.combatProjectiles[0].combat.skill.geo.k,'self');run(s,.2);
 assert.equal(casterNear.hp,90);assert.equal(target.hp,100);assert.equal(impactNear.hp,100);
});
test('all three Thien Vuong level 90 missiles hit in eight directions, after real contact and never beyond range',()=>{
 for(const id of [322,323,325,326,327,408])for(let dir=0;dir<8;dir++){
  const s=world();load(s,'src/client/data/status-effects-01.js');
  const angle=dir*Math.PI/4,target=enemy(s,Math.cos(angle)*65,Math.sin(angle)*65/2),far=enemy(s,Math.cos(angle)*1000,Math.sin(angle)*1000/2);
  const skill=standardSkill(s,id);contact(s, s.v,target,skill,h=>s.hs(skill,h));
  assert.equal(target.hp,100);if(![325,408].includes(id))assert.ok(s.l.combatProjectiles.every(e=>e.mid===({322:326,323:327}[id]||id)&&e.kind===1));
  run(s,2);assert.equal(target.hp,90,`${id} direction ${dir}`);assert.equal(far.hp,100);
 }
});

test('Nhiep Hon piercing contacts display one impact on every hit monster beyond the first splash, without extra damage',()=>{
 const s=world(),first=enemy(s,80),second=enemy(s,170),third=enemy(s,240),side=enemy(s,170,120);secondaryWorld(s);
 const emitted=[];s.l.fxQ=[];s.l.fxQ.push=function(...effects){emitted.push(...effects);return Array.prototype.push.apply(this,effects);};
 const skill=standardSkill(s,339);skill.ev=true;s.skill=skill;
 s.tD=(skill,target,live,hit)=>s.eD(skill,target,live,hit,{sid:340,col:true,max:3});
 launch(s);assert.equal(s.l.fx.filter(e=>e.cosmetic).length,0);run(s,1.5);
 assert.equal(first.hp,80);assert.equal(second.hp,90);assert.equal(third.hp,90);assert.equal(side.hp,100);
 const impacts=emitted.filter(e=>e.cosmetic&&e.s===s.A0.m[150].fly);
 assert.equal(impacts.length,3);
 for(const target of [first,second,third])assert.equal(impacts.filter(e=>e.x===target.x&&e.y===target.y-14).length,1);
});

test('Thien Dia one-shot stops drawing after its accelerated final frame instead of freezing until contact expiry',()=>{
 const s=world();load(s,'src/client/data/status-effects-01.js');declaration(s,'src/client/render/projectiles-01.js','YP');s.Ds=()=>0;
 const skill=standardSkill(s,365),target=enemy(s,100);contact(s, s.v,target,skill,hit=>s.hs(skill,hit));
 const effect=s.l.combatProjectiles.find(e=>e.k==='jm');assert.ok(effect);assert.equal(effect.loop,false);
 const frames=[];s.Fa=(sprite,dir,time)=>frames.push(Math.floor(time*1000/sprite.ms));
 effect.age=0;s.YP(effect);assert.equal(frames.at(-1),0);
 const visual=effect.visualLifetime;
 effect.age=visual/2-visual/(effect.m.fly.n*4);s.YP(effect);assert.equal(frames.at(-1),effect.m.fly.n-1);
 const count=frames.length,life=effect.lf;
 for(const age of [life/2,life*.6,life*.9]){effect.age=age;s.YP(effect);assert.equal(effect.age,age);}
 assert.equal(frames.length,count);assert.equal(effect.lf,life);
 s.YP({...effect,visualLifetime:undefined,combat:{skill:{id:380}}});assert.equal(frames.length,count+1);
});

test('Thien Vuong hit sheets animate once at a fixed impact point instead of scattering frames along missile paths',()=>{
 for(const [id,spriteId,legacyId]of [[322,326,138],[326,326,138],[323,327,139],[327,327,139]]){
  for(const quiet of [false,true]){
   const s=world();load(s,'src/client/data/status-effects-01.js');s.l.quiet=quiet;
   const originalFly=s.A0.m[spriteId].fly,legacy=s.A0.m[legacyId].hit,target=enemy(s,65),skill=standardSkill(s,id);
   const packed=Array.from({length:8},()=>enemy(s,65));
   contact(s, s.v,target,skill,h=>s.hs(skill,h));
   const missiles=s.l.combatProjectiles;assert.ok(missiles.length);assert.ok(missiles.every(e=>e.mid===spriteId&&e.kind===1&&e.m.fly===null&&e.m.hit===null));
   assert.equal(s.A0.m[spriteId].fly,originalFly);
   declaration(s,'src/client/render/projectiles-01.js','YP');s.Ds=()=>0;const draws=[];s.Fa=(sprite,dir,t,x,y)=>draws.push({file:sprite.f,t,x,y});
   for(const missile of missiles)s.YP({...missile,age:0});assert.equal(draws.length,0);
   const emitted=[];s.l.fxQ=[];s.l.fxQ.push=function(...effects){emitted.push(...effects);return Array.prototype.push.apply(this,effects);};
   assert.equal(target.hp,100);assert.equal(emitted.length,0);run(s,1);assert.equal(target.hp,90);assert.ok(packed.every(mob=>mob.hp===90));
   const animations=emitted.filter(e=>e.s===legacy);
   assert.equal(animations.length,quiet?0:1);
   if(!quiet){
    const effect=animations[0];assert.equal(effect.x,65);assert.equal(effect.y,-14);assert.equal(effect.k,'boom');
    target.x=200;target.y=100;
    declaration(s,'src/client/render/arena-01.js','CP');declaration(s,'src/client/render/arena-01.js','TP');
    for(const t of [0,legacy.ms/1000,legacy.ms*(legacy.n-1)/1000])s.CP({...effect,t});
    assert.equal(draws.length,3);assert.ok(draws.every(draw=>draw.file===`fx/m${legacyId}_hit.webp`&&draw.x===65&&draw.y===-14));
    assert.ok(draws[0].t<draws[1].t&&draws[1].t<draws[2].t);
    assert.equal(s.TP({...effect,t:effect.life},.01),false);
   }
  }
 }
});

// Real primary cast + real collide-event lookup + real secondary damage formula.
function lotusWorld(options = {}) {
  const s = world(options);
  secondaryWorld(s);
  for (const name of ['l1', 'l4', 'Uw', 'Jw', 'F5']) declaration(s, 'src/client/combat/skills-01.js', name);
  for (const name of ['I5', 'S5']) declaration(s, 'src/client/core/attributes-01.js', name);
  declaration(s, 'src/client/core/state-and-save-01.js', 'tD');
  declaration(s, 'src/client/render/arena-02.js', 'yn');
  s.Tw = () => [];
  s.skill = { ...standardSkill(s, 336), ev: true, tot: 40 };
  s.flowers = [];
  const spawn = s.spawnLotusImpact;
  s.spawnLotusImpact = (...args) => {
    const cast = spawn(...args);
    s.flowers.push({ cast, center: { ...args[1] } });
    return cast;
  };
  return s;
}

test('Bang Tung three rays contacting three distinct monsters create three lotus fields at their actual contacts', () => {
  const s = lotusWorld(), targets = [enemy(s, 220), enemy(s, 220, -100), enemy(s, 220, 100)];
  s.skill.nMis = 3;
  launch(s);
  const missiles = s.l.combatProjectiles.slice();
  assert.equal(missiles.length, 3);
  targets.forEach((target, i) => {
    const missile = missiles[i];
    target.x = missile.x + Math.cos(missile.ang) * 180;
    target.y = missile.y - (missile.z + missile.hz) * s.wf + Math.sin(missile.ang) * 90 + 14;
  });
  assert.equal(s.flowers.length, 0);
  run(s, .05); assert.equal(s.flowers.length, 0, 'No lotus before physical contact');
  run(s, 1.5);
  assert.equal(s.flowers.length, 3);
  for (const target of targets) {
    assert.equal(s.flowers.filter(f => f.center.x === target.x && f.center.y === target.y).length, 1);
    assert.ok(target.hp < 100);
  }
  run(s, 1); assert.equal(s.flowers.length, 3, 'The same projectile cannot bloom again on later ticks');
});

test('three separate rays hitting one monster produce three blooms and three independent secondary hits', () => {
  const s = lotusWorld(), target = enemy(s, 180);
  s.skill.nMis = 3;
  launch(s);
  const missiles = s.l.combatProjectiles.slice(), direction = missiles[1].ang;
  // Aim the three real missiles at the same body to test per-projectile impacts.
  for (const missile of missiles) missile.ang = direction;
  run(s, 1.5);
  assert.equal(s.flowers.length, 3);
  assert.ok(s.flowers.every(f => f.center.x === 180 && f.center.y === 0));
  assert.equal(target.hp, 60, 'One existing primary hit plus one secondary hit per lotus');
  run(s, 1); assert.equal(target.hp, 60);
});

test('a single Bang Tung impact creates one real lotus sprite and an 80-radius field; nearby AoE hits do not spawn more flowers', () => {
  const s = lotusWorld(), target = enemy(s, 180), nearby = enemy(s, 180, 35), outside = enemy(s, 180, 65);
  s.skill.nMis = 1;
  launch(s); run(s, .95);
  assert.equal(s.flowers.length, 1);
  assert.equal(s.flowers[0].cast.skill.geo.r, 80);
  const flowers = s.l.fx.filter(effect => effect.k === 'boom' && effect.s === s.A0.m[188].fly);
  assert.equal(flowers.length, 1);
  assert.equal(flowers[0].x, 180); assert.equal(flowers[0].y, -14);
  assert.equal(target.hp, 80); assert.equal(nearby.hp, 90); assert.equal(outside.hp, 100);
  assert.deepEqual(Object.keys(s.flowers[0].cast.skill.parts), ['cold']);
  run(s, 1); assert.equal(s.flowers.length, 1); assert.equal(target.hp, 80); assert.equal(nearby.hp, 90);
});

test('lotus fields keep their impact position and expire; entering during the active window gives only one hit', () => {
  const s = lotusWorld(), target = enemy(s, 180), entering = enemy(s, 400, 100);
  s.skill.nMis = 1;
  launch(s); run(s, .95);
  assert.equal(s.flowers.length, 1);
  const center = s.flowers[0].center;
  target.x = 500; s.v.x = -300;
  entering.x = 180; entering.y = 35;
  run(s, .2); assert.equal(entering.hp, 90);
  assert.equal(center.x, 180); assert.equal(center.y, 0);
  run(s, 2); assert.equal(entering.hp, 90);
  const late = enemy(s, 180, 35); run(s, .2); assert.equal(late.hp, 100);
});

test('quiet and low-FX combat retain one lotus field per missile and the same damage without visible sprites', () => {
  for (const quiet of [false, true]) {
    const s = lotusWorld({ state: { quiet }, preferences: { lowFx: true } }), target = enemy(s, 180);
    s.skill.nMis = 3; launch(s);
    const missiles = s.l.combatProjectiles.slice();
    for (const missile of missiles) missile.ang = missiles[1].ang;
    run(s, 1.5);
    assert.equal(s.flowers.length, 3); assert.equal(target.hp, 60);
    if (quiet) assert.equal(s.l.fx.length, 0);
  }
});

// Exercise the SIM adapter with real event lookup, sprites and collision engine.
function simulatorCastWorld(id) {
  const s = lotusWorld(), hero = s.v;
  vm.runInContext(compileTypeScriptEntry('simulator/skill-cast.ts', 'SimSkillCasting').code, s);
  const actor = { x: 0, y: 0, hp: 1000, r: 17 }, profile = { sk: {}, lowFx: false };
  const stats = { skillBonus: { [id]: 100 }, seriesSkill: 0, skillEnh: 0 };
  s.skill = { ...standardSkill(s, id), ev: true, tot: 40, nMis: 1 };
  s.l8 = () => 0;
  s.valid = true; s.hits = [];
  s.withActor = action => {
    const player = s.o, v = s.v, originalStats = s.l.P;
    s.o = profile; s.v = actor; s.l.P = stats;
    try { return action(); } finally { s.o = player; s.v = v; s.l.P = originalStats; }
  };
  s.cast = (target, targets) => {
    const cast=s.SimSkillCasting.castSimulatorSkill(actor, target, s.skill,
      () => s.valid, targets, (skill, contact) => {
        s.hits.push({ actor, skill, contact });
        return s.withActor(() => s.hs(skill, contact));
      }, s.withActor);
    finishAttackPose(s,actor);return cast;
  };
  return Object.assign(s, { actor, hero, stats });
}

test('SIM Bang Tung emits a real lotus at contact and applies its own secondary skill bonus to its allowed targets', () => {
  const s = simulatorCastWorld(336), target = enemy(s, 180), near = enemy(s, 180, 35), excluded = enemy(s, 180, -35);
  s.cast(target, () => [target, near]);
  assert.equal(s.flowers.length, 0);
  run(s, .95);
  assert.equal(s.flowers.length, 1);
  const flower = s.flowers[0];
  assert.equal(flower.cast.actor, s.actor);
  assert.equal(flower.cast.skill.parts.cold, 5, '40 × .25 × secondary/primary bonus (.5), using SIM stats');
  assert.equal(target.hp, 80); assert.equal(near.hp, 90); assert.equal(excluded.hp, 100);
  assert.ok(s.l.fx.some(effect => effect.s === s.A0.m[188].fly));
  assert.equal(s.v, s.hero); assert.ok(!s.l.P.skillBonus);
});

test('SIM Thien Ngoai creates the real lava sprite and secondary AoE with SIM attribution', () => {
  const s = simulatorCastWorld(362), target = enemy(s, 180), near = enemy(s, 240), excluded = enemy(s, 180, 15);
  s.cast(target, () => [target, near]);
  run(s, .5);
  const secondary = s.l.combatProjectiles.filter(effect => effect.combat.skill.ev2);
  assert.ok(secondary.length > 0);
  assert.ok(secondary.every(effect => effect.combat.actor === s.actor));
  assert.ok(secondary.some(effect => effect.mid === s.LP[363][0]));
  assert.equal(secondary[0].combat.skill.parts.fire, 20, 'secondary uses SIM bonus, not the player stats');
  run(s, 1);
  assert.ok(s.hits.some(hit => hit.skill.ev2 && hit.contact === target));
  assert.ok(s.hits.some(hit => hit.skill.ev2 && hit.contact === near));
  assert.equal(excluded.hp, 100);
  assert.equal(s.v, s.hero);
});

test('SIM secondary contacts stop on cancellation and never fall back to the player enemy list', () => {
  for (const id of [336, 362]) {
    const s = simulatorCastWorld(id), target = enemy(s, 180), excluded = enemy(s, 180, 15);
    s.cast(target, () => [target]);
    run(s, .5);
    s.valid = false;
    const health = target.hp;
    run(s, 2);
    assert.equal(target.hp, health);
    assert.equal(excluded.hp, 100);
    assert.equal(s.v, s.hero);
  }
});

test('SIM lotus and lava can hit the player in PK and stop all delayed damage when PK is disabled', () => {
  for (const id of [336, 362]) {
    const s = simulatorCastWorld(id), unrelated = enemy(s, 180);
    s.hero.x = 180;
    let pk = true;
    const hit = (skill, contact) => {
      assert.equal(contact, s.hero);
      s.l.life -= 10;
      s.hits.push(skill);
      return 10;
    };
    s.SimSkillCasting.castSimulatorSkill(s.actor, s.hero, s.skill, () => pk,
      () => pk ? [s.hero] : [], hit, s.withActor);
    finishAttackPose(s,s.actor);run(s, 1);
    assert.ok(s.hits.some(skill => skill.ev2), `skill ${id}: secondary hits the player`);
    assert.equal(unrelated.hp, 100);
    pk = false;
    const health = s.l.life;
    // Also exercise stale callbacks retained outside the projectile array.
    for (const effect of s.l.combatProjectiles) effect.combat.onHit(s.hero);
    run(s, 2);
    assert.equal(s.l.life, health);
    assert.equal(unrelated.hp, 100);
  }
});

test('Vo Hinh Doc emits its green native contact sprite only on nearby living monsters at aura pulses', () => {
 const s=world(),near=enemy(s,50),far=enemy(s,400),dead=enemy(s,40);dead.dead=true;
 Object.assign(s,{Yn:{69:{el:'poison',every:10/18,rad:180}},y4:{},zi:()=>1,i6:()=>90,F0:()=>1,
  Q0:['poison'],Rn:()=>null,ja:value=>value,ea:()=>1,ve:3});
 s.l.P.main={};near.res=far.res=dead.res={poison:0};
 declaration(s,'src/client/gameplay/shop-and-books-01.js','b7');
 s.b7(69,.01);
 assert.equal(near.hp,100);assert.equal(near.poison,3);assert.equal(near.poisonDmg,30);
 assert.equal(far.poison,undefined);assert.equal(dead.poison,undefined);
 assert.equal(s.l.fxQ.length,1);assert.equal(s.l.fxQ[0].s,s.A0.m[94].hit);
 assert.equal(s.l.fxQ[0].x,near.x);assert.equal(s.l.fxQ[0].y,near.y-14);
 s.b7(69,.1);assert.equal(s.l.fxQ.length,1,'no contact between aura pulses');
 s.o.lowFx=true;s.b7(69,.6);assert.equal(s.l.fxQ.length,2);assert.equal(near.poisonDmg,60);
 s.l.quiet=true;s.b7(69,.6);assert.equal(s.l.fxQ.length,2);assert.equal(near.poisonDmg,90,'hidden FX keeps original poison stacking');
 near.x=400;s.l.quiet=false;s.b7(69,.6);assert.equal(s.l.fxQ.length,2,'leaving the aura stops contacts');
});

// Load the actual level-16 event configuration, including its native ring sprite.
function nhanKiemWorld(options = {}) {
 const s=lotusWorld(options);
 declaration(s,'src/client/combat/skills-01.js','Vw');
 const source=fs.readFileSync(path.join(ROOT,'src/client/combat/skills-01.js'),'utf8');
 const setup=acorn.parse(source,{ecmaVersion:'latest'}).body.find(node=>node.type==='ForOfStatement'&&
  node.right.type==='ArrayExpression'&&node.right.elements.some(value=>value.value===368));
 assert.ok(setup);vm.runInContext(source.slice(setup.start,setup.end),s);
 s.skill={...standardSkill(s,368),ev:true,tot:40};
 s.S5=()=>({light:10});
 s.impacts=[];s.l.fxQ=[];
 s.l.fxQ.push=function(...effects){s.impacts.push(...effects);return Array.prototype.push.apply(this,effects);};
 return s;
}

test('level-20 Nhan Kiem shows one native ring per sword/body contact in all eight directions, including up-left',()=>{
 for(const [dx,dy]of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]){
  const s=nhanKiemWorld(),target=enemy(s,dx*50,dy*35);
  target.hp=target.max=10000;launch(s);const swords=s.l.combatProjectiles.slice();
  assert.equal(swords.length,3);assert.equal(s.impacts.length,0);
  run(s,2);
  const contacts=swords.filter(ray=>ray.contactHits.has(target)).length;
  assert.equal(contacts,3,`all swords reach target in direction ${dx},${dy}`);
  const rings=s.impacts.filter(effect=>effect.s===s.A0.m[27].hit);
  assert.equal(rings.length,contacts,`one ring per contact in direction ${dx},${dy}`);
  assert.ok(rings.every(effect=>effect.cosmetic&&!effect.combat&&effect.x===target.x&&effect.y===target.y-14));
 }
});

test('four piercing Nhan Kiem swords each show rings on every contacted body without adding damage hits',()=>{
 const s=nhanKiemWorld(),first=enemy(s,55),second=enemy(s,95),third=enemy(s,135),offPath=enemy(s,95,85);
 for(const target of s.l.enemies)target.hp=target.max=10000;
 s.skill.nMis=4;
 launch(s);const swords=s.l.combatProjectiles.slice();assert.equal(swords.length,4);run(s,2);
 for(const target of [first,second,third]){
  const contacts=swords.filter(ray=>ray.contactHits.has(target)).length;
  assert.equal(contacts,4);
  const rings=s.impacts.filter(effect=>effect.s===s.A0.m[27].hit&&effect.x===target.x&&effect.y===target.y-14);
  assert.equal(rings.length,contacts,'damage quota must not suppress the fourth cosmetic ring');
  assert.equal(swords[0].combat.hits.get(target),3,'primary damage retains its original cap');
 }
 assert.equal(s.impacts.filter(effect=>effect.s===s.A0.m[27].hit).length,12);
 assert.ok(swords.every(ray=>!ray.contactHits.has(offPath)));
 const count=s.impacts.length;run(s,2);assert.equal(s.impacts.length,count,'a contact never emits again on later ticks');
});

test('Nhan Kiem contact rings retain level unlock and quiet/low-FX behavior',()=>{
 for(const {level,quiet,lowFx,expected}of [
  {level:15,quiet:false,lowFx:false,expected:0},
  {level:20,quiet:true,lowFx:false,expected:0},
  {level:20,quiet:false,lowFx:true,expected:3},
 ]){
  const s=nhanKiemWorld({state:{quiet},preferences:{lowFx}}),target=enemy(s,60);
  s.skill.L=level;target.hp=target.max=10000;
  launch(s);run(s,2);
  assert.equal(s.impacts.filter(effect=>effect.s===s.A0.m[27].hit).length,expected);
 }
});

test('SIM Nhan Kiem uses the same per-sword rings on its permitted targets, away from the player',()=>{
 const s=nhanKiemWorld(),actor={x:300,y:300,hp:1000},target=enemy(s,250,265),excluded=enemy(s,250,265);
 target.hp=excluded.hp=10000;s.skill.nMis=4;
 vm.runInContext(compileTypeScriptEntry('simulator/skill-cast.ts','SimSkillCasting').code,s);
 const withActor=action=>{const hero=s.v;s.v=actor;try{return action();}finally{s.v=hero;}};
 s.SimSkillCasting.castSimulatorSkill(actor,target,s.skill,()=>true,()=>[target],
  (skill,contact)=>s.hs(skill,contact),withActor);
 finishAttackPose(s,actor);const swords=s.l.combatProjectiles.slice();run(s,2);
 assert.equal(swords.filter(ray=>ray.contactHits.has(target)).length,4);
 assert.equal(s.impacts.filter(effect=>effect.s===s.A0.m[27].hit).length,4);
 assert.equal(excluded.hp,10000);assert.equal(target.hp,9960,'three primary hits and one existing secondary hit');
 assert.equal(s.v.x,0);assert.equal(s.v.y,0);
});

function snowWorld(options = {}) {
 const s=lotusWorld(options);
 s.skill={...standardSkill(s,337),ev:true,tot:40};
 return s;
}

test('Bang Tam snow begins at attack release and advances through fixed patches to the selected position in eight directions',()=>{
 for(let dir=0;dir<8;dir++){
  const s=snowWorld(),angle=dir*Math.PI/4,target=enemy(s,Math.cos(angle)*350,Math.sin(angle)*350/2);
  launch(s);const patches=s.l.combatProjectiles.filter(effect=>effect.k==='boom'&&effect.s===s.A0.m[148].fly);
  assert.ok(patches.length>=4);assert.equal(patches[0].t,0);assert.equal(patches[0].x,0);assert.equal(patches[0].y,-14);
  assert.equal(patches.at(-1).x,target.x);assert.equal(patches.at(-1).y,target.y-14);
  for(let i=1;i<patches.length;i++)assert.ok(patches[i].t<patches[i-1].t);
  assert.ok(patches.every(effect=>effect.combat.skill.geo.r===150));
  assert.equal(new Set(patches.map(effect=>effect.combat)).size,1);
  const positions=patches.map(e=>[e.x,e.y]);target.x+=200;target.y+=80;s.v.x-=200;s.v.y-=80;
  run(s,.04);assert.equal(patches[0].t,.05);assert.ok(patches.at(-1).t<0);
  assert.deepEqual(patches.map(e=>[e.x,e.y]),positions);
  declaration(s,'src/client/render/arena-01.js','CP');const frames=[];s.Fa=(sprite,dir,t,x,y)=>frames.push({sprite,t,x,y});
  for(const patch of patches)s.CP(patch);
  assert.equal(frames.length,1);assert.equal(frames[0].x,0);assert.equal(frames[0].y,-14);
 }
});

test('snow affects every live occupant within the old 150 radius along its path without repeated overlap damage',()=>{
 const s=snowWorld(),target=enemy(s,350),nearCaster=enemy(s,0,40),middle=enemy(s,175,35),far=enemy(s,175,130);
 const pack=Array.from({length:6},()=>enemy(s,175,35));launch(s);
 run(s,.02);assert.equal(nearCaster.hp,90);assert.equal(middle.hp,100);assert.equal(target.hp,100);
 run(s,1.5);assert.equal(middle.hp,90);assert.ok(pack.every(mob=>mob.hp===90));assert.equal(far.hp,100);
 assert.ok(target.hp<100);const health=middle.hp;run(s,1);assert.equal(middle.hp,health);
 assert.equal(s.l.combatProjectiles.filter(e=>e.k==='boom').length,0);
});

test('snow uses live occupants, keeps damage in quiet and low FX modes and survives missing sprite metadata',()=>{
 for(const quiet of [false,true])for(const missing of [false,true]){
  const s=snowWorld({state:{quiet},preferences:{lowFx:true}}),target=enemy(s,350),entering=enemy(s,175,200);
  if(missing)delete s.A0.m[148];launch(s);entering.y=35;run(s,1.5);
  assert.equal(entering.hp,90);assert.ok(target.hp<100);
  if(quiet||missing)assert.ok(!s.l.fx.some(effect=>effect.k==='boom'&&effect.s===s.A0.m[148]?.fly));
 }
});

test('snow stops at terrain and is invalidated on zone change or player death',()=>{
 const s=snowWorld(),target=enemy(s,350);s.mt=(x0,y0,x1)=>x1<180;
 // Exercise the shared helper directly: ordinary targeting correctly refuses a blocked cast.
 const skill={...s.skill,ev2:true};s.spawnSnowTrail(s.v,target,skill,hit=>s.hs(skill,hit));
 assert.ok(s.l.combatProjectiles.every(effect=>effect.x<180));
 for(const field of ['zone','death']){
  const w=snowWorld(),far=enemy(w,350),near=enemy(w,0,35);launch(w);
  if(field==='zone')w.l.zoneShown++;else w.l.deadT=1;
  run(w,2);assert.equal(near.hp,100);assert.equal(far.hp,100);assert.equal(w.l.combatProjectiles.length,0);
 }
});

test('SIM snow uses its own caster, damage bonuses and allowed targets; cancellation stops later contacts',()=>{
 const s=simulatorCastWorld(337),target=enemy(s,350),middle=enemy(s,175,35),excluded=enemy(s,175,-35);
 s.cast(target,()=>[target,middle]);const fields=s.l.combatProjectiles.filter(effect=>effect.k==='boom');
 assert.ok(fields.length>1);assert.ok(fields.every(effect=>effect.combat.actor===s.actor));
 assert.equal(fields[0].combat.skill.parts.cold,7,'40 × .35 × SIM secondary bonus ratio .5');
 run(s,1.5);assert.equal(middle.hp,90);assert.equal(excluded.hp,100);assert.equal(s.v,s.hero);
 const cancelled=simulatorCastWorld(337),later=enemy(cancelled,350);cancelled.cast(later,()=>[later]);
 cancelled.valid=false;run(cancelled,2);assert.equal(later.hp,100);
});
