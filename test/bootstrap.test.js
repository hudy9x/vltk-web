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
    location:{ search,reload(){sandbox.reloads++;} }, reloads:0, nodes:new Map(), URLSearchParams, loadedScripts:[],
    setInterval:() => {}, setTimeout, clearTimeout, console:{ error:() => {} }, addEventListener:() => {},
    fetch:(url,options) => {
      if (failWrites && url === '/api/storage' && options?.method === 'POST') return Promise.reject(new Error('Network disconnected'));
      return fetch(base+url,{ ...options, headers:{ ...options?.headers, cookie } });
    },
    document:{
      createElement:() => ({style:{},hidden:false,children:[],setAttribute(){},focus(){},append(...items){this.children.push(...items);},appendChild(item){this.children.push(item);},remove(){sandbox.nodes.delete(this.id);}}),
      body:{ appendChild:element => { if(element.id)sandbox.nodes.set(element.id,element); if (element.src) { sandbox.loadedScripts.push(element.src); queueMicrotask(() => element.onload()); } } },
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
    assert.deepEqual(Array.from(reloaded.loadedScripts),['data.js?v=622','setvi.js?v=622','jxlook.js?v=622','app/game.js?v=622']);
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
    assert.deepEqual(Array.from(legacyUrl.loadedScripts),['data.js?v=622','setvi.js?v=622','jxlook.js?v=622','app/game.js?v=622']);
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

test('autosave safely retries the same batch after the server committed but its response was lost', async () => {
  const db = openDatabase(':memory:');
  const { app, server } = createServer({ db, downloadAssets:false });
  await app.ready();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const nativeFetch = globalThis.fetch;
  try {
    const client = await boot(base, new Map());
    const batches = [];
    globalThis.fetch = async (url, options) => {
      const response = await nativeFetch(url, options);
      if (url === base + '/api/storage' && options?.method === 'POST') {
        batches.push(JSON.parse(options.body));
        if (batches.length === 1) throw new TypeError('Failed to fetch');
      }
      return response;
    };
    client.localStorage.setItem('jxidle', 'saved-after-disconnect');
    await client.localGameStorage.flush();
    assert.equal(batches.length, 2);
    assert.equal(batches[0].id, batches[1].id);
    assert.equal(client.localGameStorage.pending, 0);
    assert.equal(snapshot(db).entries.jxidle, 'saved-after-disconnect');
    assert.equal(db.prepare('SELECT count(*) AS n FROM account_batches WHERE id=?').get(batches[0].id).n, 1);
  } finally { globalThis.fetch = nativeFetch; await app.close(); db.close(); }
});

test('bootstrap reports the failing API endpoint and bounds retries', async () => {
  for (const kind of ['network', 'gateway', 'html']) {
    let calls = 0;
    const status = { style:{} };
    class Storage {}
    const sandbox = { Storage, localStorage:{}, AbortSignal, console:{ error:() => {} },
      document:{ createElement:() => status, body:{ appendChild:() => {} } },
      fetch:async () => {
        calls++;
        if (kind === 'network') throw new TypeError('Failed to fetch');
        return kind === 'gateway' ? new Response('{}', { status:503 }) : new Response('<html>');
      } };
    sandbox.window = sandbox;
    await vm.runInNewContext(source, sandbox);
    assert.equal(calls, kind === 'html' ? 1 : 2);
    assert.match(status.textContent, /Không thể mở game: \/api\/config:/);
    assert.match(status.textContent, kind === 'html' ? /JSON/ : kind === 'gateway' ? /503/ : /Failed to fetch/);
  }
});

test('canonical progression is loaded before game scripts so stale local levels cannot choose a high-level map',async()=>{
  const previousControl=process.env.MULTIPLAYER_WT_CONTROL_URL,previousSecret=process.env.MULTIPLAYER_SECRET;
  process.env.MULTIPLAYER_WT_CONTROL_URL='http://127.0.0.1:1';process.env.MULTIPLAYER_SECRET='test-progression-secret-0123456789';
  const db=openDatabase(':memory:'),{app,server}=createServer({db,downloadAssets:false});
  await app.ready();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const registered=await fetch(base+'/api/auth/register',{method:'POST',body:JSON.stringify({username:'test_user',password:'secret123'})});
    const account=(await registered.json()).user.id;
    const stale={fac:'shaolin',lvl:150,attrPts:0,skPts:0,sk:{10:20},attr:{str:500},stage:700,maxStage:700};
    db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify(stale));
    const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
    createCharacters(db).read(account,0);
    db.prepare('UPDATE multiplayer_characters SET profile=?,revision=1 WHERE account=?').run(JSON.stringify({...stale,lvl:1,fac:'vo0',sk:{},attr:{str:0},attrPts:0,skPts:1}),account);
    const values=new Map(),client=await boot(base,values);
    const loaded=JSON.parse(client.localStorage.getItem('jxidle'));
    assert.equal(loaded.lvl,1);assert.equal(loaded.fac,'vo0');assert.deepEqual(loaded.sk,{});assert.equal(loaded.attr.str,0);
    assert.ok(client.loadedScripts.includes('app/game.js?v=622'));
  }finally{await app.close();db.close();if(previousControl===undefined)delete process.env.MULTIPLAYER_WT_CONTROL_URL;else process.env.MULTIPLAYER_WT_CONTROL_URL=previousControl;if(previousSecret===undefined)delete process.env.MULTIPLAYER_SECRET;else process.env.MULTIPLAYER_SECRET=previousSecret;}
});


