const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
function load(entry) {
  const output = buildSync({ entryPoints: [path.join(root, entry)], bundle: true, platform: 'node', format: 'cjs', write: false,
    alias: { '@game': path.join(root, 'src/client/maps') } });
  const scope = { module: { exports: {} }, atob, btoa, structuredClone, Uint8Array, Map, Set };
  vm.runInNewContext(output.outputFiles[0].text, scope);
  return scope.module.exports;
}
const npcs = load('src/client/npcs/index.ts');
const model = load('tools/map-tool/src/lib/model.ts');
const readMap = id => JSON.parse(fs.readFileSync(path.join(root, `src/client/maps/content/${id}/map.json`)));
const document = id => model.createDocument({ projects: {}, encounters: JSON.parse(fs.readFileSync(path.join(root, 'src/client/gameplay/encounters/catalog.json'))),
  progression: JSON.parse(fs.readFileSync(path.join(root, 'src/client/maps/progression.json'))) }, readMap(id));

test('NPC catalog has four reusable idle sheets and placements cover town and Hoang Nguyên', () => {
  assert.deepEqual(plain(npcs.npcCatalog.map(npc => npc.id)), ['equipment', 'pharmacy', 'tongkim', 'horse']);
  for (const npc of npcs.npcCatalog) {
    assert.ok(fs.statSync(path.join(root, 'src/client', npc.image.slice(4))).size > 0);
    assert.equal(npc.directions, 8);
  }
  for (const id of [37, 9003]) {
    const map = readMap(id);
    if (id === 37) delete map.npcs; // Only town inherits a legacy layout.
    const before = JSON.stringify(map), layout = npcs.mapNpcs(map);
    assert.ok(layout.length >= 4);
    assert.equal(JSON.stringify(map), before, 'opening or rendering does not materialize defaults');
    for (const npc of layout) {
      assert.ok(npcs.getNpc(npc.npcId));
      assert.ok(npc.position.x >= 0 && npc.position.x < map.size.width);
      assert.ok(npc.position.y >= 0 && npc.position.y < map.size.height);
    }
    if (id !== 37) for (const team of ['song', 'jin']) {
      assert.deepEqual(plain(layout.filter(npc => npc.team === team).map(npc => npc.npcId)), ['tongkim', 'pharmacy', 'horse']);
    }
  }
});

test('editing NPC positions is undoable and survives compile, serialization and reload in town and Hoang Nguyên', () => {
  for (const id of [37, 9003]) {
    const original = document(id), initial = model.documentKey(original), draft = model.cloneDocument(original);
    const first = npcs.editableNpcs(draft.map)[0];
    first.position = { x: 400, y: 400 }; first.animated = true; first.direction = 7;
    assert.equal(model.documentKey(original), initial);
    assert.notEqual(model.documentKey(draft), initial);
    const saved = model.validateDocument(draft), reloaded = model.createDocument({ projects: {}, encounters: draft.encounters, progression: draft.progression }, plain(saved));
    assert.deepEqual(plain(npcs.mapNpcs(reloaded.map)[0]), plain(first));
    assert.notDeepEqual(plain(npcs.mapNpcs(original.map)[0].position), plain(first.position));
    draft.map.npcs = [];
    assert.deepEqual(plain(npcs.mapNpcs(model.validateDocument(draft))), []);
    assert.ok(npcs.mapNpcs(original.map).length > 0, 'undo snapshot still has inherited NPCs');
  }
});

test('NPC validation rejects unknown types, duplicate instances, invalid coordinates, scale, team and animation', () => {
  const valid = { id: 'one', npcId: 'horse', position: { x: 80, y: 40 } };
  for (const change of [npc => { npc.npcId = 'missing'; }, npc => { npc.position.x = -1; }, npc => { npc.position.y = Infinity; },
    npc => { npc.scale = 0; }, npc => { npc.scale = NaN; }, npc => { npc.direction = 8; }, npc => { npc.direction = 1.5; },
    npc => { npc.team = 'other'; }, npc => { npc.animated = 'true'; }]) {
    const doc = document(37), npc = structuredClone(valid); change(npc); doc.map.npcs = [npc];
    assert.throws(() => model.validateDocument(doc));
  }
  const doc = document(37); doc.map.npcs = [valid, structuredClone(valid)];
  assert.throws(() => model.validateDocument(doc), /duplicate NPC/);
  doc.map.npcs = {}; assert.throws(() => model.validateDocument(doc), /expected array/);
});

