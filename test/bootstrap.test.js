const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { openDatabase, reset } = require('../src/server/database.ts');
const { createServer } = require('../src/server/index.ts');
const source = fs.readFileSync(path.join(__dirname,'../src/client/bootstrap.js'),'utf8');
const { accountSnapshot: snapshot } = require('./helpers/accounts.js');
const OUTBOX = '__volam_sqlite_outbox';
async function boot(base, values, { failWrites = false, search = '' } = {}) {
  const authResponse = await fetch(base + '/api/auth/login', { method:'POST', body:JSON.stringify({ username:'test_user', password:'secret123' }) });
  const response = authResponse.ok ? authResponse : await fetch(base + '/api/auth/register', { method:'POST', body:JSON.stringify({ username:'test_user', password:'secret123' }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  class Storage {
    getItem(key) { return values.get(String(key)) ?? null; }
    setItem(key,value) { values.set(String(key),String(value)); }
    removeItem(key) { values.delete(String(key)); }
    clear() { values.clear(); }
  }
  const storage = new Proxy(new Storage(), { ownKeys:() => [...values.keys()], getOwnPropertyDescriptor:() => ({ enumerable:true,configurable:true }) });
  const sandbox = {
    Storage, localStorage:storage, sessionStorage:new Storage(), crypto:{ randomUUID }, AbortSignal,
    location:{ search }, URLSearchParams, loadedScripts:[],
    setInterval:() => {}, console:{ error:() => {} }, addEventListener:() => {},
    fetch:(url,options) => {
      if (failWrites && url === '/api/storage' && options?.method === 'POST') return Promise.reject(new Error('Network disconnected'));
      return fetch(base+url,{ ...options, headers:{ ...options?.headers, cookie } });
    },
    document:{
      createElement:() => ({ style:{}, hidden:false }),
      body:{ appendChild:element => { if (element.src) { sandbox.loadedScripts.push(element.src); queueMicrotask(() => element.onload()); } } },
      addEventListener:() => {}
    }
  };
  sandbox.window = sandbox;
  await vm.runInNewContext(source, sandbox);
  assert.ok(sandbox.localGameStorage, 'bootstrap must finish before starting the game');
  return sandbox;
}
test('flush waits for an already running SQLite write and drains later queued saves', async () => {
  const db = openDatabase(':memory:');
  const { app, server } = createServer({ db, downloadAssets:false });
  await app.ready();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const nativeFetch = globalThis.fetch;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  try {
    const client = await boot(base, new Map());
    globalThis.fetch = async (url, options) => {
      if (url === base + '/api/storage' && options?.method === 'POST') await gate;
      return nativeFetch(url, options);
    };
    client.localStorage.setItem('jxidle', 'first');
    client.localStorage.setItem('jxidle', 'latest');
    let finished = false;
    const flush = client.localGameStorage.flush().then(() => { finished = true; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(finished, false, 'navigation must wait for the active autosave');
    release();
    await flush;
    assert.equal(client.localGameStorage.pending, 0);
    assert.equal(snapshot(db).entries.jxidle, 'latest');
  } finally {
    release();
    globalThis.fetch = nativeFetch;
    await app.close(); db.close();
  }
});
test('browser outbox survives interrupted writes and reload; SQLite reset rejects old browser saves', async () => {
  const db = openDatabase(':memory:');
  const { app, server } = createServer({ db, downloadAssets:false });
  await app.ready();
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
    assert.deepEqual(Array.from(reloaded.loadedScripts),['data.js?v=622','setvi.js?v=622','app/game.js?v=622']);
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
    const legacyUrl = await boot(base,values,{ search:'?backup=1' });
    assert.deepEqual(Array.from(legacyUrl.loadedScripts),['data.js?v=622','setvi.js?v=622','app/game.js?v=622']);
  } finally { await app.close(); db.close(); }
});

test('recruitment settings are written to SQLite, restored in a fresh browser, and isolated by character slot', async () => {
  const { compileTypeScriptEntry } = require('../tools/build-app');
  const scope = {};
  vm.runInNewContext(compileTypeScriptEntry('simulator/battlefield-settings.ts', 'Settings').code, scope);
  const { createBattlefieldSettingsStore } = scope.Settings;
  const db = openDatabase(':memory:');
  const { app, server } = createServer({ db, downloadAssets:false });
  await app.ready();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const settings = { version:1, fields:{ 'redeployment':'60', 'soldier-appearance':'45', 'soldier-soldier-count':'0', 'soldier-soldier-hp':'50000', 'soldier-marshal-hp':'200000', 'soldier-commander-skill-0':'11', 'soldier-commander-patrol':'250', 'prefer-pk':true, map:'9002' }, ratios:{ song:{shaolin:100}, jin:{wudang:100} } };
  try {
    const first = await boot(base, new Map());
    first.localStorage.setItem('jxidle_slot', '0');
    const store = createBattlefieldSettingsStore(first.localStorage);
    store.save(settings);
    await first.localGameStorage.flush();
    assert.deepEqual(JSON.parse(snapshot(db).entries.jxidle_battlefield_settings_0), settings);
    // No local cache: the second browser obtains settings from the database.
    const fresh = await boot(base, new Map());
    fresh.localStorage.setItem('jxidle_slot', '0');
    const restored = createBattlefieldSettingsStore(fresh.localStorage);
    assert.equal(JSON.stringify(restored.load()), JSON.stringify(settings));
    fresh.localStorage.setItem('jxidle_slot', '1');
    assert.equal(restored.load(), null);
    restored.save({ ...settings, fields:{map:'9001'} });
    await fresh.localGameStorage.flush();
    fresh.localStorage.setItem('jxidle_slot', '0');
    assert.equal(restored.load().fields.map, '9002');
    assert.equal(JSON.parse(snapshot(db).entries.jxidle_battlefield_settings_1).fields.map, '9001');
  } finally { await app.close(); db.close(); }
});
