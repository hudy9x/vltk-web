const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const { randomUUID } = require('node:crypto');
const { loadMapsEngine } = require('./helpers/maps-engine');
const { compileTypeScriptEntry } = require('../tools/build-app');

const engine = loadMapsEngine(vm.createContext({}));
const plain = value => JSON.parse(JSON.stringify(value));
function gridDefinition(columns = 8, rows = 8, blocked = []) {
  const bytes = Buffer.alloc(Math.ceil(columns * rows / 8));
  for (const cell of blocked) bytes[cell >> 3] |= 1 << (cell & 7);
  return { w: columns * 32, h: rows * 16, gw: columns, gh: rows, cw: 32, ch: 16, obs: bytes.toString('base64') };
}
function declaration(sandbox, file, name) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const node = acorn.parse(source, { ecmaVersion: 'latest' }).body.find(node =>
    node.type === 'VariableDeclaration' && node.declarations.some(declaration => declaration.id.name === name));
  assert.ok(node, name);
  vm.runInContext(source.slice(node.start, node.end), sandbox);
}
function randomSource(seed = 42) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

test('all map artwork is local to its map folder and Test maps are excluded from runtime loading', () => {
  const oldFolder = path.join(__dirname, '../img/z');
  assert.ok(!fs.existsSync(oldFolder) || fs.readdirSync(oldFolder).length === 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/maps/availability.json')));
  const catalog = engine.createLegacyCatalog();
  for (const id of fs.readdirSync(path.join(__dirname, '../app/maps/content'))) {
    const map = JSON.parse(fs.readFileSync(path.join(__dirname, `../app/maps/content/${id}/map.json`)));
    for (const layer of map.layers) for (const image of 'image' in layer ? [layer.image] : layer.type === 'world' ? layer.objects.map(object => object.image) : []) {
      assert.ok(image.startsWith('./'), `${id}: ${image}`);
      const resolved = engine.resolveMapAsset(map.id, image);
      assert.ok(resolved.startsWith(`app/maps/content/${id}/`));
      if (map.status !== 'test') assert.ok(fs.existsSync(path.join(__dirname, '..', resolved)), resolved);
    }
    assert.equal(manifest.maps[id], map.status || 'available');
    if (map.status === 'test') { assert.equal(engine.getMap(map.id), undefined); assert.equal(catalog.navigation[id], undefined); }
    else assert.ok(engine.getMap(map.id));
  }
  assert.throws(() => engine.resolveMapAsset(2, 'img/z/2.jpg'), /thư mục map/);
  assert.throws(() => engine.resolveMapAsset(2, './../37/ground.jpg'), /thư mục map/);
});

test('live availability hides revoked maps and pauses until the player acknowledges town teleport', async () => {
  const state = engine.createMapAvailability([37, 2, 7]);
  let current = 2, time = 0, notice, returned = 0, fetches = 0;
  const disabled = { schemaVersion: 1, maps: { 37: 'available', 2: 'test', 7: 'available' } };
  const guard = engine.createMapAvailabilityGuard({ currentMapId: () => current, isAvailable: state.has,
    now: () => time, fetchManifest: async () => { fetches++; return disabled; }, applyManifest: value => state.update(value),
    showNotice: (message, acknowledge) => { assert.equal(notice, undefined); notice = { message, acknowledge }; },
    returnToTown: () => { returned++; current = null; } });
  assert.equal(guard.tick(), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(guard.tick(), false);
  assert.equal(notice.message, 'Map không tồn tại. sử dụng Thổ địa phù ngay');
  assert.equal(returned, 0); assert.equal(guard.tick(), false);
  notice.acknowledge(); assert.equal(returned, 1); assert.equal(guard.tick(), true);
  notice.acknowledge(); assert.equal(returned, 1);
  assert.equal(fetches, 1); time = 5000; guard.tick(); await new Promise(resolve => setImmediate(resolve)); assert.equal(fetches, 2);
  assert.equal(state.update({ schemaVersion: 1, maps: { 37: 'test' } }), false);
  assert.equal(state.update({ schemaVersion: 1, maps: {} }), false);
  assert.equal(state.has(37), true);
  const offline = engine.createMapAvailabilityGuard({ currentMapId: () => 7, isAvailable: state.has, now: () => 0,
    fetchManifest: async () => { throw new Error('offline'); }, applyManifest() {}, showNotice() { assert.fail('Network failure must not evict players'); }, returnToTown() {} });
  assert.equal(offline.tick(), true); await new Promise(resolve => setImmediate(resolve)); assert.equal(offline.tick(), true);
});

test('all migrated maps validate, retain navigation dimensions and legacy progression indices', () => {
  const catalog = engine.createLegacyCatalog();
  const originalOrder = [140, 2, 3, 92, 21, 42, 56, 319, 320, 225, 226, 93, 75, 227, 321, 322, 336, 340, 201, 205];
  assert.deepEqual(plain(catalog.zones.slice(0, originalOrder.length).map(zone => zone.id)), originalOrder);
  assert.ok(engine.listMaps().length >= 42);
  for (const map of engine.listMaps()) {
    assert.equal(engine.parseMapDefinition(map), map);
    const source = JSON.parse(fs.readFileSync(path.join(__dirname, `../app/maps/content/${map.id}/map.json`)));
    assert.deepEqual(plain(map), source);
    const definition = catalog.navigation[map.id];
    if (definition) {
      const runtime = engine.createNavigationRuntime();
      runtime.load(map.id, definition);
      assert.ok(runtime.state.g.free > 0, `No usable region in ${map.id}`);
      assert.equal(runtime.bounds.w, map.size.width);
      assert.equal(runtime.bounds.h, map.size.height);
    }
  }
  const monsters = {};
  const sandbox = vm.createContext({ window: {}, MapsEngine: engine });
  for (const file of ['monsters-and-zones-01', 'monsters-and-zones-02', 'monsters-and-zones-03', 'monsters-and-zones-04']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, `../app/data/${file}.js`), 'utf8'), sandbox);
    sandbox.JW = sandbox.window.JW;
  }
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/data/equipment-and-zone-patches-02.js'), 'utf8'), sandbox);
  Object.assign(monsters, sandbox.JW.mon);
  for (const profile of engine.encounters) {
    assert.ok(monsters[profile.bossId], `Unknown boss ${profile.bossId}`);
    for (const id of profile.monsterIds) assert.ok(monsters[id], `Unknown monster ${id}`);
  }
});

