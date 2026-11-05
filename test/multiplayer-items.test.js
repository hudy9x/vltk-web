const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const monster={tid:11,level:20,cls:'boss',map:140,scene:'dg:dvc',x:200,y:200};
function fixture(file=':memory:'){
 const db=new DatabaseSync(file);db.exec('CREATE TABLE IF NOT EXISTS account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
 for(const [account,slot]of [['one',0],['one',1],['two',0]])db.prepare('INSERT OR IGNORE INTO account_storage VALUES(?,?,?)').run(account,slot?'jxidle_2':'jxidle',JSON.stringify({fac:'shaolin',lvl:150,autoJunk:false,attr:{str:1000,dex:1000,vit:1000,eng:1000}}));
 const store=createCharacters(db);let sequence=0;
 return {db,store,act:(action,account='one',slot=0,id='item-command-'+ ++sequence)=>store.mutate(account,slot,id,action,true).profile};
}
test('real native monster rolls can be picked, equipped, deposited and withdrawn across SQLite restart and stale browser saves',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'vltk-items-')),file=path.join(dir,'game.sqlite');let f=fixture(file);
 try{
  let p=f.act({kind:'lootDrop',monster});assert.ok(p.itemDrops.length>=3);
  const drop=p.itemDrops[0],expected=structuredClone(drop.it),dropIds=p.itemDrops.map(d=>d.id);
  p=f.act({kind:'lootPickup',dropId:drop.id},'one',0,'pickup-exact-once');assert.deepEqual(p.inv.find(it=>it.uid===expected.uid),expected);
  assert.deepEqual(f.act({kind:'lootPickup',dropId:drop.id},'one',0,'pickup-exact-once'),p,'retry never duplicates');
  assert.throws(()=>f.act({kind:'lootPickup',dropId:drop.id}),/không còn/);
  // The very same server-generated UID is accepted by the real native equip rules.
  p=f.act({kind:'equip',uid:expected.uid});assert.ok(Object.values(p.eq).some(it=>it.uid===expected.uid));
  const slot=Object.entries(p.eq).find(([,it])=>it.uid===expected.uid)[0];p=f.act({kind:'unequip',slot});
  p=f.act({kind:'stashDeposit',uids:[expected.uid]},'one',0,'deposit-exact-once');
  assert.ok(!p.inv.some(it=>it.uid===expected.uid));assert.equal(p.itemStash.items.length,1);
  f.act({kind:'stashDeposit',uids:[expected.uid]},'one',0,'deposit-exact-once');assert.equal(f.store.read('one',1).profile.itemStash.items.length,1);
  assert.equal(f.store.read('two',0).profile.itemStash.items.length,0);
  assert.throws(()=>f.act({kind:'stashWithdraw',stashId:p.itemStash.items[0].stashId},'two'),/không còn/);
  // Replaying browser saves cannot replace either canonical location.
  f.db.prepare('UPDATE account_storage SET value=? WHERE account_id=?').run(JSON.stringify({fac:'shaolin',lvl:150,inv:[],items:[]}), 'one');
  f.db.close();f=fixture(file);p=f.store.read('one',0).profile;
  assert.deepEqual(p.itemStash.items[0].mag,expected.mag);assert.deepEqual(p.itemDrops.map(d=>d.id),dropIds.slice(1));
  const stashId=p.itemStash.items[0].stashId;
  let other=f.act({kind:'stashWithdraw',stashId},'one',1,'withdraw-exact-once');
  const taken=other.inv.find(it=>it.n===expected.n);assert.ok(taken);assert.deepEqual(taken.mag,expected.mag);
  other=f.act({kind:'stashWithdraw',stashId},'one',1,'withdraw-exact-once');assert.equal(other.inv.filter(it=>it.n===expected.n).length,1);
  assert.equal(f.store.read('one',0).profile.itemStash.items.length,0);
  f.db.close();f=fixture(file);assert.deepEqual(f.store.read('one',1).profile.inv,other.inv);
 }finally{f.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('full inventory/stash and forged UIDs roll back without consuming ground items or equipment',()=>{
 const f=fixture();try{
  let p=f.act({kind:'lootDrop',monster});const drop=p.itemDrops[0];
  const limit=native.withProgression(p,s=>s.INV_MAX);
  p.inv=Array.from({length:limit},(_,i)=>({...drop.it,uid:1000+i}));p.uid=2000;
  f.db.prepare('UPDATE multiplayer_characters SET profile=? WHERE account=? AND slot=0').run(JSON.stringify(p),'one');
  const before=f.store.read('one',0);
  assert.throws(()=>f.act({kind:'lootPickup',dropId:drop.id}),/đầy/);assert.deepEqual(f.store.read('one',0),before);
  assert.throws(()=>f.act({kind:'stashDeposit',uids:[99999]}),/sở hữu/);assert.deepEqual(f.store.read('one',0),before);
  assert.throws(()=>f.act({kind:'stashDeposit',uids:[1000,1000]}),/hợp lệ/);
  const stash=f.store.read('one',0).profile.itemStash;stash.items=Array.from({length:60},(_,i)=>({...drop.it,stashId:'full-'+i}));
  f.db.prepare('UPDATE multiplayer_stashes SET data=? WHERE account=?').run(JSON.stringify(stash),'one');
  const full=f.store.read('one',0);
  assert.throws(()=>f.act({kind:'stashDeposit',uids:[1000]}),/Kho đầy/);assert.deepEqual(f.store.read('one',0),full);
  assert.throws(()=>f.act({kind:'stashWithdraw',stashId:'full-0'}),/Hành trang đầy/);assert.deepEqual(f.store.read('one',0),full);
 }finally{f.db.close();}
});
test('durable Rust death receipts roll equipment once and cannot be forged as progression commands in production',()=>{
 const f=fixture();try{
  const grant={id:'123-456-1-0',account:'one',slot:0,xp:5,gold:0,monsterLoot:{...monster,scene:'map:140'}};
  f.store.apply(grant);const before=f.store.read('one',0);assert.ok(before.profile.itemDrops.length>=3);
  assert.ok(before.profile.itemDrops.every(d=>d.source==='world'));
  f.store.apply(grant);assert.deepEqual(f.store.read('one',0),before);
  assert.throws(()=>f.store.mutate('one',0,'forged-loot-drop',{kind:'lootDrop',monster},false),{status:403});
  assert.throws(()=>f.act({kind:'lootPickup',dropId:before.profile.itemDrops[0].id},'two'),/không còn/);
 }finally{f.db.close();}
});

test('authenticated world pickups require a living owner near the drop; rejected attempts and retries never lose or duplicate it',async()=>{
 const {createServer:controlServer}=require('node:http'),{once}=require('node:events');
 const oldControl=process.env.MULTIPLAYER_WT_CONTROL_URL,oldSecret=process.env.MULTIPLAYER_SECRET;
 let position={map:999,x:200,y:200,alive:true,range:90};
 const control=controlServer(async(req,res)=>{for await(const chunk of req){}res.setHeader('content-type','application/json');res.end(JSON.stringify(req.url==='/loot/position'?position:req.url==='/refresh'?true:[]));});
 control.listen(0,'127.0.0.1');await once(control,'listening');
 process.env.MULTIPLAYER_WT_CONTROL_URL=`http://127.0.0.1:${control.address().port}`;process.env.MULTIPLAYER_SECRET='loot-api-test-secret-0123456789012345';
 const {openDatabase}=require('../src/server/database.ts'),{createServer}=require('../src/server/index.ts');
 const db=openDatabase(':memory:'),{app}=createServer({db,downloadAssets:false,development:false});
 try{
  const register=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'loot_api_user',password:'secret123'}});
  const account=register.json().user.id,cookie=register.headers['set-cookie'].split(';')[0];
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify({fac:'shaolin',lvl:150}));
  const store=createCharacters(db);store.apply({id:'999-1-1-0',account,slot:0,xp:0,gold:0,monsterLoot:monster});
  const drop=store.read(account,0).profile.itemDrops[0];
  const payload={slot:0,id:'http-loot-pickup',action:{kind:'lootPickup',dropId:drop.id}};
  const call=()=>app.inject({method:'POST',url:'/api/multiplayer/progression',headers:{cookie},payload});
  assert.equal((await app.inject({method:'POST',url:'/api/multiplayer/progression',payload})).statusCode,401);
  assert.equal((await call()).statusCode,400,'wrong map');
  position={...position,map:monster.map,x:1000};assert.equal((await call()).statusCode,400,'too far');
  position={...position,x:200,alive:false};assert.equal((await call()).statusCode,400,'dead');
  assert.ok(store.read(account,0).profile.itemDrops.some(d=>d.id===drop.id));
  position.alive=true;
  const first=await call();assert.equal(first.statusCode,200,first.body);assert.deepEqual(first.json().profile.inv[0],drop.it);
  const replay=await call();assert.equal(replay.statusCode,200);assert.equal(replay.json().revision,first.json().revision);assert.equal(replay.json().profile.inv.filter(it=>it.uid===drop.it.uid).length,1);
  const forged=await app.inject({method:'POST',url:'/api/multiplayer/progression',headers:{cookie},payload:{slot:0,id:'http-forged-drop',action:{kind:'lootDrop',monster}}});assert.equal(forged.statusCode,403);
  const deposit=await app.inject({method:'POST',url:'/api/multiplayer/progression',headers:{cookie},payload:{slot:0,id:'http-stash-deposit',action:{kind:'stashDeposit',uids:[drop.it.uid]}}});
  assert.equal(deposit.statusCode,200,deposit.body);assert.equal(deposit.json().profile.itemStash.items.length,1);assert.ok(!deposit.json().profile.inv.some(it=>it.uid===drop.it.uid));
  const reloaded=(await app.inject({url:'/api/multiplayer/character?slot=0',headers:{cookie}})).json();assert.deepEqual(reloaded.profile.itemStash,deposit.json().profile.itemStash);
 }finally{
  await app.close();db.close();await new Promise(resolve=>control.close(resolve));
  if(oldControl===undefined)delete process.env.MULTIPLAYER_WT_CONTROL_URL;else process.env.MULTIPLAYER_WT_CONTROL_URL=oldControl;
  if(oldSecret===undefined)delete process.env.MULTIPLAYER_SECRET;else process.env.MULTIPLAYER_SECRET=oldSecret;
 }
});
