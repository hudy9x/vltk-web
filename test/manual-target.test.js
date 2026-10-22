const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const { loadCombatEngine } = require('./helpers/combat-engine');
const ROOT = path.resolve(__dirname, '..');
function declaration(s, file, name) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const node = acorn.parse(text, { ecmaVersion: 'latest' }).body.find(n => n.type === 'VariableDeclaration' && n.declarations.some(d => d.id.name === name));
  assert.ok(node, name);
  vm.runInContext(text.slice(node.start, node.end), s);
}
function game() {
  const handlers = {};
  const canvas = { style: {}, addEventListener: (name, handler) => handlers[name] = handler, getBoundingClientRect: () => ({ left: 0, top: 0 }), setPointerCapture() {} };
  const s = {
    Math, o: { ctrl: 'manual', sk: {} }, l: { enemies: [], ground: [], clock: 0, P: { life: 100, mana: 100, regen: 0, manaRegen: 0 }, life: 100, mana: 100, atkT: 0, stall: 0 },
    v: { x: 0, y: 100 }, QA: 0.81, Qa: 0.5, B0: { x: 0, y: 0 }, T1: { v: [0,0] },
    lA: canvas, handlers, casts: 0, moves: 0, gs: -1,
    document: { querySelectorAll: () => [] }, window: { addEventListener() {} },
    m: () => ({ addEventListener() {} }), $8: () => 1, Hs: () => true,
    k() {}, qA() {}, W8() {}, O3() {}, eo() {}, en() {},
    X0: (x,y) => [x,y], $6: () => null, Ra: () => 1, H5: (x,y) => [x,y],
    gt: (actor,x,y) => { actor.x=x; actor.y=y; s.moves++; return true; },
    wa: (actor,x,y,step) => { actor.x += Math.sign(x-actor.x)*step; s.moves++; },
    hp: () => false, Ga: () => false, sD: () => false,
    mt: () => true, S3: () => false, tP: () => false,
    iD: enemies => enemies[0], jm: () => 0, aD: () => 0, Z9: () => s.skill,
    o4() {}, nD: () => [], l8: () => 0,
    queueSkillContact: () => { s.casts++; }, kn: () => 0, G8() {}, W3() {}, Jt: () => null,
  };
  for (const name of ['$w','Sb','advanceSkillContacts','X9','nP','Ab','cb','Oy','fy','Cd','$d']) s[name]=()=>{};
  s._1 = () => s.l.enemies.filter(e => !e.dead && e.hp > 0);
  s.q0 = (a,b) => Math.hypot(a.x-b.x, (a.y-b.y)*2)/s.QA;
  s.skill = { id: 10, rad: 300, rate: 2, targets: 1 };
  vm.createContext(s);
  const combat = loadCombatEngine(s, { bridge: false });
  // Keep the cast/tick spies; use the real migrated range/terrain functions.
  for (const name of ['skillIgnoresTerrain', 'SKILL_RANGE_Y_RATIO', 'skillCastDistance', 'actorActionLocked', 'advanceConsumableCooldowns', 'coldSpeedFactor', 'applyColdSlow']) s[name] = combat[name];
  const ui = 'src/client/ui/legacy-panels-and-audio-04.js';
  for (const name of ['Y','$1','hA','Rv']) declaration(s, ui, name);
  for (const name of ['eh','Wa','Qv','Ah']) declaration(s, 'src/client/ui/legacy-panels-and-audio-03.js', name);
  declaration(s, 'src/client/core/state-and-save-01.js', 'oD');
  declaration(s, 'src/client/core/state-and-save-02.js', 'Td');
  s.Rv();
  return s;
}
function enemy(s, x=150) { const e={ x, y:100, r:17, hp:100, n:'Quái', cls:'normal' };s.l.enemies.push(e);return e; }
function pointer(s, type, x, y, pointerType='mouse') { s.handlers[type]({ clientX:x,clientY:y,pointerId:1,pointerType }); }
function ticks(s, seconds) { for(let i=0;i<seconds*60;i++) { s.l.clock+=1/60;s.Td(1/60); } }