test('invalid navigation never replaces a valid active map, including an entirely blocked grid', () => {
  const runtime = engine.createNavigationRuntime();
  runtime.load(1, gridDefinition());
  const original = runtime.state.g;
  for (const definition of [
    { w: 3584, h: 3584 },
    { ...gridDefinition(), obs: '' },
    { ...gridDefinition(), obs: '?' },
    { ...gridDefinition(), gw: 1 },
    gridDefinition(8, 8, Array.from({ length: 64 }, (_, index) => index)),
  ]) {
    assert.throws(() => runtime.load(2, definition));
    assert.equal(runtime.state.g, original);
    assert.equal(runtime.state.key, 1);
  }
  runtime.load('open', null, { width: 640, height: 480 });
  assert.equal(runtime.state.g, null);
  assert.deepEqual(plain(runtime.resolvePosition(900, 900)), [620, 460]);
});

test('A* and flow fields respect walls, corner cutting and island selection', () => {
  const runtime = engine.createNavigationRuntime();
  runtime.load(1, gridDefinition(3, 3, [1, 3]));
  // Top-left and bottom-right only touch diagonally; select the largest island.
  assert.equal(runtime.walkable(16, 8), false);
  assert.equal(runtime.state.g.free, 6);
  runtime.load(2, gridDefinition(8, 8, [3, 11, 19, 27, 35, 43, 51]));
  const points = runtime.path(48, 8, 208, 8);
  assert.ok(points.length > 8, 'Path must go around the wall opening at the bottom');
  assert.ok(points.every(point => runtime.walkable(point.x, point.y)));
  const distances = runtime.distances(208, 8);
  assert.equal(distances[6], 0);
  assert.equal(distances[3], -1);
  assert.equal(runtime.distances(208, 8), distances);
  runtime.load(3, gridDefinition());
  assert.notEqual(runtime.distances(208, 8), distances);
  assert.equal(runtime.path(48, 8, 208, 8, 0), null);
});

