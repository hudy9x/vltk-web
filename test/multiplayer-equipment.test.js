const {test}=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
const progression=require('../src/server/multiplayer/definitions/progression.cjs');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
const base={fac:'shaolin',lvl:150,knb:100,gold:1000000000,attr:{str:1000,dex:1000,vit:1000,eng:1000}};
function fixture(profile=base){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('one','jxidle',JSON.stringify(profile));const store=createCharacters(db);let seq=0;return {db,store,act:action=>store.mutate('one',0,'equipment-'+ ++seq,action,false).profile};}
function selection(d=5){return native.withProgression(base,s=>{const item=s.equipmentTrader.blueCatalog(0,10).find(t=>t.d===d);return {kind:'blue',sex:0,level:10,item:item.key,series:0,lines:s.equipmentTrader.affixes(item,0,0).filter(a=>a.a===111).map(a=>a.a)};});}
test('NPC equipment, horse, worn slots and UIDs survive reload; retries do not duplicate or charge twice',()=>{
 const {db,store,act}=fixture();try{
  let p=act({kind:'equipmentTrader',operation:'rings'});assert.equal(p.inv.length,2);
  for(const item of p.inv)p=act({kind:'equip',uid:item.uid});assert.ok(p.eq.ring1&&p.eq.ring2);
  const action={kind:'horseBuy',offer:'0:10'};const a=store.mutate('one',0,'buy-horse-once',action,false);store.mutate('one',0,'buy-horse-once',action,false);
  assert.equal(a.profile.knb,90);p=act({kind:'equip',uid:a.profile.inv[0].uid});
  p=act({kind:'mount',enabled:true});assert.equal(p.onlineMounted,true);
  const before=structuredClone(p);assert.deepEqual(createCharacters(db).read('one',0).profile,before);
  p=act({kind:'unequip',slot:'horse'});assert.equal(p.onlineMounted,false);assert.equal(p.inv[0].uid,before.eq.horse.uid);
  assert.ok(p.uid>Math.max(...p.inv.map(t=>t.uid),...Object.values(p.eq).map(t=>t.uid)));
 }finally{db.close();}
});
test('boots and mounted horse increase actual authoritative distance speed, not only sprite frames',()=>{
 let p=structuredClone(base);const foot=catalog.character(p).speed;
 const sel=selection();assert.equal(sel.lines.length,1);
 p=progression.apply(p,{kind:'equipmentTrader',operation:'item',selection:sel});p=progression.apply(p,{kind:'equip',uid:p.inv[0].uid});const boots=catalog.character(p).speed;
 assert.ok(boots>foot,`${boots} > ${foot}`);
 p=progression.apply(p,{kind:'horseBuy',offer:'0:10'});p=progression.apply(p,{kind:'equip',uid:p.inv[0].uid});assert.equal(catalog.character(p).speed,boots);
 p=progression.apply(p,{kind:'mount',enabled:true});assert.ok(catalog.character(p).speed>boots);assert.equal(catalog.character(p).speed,native.buildCharacter(p).moveSpeed);
 assert.equal(catalog.character({...p,onlineMounted:false}).speed,boots);
});
test('all wearable categories are resolved from native NPC catalogs and persist independently',()=>{
 const {db,store,act}=fixture();try{
  for(const d of [0,2,7,4,6,8,5,9,3]){
   const sel=native.withProgression(base,s=>{const item=s.equipmentTrader.blueCatalog(0,1).find(t=>t.d===d);return {kind:'blue',sex:0,level:1,item:item.key,series:0,lines:[s.equipmentTrader.affixes(item,0,0)[0].a]};});
   let p=act({kind:'equipmentTrader',operation:'item',selection:sel});const item=p.inv.at(-1);p=act({kind:'equip',uid:item.uid});assert.ok(Object.values(p.eq).some(t=>t.uid===item.uid));
  }
  assert.equal(Object.keys(createCharacters(db).read('one',0).profile.eq).length,9);
 }finally{db.close();}
});
test('invalid purchase, forged item/UID, wrong faction and insufficient funds are atomic',()=>{
 assert.throws(()=>progression.apply(base,{kind:'horseBuy',offer:'fake'}),/danh sách/);
 assert.throws(()=>progression.apply({...base,knb:9},{kind:'horseBuy',offer:'0:1'}),/KNB/);
 assert.throws(()=>progression.apply(base,{kind:'equip',uid:999}),/sở hữu/);
 assert.throws(()=>progression.apply(base,{kind:'mount',enabled:true}),/cưỡi/);
 assert.throws(()=>progression.apply(base,{kind:'equipmentTrader',operation:'item',selection:{kind:'blue',sex:0,level:10,item:'5:0',series:0,lines:[99999]}}),/hợp lệ/);
 let offer=native.withProgression(base,s=>({shop:'weapon',offer:s.S.shops.weapon.items.find(t=>t.g!==1)}));
 let p=progression.apply(base,{kind:'shopBuy',...offer});assert.ok(p.inv.length);assert.ok(p.gold<base.gold);
 assert.throws(()=>progression.apply({...base,gold:0},{kind:'shopBuy',...offer}),/ngân lượng/);
});

test('adding the exact equipment requirements equips immediately, persists and charges points once',()=>{
 const {db,store,act}=fixture({...base,attr:{str:0,dex:0,vit:0,eng:0},attrPts:745});
 try{
  const p=act({kind:'equipmentTrader',operation:'item',selection:selection()});
  const item=p.inv.find(t=>t.d===5),need=native.withProgression(p,s=>s.bt(item));
  const cost=Object.values(need).reduce((a,b)=>a+b,0);assert.ok(cost>0);
  assert.throws(()=>act({kind:'equip',uid:item.uid}),/điều kiện/);
  const action={kind:'equipWithPotential',uid:item.uid};
  const saved=store.mutate('one',0,'allocate-and-equip',action,false).profile;
  assert.equal(saved.eq.boot.uid,item.uid);assert.equal(saved.attrPts,p.attrPts-cost);
  for(const [key,amount]of Object.entries(need))assert.equal(saved.attr[key],p.attr[key]+amount);
  assert.deepEqual(store.mutate('one',0,'allocate-and-equip',action,false).profile,saved,'retry cannot spend points again');
  assert.deepEqual(createCharacters(db).read('one',0).profile,saved);
  const rejected={...p,attrPts:0};
  assert.throws(()=>progression.apply(rejected,action),/điểm tiềm năng/);
  assert.equal(rejected.attr.str,p.attr.str);assert.equal(rejected.inv[0].uid,p.inv[0].uid);
  const wrongSex={...p,sex:1};
  assert.throws(()=>progression.apply(wrongSex,action),/điều kiện/);
  assert.equal(wrongSex.attrPts,p.attrPts,'non-attribute requirements cannot spend points');
 }finally{db.close();}
});
