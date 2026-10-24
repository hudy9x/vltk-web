const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const acorn = require('acorn');
const { loadCombatEngine } = require('./helpers/combat-engine');

function world() {
  const s = { Math, Set, Map, v: { x: 0, y: 0 },
    l: { fx: [], enemies: [], life: 1000, zoneShown: 1, P: { speed: 1, speedFoot: 1 } },
    QA: .81, Z0: { g: false }, R2: () => true, mt: () => true,
    A0: { m: {}, f: {}, s: {} }, Hi: { phys: '#fff' }, Y3: () => 0,
    G3() {}, x8() {}, ws: () => .4, Y: { target: null } };
  s._1=()=>s.l.enemies;
  vm.createContext(s); loadCombatEngine(s); return s;
}
function declaration(s, file, name) {
  const source = fs.readFileSync(file, 'utf8');
  const node = acorn.parse(source, { ecmaVersion: 'latest' }).body.find(node =>
    node.type === 'VariableDeclaration' && node.declarations.some(d => d.id.name === name));
  assert.ok(node, name); vm.runInContext(source.slice(node.start, node.end), s);
}
function advance(s, seconds, dt = .01) {
  for (let t = 0; t < seconds - 1e-9; t += dt) s.advanceSkillContacts(Math.min(dt, seconds - t));
}

test('shipped attack balance uses 25 FPS at baseline and 50 FPS for a 2.32 rate', () => {
  const s = {};
  vm.createContext(s);
  const engine = loadCombatEngine(s, { bridge: false, productionSpeed: true });
  engine.validateSpeedConfiguration(engine.SPEED_CONFIG);
  assert.equal(engine.resolveSpeed('attack', 100).fps, 25);
  const attack = engine.resolveSpeed('attack', 232);
  assert.equal(attack.phasePercent, 200);
  assert.equal(attack.fps, 50);
  assert.equal(attack.cycleSeconds, .4);
  assert.equal(engine.resolveSpeed('attack', 999).fps, 70);
});

test('speed caps and floor phases apply once, after buffs and slows', () => {
  const s = world();
  for (const [input, run, attack] of [[-100,25,25],[25,25,25],[49.99,25,25],[50,50,50],
    [99.99,75,75],[100,100,100],[120,120,100],[124.99,120,100],[125,120,125],
    [199.99,150,150],[200,200,200],[250,250,250],[299.99,250,250],[300,300,300],[999,300,300]]) {
    assert.equal(s.resolveSpeed('run',input).phasePercent,run);
    assert.equal(s.resolveSpeed('attack',input).phasePercent,attack);
  }
  // A 400% build is slowed BEFORE the 300% cap: 400% × .5 = 200%.
  Object.assign(s.l.P,{speed:4,speedFoot:4});Object.assign(s.l,{slowT:5,slowPower:.5});
  assert.equal(s.actorRunSpeed(s.v),2);
  assert.equal(s.actorAttackTiming(s.v,{rate:4}).phasePercent,200);
});

test('phase thresholds and FPS can be independently configured and invalid tables are rejected', () => {
  const s = world(), config = JSON.parse(JSON.stringify(s.CombatEngine.SPEED_CONFIG));
  config.run.phases.find(p=>p.minPercent===150).fps=20;
  s.CombatEngine.validateSpeedConfiguration(config);
  assert.equal(s.resolveSpeed('run',150,config).multiplier,20/12);
  config.attack.phases.find(p=>p.minPercent===125).minPercent=130;
  assert.equal(s.resolveSpeed('attack',129,config).phasePercent,100);
  assert.equal(s.resolveSpeed('attack',130,config).phasePercent,130);
  config.attack.phases[0].fps=0;
  assert.throws(()=>s.CombatEngine.validateSpeedConfiguration(config),/Invalid/);
});

test('player, SIM and monster statuses feed the same speed phases', () => {
  const s = world(), sim = {x:0,y:0,stats:{speed:2,speedFoot:1.5},mounted:false,slowT:3,slowPower:.5};
  assert.equal(s.actorRunSpeed(sim),.75);
  assert.equal(s.actorRunSpeed({x:0,y:0,slowT:3,slowPower:.75}),.25);
  s.Rn = () => ({run:-50,cast:-50,slow:0});s.v.curse={1:100};
  assert.equal(s.actorRunSpeed(s.v),.5);
  assert.equal(s.actorAttackTiming(s.v,{rate:1,phys:false}).phasePercent,50);
  assert.equal(s.actorAttackTiming(s.v,{rate:1,phys:true}).phasePercent,100);
});