function fieldFixture() {
  const nav = engine.createNavigationRuntime();
  const catalog = engine.createLegacyCatalog();
  let zone = catalog.zones[1], field = null, enemies = [], loads = 0, created = 0;
  const player = { x: 768, y: 768 };
  nav.load(2, catalog.navigation[2]);
  const host = {
    zone: () => zone, key: () => `${nav.state.key}|${zone.id}`,
    player: () => player, playerAlive: () => true, normalCountRange: () => [6, 8],
    ensureMap: zone => {
      if (nav.state.key !== zone.id) {
        nav.load(zone.id, catalog.navigation[zone.id]);
        [player.x, player.y] = nav.resolvePosition(player.x, player.y); loads++;
      }
    },
    field: () => field, setField: value => { field = value; },
    enemies: () => enemies, setEnemies: value => { enemies = value; },
    createEnemy: point => { created++; return { ...point, hp: 100, max: 100, dmg: 100, spd: 100 }; },
    announceBoss() {}, normalRespawnSeconds: () => 20, questNeedsBoss: () => false,
    afterTick() {}, isVoid: () => false,
    distance: (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 2) / .81, direction: () => 0,
  };
  const runtime = engine.createFieldRuntime(nav, host, randomSource());
  return { nav, host, runtime, player, catalog, setZone: value => { zone = value; },
    get field() { return field; }, get enemies() { return enemies; }, get loads() { return loads; }, get created() { return created; } };
}

test('Test maps cannot initialize navigation or spawn actors through direct field runtime calls', () => {
  const fixture = fieldFixture();
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/maps/availability.json'))), disabled = plain(baseline);
  disabled.maps[2] = 'test';
  engine.updateMapAvailability(disabled);
  try {
    fixture.runtime.initialize(); fixture.runtime.tick(1);
    fixture.runtime.spawn({ x: 400, y: 600, cls: 'boss', tid: 543, t: 0 });
    assert.equal(fixture.field, null); assert.equal(fixture.created, 0); assert.equal(fixture.loads, 0); assert.equal(fixture.enemies.length, 0);
  } finally { engine.updateMapAvailability(baseline); }
});

test('switching to alternate map 195 loads its navigation before generating homes and stays stable next tick', () => {
  const fixture = fieldFixture();
  fixture.setZone(fixture.catalog.alternates[1][0]);
  fixture.runtime.tick(1 / 60);
  const field = fixture.field;
  assert.equal(fixture.loads, 1);
  assert.equal(field.key, '195|195');
  assert.ok(field.pts.length > 10);
  assert.ok(field.pts.every(point => fixture.nav.canStand(point.x, point.y)));
  fixture.runtime.tick(1 / 60);
  assert.equal(fixture.field, field, 'Do not discard and regenerate all camps on the second frame');
  assert.equal(fixture.loads, 1);
});

test('fixed map spawns consume encounter references and reject positions inside walls', () => {
  const fixture = fieldFixture(), map = plain(engine.getMap(2));
  const [x, y] = fixture.nav.nearest(1600, 1600);
  map.spawns = [{ id: 'fixed-boss', position: { x, y }, encounterId: 'map-2', rank: 'boss', initialDelaySeconds: 60 }];
  const points = engine.generateFieldPoints(fixture.nav, fixture.catalog.zones[1], fixture.player, [6, 8], () => false, randomSource(), map);
  assert.equal(points.length, 1); assert.equal(points[0].tid, 543); assert.equal(points[0].t, 60);
  map.spawns[0].position = { x: -1, y: -1 };
  assert.throws(() => engine.generateFieldPoints(fixture.nav, fixture.catalog.zones[1], fixture.player, [6, 8], () => false, randomSource(), map), /blocked spawn/);
});