test('disconnect dialog waits for both storage and combat recovery and reload button reloads the browser',async()=>{
  const db=openDatabase(':memory:'),{app,server}=createServer({db,downloadAssets:false});await app.ready();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const client=await boot(`http://127.0.0.1:${server.address().port}`,new Map());
    client.localGameConnection.set('combat',true);client.localGameConnection.set('storage',true);
    const panel=client.nodes.get('serverDisconnect');assert.ok(panel);const reload=panel.children[0].children[2];assert.equal(reload.textContent,'Tải lại');reload.onclick();assert.equal(client.reloads,1);
    client.localGameConnection.set('combat',false);assert.ok(client.nodes.has('serverDisconnect'));
    client.localGameConnection.set('storage',false);assert.equal(client.nodes.has('serverDisconnect'),false);
  }finally{await app.close();db.close();}
});

test('real bootstrap reload restores full newbie progression from server despite a stale or empty browser cache',async()=>{
 const oldControl=process.env.MULTIPLAYER_WT_CONTROL_URL,oldSecret=process.env.MULTIPLAYER_SECRET;
 process.env.MULTIPLAYER_WT_CONTROL_URL='http://127.0.0.1:1';process.env.MULTIPLAYER_SECRET='test-progression-secret-0123456789';
 const db=openDatabase(':memory:'),{app,server}=createServer({db,downloadAssets:false});await app.ready();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const registration=await fetch(base+'/api/auth/register',{method:'POST',body:JSON.stringify({username:'test_user',password:'secret123'})}),account=(await registration.json()).user.id;
  const stale={fac:'vo0',lvl:1,inv:[],gold:100000};db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify(stale));
  const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts'),store=createCharacters(db);let id=0;
  const act=action=>store.mutate(account,0,'reload-browser-'+ ++id,action,false,'development').profile;
  act({kind:'specialItemBuy',item:'newbie_token'});act({kind:'newbie',action:'level150'});act({kind:'newbie',action:'join',value:'shaolin'});
  for(const action of ['learn90','learn120','learn150','max90','potential','gold','knb','warMerit','xp','chest'])act({kind:'newbie',action});
  act({kind:'potential',key:'str',amount:10});let expected=act({kind:'equipmentTrader',operation:'rings'});
  for(const item of expected.inv.slice(-2))expected=act({kind:'equip',uid:item.uid});
  for(const values of [new Map(),new Map([['jxidle',JSON.stringify(stale)]])]){
   const client=await boot(base,values),loaded=JSON.parse(client.localStorage.getItem('jxidle'));
   for(const key of ['lvl','xp','gold','knb','attrPts','skPts','attr','sk','skL','bkOk','inv','eq','fac','uid','mats','specialPurchases'])assert.deepEqual(loaded[key],expected[key],key+' must load from canonical server state');
  }
 }finally{await app.close();db.close();if(oldControl===undefined)delete process.env.MULTIPLAYER_WT_CONTROL_URL;else process.env.MULTIPLAYER_WT_CONTROL_URL=oldControl;if(oldSecret===undefined)delete process.env.MULTIPLAYER_SECRET;else process.env.MULTIPLAYER_SECRET=oldSecret;}
});
