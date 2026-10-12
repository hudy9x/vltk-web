const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { openDatabase, snapshot, initialize, applyBatch, reset } = require('../server/database');
const { createServer } = require('../server');

test('save, shared stash and backup survive reopening SQLite; retries cannot overwrite newer saves', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'volam-sqlite-'));
  const filename = path.join(dir, 'game.sqlite');
  let db = openDatabase(filename);
  try {
    const save = JSON.stringify({ d:JSON.stringify({ name:'Test', lvl:12, fac:'vo0' }), h:'original-checksum' });
    const initial = initialize(db, { jxidle:save, jxidle_stash:'{"gold":123}', jxidle_bak:save });
    const first = { id:'first', generation:initial.generation, operations:[{ key:'jxidle_slot', value:'0' }] };
    applyBatch(db, first);
    applyBatch(db, { id:'second', generation:initial.generation, operations:[{ key:'jxidle_slot', value:'menu' }] });
    applyBatch(db, first); // replaying a completed older batch must do nothing
    db.close(); db = openDatabase(filename);
    const restored = snapshot(db);
    assert.equal(restored.entries.jxidle, save);
    assert.equal(restored.entries.jxidle_stash, '{"gold":123}');
    assert.equal(restored.entries.jxidle_bak, save);
    assert.equal(restored.entries.jxidle_slot, 'menu');
    assert.equal(db.prepare('SELECT name,level FROM characters').get().name, 'Test');
    assert.equal(db.prepare('SELECT name,level FROM characters').get().level, 12);
    reset(db);
    assert.throws(() => applyBatch(db, first), { status:409 });
    assert.deepEqual(initialize(db, { jxidle:save }).entries, {}); // reset must not re-import browser data
  } finally { db.close(); rmSync(dir, { recursive:true, force:true }); }
});

test('HTTP API persists changes and rejects invalid writes; private server/database files are not served', async () => {
  const db = openDatabase(':memory:');
  const { server } = createServer({ db, downloadAssets:false, development:false });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = value => ({ method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(value) });
  try {
    assert.deepEqual(await (await fetch(base+'/api/config?development=true')).json(), { development:false });
    const initial = await (await fetch(base+'/api/storage/init',post({ entries:{} }))).json();
    const batch = { id:'http-test', generation:initial.generation, operations:[{ key:'jxidle_2',value:'{"name":"Second","lvl":2,"fac":"vo1"}' }] };
    assert.equal((await fetch(base+'/api/storage',post(batch))).status,200);
    assert.equal((await (await fetch(base+'/api/storage')).json()).entries.jxidle_2, batch.operations[0].value);
    assert.equal((await fetch(base+'/api/storage',post({ ...batch,id:'invalid',operations:[{ key:'jxidle_auth',value:'token' }] }))).status,400);
    assert.equal((await fetch(base+'/api/storage', { ...post(batch),headers:{ 'Content-Type':'application/json',Origin:'https://example.org' } })).status,403);
    for (const file of ['database/game.sqlite','server/database.js','.git/config','tools/reset-db.js','app.js']) assert.equal((await fetch(base+'/'+file)).status,404);
    assert.match(await (await fetch(base+'/')).text(), /client\/bootstrap.js/);
    const bundle = await fetch(base+'/app/game.js?v=622');
    assert.equal(bundle.status,200);
    assert.match(await bundle.text(), /sourceMappingURL=game.js.map/);
    const sourceMap = await (await fetch(base+'/app/game.js.map')).json();
    assert.equal(sourceMap.version,3);
    for (const file of ['app/'+sourceMap.sources[0]]) {
      const response = await fetch(base+'/'+file);
      assert.equal(response.status,200);
      assert.ok((await response.text()).length > 0);
    }
    assert.equal((await fetch(base+'/img/missing-for-test.png')).status,404);
    assert.ok((await (await fetch(base+'/api/catalog')).json()).some(row => row.section === 'maps' && row.entries > 900));
    assert.equal((await fetch(base+'/api/storage',post({ ...batch,id:'remove',operations:[{ key:'jxidle_2',value:null }] }))).status,200);
    assert.equal((await (await fetch(base+'/api/storage')).json()).entries.jxidle_2,undefined);
    assert.equal((await fetch(base+'/api/storage',{ method:'POST',body:'{' })).status,400);
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});
