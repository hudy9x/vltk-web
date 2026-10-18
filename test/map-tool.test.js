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