test('field respawn preserves home, delays near the player, and retains the boss quest shortcut', () => {
  const fixture = fieldFixture();
  const point = { x: 1600, y: 1600, cls: 'normal', tid: 12, t: 0 };
  fixture.host.setField({ key: fixture.host.key(), pts: [point], kills: 0 });
  fixture.runtime.spawn(point);
  assert.equal(point.e.dmg, 75); assert.equal(point.e.home, point);
  point.e.dead = true;
  fixture.runtime.tick(1);
  assert.equal(point.e, null); assert.equal(point.t, 19);
  fixture.player.x = point.x; fixture.player.y = point.y;
  fixture.runtime.tick(20);
  assert.equal(point.e, null); assert.equal(point.t, 1);
  fixture.player.x = 0; fixture.player.y = 0;
  fixture.runtime.tick(1);
  assert.equal(point.e.home, point); assert.equal(fixture.created, 2);
  const boss = { x: 2400, y: 1600, cls: 'boss', tid: 543, t: 180, e: null };
  fixture.host.questNeedsBoss = () => true;
  fixture.host.setField({ key: fixture.host.key(), pts: [boss], kills: 0 });
  fixture.runtime.tick(1); assert.equal(boss.t, 19);
  fixture.runtime.tick(19); assert.equal(boss.e.cls, 'boss');
});

test('leash resets ordinary monsters but not bosses', () => {
  const fixture = fieldFixture(), home = { x: 1600, y: 1600, cls: 'normal', tid: 12, t: 0 };
  const enemy = { x: 3000, y: 1600, cls: 'normal', hp: 20, max: 100, spd: 100, dmg: 100, aggro: true, poison: 3, slowT: 2, home };
  fixture.runtime.releaseAggro(enemy);
  assert.equal(enemy.aggro, false); assert.equal(enemy.hp, 100); assert.equal(enemy.backT, 6);
  assert.equal(enemy.poison, 0); assert.equal(enemy.slowT, 0);
  enemy.cls = 'boss'; enemy.aggro = true; enemy.hp = 20;
  fixture.runtime.releaseAggro(enemy);
  assert.equal(enemy.aggro, true); assert.equal(enemy.hp, 20);
});

test('map render phases preserve actor/object depth and cull by sprite bounds rather than the root', () => {
  const map = plain(engine.getMap(2));
  const tree = { id: 'tree', image: './tree.png', position: { x: 100, y: 520 }, anchor: { x: 100, y: 280 }, scale: 1, depthOffsetY: 0 };
  map.layers.push({ id: 'shadow', type: 'shadow', image: './shadow.png', opacity: .3 },
    { id: 'objects', type: 'world', objects: [tree] },
    { id: 'front', type: 'foreground', image: './foreground.png' },
    { id: 'sunset', type: 'atmosphere', color: '#e99552', opacity: .15 });
  const images = new Map(), events = [];
  const scene = engine.createMapScene(src => {
    if (!images.has(src)) images.set(src, { src, complete: true, naturalWidth: 200, naturalHeight: 300 });
    return images.get(src);
  });
  scene.setMap(engine.parseMapDefinition(map));
  const context = { globalAlpha: 1, save() {}, restore() { this.globalAlpha = 1; },
    drawImage(image) { events.push(image.src); }, fillRect() { events.push('sunset'); } };
  scene.drawShadows(context);
  const queue = [{ y: 450, actor: 'behind' }, ...scene.worldObjects({ x: 0, y: 200, width: 300, height: 200 }), { y: 590, actor: 'front' }].sort((a, b) => a.y - b.y);
  for (const item of queue) if (item.mapObject) scene.drawObject(context, item.mapObject); else events.push(item.actor);
  scene.drawForeground(context); scene.drawAtmosphere(context);
  assert.deepEqual(events, ['app/maps/content/2/shadow.png', 'behind', 'app/maps/content/2/tree.png', 'front', 'app/maps/content/2/foreground.png', 'sunset']);
  assert.equal(scene.worldObjects({ x: 1000, y: 0, width: 100, height: 100 }).length, 0);
});