test('run distance and sprite cycle accelerate together at phase boundaries', () => {
  const s=world(); declaration(s,'src/client/core/state-and-save-03.js','Ra');
  declaration(s,'src/client/render/arena-01.js','H8'); declaration(s,'src/client/render/arena-01.js','ps');
  for(const speed of [.25,1,1.2,2,3]) {
    Object.assign(s.l.P,{speed,speedFoot:speed});Object.assign(s.v,{act:'run',actT:0});
    s.H8(s.v,.1,'run');assert.ok(Math.abs(s.v.actT-.1*speed)<1e-9);
    assert.ok(Math.abs(150*s.Ra()*.1-15*speed)<1e-9);
  }
  // Different sheets complete the same step cycle, without using native FPS.
  assert.equal(s.speedSpriteFrame('run',1/3,8,150),4);
  assert.equal(s.speedSpriteFrame('run',1/3,16,150),8);
});

test('each completed attack pose releases exactly one skill at 100, 200 and 300 percent', () => {
  for(const rate of [1,2,3]) for(const dt of [1/60,1/30]) {
    const s=world(), target={x:10,y:0,hp:1000,r:20};s.l.enemies=[target];let emitted=0,hits=0;
    const start=()=>s.queueSkillContact(s.v,target,{rate,phys:true,melee:true,parts:{phys:1}},()=>hits++,{visual:()=>emitted++});
    for(let tick=0;tick<180;tick++) {
      if(!s.actorActionLocked(s.v))start();
      s.advanceSkillContacts(dt);
    }
    assert.equal(emitted,Math.round(180*dt*rate),`${rate}/${dt}`);
    s.advanceSkillContacts(dt);
    assert.equal(hits,emitted);
  }
});

test('distance scale changes travel time without changing run frames or attack timing', () => {
  const s = world();
  declaration(s, 'src/client/core/state-and-save-03.js', 'Ra');
  declaration(s, 'src/client/render/arena-01.js', 'H8');
  declaration(s, 'src/client/render/arena-01.js', 'ps');
  Object.assign(s.l.P, { speed: 2, speedFoot: 2 });
  const attackDuration = s.actorAttackTiming(s.v, { rate: 2 }).cycleSeconds;
  for (const scale of [.8, 1, 1.15, 1.3]) {
    s.CombatEngine.SPEED_CONFIG.run.distanceScale = scale;
    s.CombatEngine.validateSpeedConfiguration(s.CombatEngine.SPEED_CONFIG);
    Object.assign(s.v, { act: 'run', actT: 0 });
    s.H8(s.v, .1, 'run');
    assert.equal(s.v.actT, .2);
    assert.ok(Math.abs(150 * s.Ra() * .1 - 30 * scale) < 1e-9);
    assert.ok(Math.abs(300 / (150 * s.Ra()) - 1 / scale) < 1e-9);
    assert.equal(s.actorAttackTiming(s.v, { rate: 2 }).cycleSeconds, attackDuration);
    // Slow debuffs and the 300% phase cap are applied before distance scaling.
    const sim = { stats: { speed: 4, speedFoot: 4 }, slowT: 3, slowPower: .5 };
    assert.equal(s.actorMovementSpeed(sim), 2 * scale);
    assert.equal(s.actorMovementSpeed({ stats: { speed: 9 } }), 3 * scale);
    assert.equal(s.actorMovementSpeed({}), scale);
  }
});

test('distance scale rejects invalid values at configuration validation', () => {
  const s = world(), config = JSON.parse(JSON.stringify(s.CombatEngine.SPEED_CONFIG));
  for (const distanceScale of [0, -1, NaN, Infinity, -Infinity, undefined]) {
    config.run.distanceScale = distanceScale;
    assert.throws(() => s.CombatEngine.validateSpeedConfiguration(config), /distanceScale/);
  }
});

test('no projectile, contact or linked secondary is emitted before the final attack frame', () => {
  const s=world(),target={x:10,y:0,hp:1000,r:20};s.l.enemies=[target];let emitted=0,secondary=0,hits=0;
  const skill={rate:2,melee:true,parts:{phys:1}};
  s.queueSkillContact(s.v,target,skill,()=>hits++,{visual:()=>emitted++,afterRelease:()=>secondary++});
  advance(s,.49);assert.equal(emitted,0);assert.equal(secondary,0);assert.equal(hits,0);
  assert.ok(Math.abs(s.v.speedCastProgress-.98)<1e-9);
  // A buff change affects only the NEXT pose.
  skill.rate=3;advance(s,.01);
  assert.equal(emitted,1);assert.equal(secondary,1);assert.equal(s.actorActionLocked(s.v),false);
  advance(s,.01);assert.equal(hits,1);
});

