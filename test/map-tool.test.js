const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = buildSync({ entryPoints: [path.join(root, 'map-tool/src/lib/model.ts')], bundle: true, platform: 'node', format: 'cjs', write: false, alias: { '@game': path.join(root, 'app/maps') } });
const sandbox = vm.createContext({ module: { exports: {} }, atob, btoa, structuredClone, Uint8Array, Map, Set });
vm.runInContext(source.outputFiles[0].text, sandbox);
const model = sandbox.module.exports;
const encounters = JSON.parse(fs.readFileSync(path.join(root, 'app/gameplay/encounters/catalog.json')));
const progression = JSON.parse(fs.readFileSync(path.join(root, 'app/maps/progression.json')));
const plain = value => JSON.parse(JSON.stringify(value));
function document() { return model.createDocument({ projects: {}, encounters, progression }, model.newMap(999997, 'Editor test', 256, 128)); }
function blocked(map, x, y) { const grid = map.navigation; const cell = Math.floor(y / grid.cellSize.height) * grid.columns + Math.floor(x / grid.cellSize.width); return !!(Buffer.from(grid.blockedBase64, 'base64')[cell >> 3] & (1 << (cell & 7))); }
function bridge(doc, assets = []) { return spawnSync(process.execPath, ['tools/maps/editor-data.ts', 'validate'], { cwd: root, encoding: 'utf8', input: JSON.stringify({ document: doc, availableAssets: assets }) }); }

test('editor brush fills continuous strokes and rectangle erase preserves unrelated cells', () => {
  const doc = document();
  model.paint(doc, { x: 16, y: 8 }, { x: 240, y: 8 }, true, 1);
  model.paint(doc, { x: 16, y: 40 }, { x: 80, y: 56 }, true, 1, true);
  model.paint(doc, { x: 16, y: 40 }, { x: 16, y: 40 }, false, 1);
  const map = model.compileMap(doc);
  for (let x = 16; x < 256; x += 32) assert.ok(blocked(map, x, 8));
  assert.ok(!blocked(map, 16, 40)); assert.ok(blocked(map, 80, 56));
});

test('moving and removing an object recompiles its collider without erasing painted navigation', () => {
  const doc = document(); model.paint(doc, { x: 16, y: 8 }, { x: 16, y: 8 }, true, 1);
  doc.map.layers[1].objects.push({ id: 'tree', image: './tree.png', position: { x: 80, y: 40 }, anchor: { x: 16, y: 64 }, scale: 1, depthOffsetY: 0 });
  doc.project.colliders['world/tree'] = { radiusX: 8, radiusY: 4, offsetX: 0, offsetY: 0 };
  const before = plain(doc.project.paintedNavigation);
  assert.ok(blocked(model.compileMap(doc), 80, 40));
  doc.map.layers[1].objects[0].position.x = 176;
  const moved = model.compileMap(doc); assert.ok(!blocked(moved, 80, 40)); assert.ok(blocked(moved, 176, 40));
  delete doc.project.colliders['world/tree']; const removed = model.compileMap(doc);
  assert.ok(!blocked(removed, 176, 40)); assert.ok(blocked(removed, 16, 8));
  assert.deepEqual(plain(doc.project.paintedNavigation), before);
});

test('editor refuses blocked worlds, invalid bitmasks and blocked fixed spawns', () => {
  const doc = document(); model.paint(doc, { x: 0, y: 0 }, { x: 255, y: 127 }, true, 1, true);
  assert.throws(() => model.validateDocument(doc), /vùng đi được/);
  doc.project.paintedNavigation.blockedBase64 = 'AA==';
  assert.throws(() => model.validateDocument(doc), /byte length/);
  const fixed = document(); model.paint(fixed, { x: 80, y: 40 }, { x: 80, y: 40 }, true, 1);
  fixed.map.spawns.push({ id: 'a', position: { x: 80, y: 40 }, encounterId: encounters[0].id, rank: 'boss', initialDelaySeconds: 2 });
  assert.throws(() => model.validateDocument(fixed), /Spawn a/);
  fixed.map.spawns[0].position = { x: 176, y: 88 }; fixed.map.spawns[0].encounterId = 'missing';
  assert.throws(() => model.validateDocument(fixed), /encounter không tồn tại/);
});