test('static and animated NPC rendering shares foot anchors, crop direction and scaled hit bounds', () => {
  const calls = [], context = { drawImage: (...args) => calls.push(args) }, image = { complete: true, naturalWidth: 1024 };
  const npc = { id: 'horse', npcId: 'horse', position: { x: 200, y: 150 }, direction: 2, scale: 2 };
  assert.equal(npcs.drawNpc(context, image, npc, 286), true);
  assert.deepEqual(calls[0], [image, 0, 104, 29, 52, 172, 52, 58, 104]);
  npc.animated = true; npcs.drawNpc(context, image, npc, 286);
  assert.equal(calls[1][1], 58);
  assert.equal(npcs.hitNpc([npc], { x: 173, y: 53 }).id, npc.id);
  assert.equal(npcs.hitNpc([npc], { x: 171, y: 53 }), undefined);
  assert.equal(npcs.drawNpc(context, null, npc), false);
});

function legacyGame(maps) {
  const scope = { document: { createElement: () => ({}), head: { appendChild() {} } }, window: {},
    o: { fac: 'shaolin' }, l: { town: true }, m: () => null, performance: { now: () => 0 },
    MapsEngine: { ...npcs, getMap: id => maps.find(map => map.id === id) },
    horseTrader: { open() { scope.horseOpened = true; } },
    lh() { scope.pharmacyOpened = scope.Nt; }, k(message) { scope.message = message; } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/client/gameplay/equipment-trader-01.js'), 'utf8'), scope);
  return scope;
}

test('game consumes authored positions, hides removed NPCs, switches maps/teams and keeps original shop interactions', () => {
  const town = readMap(37), war = readMap(9003), scope = legacyGame([town, war]);
  scope.equipmentTrader.place({ x: 99, y: 99, name: 'Mã Phu' });
  town.npcs = [{ id: 'new-horse', npcId: 'horse', position: { x: 300, y: 400 } },
    { id: 'new-pharmacy', npcId: 'pharmacy', position: { x: 500, y: 600 } }];
  let entities = scope.equipmentTrader.entities();
  assert.deepEqual(plain(entities.map(npc => [npc.x, npc.y])), [[300, 400], [500, 600]], 'old NPC at 99,99 is replaced');
  entities[0].onInteract(); assert.equal(scope.horseOpened, true);
  entities[1].onInteract(); assert.equal(scope.pharmacyOpened, 'med');
  town.npcs = []; assert.equal(scope.equipmentTrader.entities().length, 0);
  scope.l.town = false;
  const state = { mapId: 9003, team: 'song' };
  scope.arenaSimulator = { battlefield: { active: true, state }, openPharmacy() { scope.warShop = true; }, openSettings() { scope.settingsOpened = true; } };
  for (const mapId of [9003]) for (const team of ['song', 'jin']) {
    Object.assign(state, { mapId, team });
    entities = scope.equipmentTrader.entities();
    assert.equal(entities.length, 3);
    assert.ok(entities.every(npc => npc.mapNpc.team === team));
    const expected = npcs.mapNpcs(war).filter(npc => npc.team === team);
    assert.deepEqual(plain(entities.map(npc => [npc.x, npc.y])), plain(expected.map(npc => [npc.position.x, npc.position.y])));
    entities.find(npc => npc.mapNpc.npcId === 'pharmacy').onInteract(); assert.equal(scope.warShop, true);
    entities.find(npc => npc.mapNpc.npcId === 'tongkim').onInteract(); assert.equal(scope.settingsOpened, true);
  }
});

test('war pharmacy purchases follow edited positions and stop when the pharmacy is removed', () => {
  const { createWarSupplies } = load('src/client/simulator/supplies.ts');
  const position = { x: 450, y: 1792 };
  let locations = [{ x: 1000, y: 1000 }];
  const supplies = createWarSupplies({ running: () => true, alive: () => true, team: () => 'song', position: () => position,
    pharmacyPositions: () => locations, recover: () => true, changed() {} });
  assert.equal(supplies.state.nearCamp, false, 'the old camp is no longer the shop');
  Object.assign(position, locations[0]);
  assert.equal(supplies.state.nearCamp, true);
  supplies.buy('life', 1); assert.equal(supplies.state.life, 1);
  locations = []; assert.equal(supplies.state.nearCamp, false);
  assert.throws(() => supplies.buy('life', 1), /Chủ dược điếm/);
  assert.equal(supplies.state.life, 1);
});

test('server serves shared NPC sheets and keeps unlisted paths private', async () => {
  const { createServer } = require('../src/server/index.ts');
  const { openDatabase } = require('../src/server/database.ts');
  const db = openDatabase(':memory:'), { app } = createServer({ db, downloadAssets: false, development: false });
  try {
    for (const npc of npcs.npcCatalog) {
      const result = await app.inject({ url: '/' + npc.image });
      assert.equal(result.statusCode, 200, npc.id);
      assert.match(result.headers['content-type'], /image\/webp/);
      assert.ok(result.rawPayload.length > 0);
    }
    assert.equal((await app.inject({ url: '/app/npcs/assets/missing.webp' })).statusCode, 404);
    assert.equal((await app.inject({ url: '/app/npcs/README.md' })).statusCode, 404);
  } finally { await app.close(); db.close(); }
});

async function canvasFixture(doc, tool) {
  const result = await require('esbuild').build({ entryPoints: [path.join(root, 'tools/map-tool/src/editor/MapCanvas.tsx')], bundle: true,
    platform: 'node', format: 'cjs', write: false, jsx: 'automatic', external: ['react', 'react/jsx-runtime'], loader: { '.webp': 'text' },
    alias: { '@': path.join(root, 'tools/map-tool/src'), '@game': path.join(root, 'src/client/maps') },
    plugins: [{ name: 'controls', setup(build) {
      build.onResolve({ filter: /^(lucide-react|@\/components\/ui\/)/ }, args => ({ path: args.path, namespace: 'controls' }));
      build.onLoad({ filter: /.*/, namespace: 'controls' }, () => ({ contents: 'export const Checkbox=()=>null,Label=()=>null,Button=()=>null,RefreshCw=()=>null;' }));
    } }],
  });
  const effects = [], listeners = new Map(), frames = new Map(), changes = [], selections = [];
  const context = new Proxy({ measureText: () => ({ width: 80 }) }, { get: (object, key) => key in object ? object[key] : () => {} });
  const rect = () => ({ left: 0, top: 0, width: 600, height: 400 });
  const canvas = { getContext: () => context, getBoundingClientRect: rect, addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener() {}, dispatchEvent: event => listeners.get(event.type)?.(event), setPointerCapture() {} };
  let refCount = 0, frameId = 0;
  const hooks = { useRef: value => ({ current: value === null ? (++refCount === 1 ? canvas : { getBoundingClientRect: rect }) : value }),
    useState: value => [value, () => {}], useEffect: callback => effects.push(callback) };
  const scope = { module: { exports: {} }, atob, btoa, structuredClone, Uint8Array, Map, Set, crypto,
    require(name) { if (name === 'react') return hooks; if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null }; throw Error(name); },
    Image: class { complete = true; naturalWidth = 800; }, ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } disconnect() {} },
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; }, cancelAnimationFrame(id) { frames.delete(id); },
    window: { devicePixelRatio: 1, document: { createElement: () => ({ getContext: () => context }) } }, Event: class { constructor(type) { this.type = type; } },
  };
  vm.runInNewContext(result.outputFiles[0].text, scope);
  scope.module.exports.MapCanvas({ document: doc, assets: { imageFor: () => ({ complete: true, naturalWidth: 3584 }), errors: new Set(), subscribe: () => () => {} },
    monsters: [], tool, activeNpcId: 'horse', brush: 3, selection: null, hidden: new Set(), showActor: false,
    showCollision: false, collisionOpacity: 65, showGrid: false, showRegions: false, zoomCommand: { action: 'fit', serial: 0 },
    onChange: value => changes.push(value), onSelect: value => selections.push(value), onStatus() {}, onError(message) { throw Error(message); } });
  effects.forEach(effect => effect());
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(16)); };
  flush(); flush();
  const zoom = Math.max(.04, Math.min(528 / doc.map.size.width, 328 / doc.map.size.height));
  const emit = (type, x, y) => listeners.get(type)({ type, clientX: (600 - doc.map.size.width * zoom) / 2 + x * zoom,
    clientY: (400 - doc.map.size.height * zoom) / 2 + y * zoom, pointerId: 1, button: 0 });
  return { changes, selections, emit, flush };
}