test('interrupts, death, stun and changing zones cancel the pending attack', () => {
  for(const interrupt of [s=>s.applyActorHurt(s.v,150,1000),s=>s.l.life=0,
    s=>s.l.stunT=3,s=>s.l.zoneShown=2,s=>{s.v.actionRevision=1;s.v.castT=0;}]) {
    const s=world(),target={x:10,y:0,hp:1000,r:20};let emitted=0;
    s.queueSkillContact(s.v,target,{rate:1,parts:{phys:1}},()=>{}, {visual:()=>emitted++});
    advance(s,.3);interrupt(s);advance(s,2);assert.equal(emitted,0);
  }
});

test('a late tick advances a newly released projectile only for the leftover time', () => {
  const s=world(),target={x:500,y:0,hp:1000,r:20};s.l.enemies=[target];
  s.queueSkillContact(s.v,target,{rate:2,melee:false,rad:1000,parts:{phys:1}},()=>{});
  s.advanceSkillContacts(.49);s.advanceSkillContacts(.03);
  const effect=s.l.combatProjectiles[0];assert.ok(Math.abs(effect.age-.02)<1e-9);
  assert.ok(Math.abs(effect.x-7.2)<1e-9);
});

test('native SIM missiles survive a temporary shallow world swap at release', () => {
  const s=world(),actor={x:0,y:0,hp:1000},target={x:500,y:0,hp:1000,r:20};
  s.queueSkillContact(actor,target,{rate:2,parts:{phys:1}},()=>{}, {visual:()=>{
    const world=s.l;s.l={...world};
    try {s.registerCombatMissile({k:'jm',x:0,y:0,age:0,lf:10,z:0,hz:0,traveled:0});}
    finally{s.l=world;}
  }});
  s.CombatEngine.advanceActorActions(.5);
  assert.equal(s.l.combatProjectiles.length,1);
  assert.equal(s.l.combatProjectiles[0].combat.actor,actor);
});

test('linked secondaries inherit release remainder and a failed visual restores casting context', () => {
  const s=world(),target={x:500,y:0,hp:1000,r:20};let secondary;
  s.queueSkillContact(s.v,target,{rate:2,parts:{phys:1}},()=>{}, {afterRelease:()=>{
    secondary=s.queueSkillContact(s.v,target,{ev2:true,parts:{phys:1}},()=>{}, {windup:0});
  }});
  s.CombatEngine.advanceActorActions(.52);assert.ok(Math.abs(secondary.firstStep-.02)<1e-9);
  const other={x:0,y:0,hp:1000};
  s.queueSkillContact(other,target,{rate:2,parts:{phys:1}},()=>{}, {visual:()=>{throw Error('visual failed');}});
  assert.throws(()=>s.CombatEngine.advanceActorActions(.5),/visual failed/);
  assert.equal(s.activeCombatCast,null);
  const next=s.queueSkillContact(s.v,target,{ev2:true,parts:{phys:1}},()=>{}, {windup:0});
  assert.equal(next.firstStep,undefined);
});

test('saver mode accumulates the skipped render time without slowing the simulation', () => {
  for(const saver of [false,true]) {
    let simulation=0,animation=0,draws=0;
    const s={Math,Date,window:{},requestAnimationFrame(){},o5:0,Wm:0,speedDrawElapsed:0,
      ra:(_,fn)=>fn(),zv(){},o:{fac:true},document:{hidden:false},i0:{blocked:false},
      mapAccess:{tick:()=>true},p_:dt=>simulation+=dt,Pi:()=>({saver}),Vm:false,
      D_:dt=>{animation+=dt;draws++;},c5:-100,r5:-100};vm.createContext(s);
    declaration(s,'src/client/core/game-loop-01.js','P_');
    for(let frame=1;frame<=60;frame++)s.P_(frame*1000/60);
    assert.ok(Math.abs(simulation-1)<1e-9);assert.ok(Math.abs(animation+s.speedDrawElapsed-1)<1e-9);
    assert.equal(draws,saver?30:60);
  }
});