function enableCurseHotbar(s) {
  Object.assign(s, { T: { 10: { id: 10, n: 'Attack', attack: true, attr: {} },
    4: { id: 4, n: 'Curse', enemy: 1, attr: { physicsres_p: [[-10, 180, 0]], skill_cost_v: [[10, 0, 0]] } } },
    Yn: {}, k7: 18, UA: skill => !!skill?.attack, te: () => false,
    zi: id => s.o.sk[id] || 0, i4: () => false,
    b0: (skill, key, level) => skill.attr[key]?.[level - 1] || null,
    $() {}, D0() {}, o0() {}, contacts: [],
    beginActorCast: s.CombatEngine.beginActorCast,
    advanceSkillContacts: s.CombatEngine.advanceActorActions,
    queueSkillContact: (actor, target, skill, hit) => {
      if (skill.id === 4) s.contacts.push({ target, hit }); else s.casts++;
    },
  });
  Object.assign(s.o, { fac: 'test', sk: { 10: 1, 4: 1 }, slots: [10, 4, -1, -1], main: 10, mainLock: true, trapV: 1 });
  s.l.P.main = { id: 10 };
  for (const name of ['B7','wn','ae','M7','ba','ya','b4','canSlotSkill','castSupportSkill']) declaration(s,'src/client/gameplay/shop-and-books-01.js',name);
  for (const name of ['nh','tn','Ac']) declaration(s,'src/client/ui/legacy-panels-and-audio-03.js',name);
}

test('selecting a curse before clicking a monster casts that curse, never the main attack, with mouse or touch in auto or manual', () => {
  for (const pointerType of ['mouse','touch']) for (const mode of ['manual','auto']) {
    const s=game(); enableCurseHotbar(s); const target=enemy(s),old=enemy(s,350);
    s.o.ctrl=mode;s.l.manTgt=old;s.l.tgt=old;
    s.Ac(1);assert.equal(s.contacts.length,0);ticks(s,.1);assert.equal(s.casts,0);
    pointer(s,'pointerdown',150,20,pointerType);pointer(s,'pointerup',150,20,pointerType);
    assert.equal(s.contacts.length,1);assert.equal(s.contacts[0].target,target);assert.equal(s.l.mana,90);
    s.contacts[0].hit(target);assert.ok(target.curse[4]>s.l.clock);
    ticks(s,1);assert.equal(s.casts,0);assert.equal(s.o.main,10);assert.equal(s.Y.pendingSupport,0);
  }
});

test('a failed targeted curse stays armed and cannot fall through to a main attack; a ground click cancels targeting', () => {
  const s=game();enableCurseHotbar(s);enemy(s);s.l.mana=0;
  s.Ac(1);pointer(s,'pointerdown',150,20);pointer(s,'pointerup',150,20);ticks(s,1);
  assert.equal(s.contacts.length,0);assert.equal(s.casts,0);assert.equal(s.Y.pendingSupport,4);
  pointer(s,'pointerdown',800,800);pointer(s,'pointerup',800,800);
  assert.equal(s.Y.pendingSupport,0);assert.ok(s.Y.target);
});

test('the selected curse reaches the monster through the real contact simulation without main-skill damage', () => {
  const s=game();enableCurseHotbar(s);const target=enemy(s);
  Object.assign(s,{activeCombatCast:null,A0:{m:{},f:{},s:{}},Hi:{},G3(){},x8(){},Y3:()=>0,Z0:{g:false},R2:()=>true});
  s.l.zoneShown=1;s.l.fx=[];
  s.queueSkillContact=s.CombatEngine.castSkill;
  s.advanceSkillContacts=s.CombatEngine.updateCombat;
  s.Ac(1);pointer(s,'pointerdown',150,20);pointer(s,'pointerup',150,20);
  assert.equal(target.curse,undefined);ticks(s,1);
  assert.ok(target.curse[4]>s.l.clock);assert.equal(target.hp,100);assert.equal(s.l.mana,90);assert.equal(s.casts,0);
});