test('actual JS map loading bridge retains the active world after a bad navigation load', () => {
  const s = vm.createContext({ window: {}, MapsEngine: engine, mapAccess: { require: id => engine.isMapAvailable(id) }, E0: { town: { id: 37 } }, actorActionLocked: () => false,
    l: { ground: [] }, bA: () => null });
  s.window.JMO = engine.createLegacyCatalog().navigation;
  for (const name of ['mapAdapter', 'mapNavigation', 'mapScene', 'O0', 'X0', 'ma', 'Z0']) declaration(s, 'app/core/attributes-01.js', name);
  assert.equal(s.ma(2), true); const grid = s.Z0.g;
  s.window.JMO.bad = { w: 3584, h: 3584 };
  assert.throws(() => s.ma('bad')); assert.equal(s.Z0.g, grid); assert.equal(s.Z0.key, 2);
  s.ma('town'); assert.equal(s.Z0.key, 'town'); assert.equal(s.O0.w, 3584);
  s.window.NO_OBS = true; assert.equal(s.ma(2), false); assert.equal(s.Z0.g, null);
});

test('explicit open maps draw a full-size ground image instead of the legacy repeated tile fallback', () => {
  const map = plain(engine.getMap(2));
  map.size = { width: 640, height: 480 }; map.navigation = { kind: 'open' };
  const calls = [], image = { complete: true, naturalWidth: 640, naturalHeight: 480 };
  const scene = engine.createMapScene(() => image); scene.setMap(map);
  const context = { globalAlpha: 1, save() {}, restore() {}, drawImage: (...args) => calls.push(args) };
  const s = vm.createContext({ mapScene: scene });
  declaration(s, 'app/render/arena-01.js', 'EP');
  s.EP(context, image);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [image, 0, 0, 640, 480]);
});

test('saving JSON or adding a map folder is detected by the real build without editing TS imports', () => {
  const id = 999998, directory = path.join(__dirname, `../app/maps/content/${id}`);
  assert.equal(fs.existsSync(directory), false);
  const map = plain(engine.getMap(2)); map.id = id; map.name = 'Editor reload probe'; map.navigation = { kind: 'open' };
  const read = () => {
    const sandbox = vm.createContext({ atob });
    vm.runInContext(compileTypeScriptEntry('maps/index.ts', 'MapsEngine').code, sandbox);
    return sandbox.MapsEngine.getMap(id);
  };
  try {
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'map.json'), JSON.stringify(map));
    assert.equal(read().name, 'Editor reload probe');
    map.name = 'Updated in JSON'; fs.writeFileSync(path.join(directory, 'map.json'), JSON.stringify(map));
    assert.equal(read().name, 'Updated in JSON');
    map.status = 'test'; fs.writeFileSync(path.join(directory, 'map.json'), JSON.stringify(map));
    assert.equal(read(), undefined);
    assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname, '../app/maps/availability.json'))).maps[id], 'test');
    map.status = 'available'; fs.writeFileSync(path.join(directory, 'map.json'), JSON.stringify(map));
    assert.equal(read().name, 'Updated in JSON');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
    require('../tools/maps/catalog.ts').syncMapCatalog(path.join(__dirname, '../app'));
  }
});

test('local map sprites are served while arbitrary source files remain private', async () => {
  const { openDatabase } = require('../server/database.ts');
  const { createServer } = require('../server/index.ts');
  const db = openDatabase(':memory:'), { app } = createServer({ db, downloadAssets: false });
  const filename = `probe-${randomUUID()}.png`, relative = `app/maps/content/2/${filename}`;
  const absolute = path.join(__dirname, '..', relative);
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII=', 'base64');
  try {
    fs.writeFileSync(absolute, bytes);
    const result = await app.inject({ method: 'GET', url: '/' + relative });
    assert.equal(result.statusCode, 200); assert.deepEqual(result.rawPayload, bytes);
    for (const url of ['/app/maps/not-a-bundled-module.ts', '/app/maps/content/2/not-public.ts', '/app/maps/content/2/.secret.png', '/server/index.ts']) {
      assert.equal((await app.inject({ method: 'GET', url })).statusCode, 404, url);
    }
  } finally { fs.rmSync(absolute, { force: true }); await app.close(); db.close(); }
});