test('canvas places reusable NPCs, drags with a foot offset, clamps to map and cancels without committing', async () => {
  for (const mapId of [37, 9003]) {
    const doc = document(mapId); doc.map.npcs = [{ id: 'existing', npcId: 'horse', position: { x: 800, y: 800 } }];
    const add = await canvasFixture(doc, 'npc');
    add.emit('pointerdown', 1000, 1000); add.emit('pointerup', 1000, 1000);
    assert.equal(add.changes.length, 1);
    assert.equal(add.changes[0].map.npcs.length, 2);
    assert.deepEqual(plain(add.changes[0].map.npcs[1].position), { x: 1000, y: 1000 });
    assert.equal(add.selections.at(-1).kind, 'npc');
    const drag = await canvasFixture(doc, 'select');
    drag.emit('pointerdown', 800, 780); drag.emit('pointermove', 900, 830); drag.flush();
    assert.equal(drag.changes.length, 0, 'moves stay in the gesture draft');
    drag.emit('pointerup', 900, 830);
    assert.equal(drag.changes.length, 1);
    assert.deepEqual(plain(drag.changes[0].map.npcs[0].position), { x: 900, y: 850 });
    assert.deepEqual(doc.map.npcs[0].position, { x: 800, y: 800 }, 'original is an undo snapshot');
    const canceled = await canvasFixture(doc, 'select');
    canceled.emit('pointerdown', 800, 780); canceled.emit('pointermove', 1000, 1000); canceled.emit('pointercancel', 1000, 1000);
    assert.equal(canceled.changes.length, 0);
    const clamped = await canvasFixture(doc, 'select');
    clamped.emit('pointerdown', 800, 780); clamped.emit('pointermove', -100, -100); clamped.emit('pointerup', -100, -100);
    assert.deepEqual(plain(clamped.changes[0].map.npcs[0].position), { x: 0, y: 20 });
  }
});

