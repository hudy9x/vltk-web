const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
function fixture(jewels=0){
 const data=native.withProgression({fac:'shaolin',lvl:150,gold:100,autoJunk:true,lootF:{pickAll:false},attr:{str:1000,dex:1000,vit:1000,eng:1000}},s=>{
  function gear(d,level){const row=s.equipmentTrader.blueCatalog(0,level).find(it=>it.d===d),it=s.equipmentTrader.preview({kind:'blue',sex:0,level,item:row.key,series:0,lines:[s.equipmentTrader.affixes(row,0,0)[0].a]})[0];it.uid=s.o.uid++;delete it.lock;return it;}
  const worn=gear(5,10),weak=gear(5,1),incoming=gear(5,1);s.o.eq.boot=worn;
  const pendant=gear(9,10);s.o.eq[s.JA(pendant)]=pendant;
  const protectedItems=['lock','vio','plv','thanma','pack','ktc','set'].map(key=>{const it=gear(5,1);it[key]=key==='set'?{kind:'gold'}:key==='ktc'?{k:'newbie_token',c:1}:true;return it;});
  const jewelry=Array.from({length:jewels},()=>gear(9,1));
  s.o.inv=[weak,...protectedItems,...jewelry];
  s.o.itemDrops=[{id:'fixture-drop',it:incoming,source:'legacy',scene:'dg:dvc',x:100,y:100,expires:Date.now()+120000}];
  return {profile:s.o,weak,incoming,protectedUids:protectedItems.map(it=>it.uid),jewelryUids:jewelry.map(it=>it.uid),prices:{weak:s.x0(weak),incoming:s.x0(incoming)}};
 });
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
 db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('one','jxidle',JSON.stringify(data.profile));
 const store=createCharacters(db);let seq=0;
 return {...data,db,store,act:(action,id='auto-sell-'+ ++seq)=>store.mutate('one',0,id,action,true).profile};
}
test('native junk sweep keeps exactly six spare jewels rather than five',()=>{
 const f=fixture(7);try{
  const result=native.withProgression(f.profile,s=>{const count=s.Of();return {profile:s.o,count};});
  assert.equal(result.profile.inv.filter(it=>f.jewelryUids.includes(it.uid)).length,6);
 }finally{f.db.close();}
});
test('server auto-sell credits native prices once, preserves protected gear and survives reload',()=>{
 const f=fixture();try{
  const p=f.act({kind:'autoSell',autoJunk:true},'sell-once');
  assert.ok(!p.inv.some(it=>it.uid===f.weak.uid));assert.equal(p.gold,100+f.prices.weak);
  for(const uid of f.protectedUids)assert.ok(p.inv.some(it=>it.uid===uid));
  assert.equal(p.lastAutoSale.count,1);assert.equal(p.lastAutoSale.amount,f.prices.weak);
  assert.deepEqual(f.act({kind:'autoSell',autoJunk:true},'sell-once'),p);
  assert.deepEqual(createCharacters(f.db).read('one',0).profile,p);
 }finally{f.db.close();}
});
test('pickup sells eligible junk when enabled and retains the same item when disabled',()=>{
 for(const enabled of [false,true]){
  const f=fixture();try{
   const p=f.act({kind:'lootPickup',dropId:'fixture-drop',autoJunk:enabled},'pickup-auto-once');
   assert.equal(p.inv.some(it=>it.uid===f.incoming.uid),!enabled);
   assert.equal(p.gold,enabled?100+f.prices.weak+f.prices.incoming:100);
   assert.deepEqual(f.act({kind:'lootPickup',dropId:'fixture-drop',autoJunk:enabled},'pickup-auto-once'),p);
   assert.equal(p.itemDrops.length,0);
  }finally{f.db.close();}
 }
});
test('disabled auto-sell and malformed settings never remove equipment or change gold',()=>{
 const f=fixture();try{
  const p=f.act({kind:'autoSell',autoJunk:false});assert.deepEqual(p.inv,f.profile.inv);assert.equal(p.gold,100);
  for(const value of [null,1,'true',undefined])assert.throws(()=>f.act({kind:'autoSell',autoJunk:value}),/hợp lệ/);
  const reloaded=createCharacters(f.db).read('one',0).profile;assert.equal(reloaded.gold,100);assert.deepEqual(reloaded.inv,p.inv);
 }finally{f.db.close();}
});