function townTravelFixture() {
  const effects = [];
  const s = vm.createContext({ window: {}, MapsEngine: engine, E0: { town: { id: 37, n: 'Biện Kinh', bg: 'app/maps/content/37/assets/ground.jpg' } },
    actorActionLocked: () => false, bA: image => image,
    l: { ground: [], enemies: [{ x: 1, y: 1 }], corpses: [{}], moveTo: {}, pickTarget: {} },
    v: { x: 3000, y: 250 }, Y: { target: {} }, ih: 1,
    M1: () => effects.push('camera'), o0: () => {}, _e: () => {}, C: () => {}, D: text => text, k: () => {},
    m: () => ({ textContent: '', classList: { remove() {} } }) });
  s.mapAccess = { require: id => engine.isMapAvailable(id) };
  s.window.JMO = engine.createLegacyCatalog().navigation;
  for (const name of ['mapAdapter', 'mapNavigation', 'mapScene', 'O0', 'X0', 'ma', 'Z0']) declaration(s, 'app/core/attributes-01.js', name);
  declaration(s, 'app/ui/legacy-panels-and-audio-03.js', 'nc');
  return { s, effects };
}

test('returning to town uses its saved map entry on every fresh game session', () => {
  const map = engine.getMap(37), original = map.entry;
  try {
    // Use a reachable authored point away from the old hardcoded map center.
    const fixture = townTravelFixture(); fixture.s.ma('town');
    const [x, y] = fixture.s.X0(original.x, original.y);
    map.entry = { x, y };
    for (let restart = 0; restart < 2; restart++) {
      const { s, effects } = townTravelFixture(); s.nc();
      assert.equal(s.l.town, true); assert.equal(s.Z0.key, 'town');
      assert.deepEqual([s.v.x, s.v.y], [x, y]);
      assert.equal(s.l.enemies.length, 0); assert.equal(s.l.corpses.length, 0);
      assert.equal(s.l.moveTo, null); assert.equal(s.Y.target, null); assert.deepEqual(effects, ['camera']);
      // The normal town tick must not repeatedly teleport the player back to entry.
      s.v.x += 1; s.nc(); assert.equal(s.v.x, x + 1);
    }
  } finally { map.entry = original; }
});

test('blocked town entry snaps to a reachable position and a failed load retains the previous entry', () => {
  const map = engine.getMap(37), original = map.entry;
  try {
    map.entry = { x: 0, y: 0 };
    const { s } = townTravelFixture(); s.nc();
    assert.ok(engine.canStandAt(s.Z0.g, s.v.x, s.v.y)); assert.ok(s.v.x > 0 && s.v.y > 0);
    const expected = [s.v.x, s.v.y];
    s.window.JMO.bad = { w: 3584, h: 3584 };
    assert.throws(() => s.ma('bad'));
    assert.deepEqual(plain(s.mapAdapter.entryPosition()), expected);
    assert.equal(s.ma(999999), false); assert.deepEqual(plain(s.mapAdapter.entryPosition()), expected);
  } finally { map.entry = original; }
});

function trainingTravelFixture() {
  const { s, effects } = townTravelFixture();
  const catalog = engine.createLegacyCatalog();
  Object.assign(s, { k0: catalog.zones, Un: catalog.alternates, o: { stage: 0, mode: 'farm', zalt: {} }, d0: catalog.zones.length - 1,
    ol: index => index, DA: index => index, Jo: () => { s.l.moveTo = null; }, Tf() {}, PA: 'none',
    m: () => ({ textContent: '', classList: { remove() {}, add() {} } }) });
  s.AA = index => s.o.zalt[index] && s.Un[index]?.[s.o.zalt[index] - 1] || s.k0[index];
  for (const [file, name] of [['app/core/game-loop-01.js', 'Gn'], ['app/ui/legacy-panels-and-audio-03.js', 'en'], ['app/systems/activities-and-stash-06.js', 'On']]) declaration(s, file, name);
  const expected = id => { const map = engine.getMap(id), nav = engine.createNavigationRuntime(); nav.load(id, catalog.navigation[id], map.size); return plain(nav.resolvePosition(map.entry.x, map.entry.y)); };
  return { s, effects, catalog, expected };
}

