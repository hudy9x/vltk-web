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

test('map status persists through editor save validation and only Available maps require local artwork', () => {
  const doc = document(); assert.equal(doc.map.status, 'test');
  doc.encounters.push({ ...encounters[0], id: 'new-status', mapId: doc.map.id });
  let result = bridge({ ...doc, map: model.validateDocument(doc) });
  assert.equal(result.status, 0, result.stderr);
  doc.map.status = 'available'; result = bridge(doc);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /Không tìm thấy ảnh/);
  doc.map.layers[0].image = './assets/local.png';
  const resolved = `app/maps/content/${doc.map.id}/assets/local.png`;
  result = bridge(doc, [resolved]); assert.equal(result.status, 0, result.stderr);
  doc.map.layers[0].image = 'img/z/2.jpg'; result = bridge(doc, ['img/z/2.jpg']);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /thư mục map/);
  doc.map.status = 'invalid'; assert.throws(() => model.validateDocument(doc), /invalid status/);
  const town = JSON.parse(fs.readFileSync(path.join(root, 'app/maps/content/37/map.json')));
  town.status = 'test'; const townDoc = model.createDocument({ projects: {}, encounters, progression }, town);
  assert.throws(() => model.validateDocument(townDoc), /Biện Kinh phải Available/);
});

