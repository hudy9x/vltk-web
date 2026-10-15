const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const { compileTypeScriptEntry } = require('../tools/build-app');

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
    updateDamageLabels: noop, SP: noop, my: noop,
  };
  vm.createContext(s);
  vm.runInContext(compileTypeScriptEntry('render/nameplates.ts', 'nameplateOffset').code, s);
  load(s, 'app/render/arena-01.js', 'L3');
  load(s, 'app/render/arena-01.js', 'IP');
  load(s, 'app/render/arena-02.js', 'NP');
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

test('party member anchors also ignore attack animation height and missing sprite frames', () => {
  const s = scene();
  load(s, 'app/online/party-01.js', 'uB');
  s.I = { faction: { series: 0 } };
  const actor = { n: 'ally', f: 'faction', x: 100, y: 200, hp: 100, hpMax: 100 };
  for (const height of [80, 200, false]) {
    s.Va = () => height;
    s.uB(s.W, actor, 1 / 60); s.IP();
  }
  assert.ok(s.positions.every(p => p.y === s.positions[0].y));
});
