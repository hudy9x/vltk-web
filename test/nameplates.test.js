const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const { compileTypeScriptEntry } = require('../tools/build-app');
const { loadMapsEngine } = require('./helpers/maps-engine');

function load(s, file, name) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const node = acorn.parse(source, { ecmaVersion: 'latest' }).body.find(node =>
    node.type === 'VariableDeclaration' && node.declarations.some(d => d.id.name === name));
  assert.ok(node, name);
  vm.runInContext(source.slice(node.start, node.end), s);
}

function scene() {
  const events = [], positions = [];
  const canvas = new Proxy({
    measureText: text => ({ width: text.length * 7 }),
    fillText: (text, x, y) => { events.push(`label:${text}`); positions.push({ text, x, y }); },
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const noop = () => {};
  const s = {
    E0: { anim: { hero: { st: { h: 80 } }, monster: { st: { h: 80 } } } },
    W: canvas, vs: [], E: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    H1: 1, M0: { w: 800, h: 600 }, B0: { x: 0, y: 0 },
    l: { enemies: [], corpses: [], ground: [], fx: [], txt: [], P: { life: 100 }, life: 100, deadT: 0 },
    v: { x: 100, y: 60 }, o: { name: 'hero' }, Jn: 1, Ua: 1, Qa: .5,
    OP: noop, EP: noop, db: noop, Vb: noop, Jt: () => ({ anim: 'hero' }),
    kn: () => 0, H8: noop, ps: noop, av: noop, Pf: noop, sv: noop,
    df: noop, _8: (_t, _x, _y, _w, _h, draw) => draw(),
    kf: () => { events.push('body:hero'); return 80; },
    Va: (_anim, _act, _dir, _time, _x, y) => { events.push(`body:monster-${y}`); return 80; },
    hf: () => '', GP: actor => actor.n, r0: { 1: { anim: 'monster' } },
    Ps: { hero: '#0f0', normal: '#f00' }, w0: ['#fff'],
    updateDamageLabels: noop, SP: noop, my: noop, goldLootVisuals:{frame:noop,draw:noop},
  };
  vm.createContext(s);
  s.mapScene = loadMapsEngine(s).createMapScene(() => null);
  s.coldSpeedFactor = require('./helpers/combat-engine').loadCombatEngine(s, { bridge: false }).coldSpeedFactor;
  vm.runInContext(compileTypeScriptEntry('render/crowd/index.ts', 'CrowdVisibility').code, s);
  s.crowdRenderer = s.CrowdVisibility.createCrowdVisibility();
  vm.runInContext(compileTypeScriptEntry('render/nameplates.ts', 'nameplateOffset').code, s);
  load(s, 'src/client/render/arena-01.js', 'L3');
  load(s, 'src/client/render/arena-01.js', 'IP');
  load(s, 'src/client/render/arena-02.js', 'NP');
  const drawActor = actor => {
    events.push(`body:${actor.n}`);
    s.L3(actor.x, actor.y - 60, actor.n, '#fff', 12, 1, '#0f0');
  };
  s.arenaSimulator = { draw: (_ctx, actor) => drawActor(actor) };
  s.othDraw = (_ctx, actor) => drawActor(actor);
  s.uB = (_ctx, actor) => drawActor(actor);
  return Object.assign(s, { events, positions });
}

test('crowded nameplates stay at their head anchors without rearrangement between frames', () => {
  const s = scene();
  for (let frame = 0; frame < 2; frame++) {
    for (let i = 0; i < 20; i++) s.L3(100, 80, `name-${i}`, '#fff', 12, 1, '#0f0');
    s.IP();
    assert.equal(s.vs.length, 0);
  }
  assert.ok(s.positions.every(p => p.x === 100 && p.y === 72));
  assert.deepEqual(s.positions.slice(0, 20).map(p => p.text), Array.from({ length: 20 }, (_, i) => `name-${i}`));
});

test('each body and its nameplate render together in foot-depth order for hero, SIM, monsters and other players', () => {
  const s = scene();
  s.l.enemies = [
    { x: 100, y: 120, n: 'monster-120', tid: 1, r: 17, hp: 100, max: 100, cls: 'normal', series: 0 },
    { x: 100, y: 80, n: 'sim-front', arenaSim: true },
    { x: 100, y: 40, n: 'sim-rear', arenaSim: true },
  ];
  s.othEnts = () => [{ y: 90, oth: { x: 100, y: 90, n: 'remote' } }];
  s.rm = () => [{ y: 100, ally: { x: 100, y: 100, n: 'ally' } }];
  s.NP(1 / 60);
  assert.deepEqual(s.events, [
    'body:sim-rear', 'label:sim-rear', 'body:hero', 'label:hero',
    'body:sim-front', 'label:sim-front', 'body:remote', 'label:remote',
    'body:ally', 'label:ally', 'body:monster-120', 'label:monster-120',
  ]);
  assert.equal(s.vs.length, 0);
});

test('ordinary game hero and monster anchors stay fixed across attack sizes and sprite loading failures', () => {
  const s = scene();
  assert.equal(s.combatSandbox, undefined, 'exercise the shared renderer outside Arena Test');
  s.l.enemies = [{ x: 100, y: 120, n: 'monster', tid: 1, r: 17, hp: 100, max: 100, cls: 'normal', series: 0 }];
  s.bA = () => ({}); s.M8 = () => true;
  const snapshots = [];
  for (const height of [80, 190, false, 35, 80]) {
    s.kf = () => height; s.Va = () => height;
    s.positions.length = 0;
    s.NP(1 / 60);
    snapshots.push(s.positions.map(p => ({ ...p })));
  }
  for (const snapshot of snapshots) assert.deepEqual(snapshot, snapshots[0]);
  // Moving the body still moves its anchored nameplate by exactly the same amount.
  s.v.y += 25; s.l.enemies[0].y += 25;
  s.positions.length = 0; s.NP(1 / 60);
  assert.deepEqual(s.positions.map(p => p.y), snapshots[0].map(p => p.y + 25));
});

test('Nhu Lai head artwork follows the same standing or mounted head anchor as the player nameplate', () => {
  const s=scene();s.window={};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/jxlook.js'),'utf8'),s);
  s.P0=s.window.JXLOOK;s.J3=()=>true;s.Jn=1.35;s.nv=.6;s.bA=()=>({complete:true,naturalWidth:100});
  load(s,'src/client/ui/legacy-panels-and-audio-01.js','L8');
  for(const name of ['heroNameplateOffset','F3'])load(s,'src/client/render/effects-and-look-01.js',name);
  const source=fs.readFileSync(path.join(__dirname,'../src/client/data/status-effects-01.js'),'utf8');
  const catalog=acorn.parse(source,{ecmaVersion:'latest'}).body[0];vm.runInContext(source.slice(catalog.start,catalog.end),s);
  const effect=s.window.JXST[273];
  for(const sex of ['m','f']){
    const positions=[];
    for(const mounted of [false,true]){
      s.l.mounted=mounted;
      s.l.jx={sx:sex,rows:{helm:0},asc:s.P0.assoc[sex]['空手'][mounted?1:0]};
      const offsets=[];
      for(const attackHeight of [80,200,30]){
        s.kf=()=>attackHeight;s.positions.length=0;s.NP(1/60);
        const name=s.positions.find(p=>p.text==='hero');let draw;
        s.F3({drawImage:(...args)=>{draw=args;}},effect,s.v.x,s.v.y,60,.4,s.Jn,.9,s.v);
        const visibleBottom=draw[6]+effect.headBottom*s.Jn*s.nv;
        assert.ok(Math.abs(visibleBottom-(name.y-18))<1e-8);
        offsets.push(s.v.y-name.y);
      }
      assert.ok(offsets.every(value=>value===offsets[0]));positions.push(offsets[0]);
    }
    assert.ok(positions[1]>positions[0],'mounted buffs and nameplates rise together with the rider');
  }
  const standalone=s.heroNameplateOffset();s.J3=()=>false;
  assert.equal(s.heroNameplateOffset(),s.nameplateOffset(s.v.animKey,s.Jn,.9,6,58));
  assert.ok(standalone>0);
});

test('party member anchors also ignore attack animation height and missing sprite frames', () => {
  const s = scene();
  load(s, 'src/client/online/party-01.js', 'uB');
  s.I = { faction: { series: 0 } };
  const actor = { n: 'ally', f: 'faction', x: 100, y: 200, hp: 100, hpMax: 100 };
  for (const height of [80, 200, false]) {
    s.Va = () => height;
    s.uB(s.W, actor, 1 / 60); s.IP();
  }
  assert.ok(s.positions.every(p => p.y === s.positions[0].y));
});

test('offscreen text expires without draw calls while visible generic notifications still animate', () => {
  const s = scene();
  s.l.txt = [
    { x: 2000, y: 200, t: 'offscreen', life: .1, size: 14, color: '#fff' },
    { x: 200, y: 200, t: 'visible', life: .5, size: 14, color: '#fff' },
    { x: 200, y: 200, t: 'expired', life: 0, size: 14, color: '#fff' },
  ];
  s.NP(.2);
  assert.ok(!s.events.includes('label:offscreen'));assert.ok(!s.events.includes('label:expired'));
  assert.ok(s.events.includes('label:visible'));assert.equal(s.l.txt.length,1);
  assert.equal(s.l.txt[0].y,193.6);
});

test('crowded arena skips hidden body/nameplate draws while every monster animation still advances',()=>{
 const s=scene();let animations=0;
 s.H8=(actor,dt)=>{animations++;actor.actT=(actor.actT||0)+dt;};
 const actors=Array.from({length:50},(_,i)=>({x:100,y:100,n:`mob-${i}`,tid:1,r:17,hp:100,max:100,cls:'normal',series:0,actT:0}));
 s.l.enemies=actors;s.l.manTgt=actors[49];
 s.l.txt=actors.map((target,i)=>({target,x:100,y:70,t:`damage-${i}`,life:1,size:14,color:'#fff'}));
 const before=actors.map(actor=>({x:actor.x,y:actor.y,hp:actor.hp}));
 s.NP(.02);
 assert.equal(s.events.filter(event=>event.startsWith('body:monster-')).length,3);
 assert.equal(s.events.filter(event=>event.startsWith('label:mob-')).length,3);
 assert.ok(s.events.some(event=>event.startsWith('label:mob-49')));
 assert.equal(s.events.filter(event=>event.includes('×50')).length,1);
 assert.equal(s.events.filter(event=>event.startsWith('label:damage-')).length,5);
 assert.equal(animations,51,'hero plus every monster must keep animation timing');
 assert.ok(actors.every(actor=>actor.actT===.02));
 assert.deepEqual(actors.map(actor=>({x:actor.x,y:actor.y,hp:actor.hp})),before);
 assert.equal(s.l.enemies.length,50);
});
test('death-burst labels remain grouped after all recipients have left the enemy list',()=>{
 const s=scene(),actors=Array.from({length:50},(_,i)=>({x:100,y:100,n:`mob-${i}`,tid:1,r:17,hp:100,max:100,cls:'normal',series:0}));
 s.l.enemies=actors;s.NP(.02);s.events.length=0;
 for(const actor of actors){actor.dead=true;actor.hp=0;}
 s.l.enemies=[];s.l.txt=actors.map((target,i)=>({target,x:100,y:70,t:`final-${i}`,life:1,size:14,color:'#fff'}));
 s.NP(.02);
 assert.equal(s.events.filter(event=>event.startsWith('label:final-')).length,5);
 assert.equal(s.events.filter(event=>event.startsWith('body:monster-')).length,0);
});

test('offscreen SIMs skip body/nameplate rendering but keep animation time and reappear with the camera', () => {
  const s = scene(), hidden = { x: 3000, y: 2000, n: 'hidden-sim', arenaSim: true }, visible = { x: 100, y: 80, n: 'visible-sim', arenaSim: true };
  const advanced = [];
  s.arenaSimulator.advanceAnimation = (actor, dt) => { actor.actT = (actor.actT || 0) + dt; advanced.push(actor); };
  s.l.enemies = [hidden, visible];
  s.NP(1/60);
  assert.ok(s.events.includes('body:visible-sim')); assert.ok(!s.events.includes('body:hidden-sim'));
  assert.ok(!s.events.includes('label:hidden-sim')); assert.deepEqual(advanced, [hidden]); assert.equal(hidden.actT, 1/60);
  s.B0 = { x: 2700, y: 1800 }; s.events.length = 0;
  s.NP(1/60); assert.ok(s.events.includes('body:hidden-sim')); assert.ok(!s.events.includes('body:visible-sim'));
});
