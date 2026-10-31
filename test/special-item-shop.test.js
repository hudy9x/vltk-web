const {test}=require('node:test'),assert=require('node:assert/strict');
const progression=require('../src/server/multiplayer/definitions/progression.cjs');
const base=()=>({fac:'vo0',lvl:1,inv:[],gold:100000});
const buy=p=>progression.apply(p,{kind:'specialItemBuy',item:'newbie_token'},false,'development');
test('special merchant sells exactly one token for 100000 silver with no GM permission',()=>{
 const p=buy(base());assert.equal(p.gold,0);assert.equal(p.inv.length,1);assert.equal(p.inv[0].ktc.k,'newbie_token');assert.equal(p.inv[0].ktc.c,1);assert.equal(p.inv[0].lock,true);assert.equal(p.specialPurchases.newbie_token,1);
 assert.throws(()=>buy({...p,gold:200000}),/chỉ được mua 1/);
 assert.throws(()=>buy({...p,inv:[],gold:200000}),/chỉ được mua 1/);
});
test('free starter token blocks duplicates, failed purchases charge nothing and forged offers are rejected',()=>{
 const native=require('../src/server/multiplayer/definitions/runtime.cjs');
 const p=native.withProgression({fac:'vo0',lvl:1,gold:100000},s=>structuredClone(s.o));assert.throws(()=>buy(p),/đã có/);assert.equal(p.gold,100000);
 const poor={...base(),gold:99999},before=structuredClone(poor);assert.throws(()=>buy(poor),/10 vạn/);assert.deepEqual(poor,before);
 const full={...base(),inv:Array.from({length:200},(_,i)=>({uid:i+2,ktc:{k:'other',c:1}}))};assert.throws(()=>buy(full),/đầy/);assert.equal(full.gold,100000);
 assert.throws(()=>progression.apply(base(),{kind:'specialItemBuy',item:'gm_hk_shaolin'}),/không được bán/);
});
test('purchase limit survives element reset, profile reload and idempotent retries',()=>{
 const {DatabaseSync}=require('node:sqlite'),{createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('one','jxidle',JSON.stringify(base()));const store=createCharacters(db),action={kind:'specialItemBuy',item:'newbie_token'};
  const first=store.mutate('one',0,'special-first-purchase',action,false,'development');assert.deepEqual(store.mutate('one',0,'special-first-purchase',action,false,'development'),first);
  assert.equal(createCharacters(db).read('one',0).profile.specialPurchases.newbie_token,1);
  const reset=progression.apply(first.profile,{kind:'newbie',action:'element',value:1});assert.equal(reset.specialPurchases.newbie_token,1);
  assert.throws(()=>buy({...reset,inv:[],gold:200000}),/chỉ được mua 1/);
 }finally{db.close();}
});
