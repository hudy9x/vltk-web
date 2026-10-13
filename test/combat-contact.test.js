const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
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
  load(s, 'data.js');
  load(s, 'app/data/projectile-effects-01.js');
  load(s, 'app/data/projectile-effects-02.js');
  s.A0 = s.JFX; s.T = s.JX.skills;
  for (const name of ['t7', 'U2', 'r4', 'Y5', 'e7', 'a7']) declaration(s, 'app/combat/skills-01.js', name);
  declaration(s, 'app/core/attributes-01.js', 'N5');
  load(s, 'app/combat/hit-resolution-01.js');
  load(s, 'app/render/projectiles-01.js');
  for (const name of ['TP', 'Ya', 'x8']) declaration(s, 'app/render/arena-01.js', name);
  declaration(s, 'app/core/state-and-save-01.js', 'oD');
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
  s.oD();
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
  shaolin(s); s.oD();
  target.y = 150;
  run(s, 2);
  assert.equal(target.hp, 100);
  assert.equal(s.l.combatProjectiles.length, 0);
});

test('Vo Tuong Tram also waits for its real flying effects before damaging a stationary monster', () => {
  const s = world(), target = enemy(s, 240);
  shaolin(s, { id: 321, L: 25, nMis: 3 }); s.oD();
  assert.equal(target.hp, 100);
  run(s, 0.2); assert.equal(target.hp, 100);
  run(s, 1.5); assert.equal(target.hp, 90);
});

test('stationary AoE contacts every overlapping body once during its active window', () => {
  const s = world(), a = enemy(s, 25), b = enemy(s, 45), far = enemy(s, 180);
  const skill = { melee: false, parts: { phys: 10 }, geo: { k: 'self', r: 80, pierce: true } };
  s.queueSkillContact(s.v, s.v, skill, target => s.hs(skill, target), { maxTargets: 3, visual: () => {} });
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
      shaolin(s, { nMis: 5 }); s.oD();
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
  s.queueSkillContact(s.v, target, skill, hit => s.hs(skill, hit), { visual: () => {} });
  run(s, 0.1); assert.equal(target.hp, 100);
  target.x = 180; run(s, 0.3); assert.equal(target.hp, 100);
  target.x = 35;
  s.queueSkillContact(s.v, target, skill, hit => s.hs(skill, hit), { visual: () => {} });
  run(s, 0.2); assert.equal(target.hp, 90);
});

test('stationary spells remain at their cast position and do not teleport after a moving target', () => {
  const s = world(), target = enemy(s, 35);
  s.A0.m[9999] = { fly: { w: 32 }, spd: 0 };
  s.A0.k = { 9999: [0, 10, 0, 0, 0, 0, 1, 0, 0, 1] };
  const skill = { melee: false, parts: { phys: 10 }, geo: { k: 'spot', r: 20 } };
  s.queueSkillContact(s.v, target, skill, hit => s.hs(skill, hit), {
    visual: () => s.Wn(9999, target.x, -14, 0, target),
  });
  target.x = 180; run(s, 1);
  assert.equal(target.hp, 100);
});

test('changing zones or dying clears in-flight damage before a later hit', () => {
  for (const state of [{ zoneShown: 2 }, { deadT: 1 }, { town: true }]) {
    const s = world(), target = enemy(s);
    shaolin(s); s.oD(); Object.assign(s.l, state); run(s, 1);
    assert.equal(target.hp, 100);
    assert.equal(s.l.combatProjectiles.length, 0);
  }
});

test('contacts advance without rendering and give the same result at different tick sizes', () => {
  for (const dt of [1 / 60, 1 / 30, 0.05]) {
    const s = world(), target = enemy(s);
    shaolin(s); s.oD(); run(s, 1, dt);
    assert.equal(target.hp, 90);
  }
});

test('secondary rays wait for their own physical contact instead of applying damage on emission', () => {
  const s = world(), target = enemy(s);
  for (const name of ['LP', 'qP', 'Ds']) declaration(s, 'app/render/arena-02.js', name);
  for (const name of ['$P', 'B8', 'Be']) declaration(s, 'app/render/arena-01.js', name);
  declaration(s, 'app/core/state-and-save-01.js', 'eD');
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
  declaration(s, 'app/core/state-and-save-01.js', '$d');
  s.$d(attacker, 1 / 60);
  assert.equal(s.l.life, 100);
  run(s, 0.2); assert.equal(s.l.life, 100);
  s.v.y = 100; run(s, 2); assert.equal(s.l.life, 100);
  s.v.y = 0; attacker.atkCd = 0; s.$d(attacker, 1 / 60);
  run(s, 1); assert.equal(s.l.life, 90);
});