test('legacy documents preserve their collision and encounter data when opened', () => {
  for (const id of fs.readdirSync(path.join(root, 'app/maps/content'))) {
    const file = path.join(root, 'app/maps/content', id, 'map.json'); if (!fs.existsSync(file)) continue;
    const map = JSON.parse(fs.readFileSync(file)); const doc = model.createDocument({ projects: {}, encounters, progression }, map);
    assert.deepEqual(plain(model.validateDocument(doc)), map);
  }
});

test('native validation accepts reordered JSON keys and rejects stale compilation, paths and progression changes', () => {
  const doc = document(); doc.map.layers[0].image = 'img/z/2.jpg';
  model.paint(doc, { x: 16, y: 8 }, { x: 16, y: 8 }, true, 1);
  doc.map = model.compileMap(doc); doc.map.navigation = Object.fromEntries(Object.entries(doc.map.navigation).reverse());
  let result = bridge(doc, ['img/z/2.jpg']); assert.equal(result.status, 0, result.stderr);
  doc.map.navigation.blockedBase64 = Buffer.alloc(8).toString('base64');
  result = bridge(doc); assert.notEqual(result.status, 0); assert.match(result.stderr, /chưa được compile/);
  doc.map = model.compileMap(doc); doc.map.layers[0].image = '../secret.png';
  result = bridge(doc); assert.notEqual(result.status, 0); assert.match(result.stderr, /Đường dẫn/);
  doc.map.layers[0].image = 'img/z/2.jpg'; doc.progression.reverse();
  result = bridge(doc); assert.notEqual(result.status, 0); assert.match(result.stderr, /thứ tự progression/);
});

test('editor history shares immutable image payloads and compares pending paths without embedding Base64', () => {
  const doc = document(); doc.assets.push({ path: './assets/tree.png', data: 'x'.repeat(1024 * 1024) });
  const copy = model.cloneDocument(doc);
  assert.notEqual(copy.map, doc.map); assert.notEqual(copy.assets, doc.assets); assert.equal(copy.assets[0], doc.assets[0]);
  assert.equal(model.documentKey(copy), model.documentKey(doc)); assert.ok(model.documentKey(copy).length < 50000);
  copy.assets.push({ path: './assets/rock.png', data: 'y' }); assert.equal(doc.assets.length, 1);
  assert.notEqual(model.documentKey(copy), model.documentKey(doc));
});

function loadEditorModule(entry) {
  const output = buildSync({ entryPoints: [path.join(root, entry)], bundle: true, platform: 'node', format: 'cjs', write: false, alias: { '@game': path.join(root, 'app/maps') } });
  const context = vm.createContext({ module: { exports: {} }, atob, btoa, structuredClone, Uint8Array, Map, Set });
  vm.runInContext(output.outputFiles[0].text, context); return context.module.exports;
}
const presentation = loadEditorModule('map-tool/src/lib/presentation.ts');
const previews = loadEditorModule('map-tool/src/lib/spawn-preview.ts');
const spawnEditing = loadEditorModule('map-tool/src/lib/spawn-editing.ts');
const spawnSelection = loadEditorModule('map-tool/src/lib/spawn-selection.ts');
const mapProgression = loadEditorModule('map-tool/src/lib/progression.ts');

test('new maps register for the game menu without reordering or duplicating existing stage indices', () => {
  const doc = document(), before = plain(doc.progression);
  doc.map.layers[0].image = 'img/z/2.jpg';
  doc.encounters.push({ ...encounters[0], id: `map-${doc.map.id}`, mapId: doc.map.id, alternate: true });
  mapProgression.ensureMapListed(doc);
  assert.deepEqual(plain(doc.progression.slice(0, before.length)), before);
  assert.deepEqual(plain(doc.progression.at(-1)), { mapId: doc.map.id, alternateMapIds: [] });
  assert.equal(doc.encounters.at(-1).alternate, undefined);
  mapProgression.ensureMapListed(doc); assert.equal(doc.progression.length, before.length + 1);
  const saved = model.validateDocument(doc), reloaded = model.createDocument({ projects: {}, encounters: doc.encounters, progression: doc.progression }, plain(saved));
  assert.equal(reloaded.progression.at(-1).mapId, saved.id);
  const result = bridge({ ...doc, map: saved }, ['img/z/2.jpg']); assert.equal(result.status, 0, result.stderr);
});

