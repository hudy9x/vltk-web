const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { migrateMapAssets } = require('../tools/maps/migrate-assets.ts');

test('map asset migration preserves bytes and metadata, is repeatable, and preflights collisions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vltk-map-migration-'));
  const source = path.join(root, 'src/client/maps/content/2');
  const target = path.join(root, 'public/app/maps/content/2');
  try {
    fs.mkdirSync(path.join(source, 'assets'), { recursive:true });
    fs.mkdirSync(path.join(target, 'assets'), { recursive:true });
    fs.writeFileSync(path.join(source, 'map.json'), '{"image":"./assets/ground.jpg"}');
    fs.writeFileSync(path.join(source, 'assets/ground.jpg'), 'original');
    fs.writeFileSync(path.join(target, 'assets/ground.jpg'), 'collision');
    fs.writeFileSync(path.join(source, 'assets/tree.png'), 'tree');
    assert.throws(() => migrateMapAssets(root), /collision/);
    assert.equal(fs.readFileSync(path.join(source, 'assets/tree.png'), 'utf8'), 'tree');
    fs.writeFileSync(path.join(target, 'assets/ground.jpg'), 'original');
    migrateMapAssets(root);
    migrateMapAssets(root);
    assert.equal(fs.readFileSync(path.join(target, 'assets/ground.jpg'), 'utf8'), 'original');
    assert.equal(fs.readFileSync(path.join(target, 'assets/tree.png'), 'utf8'), 'tree');
    assert.equal(fs.readFileSync(path.join(source, 'map.json'), 'utf8'), '{"image":"./assets/ground.jpg"}');
    assert.equal(fs.existsSync(path.join(source, 'assets/ground.jpg')), false);
  } finally { fs.rmSync(root, { recursive:true, force:true }); }
});