function standardSkill(s, id) {
  for (let i = 1; i <= 59; i++) load(s, `app/data/skill-tables-${String(i).padStart(2, '0')}.js`);
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
    s.queueSkillContact(s.v, target, skill, hit => s.hs(skill, hit));
    assert.ok(s.l.combatProjectiles.every(effect => effect.kind === 5));
    run(s, 0.2); assert.equal(target.hp, 100);
    target.y = 65;
    run(s, 0.15);
    assert.ok(s.l.combatProjectiles.some(effect => Math.abs(effect.ang) > 0.1));
    run(s, 2); assert.equal(target.hp, 90);
  }
});

test('Thien Dia Vo Cuc is an immediate stationary field with an exact live area and expiry', () => {
  const s = world(), target = enemy(s, 80), inside = enemy(s, 120), outside = enemy(s, 260);
  const skill = standardSkill(s, 365);
  s.queueSkillContact(s.v, target, skill, hit => s.hs(skill, hit));
  const field = s.l.combatProjectiles[0];
  assert.equal(field.kind, 0); assert.equal(field.age, 0);
  const origin = [field.x, field.y];
  target.x = 350; s.v.x = 400;
  run(s, 0.1);
  assert.deepEqual([field.x, field.y], origin);
  assert.equal(target.hp, 100); assert.equal(inside.hp, 90); assert.equal(outside.hp, 100);
  outside.x = 100; run(s, 0.1); assert.equal(outside.hp, 90);
  run(s, 1.5);
  target.x = 80; run(s, 0.1); assert.equal(target.hp, 100);
});

test('Thien Ngoai Luu Tinh secondary explosion ignores terrain, hits nearby bodies within its area and excludes distant ones', () => {
  const s = world(), center = enemy(s, 200), nearby = enemy(s, 270), outside = enemy(s, 400);
  s.Z0.g = true; s.mt = () => false; s.R2 = () => false;
  const skill = standardSkill(s, 362);
  for (const name of ['LP', 'qP', 'Ds']) declaration(s, 'app/render/arena-02.js', name);
  for (const name of ['$P', 'B8', 'Be']) declaration(s, 'app/render/arena-01.js', name);
  declaration(s, 'app/core/state-and-save-01.js', 'eD');
  s.Qi = () => 5; s.S5 = () => ({ fire: 10 });
  s.eD(skill, center, s.l.enemies, [center], { sid: 363, max: 5, el: 'fire' });
  assert.equal(nearby.hp, 100);
  run(s, 0.5);
  assert.equal(center.hp, 90); assert.equal(nearby.hp, 90); assert.equal(outside.hp, 100);
});

test('homing missiles expire at their configured range instead of following an unreachable enemy forever', () => {
  const s = world(), target = enemy(s, 2200), skill = standardSkill(s, 357);
  s.queueSkillContact(s.v, target, skill, hit => s.hs(skill, hit));
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
  s.queueSkillContact(s.v, target, skill, hit => s.hs(skill, hit), { visual: () => {}, maxTargets: Infinity });
  s.v.x = 400;
  run(s, 0.1);
  assert.equal(target.hp, 90); assert.equal(atCaster.hp, 100);
});

test('an enemy entering the Thien Ngoai explosion before activation is hit even if it was outside on cast', () => {
  const s = world(), center = enemy(s, 200), entering = enemy(s, 450);
  const skill = standardSkill(s, 362);
  for (const name of ['LP', 'qP', 'Ds']) declaration(s, 'app/render/arena-02.js', name);
  for (const name of ['$P', 'B8', 'Be']) declaration(s, 'app/render/arena-01.js', name);
  declaration(s, 'app/core/state-and-save-01.js', 'eD');
  s.Qi = () => 5; s.S5 = () => ({ fire: 10 });
  s.eD(skill, center, s.l.enemies, [center], { sid: 363, max: 5, el: 'fire' });
  entering.x = 270;
  run(s, 0.5);
  assert.equal(entering.hp, 90);
});

test('the terrain-independent spells cast and contact through obstacles but still require range', () => {
  for (const id of [362, 365, 375, 380]) {
    const s = world(), target = enemy(s, 80);
    s.skill = standardSkill(s, id);
    s.Z0.g = true;
    s.mt = () => false;
    s.R2 = () => false;
    s.oD();
    assert.equal(s.l.moveTo, null, `skill ${id} must cast without approaching an obstacle`);
    assert.ok(s.l.combatProjectiles.length > 0, `skill ${id} emitted`);
    assert.ok(s.l.combatProjectiles.every(effect => effect.combat.ignoreTerrain));
    run(s, 2);
    assert.ok(target.hp <= 90, `skill ${id} must contact through terrain`);
    const far = world(), outside = enemy(far, 2000);
    far.skill = standardSkill(far, id);
    far.Z0.g = true; far.mt = () => false; far.R2 = () => false;
    far.oD(); run(far, 2);
    assert.equal(outside.hp, 100);
    assert.equal(far.l.combatProjectiles.length, 0);
  }
});

