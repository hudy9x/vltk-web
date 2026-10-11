const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { openDatabase, snapshot, reset } = require('../server/database');
const { createServer } = require('../server');
const source = fs.readFileSync(path.join(__dirname,'../client/bootstrap.js'),'utf8');
const OUTBOX = '__volam_sqlite_outbox';
async function boot(base, values, { failWrites = false } = {}) {
  class Storage {
    getItem(key) { return values.get(String(key)) ?? null; }
    setItem(key,value) { values.set(String(key),String(value)); }
    removeItem(key) { values.delete(String(key)); }
    clear() { values.clear(); }
  }
  const storage = new Proxy(new Storage(), { ownKeys:() => [...values.keys()], getOwnPropertyDescriptor:() => ({ enumerable:true,configurable:true }) });
  const sandbox = {
    Storage, localStorage:storage, crypto:{ randomUUID }, AbortSignal,
    setInterval:() => {}, console:{ error:() => {} }, addEventListener:() => {},
    fetch:(url,options) => {
      if (failWrites && url === '/api/storage' && options?.method === 'POST') return Promise.reject(new Error('Network disconnected'));
      return fetch(base+url,options);
    },
    document:{
      createElement:() => ({ style:{}, hidden:false }),
      body:{ appendChild:element => { if (element.src) queueMicrotask(() => element.onload()); } },
      addEventListener:() => {}
    }
  };
  sandbox.window = sandbox;
  await vm.runInNewContext(source, sandbox);
  assert.ok(sandbox.localGameStorage, 'bootstrap must finish before starting the game');
  return sandbox;
}
test('browser outbox survives interrupted writes and reload; SQLite reset rejects old browser saves', async () => {
  const db = openDatabase(':memory:');
  const { server } = createServer({ db, downloadAssets:false });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const values = new Map([['jxidle','{"name":"Imported"}'],['unrelated','keep']]);
  try {
    const offline = await boot(base,values,{ failWrites:true });
    assert.equal(snapshot(db).entries.jxidle,'{"name":"Imported"}');
    offline.localStorage.setItem('jxidle','{"name":"Updated"}');
    offline.localStorage.setItem('jxidle_bak','{"name":"Imported"}');
    assert.equal(JSON.parse(values.get(OUTBOX)).queue.length,2);
    assert.equal(snapshot(db).entries.jxidle,'{"name":"Imported"}');
    const reloaded = await boot(base,values);
    assert.equal(snapshot(db).entries.jxidle,'{"name":"Updated"}');
    assert.equal(snapshot(db).entries.jxidle_bak,'{"name":"Imported"}');
    assert.equal(reloaded.localStorage.getItem('jxidle'),' {"name":"Updated"}'.trim());
    assert.equal(JSON.parse(values.get(OUTBOX)).queue.length,0);
    assert.equal(values.get('unrelated'),'keep');
    const generation = snapshot(db).generation;
    values.set(OUTBOX,JSON.stringify({ generation,queue:[{ id:'old-batch',generation,operations:[{ key:'jxidle',value:'stale' }] }] }));
    reset(db);
    const clean = await boot(base,values);
    assert.equal(clean.localStorage.getItem('jxidle'),null);
    assert.equal(values.get('unrelated'),'keep');
    assert.deepEqual(snapshot(db).entries,{});
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});
