const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const progression=require('../src/server/multiplayer/definitions/progression.cjs');
const apply=(p,action,value)=>progression.apply(p,{kind:'newbie',action,value},false,'development');
const fresh=()=>native.withProgression({name:'Tân thủ',fac:'vo0',lvl:1},s=>structuredClone(s.o));
test('new characters receive one persistent token with the supplied icon and unique UID',()=>{
 const p=fresh(),token=p.inv.find(i=>i.ktc?.k==='newbie_token');
 assert.equal(p.inv.length,1);assert.equal(token.ktc.c,1);assert.equal(token.ic,'img/ep/newbie-token.png');assert.ok(p.uid>token.uid);
 const saved=apply(p,'potential');assert.equal(saved.inv.length,1);assert.equal(saved.inv[0].uid,token.uid);
 assert.equal(saved.attrPts,3000);
});
test('support requires ownership and rejects arbitrary GM operations; token cannot be quick sold',()=>{
 const p=fresh();assert.throws(()=>apply({...p,inv:[]},'gold'),/Lệnh bài/);
 assert.throws(()=>apply(p,'quickSale'),/không hợp lệ/);
 assert.throws(()=>progression.apply(p,{kind:'gm',action:'quickSale',uid:p.inv[0].uid},true),/không thể bán/);
 assert.equal(p.inv.length,1);
});
test('joining selects only factions matching current element and gender, and cannot join twice',()=>{
 let p=fresh();assert.throws(()=>apply(p,'join','wudang'),/phù hợp/);
 p=apply(p,'join','shaolin');assert.equal(p.fac,'shaolin');assert.ok(p.sk[10]);
 assert.throws(()=>apply(p,'join','tianwang'),/phù hợp/);
 const female={...fresh(),sex:1};assert.throws(()=>apply(female,'join','shaolin'),/phù hợp/);
});
test('element change wipes character progression and possessions but preserves identity, level, XP and token',()=>{
 let p={...fresh(),lvl:150,xp:123,attrPts:3000,attr:{str:500,dex:5,vit:5,eng:5},skPts:99,sk:{10:20},skL:{10:{lv:20,xp:0}},gold:123,knb:99,mats:{misc:{bk90:5}},epBox:[{uid:99}],ground:[{it:{uid:100}}],eq:{weapon:{uid:77,base:[],mag:[],ext:[],req:[]}},rw:{stat:{reborn:5}}};
 p.inv.push({uid:3,n:'old item'});const original=structuredClone(p);
 p=apply(p,'element',1);assert.equal(p.fac,'vo1');assert.equal(p.lvl,150);assert.equal(p.xp,123);assert.equal(p.name,original.name);
 assert.equal(p.attrPts,0);assert.equal(p.skPts,0);assert.deepEqual(p.sk,{});assert.deepEqual(p.eq,{});assert.deepEqual(p.attr,{str:0,dex:0,vit:0,eng:0});
 assert.equal(p.inv.length,1);assert.equal(p.inv[0].ktc.k,'newbie_token');assert.deepEqual(p.mats.misc,{});assert.equal(p.gold,0);assert.equal(p.knb||0,0);assert.equal(p.epBox,undefined);assert.equal(p.rw,undefined);
 assert.equal(original.inv.length,2);assert.throws(()=>apply(p,'element',1),/khác/);assert.throws(()=>apply(p,'element',9),/khác/);
});
test('gender change removes gender-restricted gear in bag and equipped slots, preserving universal gear',()=>{
 let p={...fresh(),eq:{armor:{uid:8,base:[],mag:[],ext:[],req:[[38,0]]},helm:{uid:9,base:[],mag:[],ext:[],req:[[38,1]]},horse:{uid:10,base:[],mag:[],ext:[],req:[[38,-1]]}}};
 p.inv.push({uid:3,req:[[38,0]]},{uid:4,req:[[38,1]]},{uid:5,req:[]});
 p=apply(p,'gender');assert.equal(p.sex,1);assert.deepEqual(p.inv.map(i=>i.uid),[1,5]);assert.deepEqual(Object.keys(p.eq),['horse']);
 assert.throws(()=>apply({...fresh(),fac:'shaolin'},'gender'),/không nhận/);
});
test('random XP stays in advertised inclusive range and stops at level 200',()=>{
 for(let i=0;i<10;i++){
  const p=apply({...fresh(),lvl:199},'xp');const curve=native.catalog().exp;
  const total=p.xp+(p.lvl===200?Number(curve[198]):0);assert.ok(total>=100000000&&total<=1000000000);
 }
 assert.throws(()=>apply({...fresh(),lvl:200},'xp'),/200/);
});
test('clicking or using token opens support without consuming it; ordinary sale is blocked',()=>{
 const p=fresh(),s={o:p,opened:0,messages:[],openNewbieSupport(){s.opened++;},k(msg){s.messages.push(msg);}};vm.createContext(s);
 for(const [file,names] of [['src/client/gameplay/shop-and-books-01.js',['c6','f6']],['src/client/ui/legacy-panels-and-audio-01.js',['Ef']]]){
  const source=fs.readFileSync(file,'utf8');for(const name of names){const node=acorn.parse(source,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations[0].id.name===name);vm.runInContext(source.slice(node.start,node.end),s);}
 }
 s.f6(p.inv[0]);assert.equal(s.opened,1);s.c6(p.inv[0]);assert.equal(s.opened,2);s.Ef(p.inv[0]);assert.match(s.messages[0],/không thể bán/);assert.equal(p.inv.length,1);assert.equal(p.inv[0].ktc.c,1);
});
test('support mutation persists and replays once, without touching account shared storage or another character',()=>{
 const {DatabaseSync}=require('node:sqlite'),{createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
  const shared=JSON.stringify({items:[{uid:91,n:'Shared treasure'}]});
  for(const [key,value] of [['jxidle',JSON.stringify(fresh())],['jxidle_2',JSON.stringify(fresh())],['shared-stash',shared]])db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('one',key,value);
  const store=createCharacters(db),action={kind:'newbie',action:'xp'};
  const first=store.mutate('one',0,'newbie-random-xp',action,false,'development');
  const replay=store.mutate('one',0,'newbie-random-xp',action,false,'development');assert.deepEqual(replay,first);
  const changed=store.mutate('one',0,'newbie-element-change',{kind:'newbie',action:'element',value:1},false,'development');
  assert.deepEqual(createCharacters(db).read('one',0).profile,changed.profile);
  assert.equal(store.read('one',1).profile.fac,'vo0');
  assert.equal(db.prepare('SELECT value FROM account_storage WHERE key=?').get('shared-stash').value,shared);
 }finally{db.close();}
});