test('registering a map already assigned as an alternate keeps its existing menu location', () => {
  const doc = document(); doc.progression[0].alternateMapIds.push(doc.map.id);
  const before = plain(doc.progression);
  mapProgression.ensureMapListed(doc); assert.deepEqual(plain(doc.progression), before);
  doc.progression[0].alternateMapIds.pop();
  assert.throws(() => mapProgression.ensureMapListed(doc), /cần encounter/);
});

test('spawn region selection includes edges and every rank in all four drag directions', () => {
  const points = [{ id: 'normal', x: 10, y: 20 }, { id: 'boss', x: 30, y: 40 }, { id: 'elite', x: 20, y: 30 }, { id: 'outside', x: 31, y: 40 }];
  for (const [start, end] of [[{ x: 10, y: 20 }, { x: 30, y: 40 }], [{ x: 30, y: 40 }, { x: 10, y: 20 }], [{ x: 10, y: 40 }, { x: 30, y: 20 }], [{ x: 30, y: 20 }, { x: 10, y: 40 }]]) {
    assert.deepEqual(plain(spawnSelection.spawnIdsInRegion(points, start, end)), ['normal', 'boss', 'elite']);
  }
  assert.deepEqual(plain(spawnSelection.spawnIdsInRegion(points, { x: 100, y: 100 }, { x: 110, y: 110 })), []);
});

test('bulk deletion keeps outside spawns and supports document history, including empty fixed maps', () => {
  const doc = document(); doc.encounters = [{ ...encounters[0], id: 'base', mapId: doc.map.id }];
  doc.map.spawns = [1, 2, 3].map(id => ({ id: `point-${id}`, position: { x: 16 + 64 * id, y: 40 }, encounterId: 'base', rank: id === 2 ? 'boss' : 'normal', initialDelaySeconds: 0 }));
  const before = model.cloneDocument(doc), mapBefore = plain(before.map);
  const selected = spawnSelection.spawnIdsInRegion(doc.map.spawns.map(point => ({ ...point.position, id: point.id })), { x: 70, y: 30 }, { x: 145, y: 50 });
  spawnSelection.deleteSpawnPoints(doc, [...selected, selected[0], 'missing']);
  assert.deepEqual(plain(doc.map.spawns), [mapBefore.spawns[2]]);
  assert.deepEqual(plain(before.map), mapBefore); // Undo snapshot must remain intact.
  const reloaded = model.createDocument({ projects: {}, encounters: doc.encounters, progression }, plain(model.validateDocument(doc)));
  assert.deepEqual(plain(reloaded.map.spawns), [mapBefore.spawns[2]]);
  spawnSelection.deleteSpawnPoints(reloaded, ['point-3']);
  assert.equal(previews.spawnPreview(reloaded, model.validateDocument(reloaded)).length, 0);
  assert.equal(reloaded.map.spawnMode, 'fixed');
});

test('bulk deleting a procedural sample retains every point outside the selected region', () => {
  const doc = document(); doc.encounters = [{ ...encounters[0], id: 'base', mapId: doc.map.id, monsterIds: [12], bossId: 543 }];
  const points = [{ id: 'inside', x: 80, y: 40, monsterId: 543, rank: 'boss', delay: 60, fixed: false }, { id: 'outside', x: 208, y: 88, monsterId: 12, rank: 'elite', delay: 0, fixed: false }];
  const ids = spawnSelection.spawnIdsInRegion(points, { x: 70, y: 30 }, { x: 90, y: 50 });
  spawnEditing.retainSpawnPoints(doc, points);
  spawnSelection.deleteSpawnPoints(doc, ids);
  const remaining = previews.spawnPreview(doc, model.validateDocument(doc));
  assert.deepEqual(plain(remaining), [{ ...points[1], fixed: true }]);
});

test('editor orders progression maps by training level and keeps alternates directly after their primary', () => {
  const maps = fs.readdirSync(path.join(root, 'app/maps/content')).flatMap(id => { const file = path.join(root, 'app/maps/content', id, 'map.json'); return fs.existsSync(file) ? [JSON.parse(fs.readFileSync(file))] : []; });
  const original = JSON.stringify(progression), result = presentation.mapList(maps, encounters, progression);
  assert.equal(result.length, maps.length); assert.equal(new Set(result.map(item => item.map.id)).size, maps.length);
  const primary = result.filter(item => item.kind === 'primary');
  assert.equal(primary[0].map.id, 140);
  for (let i = 1; i < primary.length; i++) assert.ok(primary[i - 1].levelRange[0] <= primary[i].levelRange[0]);
  for (const entry of progression) { const index = result.findIndex(item => item.map.id === entry.mapId); entry.alternateMapIds.forEach((id, offset) => assert.equal(result[index + offset + 1].map.id, id)); }
  assert.equal(JSON.stringify(progression), original);
  const draft = model.createDocument({ projects: {}, encounters, progression }, maps.find(map => map.id === 2)); draft.map.name = 'Tên chưa lưu';
  assert.equal(presentation.mapListForDraft(maps, draft, encounters, progression).find(item => item.map.id === 2).map.name, 'Tên chưa lưu');
});