test('native validation accepts reordered JSON keys and rejects stale compilation, paths and progression changes', () => {
  const doc = document(); doc.map.layers[0].image = './assets/test.jpg';
  model.paint(doc, { x: 16, y: 8 }, { x: 16, y: 8 }, true, 1);
  doc.map = model.compileMap(doc); doc.map.navigation = Object.fromEntries(Object.entries(doc.map.navigation).reverse());
  let result = bridge(doc, [`app/maps/content/${doc.map.id}/assets/test.jpg`]); assert.equal(result.status, 0, result.stderr);
  doc.map.navigation.blockedBase64 = Buffer.alloc(8).toString('base64');
  result = bridge(doc); assert.notEqual(result.status, 0); assert.match(result.stderr, /chưa được compile/);
  doc.map = model.compileMap(doc); doc.map.layers[0].image = '../secret.png';
  result = bridge(doc); assert.notEqual(result.status, 0); assert.match(result.stderr, /Đường dẫn/);
  doc.map.layers[0].image = './assets/test.jpg'; doc.progression.reverse();
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
  doc.map.layers[0].image = './assets/test.jpg';
  doc.encounters.push({ ...encounters[0], id: `map-${doc.map.id}`, mapId: doc.map.id, alternate: true });
  mapProgression.ensureMapListed(doc);
  assert.deepEqual(plain(doc.progression.slice(0, before.length)), before);
  assert.deepEqual(plain(doc.progression.at(-1)), { mapId: doc.map.id, alternateMapIds: [] });
  assert.equal(doc.encounters.at(-1).alternate, undefined);
  mapProgression.ensureMapListed(doc); assert.equal(doc.progression.length, before.length + 1);
  const saved = model.validateDocument(doc), reloaded = model.createDocument({ projects: {}, encounters: doc.encounters, progression: doc.progression }, plain(saved));
  assert.equal(reloaded.progression.at(-1).mapId, saved.id);
  const result = bridge({ ...doc, map: saved }, [`app/maps/content/${doc.map.id}/assets/test.jpg`]); assert.equal(result.status, 0, result.stderr);
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

test('paint gesture decodes once and serializes only on commit, including large pending images', () => {
  let decodes = 0, encodes = 0;
  const context = vm.createContext({ module: { exports: {} }, structuredClone, Uint8Array, Map, Set,
    atob(value) { decodes++; return atob(value); }, btoa(value) { encodes++; return btoa(value); } });
  vm.runInContext(source.outputFiles[0].text, context);
  const fast = context.module.exports, original = document();
  original.assets.push({ path: './assets/large.png', data: 'x'.repeat(28 * 1024 * 1024) });
  const draft = fast.cloneDocument(original), reference = model.cloneDocument(original);
  const stroke = fast.beginPaintStroke(draft);
  const before = draft.project.paintedNavigation.blockedBase64;
  const counts = [decodes, encodes];
  for (let i = 0; i < 250; i++) {
    const from = { x: (i * 17) % 256, y: (i * 7) % 128 };
    const to = { x: (i * 23) % 256, y: (i * 13) % 128 };
    stroke.paint(from, to, i % 3 !== 0, 3);
    model.paint(reference, from, to, i % 3 !== 0, 3);
  }
  assert.deepEqual([decodes, encodes], counts, 'pointer moves must not decode or encode navigation');
  assert.equal(draft.project.paintedNavigation.blockedBase64, before, 'discarding a gesture needs no rollback');
  stroke.commit();
  assert.equal(encodes, counts[1] + 1);
  assert.equal(draft.project.paintedNavigation.blockedBase64, reference.project.paintedNavigation.blockedBase64);
  assert.equal(draft.assets[0], original.assets[0], 'large immutable bytes are shared');
  assert.equal(original.project.paintedNavigation.kind, 'open');
});

test('live erase preserves object colliders while allowing painted cells to be removed', () => {
  const doc = document();
  doc.map.layers.push({ id: 'objects', type: 'world', objects: [{ id: 'tree', image: './assets/tree.png', position: { x: 80, y: 40 }, anchor: { x: 16, y: 32 }, scale: 1, depthOffsetY: 0 }] });
  doc.project.colliders['objects/tree'] = { radiusX: 12, radiusY: 6, offsetX: 0, offsetY: 0 };
  model.paint(doc, { x: 80, y: 40 }, { x: 176, y: 40 }, true, 1);
  const stroke = model.beginPaintStroke(doc);
  stroke.paint({ x: 80, y: 40 }, { x: 176, y: 40 }, false, 1);
  assert.equal(stroke.blocked(2 * 8 + 2), true);
  assert.equal(stroke.blocked(2 * 8 + 5), false);
  stroke.commit();
  assert.equal(blocked(model.compileMap(doc), 80, 40), true);
  assert.equal(blocked(model.compileMap(doc), 176, 40), false);
});

test('preview uses the real standing sprite, renderer scale and foot anchor', () => {
  const actor = loadEditorModule('map-tool/src/lib/preview-actor.ts');
  const catalog = { JW: { anim: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'app/data/monsters-and-zones-04.js'), 'utf8').split('window.JW["town"]')[0], { window: catalog });
  const frame = catalog.JW.anim.pl_shaolin.st;
  assert.deepEqual(plain(actor.previewActor), { width: frame.w, height: frame.h, anchorX: frame.ax, anchorY: frame.ay, scale: 1.35 });
  assert.match(fs.readFileSync(path.join(root, 'app/render/arena-02.js'), 'utf8'), /var Jn = 1\.35/);
  const image = { complete: true, naturalWidth: frame.w * frame.n }, calls = [];
  actor.drawPreviewActor({ drawImage: (...args) => calls.push(args) }, image, { x: 200, y: 150 });
  assert.deepEqual(calls[0], [image, 0, 0, 64, 47, 156.8, 89.25, 86.4, 63.45]);
});

test('canvas reuses large-image background and defers navigation work throughout a drag', async () => {
  const output = await require('esbuild').build({
    entryPoints: [path.join(root, 'map-tool/src/editor/MapCanvas.tsx')], bundle: true,
    platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
    external: ['react', 'react/jsx-runtime'], loader: { '.webp': 'text' },
    alias: { '@': path.join(root, 'map-tool/src'), '@game': path.join(root, 'app/maps') },
    plugins: [{ name: 'headless-controls', setup(build) {
      build.onResolve({ filter: /^(lucide-react|@\/components\/ui\/)/ }, args => ({ path: args.path, namespace: 'controls' }));
      build.onLoad({ filter: /.*/, namespace: 'controls' }, () => ({ contents: 'export const Checkbox=()=>null,Label=()=>null,Button=()=>null,RefreshCw=()=>null;' }));
    } }],
  });
  let decodes = 0, encodes = 0, backgroundDraws = 0, nextFrame = 0;
  const effects = [], listeners = new Map(), frames = new Map(), commits = [];
  const image = { complete: true, naturalWidth: 5016, naturalHeight: 5016, src: 'large.png' };
  const drawing = () => new Proxy({ measureText: () => ({ width: 80 }), drawImage(source) { if (source === image) backgroundDraws++; } },
    { get(object, key) { return key in object ? object[key] : () => {}; } });
  const canvas = { width: 0, height: 0, getContext: () => drawing(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 }),
    addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener() {},
    dispatchEvent: event => listeners.get(event.type)?.(event), setPointerCapture() {} };
  const parent = { getBoundingClientRect: canvas.getBoundingClientRect };
  let refs = 0;
  const hooks = { useRef(value) { return { current: value === null ? (++refs === 1 ? canvas : parent) : value }; },
    useState(value) { return [value, () => {}]; }, useEffect(callback) { effects.push(callback); } };
  const context = vm.createContext({ module: { exports: {} }, structuredClone, Uint8Array, Map, Set,
    atob(value) { decodes++; return atob(value); }, btoa(value) { encodes++; return btoa(value); },
    require(name) { if (name === 'react') return hooks; if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null }; throw new Error(name); },
    Image: class { complete = true; naturalWidth = 704; },
    ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } disconnect() {} },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; }, cancelAnimationFrame(id) { frames.delete(id); },
    window: { devicePixelRatio: 1, document: { createElement: () => ({ getContext: () => drawing() }) } },
    Event: class { constructor(type) { this.type = type; } },
  });
  vm.runInContext(output.outputFiles[0].text, context);
  const doc = document(); doc.assets.push({ path: './assets/large.png', data: 'x'.repeat(28 * 1024 * 1024) });
  context.module.exports.MapCanvas({ document: doc, assets: { imageFor: () => image, errors: new Map(), subscribe: () => () => {} },
    monsters: [], tool: 'block', brush: 3, selection: null, hidden: new Set(), showGrid: false,
    showCollision: true, collisionOpacity: 65, showRegions: false, zoomCommand: { action: 'fit', serial: 0 },
    onChange: value => commits.push(value), onSelect() {}, onStatus() {}, onError(message) { throw new Error(message); } });
  effects.forEach(effect => effect());
  function flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(16)); }
  flush(); flush();
  const event = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, button: 0 });
  listeners.get('pointerdown')(event(180, 150)); flush();
  const baseline = [decodes, encodes, backgroundDraws];
  for (let i = 0; i < 100; i++) { listeners.get('pointermove')(event(180 + i % 100, 150 + i % 30)); flush(); }
  assert.deepEqual([decodes, encodes, backgroundDraws], baseline, 'paint frames must reuse decoded navigation and the viewport background');
  assert.equal(commits.length, 0);
  listeners.get('pointerup')({ ...event(280, 180), type: 'pointerup' });
  assert.equal(commits.length, 1, 'one gesture is one undo entry');
  assert.equal(commits[0].assets[0], doc.assets[0]);
});

test('zoom buttons follow the exact preset list in both directions and clamp at limits', () => {
  const { ZOOM_LEVELS, stepZoom } = loadEditorModule('map-tool/src/lib/zoom.ts');
  assert.deepEqual(plain(ZOOM_LEVELS), [20, 30, 50, 70, 80, 90, 100, 120, 150, 200, 300, 400]);
  for (let i = 0; i < ZOOM_LEVELS.length; i++) {
    assert.equal(stepZoom(ZOOM_LEVELS[i], 'in'), ZOOM_LEVELS[Math.min(i + 1, ZOOM_LEVELS.length - 1)]);
    assert.equal(stepZoom(ZOOM_LEVELS[i], 'out'), ZOOM_LEVELS[Math.max(i - 1, 0)]);
  }
  assert.equal(stepZoom(67, 'in'), 70);
  assert.equal(stepZoom(67, 'out'), 50);
  assert.equal(stepZoom(18, 'in'), 20);
  assert.equal(stepZoom(18, 'out'), 20);
  assert.equal(stepZoom(120.00000000001, 'out'), 100);
  assert.equal(stepZoom(119.99999999999, 'in'), 150);
});
