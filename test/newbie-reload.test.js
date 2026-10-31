const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {openDatabase}=require('../src/server/database.ts'),{createServer}=require('../src/server/index.ts');
test('every newbie grant, allocated point, item and equipped slot survives authenticated reload and SQLite/server restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'volam-newbie-reload-')),filename=path.join(dir,'game.sqlite');let db=openDatabase(filename),app=createServer({db,downloadAssets:false,development:false,gameMasterMode:'development'}).app;
 try{
  const registered=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'newbie_reload',password:'secret123'}}),account=registered.json().user.id,cookie=registered.headers['set-cookie'].split(';')[0];
  const initial={fac:'vo0',lvl:1,inv:[],gold:100000,name:'Reload Hero',sex:0};db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify(initial));
  let id=0,last;
  const reload=async expected=>{const response=await app.inject({url:'/api/multiplayer/character?slot=0',headers:{cookie}});assert.equal(response.statusCode,200);assert.deepEqual(response.json().profile,expected);};
  const action=async action=>{const response=await app.inject({method:'POST',url:'/api/multiplayer/progression',headers:{cookie},payload:{slot:0,id:'newbie-reload-'+ ++id,action}});assert.equal(response.statusCode,200,response.body);last=response.json().profile;await reload(last);return last;};
  await action({kind:'specialItemBuy',item:'newbie_token'});
  for(const name of ['level150','gold','knb','potential'])await action({kind:'newbie',action:name});
  await action({kind:'newbie',action:'join',value:'shaolin'});
  for(const name of ['learn90','learn120','learn150','max90','warMerit','xp','chest'])await action({kind:'newbie',action:name});
  await action({kind:'potential',key:'str',amount:25});await action({kind:'skill',skill:10,amount:2});
  let p=await action({kind:'equipmentTrader',operation:'rings'});
  for(const item of p.inv.slice(-2))await action({kind:'equip',uid:item.uid});
  assert.ok(last.lvl>=150);assert.equal(last.attr.str,25);assert.ok(last.sk[10]>=3);assert.ok(last.sk[319]);assert.ok(last.sk[1056]);assert.ok(Object.keys(last.eq).length>0);assert.ok(last.inv.some(item=>item.ktc?.k==='gm_hk_shaolin'));assert.equal(last.specialPurchases.newbie_token,1);
  const expected=structuredClone(last);
  // A stale browser autosave must not replace canonical progression on the next login.
  db.prepare('UPDATE account_storage SET value=? WHERE account_id=? AND key=?').run(JSON.stringify(initial),account,'jxidle');await reload(expected);
  await app.close();db.close();db=openDatabase(filename);app=createServer({db,downloadAssets:false,development:false,gameMasterMode:'development'}).app;
  await reload(expected);
  const delta=await app.inject({url:'/api/multiplayer/character?slot=0&revision=0',headers:{cookie}});assert.equal(delta.statusCode,200);assert.deepEqual(delta.json().profile.specialPurchases,{newbie_token:1});
  const duplicate=await app.inject({method:'POST',url:'/api/multiplayer/progression',headers:{cookie},payload:{slot:0,id:'duplicate-after-restart',action:{kind:'specialItemBuy',item:'newbie_token'}}});assert.equal(duplicate.statusCode,400);await reload(expected);
 }finally{await app.close();db.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('live browser full and revision updates retain the token purchase receipt alongside skills and equipment',()=>{
 const vm=require('node:vm'),fields=require('../src/shared/multiplayer/progression-fields.json');
 const s={GameWebTransport:{LocalMotion:class{}},OnlineSkillVisuals:()=>({}),structuredClone,window:{localGameConfig:{progressionFields:fields}},m0:0,o:{lvl:1,fac:'vo0'},l:{},D0(){}};
 vm.createContext(s);vm.runInContext(fs.readFileSync('src/client/multiplayer/state/legacy-pve.js','utf8'),s);
 const p={lvl:150,xp:123,fac:'shaolin',attr:{str:25},attrPts:3000,skPts:100,sk:{10:3,319:20},inv:[{uid:1,ktc:{k:'newbie_token',c:1}}],eq:{ring1:{uid:2}},specialPurchases:{newbie_token:1}};
 s.onlineWorld.profile({revision:1,full:true,profile:p});for(const key of Object.keys(p))assert.deepEqual(s.o[key],p[key],key);
 s.onlineWorld.profile({revision:2,full:false,profile:{xp:456,specialPurchases:{newbie_token:1}}});assert.equal(s.o.xp,456);assert.deepEqual(s.o.specialPurchases,{newbie_token:1});assert.deepEqual(s.o.eq,p.eq);assert.deepEqual(s.o.sk,p.sk);
});