test('monster picker filters accented names, encounter level groups, unused monsters and selected exclusions', () => {
  const monsters = [{ id: 12, name: 'Nhím' }, { id: 11, name: 'Heo rừng' }, { id: 543, name: 'Đại Boss' }, { id: 999, name: 'Chưa có bãi' }];
  const profiles = [{ ...encounters[0], id: 'a', levelRange: [10, 20], monsterIds: [12], bossId: 543 }, { ...encounters[0], id: 'b', levelRange: [20, 30], monsterIds: [11], bossId: 543 }];
  assert.deepEqual(plain(presentation.filterMonsters(monsters, profiles, 'nhim', 'all')).map(monster => monster.id), [12]);
  assert.deepEqual(plain(presentation.filterMonsters(monsters, profiles, '', '10-20', [543])).map(monster => monster.id), [12]);
  assert.deepEqual(plain(presentation.filterMonsters(monsters, profiles, '', 'unassigned')).map(monster => monster.id), [999]);
  assert.equal(presentation.monsterRanges(543, profiles).length, 2);
  assert.deepEqual(plain(presentation.filterMonsters(monsters, profiles, 'dai', '20-30')).map(monster => monster.id), [543]);
});

test('spawn preview uses current draft encounters, remains deterministic, and never writes procedural points into the document', () => {
  const doc = document(); doc.map = model.newMap(999997, 'Preview'); doc.project.paintedNavigation = { kind: 'open' };
  doc.encounters = [{ ...encounters[0], id: 'draft-profile', mapId: doc.map.id, monsterIds: [12], bossId: 543 }];
  const original = JSON.stringify(doc), map = model.compileMap(doc);
  const first = previews.spawnPreview(doc, map), second = previews.spawnPreview(doc, map);
  assert.deepEqual(plain(first), plain(second)); assert.ok(first.length > 0);
  assert.ok(first.every(point => [12, 543].includes(point.monsterId) && point.x >= 0 && point.x < map.size.width && point.y >= 0 && point.y < map.size.height));
  assert.notDeepEqual(plain(first), plain(previews.spawnPreview(doc, map, 1)));
  assert.equal(JSON.stringify(doc), original); assert.equal(doc.map.spawns.length, 0);
  assert.equal(previews.spawnPreview(doc, map, 0, () => true).length, 0);
  doc.map.spawns = [{ id: 'saved-boss', position: { x: 400, y: 600 }, rank: 'boss', encounterId: 'draft-profile', initialDelaySeconds: 20 }];
  const fixed = previews.spawnPreview(doc, model.compileMap(doc)); assert.equal(fixed.length, 1); assert.equal(fixed[0].fixed, true); assert.equal(fixed[0].monsterId, 543); assert.equal(fixed[0].delay, 20);
});

test('shared spawn generation resolves draft fixed encounters without depending on the game catalog', () => {
  const generation = loadEditorModule('app/maps/spawn/generation.ts');
  const doc = document(); const profile = { ...encounters[0], id: 'not-in-catalog', monsterIds: [12], bossId: 543 };
  doc.map.spawns = [{ id: 'fixed', position: { x: 80, y: 40 }, rank: 'boss', encounterId: profile.id, initialDelaySeconds: 5 }];
  const points = generation.generateFieldPoints({ canStand: () => true }, {}, {}, [6, 8], () => false, () => .5, doc.map, id => id === profile.id ? profile : undefined);
  assert.deepEqual(plain(points), [{ x: 80, y: 40, cls: 'boss', tid: 543, t: 5 }]);
  assert.throws(() => generation.generateFieldPoints({ canStand: () => true }, {}, {}, [6, 8], () => false, () => .5, doc.map), /Unknown encounter/);
});

