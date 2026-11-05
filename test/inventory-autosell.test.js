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
