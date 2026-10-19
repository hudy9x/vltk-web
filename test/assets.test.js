const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { createAssetCache, validBytes, isAssetPath } = require('../src/server/assets.ts');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII=','base64');

test('repair base64 images locally and redownload empty/corrupt files; cache concurrent requests', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(),'volam-assets-'));
  let downloads=0;
  const cache = createAssetCache({ root,fetchAsset:async () => { downloads++; return new Response(png); } });
  try {
    await fs.mkdir(path.join(root,'img'),{ recursive:true });
    await fs.writeFile(path.join(root,'img/encoded.png'),png.toString('base64'));
    assert.equal((await cache.ensure('img/encoded.png')).action,'repaired');
    assert.equal(downloads,0);
    assert.deepEqual(await fs.readFile(path.join(root,'img/encoded.png')),png);
    await fs.writeFile(path.join(root,'img/empty.png'),Buffer.alloc(0));
    await fs.writeFile(path.join(root,'img/corrupt.png'),'<html>not an image</html>');
    await Promise.all([cache.ensure('img/empty.png'),cache.ensure('img/empty.png'),cache.ensure('img/corrupt.png')]);
    assert.equal(downloads,2);
    assert.equal(cache.report().downloaded,2);
    assert.equal(cache.report().failures.length,0);
    assert.ok(validBytes('img/empty.png',await fs.readFile(path.join(root,'img/empty.png'))));
    assert.ok(isAssetPath('music/music210.mp3'));
    assert.ok(!isAssetPath('img/../database/game.sqlite'));
    assert.ok(!isAssetPath('img/.secret.png'));
  } finally { await fs.rm(root,{ recursive:true,force:true }); }
});

test('reject HTML disguised as an image and expose failures; allow retry after upstream recovers', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(),'volam-assets-'));
  let recovered=false;
  const cache = createAssetCache({ root,fetchAsset:async () => new Response(recovered ? png : '<!doctype html>') });
  try {
    await assert.rejects(cache.ensure('img/test.png'),{ status:502 });
    await assert.rejects(fs.stat(path.join(root,'img/test.png')),{ code:'ENOENT' });
    assert.equal(cache.report().failures[0].path,'img/test.png');
    recovered=true;
    await cache.ensure('img/test.png');
    assert.equal(cache.report().failures.length,0);
    assert.deepEqual(await fs.readFile(path.join(root,'img/test.png')),png);
  } finally { await fs.rm(root,{ recursive:true,force:true }); }
});