test('removing one NPC preserves the opposite camp, allows re-adding and survives save/reload and undo', () => {
  for (const mapId of [37, 9003]) {
    const original = document(mapId), before = plain(npcs.mapNpcs(original.map));
    const next = model.cloneDocument(original), selected = before[0];
    assert.equal(npcs.removeNpc(next.map, selected.id), true);
    assert.deepEqual(plain(npcs.mapNpcs(next.map)), before.filter(npc => npc.id !== selected.id));
    assert.deepEqual(plain(npcs.mapNpcs(original.map)), before, 'undo retains the original NPC list');
    const saved = model.validateDocument(next), reloaded = plain(saved);
    assert.equal(npcs.mapNpcs(reloaded).some(npc => npc.id === selected.id), false);
    if (selected.team) assert.ok(npcs.mapNpcs(reloaded).some(npc => npc.npcId === selected.npcId && npc.team !== selected.team));
    assert.equal(npcs.removeNpc(next.map, 'missing'), false);
    npcs.editableNpcs(next.map).push(selected);
    assert.equal(npcs.mapNpcs(next.map).length, before.length, 'removed NPC can be placed again');
    for (const npc of [...npcs.mapNpcs(next.map)]) npcs.removeNpc(next.map, npc.id);
    assert.deepEqual(plain(npcs.mapNpcs(plain(model.validateDocument(next)))), [], 'deleting the last NPC never restores inherited defaults');
  }
});