test('an auto ground click interrupts casting on the next tick, prevents attacks while travelling and resumes auto on arrival', () => {
  const s=game(); enemy(s,150); s.o.ctrl='auto';
  Object.assign(s.v,{castT:.8,atT:.8,act:'at',actionRevision:2});
  pointer(s,'pointerdown',240,100); pointer(s,'pointerup',240,100);
  assert.equal(s.v.castT,0); assert.equal(s.v.actionRevision,3);
  ticks(s,1/60);
  assert.ok(s.v.x>0); assert.equal(s.v.castT,0); assert.equal(s.v.actionRevision,3);
  assert.equal(s.casts,0); assert.equal(s.o.ctrl,'auto');
  ticks(s,1); assert.equal(s.casts,0); assert.ok(s.Y.target);
  ticks(s,1); assert.equal(s.Y.target,null); assert.equal(s.Y.tmp,false); assert.ok(s.casts>0);
});

test('auto ground movement works with an empty field and preserves hurt locks', () => {
  const s=game(); s.o.ctrl='auto'; s.l.spawnT=10;
  Object.assign(s.v,{hurtT:.5,act:'hurt'});
  pointer(s,'pointerdown',240,100); pointer(s,'pointerup',240,100);
  ticks(s,1/60); assert.equal(s.v.x,0); assert.equal(s.v.hurtT,.5);
  s.v.hurtT=0; ticks(s,1/60); assert.ok(s.v.x>0);
});

test('manual movement overrides casts even in empty fields, for mouse, keyboard and gamepad',()=>{
  for(const input of ['ground','keyboard','gamepad']) {
    const s=game();s.l.spawnT=10;s.l.clickHold=true;
    Object.assign(s.v,{castT:.4,atT:.4,actionRevision:2});
    if(input==='ground')s.Y.moveTarget(240,100);
    if(input==='keyboard')s.Y.keys.d=true;
    if(input==='gamepad')s.T1.v=[1,0];
    ticks(s,1/60);
    assert.ok(s.v.x>0,input);assert.equal(s.v.castT,0);assert.equal(s.v.actionRevision,3);
  }
});

test('automatic attacks cannot re-lock movement toward a selected monster while movement input is held',()=>{
  const s=game(),e=enemy(s);s.l.manTgt=e;s.Y.keys.d=true;
  ticks(s,.2);assert.ok(s.v.x>0);assert.equal(s.casts,0);
  s.Y.keys.d=false;ticks(s,.2);assert.ok(s.casts>0,'attack resumes after movement input stops');
});

test('auto buffs wait for the ground command to finish, while expired buffs still expire', () => {
  const s=game(), buffs={buff:{2:.1},cd:{}}; enemy(s); s.o.ctrl='auto'; s.o.fac='test'; s.o.sk={1:1};
  Object.assign(s,{v7(){},k4:0,ya:()=>s.l.clock,ba:()=>buffs,T:{1:{n:'Buff'}},wn:()=> 'buff',zi:()=>1,
    M7:()=>10,ae:()=>10,i4:()=>false,b4:()=>false,beginActorCast:()=>{s.v.castT=.4;return true;},o0(){}});
  declaration(s,'src/client/gameplay/shop-and-books-01.js','A6');
  s.l.clock=1; pointer(s,'pointerdown',240,100); pointer(s,'pointerup',240,100);
  s.A6(.5); assert.equal(s.l.mana,100); assert.equal(buffs.buff[1],undefined); assert.equal(buffs.buff[2],0);
  s.Y.target=null;s.Y.tmp=false;s.A6(.5);assert.equal(s.l.mana,90);assert.ok(buffs.buff[1]>s.l.clock);
});