test('server sweep preserves six jewels, and selling a full-bag drop needs no spare slot',()=>{
 const f=fixture(7);try{
  let p=f.act({kind:'autoSell',autoJunk:true});
  assert.equal(p.inv.filter(it=>f.jewelryUids.includes(it.uid)).length,6);
  const capacity=native.withProgression(p,s=>s.INV_MAX);
  p.inv=Array.from({length:capacity},(_,i)=>({...f.weak,uid:5000+i,lock:true}));
  f.db.prepare('UPDATE multiplayer_characters SET profile=? WHERE account=? AND slot=0').run(JSON.stringify(p),'one');
  const gold=p.gold;p=f.act({kind:'lootPickup',dropId:'fixture-drop',autoJunk:true});
  assert.equal(p.inv.length,capacity);assert.equal(p.gold,gold+f.prices.incoming);assert.equal(p.itemDrops.length,0);
 }finally{f.db.close();}
});
test('a sale that would overflow the safe balance rolls back both item removal and credit',()=>{
 const f=fixture();try{
  const p=f.store.read('one',0).profile;p.gold=Number.MAX_SAFE_INTEGER;
  f.db.prepare('UPDATE multiplayer_characters SET profile=? WHERE account=? AND slot=0').run(JSON.stringify(p),'one');
  const before=f.store.read('one',0);
  assert.throws(()=>f.act({kind:'autoSell',autoJunk:true}),/Số dư/);
  assert.deepEqual(f.store.read('one',0),before);
 }finally{f.db.close();}
});

test('manual bulk sale persists native prices and removals, independently of the auto-sell checkbox',()=>{
 const f=fixture();try{
  const before=f.act({kind:'inventoryAutomation',autoJunk:false});
  const action={kind:'itemSell',uids:[f.weak.uid],bulk:true};
  const sold=f.act(action,'manual-bulk-once');
  assert.equal(sold.autoJunk,false);assert.equal(sold.gold,before.gold+f.prices.weak);
  assert.ok(!sold.inv.some(it=>it.uid===f.weak.uid));
  assert.deepEqual(sold.inv.map(it=>it.uid),f.protectedUids);
  assert.deepEqual(f.act(action,'manual-bulk-once'),sold,'retries never credit gold twice');
  // A stale client save must not resurrect the sold item on reload.
  f.db.prepare('UPDATE account_storage SET value=? WHERE account_id=?').run(JSON.stringify(f.profile),'one');
  assert.deepEqual(createCharacters(f.db).read('one',0).profile,sold);
 }finally{f.db.close();}
});

test('manual single sale persists and rejects missing, duplicate, locked and protected UIDs atomically',()=>{
 const f=fixture();try{
  const before=f.store.read('one',0);
  const invalid=[
   {uids:[999999],bulk:false},{uids:[f.weak.uid,f.weak.uid],bulk:true},
   {uids:[],bulk:true},{uids:['1'],bulk:true},{uids:[f.weak.uid],bulk:'true'},
   ...f.protectedUids.map(uid=>({uids:[f.weak.uid,uid],bulk:true})),
   {uids:[f.protectedUids[0]],bulk:false},{uids:[f.protectedUids[5]],bulk:false},
   {uids:[f.weak.uid,f.protectedUids[1]],bulk:false},
  ];
  for(const action of invalid){
   assert.throws(()=>f.act({kind:'itemSell',...action}));
   assert.deepEqual(f.store.read('one',0),before);
  }
  const sold=f.act({kind:'itemSell',uids:[f.weak.uid],bulk:false},'manual-single-once');
  assert.equal(sold.gold,100+f.prices.weak);assert.ok(!sold.inv.some(it=>it.uid===f.weak.uid));
  assert.deepEqual(createCharacters(f.db).read('one',0).profile,sold);
 }finally{f.db.close();}
});

test('manual sale overflow rolls back item removal and checkbox settings survive server reload',()=>{
 const f=fixture();try{
  for(const enabled of [false,true,false]){
   const p=f.act({kind:'inventoryAutomation',autoJunk:enabled});
   assert.equal(createCharacters(f.db).read('one',0).profile.autoJunk,enabled);
   assert.equal(p.autoJunk,enabled);
  }
  const p=f.store.read('one',0).profile;p.gold=Number.MAX_SAFE_INTEGER;p.inv.push(f.incoming);
  f.db.prepare('UPDATE multiplayer_characters SET profile=? WHERE account=? AND slot=0').run(JSON.stringify(p),'one');
  const before=f.store.read('one',0);
  assert.throws(()=>f.act({kind:'itemSell',uids:[f.incoming.uid],bulk:true}),/Số dư/);
  assert.deepEqual(f.store.read('one',0),before);
 }finally{f.db.close();}
});

test('old-client pickup without automation settings retains the saved checkbox preference',()=>{
 const f=fixture();try{
  const p=f.act({kind:'lootPickup',dropId:'fixture-drop'});
  assert.equal(p.autoJunk,true);assert.ok(p.inv.some(it=>it.uid===f.incoming.uid));
  const sold=f.act({kind:'autoSell',autoJunk:true});
  assert.ok(!sold.inv.some(it=>it.uid===f.incoming.uid));
  assert.equal(sold.gold,100+f.prices.weak+f.prices.incoming);
 }finally{f.db.close();}
});