test('choosing primary/alternate training maps, including from town, uses each destination entry', () => {
  const { s, catalog, expected } = trainingTravelFixture();
  s.nc(); assert.equal(s.l.town, true); s.l.tpCd = 0;
  assert.equal(s.On(1, 'Chọn map', false, true), true);
  assert.equal(s.l.town, false); assert.equal(s.Z0.key, catalog.zones[1].id);
  assert.deepEqual([s.v.x, s.v.y], expected(catalog.zones[1].id));
  const index = Number(Object.keys(catalog.alternates).find(index => catalog.alternates[index].length));
  s.o.zalt[index] = 1; s.On(index, 'Chọn map phụ', false, true);
  assert.equal(s.Z0.key, catalog.alternates[index][0].id);
  assert.deepEqual([s.v.x, s.v.y], expected(catalog.alternates[index][0].id));
  s.o.zalt[index] = 0; s.On(index, 'Chọn map chính', false, true);
  assert.equal(s.Z0.key, catalog.zones[index].id);
  assert.deepEqual([s.v.x, s.v.y], expected(catalog.zones[index].id));
});

test('explicit reselection returns to entry while same-map refresh and field rebuilding retain player position', () => {
  const { s, catalog, expected } = trainingTravelFixture(); const zone = catalog.zones[1];
  s.On(1, 'Chọn map', false, true);
  const [x, y] = s.X0(2700, 2400); s.v.x = x; s.v.y = y;
  s.Gn(zone); assert.deepEqual([s.v.x, s.v.y], [x, y]);
  s.On(1, 'Cập nhật cấp'); assert.deepEqual([s.v.x, s.v.y], [x, y]);
  s.On(1, 'Chọn lại map', false, true); assert.deepEqual([s.v.x, s.v.y], expected(zone.id));
  s.On(2, 'Tự đổi map'); assert.deepEqual([s.v.x, s.v.y], expected(catalog.zones[2].id));
});