test('mouse click cancels stale movement, flashes the monster, and does not turn holding/releasing into another command', () => {
  const s=game(), e=enemy(s);
  s.l.moveTo={x:900,y:100,hp:100};s.Y.target={x:900,y:100};s.l.pickTarget={};
  pointer(s,'pointerdown',150,20);
  assert.equal(s.l.manTgt,e);assert.equal(s.l.clickedTarget,e);assert.equal(s.l.clickedUntil,1);
  assert.equal(s.l.moveTo,null);assert.equal(s.l.pickTarget,null);assert.equal(s.Y.target,null);
  ticks(s,.02);assert.equal(s.casts,1);assert.equal(s.l.clickHold,true);
  pointer(s,'pointermove',450,100);pointer(s,'pointerup',450,100);
  assert.equal(s.Y.target,null);assert.equal(s.l.clickHold,true);assert.equal(s.l.manTgt,e);
});
test('after casting, a moving target cannot cause pursuit; only a fresh click allows movement', () => {
  const s=game(),e=enemy(s);s.Y.selectTarget(e);ticks(s,.02);
  const x=s.v.x;e.x=900;ticks(s,1);
  assert.equal(s.v.x,x);assert.equal(s.moves,0);assert.equal(s.casts,1);assert.equal(s.l.moveTo,null);
  pointer(s,'pointerdown',450,100);pointer(s,'pointerup',450,100);
  assert.equal(s.l.manTgt,null);assert.equal(s.l.clickHold,false);
  ticks(s,.05);assert.ok(s.v.x>x);
});
test('clicking an out-of-range target approaches once, casts, and then holds position while continuing in-range attacks', () => {
  const s=game(),e=enemy(s,400);s.Y.selectTarget(e);ticks(s,2);
  assert.ok(s.moves>0);assert.ok(s.casts>0);assert.equal(s.l.clickHold,true);
  const x=s.v.x,moves=s.moves,casts=s.casts;ticks(s,1);
  assert.equal(s.v.x,x);assert.equal(s.moves,moves);assert.ok(s.casts>casts);
});
test('manual idle consumes attack timer; selecting does not bypass a still-active attack cooldown', () => {
  const s=game(),e=enemy(s);s.l.atkT=.5;ticks(s,1);
  assert.equal(s.l.atkT,0);s.Y.selectTarget(e);ticks(s,.02);assert.equal(s.casts,1);
  s.Y.selectTarget(e);ticks(s,.1);assert.equal(s.casts,1);
});
test('monster click in auto takes manual control and wins over overlapping loot; hover agrees with head hit-testing', () => {
  const s=game(),e=enemy(s);s.o.ctrl='auto';s.$6=()=>({x:150,y:100,it:{n:'Đồ'}});
  pointer(s,'pointermove',150,20);assert.equal(s.lA.style.cursor,'url("img/cursors/attack.png") 13 12, pointer');
  pointer(s,'pointerdown',150,20);assert.equal(s.o.ctrl,'manual');assert.equal(s.l.manTgt,e);assert.equal(s.l.pickTarget,null);
  pointer(s,'pointerup',150,20);
  pointer(s,'pointermove',800,800);assert.equal(s.lA.style.cursor,'url("img/cursors/move.png") 12 10, default');
});
test('touch tap selects and flashes without a ground move; a later ground tap releases the hold', () => {
  const s=game(),e=enemy(s);
  pointer(s,'pointerdown',150,20,'touch');pointer(s,'pointerup',150,20,'touch');
  ticks(s,.02);assert.equal(s.l.manTgt,e);assert.equal(s.l.clickHold,true);
  pointer(s,'pointerdown',450,100,'touch');pointer(s,'pointerup',450,100,'touch');
  assert.equal(s.l.clickHold,false);assert.equal(s.l.manTgt,null);assert.equal(s.Y.target.x,450);
});

test('cold intensity slows keyboard and joystick movement, pursuit and the player attack clock',()=>{
 const s=game(),e=enemy(s,900);s.applyColdSlow(s.l,100,3);
 s.Qv=()=>[1,0];assert.equal(s.Ah(.2),true);assert.equal(s.v.x,22.5);
 s.Qv=()=>[0,0];s.l.manTgt=e;s.l.moveTo=e;s.l.clickHold=false;s.Y.target=null;
 s.l.atkT=2;s.Td(.2);assert.equal(s.v.x,45);assert.equal(s.l.atkT,1.85);
 s.l.slowT=0;s.Ah(.2);s.Qv=()=>[1,0];s.Ah(.2);assert.equal(s.v.x,75,'normal movement after expiry');
});