test('editing procedural spawns retains every displayed position, monster, rank and delay on addition', () => {
  const doc = document(); doc.map = model.newMap(999997, 'Retain'); doc.project.paintedNavigation = { kind: 'open' };
  doc.encounters = [{ ...encounters[0], id: 'base', mapId: doc.map.id, monsterIds: [12, 11], bossId: 543 }];
  const original = model.documentKey(doc), points = previews.spawnPreview(doc, model.compileMap(doc), 7);
  assert.ok(points.length > 1);
  spawnEditing.retainSpawnPoints(doc, points);
  const kept = previews.spawnPreview(doc, model.compileMap(doc));
  assert.deepEqual(plain(kept.map(({ fixed, ...point }) => point)), plain(points.map(({ fixed, ...point }) => point)));
  const before = plain(doc.map.spawns);
  doc.map.spawns.push({ id: 'new', position: { x: 400, y: 600 }, encounterId: 'base', rank: 'normal', initialDelaySeconds: 0 });
  spawnEditing.retainSpawnPoints(doc, []);
  assert.equal(doc.map.spawns.length, points.length + 1);
  assert.deepEqual(plain(doc.map.spawns.slice(0, -1)), before);
  assert.notEqual(model.documentKey(doc), original);
  assert.equal(doc.encounters[0].id, 'base'); assert.equal(doc.encounters[0].monsterIds.length, 2);
  assert.equal(new Set(doc.encounters.map(profile => profile.id)).size, doc.encounters.length);
});

test('delete one spawn preserves neighbors and deleting the last stays empty after validation and reload', () => {
  const doc = document();
  const samples = [1, 2].map(id => ({ id: `preview-${id}`, x: id * 64 + 16, y: 40, monsterId: 12, rank: 'normal', delay: 0, fixed: false }));
  doc.encounters = [{ ...encounters[0], mapId: doc.map.id }];
  spawnEditing.retainSpawnPoints(doc, samples);
  const neighbor = plain(doc.map.spawns[1]); doc.map.spawns.splice(0, 1);
  assert.deepEqual(plain(doc.map.spawns[0]), neighbor);
  doc.map.spawns = [];
  const saved = model.validateDocument(doc);
  const reloaded = model.createDocument({ projects: {}, encounters: doc.encounters, progression }, plain(saved));
  assert.equal(reloaded.map.spawnMode, 'fixed');
  assert.equal(previews.spawnPreview(reloaded, reloaded.map).length, 0);
  const generation = loadEditorModule('app/maps/spawn/generation.ts');
  assert.equal(generation.generateFieldPoints({}, {}, {}, [6, 8], () => false, () => .5, saved).length, 0);
  reloaded.map.spawnMode = 'invalid'; assert.throws(() => model.validateDocument(reloaded), /invalid spawnMode/);
  reloaded.map.spawnMode = 'procedural'; reloaded.map.spawns = [neighbor];
  assert.throws(() => model.validateDocument(reloaded), /procedural mode cannot contain fixed spawns/);
});

test('reselecting a boss isolates the chosen point and runtime uses the new boss ID', () => {
  const doc = document(); const base = { ...encounters[0], id: 'base', mapId: doc.map.id, monsterIds: [12], bossId: 543 };
  doc.encounters = [base]; doc.map.spawnMode = 'fixed';
  doc.map.spawns = ['boss-a', 'boss-b'].map((id, index) => ({ id, position: { x: 80 + 64 * index, y: 40 }, encounterId: 'base', rank: 'boss', initialDelaySeconds: 5 }));
  spawnEditing.setSpawnMonster(doc, 'boss-a', 544);
  spawnEditing.setSpawnMonster(doc, 'boss-a', 545);
  assert.equal(doc.encounters.length, 2); assert.equal(base.bossId, 543);
  assert.equal(previews.spawnPreview(doc, doc.map)[0].monsterId, 545);
  assert.equal(previews.spawnPreview(doc, doc.map)[1].monsterId, 543);
  const generation = loadEditorModule('app/maps/spawn/generation.ts');
  const points = generation.generateFieldPoints({ canStand: () => true }, {}, {}, [6, 8], () => false, () => .5, doc.map, id => doc.encounters.find(profile => profile.id === id));
  assert.deepEqual(plain(points.map(point => point.tid)), [545, 543]);
  doc.map.spawns[0].rank = 'elite'; spawnEditing.setSpawnMonster(doc, 'boss-a', 11);
  assert.deepEqual(plain(previews.spawnPreview(doc, doc.map).map(point => point.monsterId)), [11, 543]);
});