test('ordinary flying attacks remain blocked when casting across terrain', () => {
  const s = world(), target = enemy(s, 80);
  shaolin(s); s.mt = () => false;
  s.oD(); run(s, 2);
  assert.equal(target.hp, 100);
  assert.equal(s.l.combatProjectiles.length, 0);
});

test('Phong Suong secondary rays ignore terrain and still wait for physical contact', () => {
  const s = world(), target = enemy(s, 180), missed = enemy(s, 180, 180);
  for (const name of ['LP', 'qP', 'Ds']) declaration(s, 'app/render/arena-02.js', name);
  for (const name of ['$P', 'B8', 'Be']) declaration(s, 'app/render/arena-01.js', name);
  declaration(s, 'app/core/state-and-save-01.js', 'eD');
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
    s.oD();
    assert.equal((s.l.combatProjectiles || []).length > 0, inRange, `target at ${dx},${dy}`);
  }
});

test('self-centered skill field covers its widened north/south ellipse but excludes targets beyond it', () => {
  const s = world(), north = enemy(s, 0, -52), south = enemy(s, 0, 52), outside = enemy(s, 0, 85);
  const skill = { parts: { phys: 10 }, geo: { k: 'self', r: 100 }, melee: false };
  s.queueSkillContact(s.v, s.v, skill, hit => s.hs(skill, hit), { visual: () => {}, maxTargets: Infinity });
  run(s, 0.1);
  assert.equal(north.hp, 90); assert.equal(south.hp, 90); assert.equal(outside.hp, 100);
});

test('Van Long Kich uses a forward narrow rectangle and hits every stacked body without circular side splash', () => {
  const s=world(), target=enemy(s,100), packed=Array.from({length:25},()=>enemy(s,100)),side=enemy(s,100,45),behind=enemy(s,-60);
  const skill=standardSkill(s,361);
  s.queueSkillContact(s.v,target,skill,hit=>s.hs(skill,hit),{maxTargets:1});
  run(s,.2);
  assert.equal(target.hp,90);assert.ok(packed.every(e=>e.hp===90));assert.equal(side.hp,100);assert.equal(behind.hp,100);
});
test('Nhan Kiem Hop Nhat sweeps narrow piercing rectangles through all packed bodies and misses off-path bodies', () => {
  const s=world(),target=enemy(s,80),packed=Array.from({length:25},()=>enemy(s,80)),side=enemy(s,80,70);
  const skill=standardSkill(s,368);
  s.queueSkillContact(s.v,target,skill,hit=>s.hs(skill,hit),{maxTargets:1});
  run(s,1);
  assert.equal(target.hp,90);assert.ok(packed.every(e=>e.hp===90));assert.equal(side.hp,100);
});
test('the Van Long rectangle keeps its initial heading when the caster and target move after casting',()=>{
  const s=world(),target=enemy(s,0,-60),onPath=enemy(s,0,-80),side=enemy(s,80,-80);
  const skill=standardSkill(s,361);
  s.queueSkillContact(s.v,target,skill,hit=>s.hs(skill,hit));
  s.v.x=500;target.x=500;
  run(s,.2);
  assert.equal(onPath.hp,90);assert.equal(side.hp,100);assert.equal(target.hp,100);
});
test('Thien Ngoai fields pulse every 300ms, deduplicate visual effects, and inspect live occupants on each pulse',()=>{
  const s=world(),target=enemy(s,200),packed=Array.from({length:25},()=>enemy(s,200)),entering=enemy(s,500);
  const skill={id:362,parts:{fire:10},melee:false,geo:{k:'spot',r:60,pierce:true}};
  s.queueSkillContact(s.v,target,skill,hit=>s.hs(skill,hit),{
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
test('Thien Ngoai logical pulses remain active with quiet or missing visual effects',()=>{
  for(const quiet of [true,false]){
    const s=world(),target=enemy(s,200);s.l.quiet=quiet;
    const skill={id:362,parts:{fire:10},melee:false,geo:{k:'spot',r:60,pierce:true}};
    s.queueSkillContact(s.v,target,skill,hit=>s.hs(skill,hit),{visual:()=>{}});
    run(s,.7);assert.equal(target.hp,70);
  }
});

test('a non-piercing narrow impact hits all overlapping bodies but stops before a separate farther pack',()=>{
  const s=world(),target=enemy(s,80),packed=Array.from({length:25},()=>enemy(s,80)),farther=enemy(s,180);
  ray(s,target,{geo:{k:'line',pierce:false}});
  run(s,1);
  assert.equal(target.hp,90);assert.ok(packed.every(e=>e.hp===90));assert.equal(farther.hp,100);
});