for (const file of ['app/ui/world-panels-02.js', 'app/ui/legacy-panels-and-audio-01.js']) {
  test(`Test maps are hidden while available alternates retain their saved selection indices: ${file}`, () => {
    const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/maps/availability.json')));
    const manifest = plain(baseline); manifest.maps[2] = 'test'; manifest.maps[398] = 'test';
    engine.updateMapAvailability(manifest);
    try {
      const { s, catalog, expected } = trainingTravelFixture(), index = catalog.zones.findIndex(zone => zone.id === 2);
      const row = { dataset: { z: String(index) } };
      const panel = { innerHTML: '', style: { removeProperty() {} }, classList: { contains: () => true, add() {}, remove() {} },
        querySelector: () => null, querySelectorAll: selector => selector === '.zrow' ? [row] : [] };
      const elements = new Map(); s.m = selector => { if (!elements.has(selector)) elements.set(selector, { ...panel }); return elements.get(selector); };
      s.document = { querySelectorAll: selector => selector === '.zrow' ? [row] : [] };
      Object.assign(s, { Wo: () => true, Lf: () => '', Nf: () => '', Ok: () => '', pk: () => '', qt: () => '', I: {}, Ek() {}, Dk() {}, $() {}, V() {} }); s.l.logs = [];
      const name = file.includes('world-panels') ? 'jB' : 'yv'; declaration(s, file, name); s[name](true);
      const html = [...elements.values()].map(element => element.innerHTML).join('');
      assert.ok(!html.includes('Bến đò Thanh Loan')); assert.ok(!html.includes('Hoa Sơn'));
      assert.ok(html.includes(`data-za="${index}:1"`));
      row.onclick(); assert.equal(s.Z0.key, 195); assert.equal(s.o.zalt[index], 1);
      assert.deepEqual([s.v.x, s.v.y], expected(195));
    } finally { engine.updateMapAvailability(baseline); }
  });
  test(`saved editor map is listed and can be selected from the game menu: ${file}`, () => {
    const { s, catalog, expected } = trainingTravelFixture();
    const index = catalog.zones.findIndex(zone => zone.id === 398);
    assert.ok(index >= 0, 'Saved map 398 must be registered in progression');
    const row = { dataset: { z: String(index) } };
    const panel = { innerHTML: '', style: { removeProperty() {} }, classList: { contains: () => true, add() {}, remove() {} },
      querySelector: () => null, querySelectorAll: selector => selector === '.zrow' ? [row] : [] };
    const elements = new Map(); s.m = selector => { if (!elements.has(selector)) elements.set(selector, { ...panel }); return elements.get(selector); };
    s.document = { querySelectorAll: selector => selector === '.zrow' ? [row] : [] };
    Object.assign(s, { Wo: () => true, Lf: () => '', Nf: () => '', Ok: () => '', pk: () => '', qt: () => '', I: {}, Ek() {}, Dk() {}, $() {}, V() {} }); s.l.logs = [];
    const name = file.includes('world-panels') ? 'jB' : 'yv'; declaration(s, file, name); s[name](true);
    assert.ok([...elements.values()].some(element => element.innerHTML.includes('Bến đò Thanh Loan') && element.innerHTML.includes(`data-z="${index}"`)));
    row.onclick(); assert.equal(s.Z0.key, 398); assert.deepEqual([s.v.x, s.v.y], expected(398));
  });
  test(`map picker routes primary and alternate selection through entry-aware travel: ${file}`, () => {
    const { s, catalog, expected } = trainingTravelFixture();
    const index = Number(Object.keys(catalog.alternates).find(index => catalog.alternates[index].length));
    const row = { dataset: { z: String(index) } }, chip = { dataset: { za: `${index}:1` } };
    const panel = { innerHTML: '', style: { removeProperty() {} }, classList: { contains: () => true, add() {}, remove() {} },
      querySelector: () => null, querySelectorAll: selector => selector === '.zrow' ? [row] : [chip] };
    const elements = new Map(); s.m = selector => { if (!elements.has(selector)) elements.set(selector, { ...panel }); return elements.get(selector); };
    s.document = { querySelectorAll: selector => selector === '.zrow' ? [row] : [chip] };
    Object.assign(s, { Wo: () => true, Lf: () => '', Nf: () => '', Ok: () => '', pk: () => '', qt: () => '', I: {},
      Ek() {}, Dk() {}, $() {}, V() {} }); s.l.logs = [];
    const name = file.includes('world-panels') ? 'jB' : 'yv'; declaration(s, file, name); s[name](true);
    row.onclick(); assert.deepEqual([s.v.x, s.v.y], expected(catalog.zones[index].id));
    // Selecting an alternate in the current stage while still in town must leave town too.
    s.l.tpCd = 0; s.nc(); s.l.tpCd = 0;
    chip.onclick(); assert.equal(s.l.town, false); assert.equal(s.Z0.key, catalog.alternates[index][0].id);
    assert.deepEqual([s.v.x, s.v.y], expected(catalog.alternates[index][0].id));
  });
}

test('selecting a training map during town teleport cooldown cannot replace the town navigation', () => {
  const { s, catalog, expected } = trainingTravelFixture(); s.nc();
  const position = [s.v.x, s.v.y], stage = s.o.stage;
  assert.equal(s.On(1, 'Chọn map', false, true), false);
  assert.equal(s.l.town, true); assert.equal(s.Z0.key, 'town'); assert.equal(s.o.stage, stage);
  assert.deepEqual([s.v.x, s.v.y], position);
  s.l.tpCd = 0; assert.equal(s.On(1, 'Chọn map', false, true), true);
  assert.equal(s.l.town, false); assert.deepEqual([s.v.x, s.v.y], expected(catalog.zones[1].id));
});
