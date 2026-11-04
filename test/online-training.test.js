const {test}=require('node:test'),assert=require('node:assert/strict');
const training=require('../src/server/multiplayer/definitions/training.cjs');
const progression=require('../src/server/multiplayer/definitions/progression.cjs');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
test('training offers attack skills from each faction and validates faction, HP and skill ownership',()=>{
 const options=training.options();assert.equal(options.length,10);
 for(const faction of options){assert.ok(faction.skills.some(s=>s.tier===150));assert.ok(faction.skills.every(s=>s.required>=80&&s.tier<=150));}
 assert.throws(()=>training.sim('wudang',-1,0,false),/HP/);
 assert.throws(()=>training.configure({fac:'wudang',lvl:150},'wudang',10,false),/thuộc môn phái/);
});
test('training tokens are non-consumable GM grants, idempotent and guarded by configured permissions',()=>{
 let p=progression.apply({fac:'wudang',lvl:150},{kind:'gm',action:'trainingTokens'},true);
 for(const key of ['sim_token','test_token'])assert.equal(p.inv.filter(i=>i.ktc?.k===key).length,1);
 const count=p.inv.length;p=progression.apply(p,{kind:'gm',action:'trainingTokens'},true);assert.equal(p.inv.length,count);
 assert.throws(()=>progression.apply(p,{kind:'gm',action:'trainingTokens'},false,'development'),{status:403});
 assert.throws(()=>progression.apply({fac:'wudang',lvl:150},{kind:'gm',action:'testFaction',faction:'emei',skill:1060},true),/Lệnh bài Test/);
});
test('SIM uses native online stats and all support variants preserve configured HP',()=>{
 const f=training.options().find(f=>f.key==='wudang'),skill=f.skills.find(s=>s.tier===150).id;
 const result=training.sim(f.key,skill,123456,false);assert.equal(result.profile.hp,123456);assert.ok(result.profile.speed>0);
 assert.ok(result.profile.skills.some(s=>s.id===skill));assert.ok(result.appearance.rows.weapon>=0);
 for(const v of result.profile.support.variants)assert.equal(v.profile.hp,123456);
 const raw=training.configure({fac:f.key,lvl:200},f.key,skill,false),stats=native.buildCharacter(raw).stats;
 assert.deepEqual(result.profile.res,['phys','poison','cold','fire','light'].map(k=>stats.res[k]||0));assert.equal(result.profile.defense,stats.def);
});
test('monster 602 keeps normal online level-150 damage and resistances; dummy only changes stationary target behavior',()=>{
 const m=training.monster(999),d=training.monster(123,true),stats=native.monsterStats(150);
 assert.equal(m.id,602);assert.equal(m.hp,999);assert.equal(m.damage,stats.dmg*.75);assert.deepEqual(m.res,[52.5,52.5,52.5,52.5,52.5]);
 assert.equal(d.id,999001);assert.equal(d.speed,0);assert.equal(d.damage,0);assert.equal(d.hp,123);
});

test('training API derives owner from authenticated cookie, requires token and ignores client damage',async()=>{
 const {createServer:http}=require('node:http'),{once}=require('node:events');
 const {createServer}=require('../src/server/index.ts'),{openDatabase}=require('../src/server/database.ts');
 const calls=[],control=http(async(req,res)=>{let text='';for await(const c of req)text+=c;res.setHeader('content-type','application/json');if(req.url==='/training'){calls.push(JSON.parse(text));res.end('{"id":123}');}else res.end('[]');});
 control.listen(0,'127.0.0.1');await once(control,'listening');
 const old=process.env.MULTIPLAYER_WT_CONTROL_URL;process.env.MULTIPLAYER_WT_CONTROL_URL='http://127.0.0.1:'+control.address().port;
 const db=openDatabase(':memory:'),{app}=createServer({db,development:true,downloadAssets:false});
 try{
  assert.equal((await app.inject({url:'/api/multiplayer/training'})).statusCode,401);
  const auth=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'training_user',password:'secret123'}}),account=auth.json().user.id,cookie=auth.headers['set-cookie'].split(';')[0];
  const raw=progression.apply({fac:'wudang',lvl:150},{kind:'gm',action:'trainingTokens'},true);
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify(raw));
  const result=await app.inject({method:'POST',url:'/api/multiplayer/training',headers:{cookie},payload:{slot:0,action:'monster',hp:9876,account:'spoofed',damage:1}});
  const mode=await app.inject({method:'POST',url:'/api/multiplayer/training',headers:{cookie},payload:{slot:0,action:'simMode',attackPlayers:true,attackMonsters:false,account:'forged'}});
  assert.equal(mode.statusCode,200);assert.equal(calls[1].account,account);assert.equal(calls[1].attackPlayers,true);assert.equal(calls[1].attackMonsters,false);
  assert.equal((await app.inject({method:'POST',url:'/api/multiplayer/training',headers:{cookie},payload:{slot:0,action:'simMode',attackPlayers:'true'}})).statusCode,400);
  assert.equal(result.statusCode,200);assert.equal(calls[0].account,account);assert.equal(calls[0].monster.hp,9876);assert.notEqual(calls[0].monster.damage,1);assert.equal(calls[0].monster.id,602);
  assert.equal((await app.inject({method:'POST',url:'/api/multiplayer/training',headers:{cookie},payload:{slot:0,action:'monster',hp:-1}})).statusCode,400);
  const no=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'no_test_token',password:'secret123'}}),c2=no.headers['set-cookie'].split(';')[0];
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(no.json().user.id,'jxidle',JSON.stringify({fac:'wudang',lvl:150}));
  assert.equal((await app.inject({method:'POST',url:'/api/multiplayer/training',headers:{cookie:c2},payload:{slot:0,action:'monster',hp:100}})).statusCode,403);
 }finally{await app.close();db.close();await new Promise(r=>control.close(r));if(old===undefined)delete process.env.MULTIPLAYER_WT_CONTROL_URL;else process.env.MULTIPLAYER_WT_CONTROL_URL=old;}
});

test('online snapshot carries SIM ownership into targeting and rejects malformed training metadata',()=>{
 const esbuild=require('esbuild'),vm=require('node:vm');const scope={module:{exports:{}},exports:{},TextEncoder,TextDecoder,Uint8Array,DataView,Map};
 vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/webtransport/protocol.ts'],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text,scope);
 const base=Buffer.alloc(43+55*2+2+11);base.set([8,17]);base.writeUInt32LE(10,2);base.writeUInt32LE(140,6);base.writeUInt32LE(1,10);base.writeUInt16LE(2,18);base.writeFloatLE(150,30);
 for(let i=0;i<2;i++){const at=43+i*55;base.writeUInt32LE(i+1,at);for(const [j,n]of [100,100,1000,100,1000,100,0,0].entries())base.writeFloatLE(n,at+4+j*4);base.writeUInt32LE(1,at+39);}
 const unit={id:2,owner:1,name:'SIM',faction:'wudang',kind:1,training:true};
 const packet=u=>{const json=Buffer.from(JSON.stringify({pinned:true,units:[u]})),head=Buffer.alloc(5);head[0]=0xe2;head.writeUInt32LE(json.length,1);return Buffer.concat([base,head,json]);};
 const result=scope.module.exports.decodePacket(packet(unit));assert.equal(result.training.units[0].name,'SIM');assert.equal(result.actors[1].trainingOwner,1);
 assert.throws(()=>scope.module.exports.decodePacket(packet({...unit,id:999})),/training/);
 const s={l:{town:false}};vm.runInNewContext(require('node:fs').readFileSync('src/client/multiplayer/state/pvp.js','utf8')+';this.pvp=OnlinePvp;',s);
 assert.equal(s.pvp.hostile(result,result.actors[1]),false);result.actors[0].pk=true;assert.equal(s.pvp.hostile(result,result.actors[1]),true);assert.equal(s.pvp.hostile({...result,self:999},result.actors[1]),false);
});

test('existing online test tokens pick up the two supplied icons on canonical reload',()=>{
 const {openDatabase}=require('../src/server/database.ts'),{createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');const db=openDatabase(':memory:');
 try{
  db.exec('CREATE TABLE IF NOT EXISTS account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('icons','jxidle',JSON.stringify({fac:'wudang',lvl:150,inv:['sim_token','test_token'].map((key,i)=>({uid:i+1,n:key,d:99,k:0,lvl:1,r:2,base:[],mag:[],ic:'img/ep/newbie-token.png',ktc:{k:key,c:1}}))}));
  const p=createCharacters(db).read('icons',0).profile;
  assert.equal(p.inv[0].ic,'img/ep/sim-token.png');assert.equal(p.inv[1].ic,'img/ep/test-token.png');
 }finally{db.close();}
});

test('Test faction changes delete all worn equipment and create only a new skill-compatible weapon',()=>{
 const factions=training.options(),f=factions.find(f=>f.key==='wudang'),next=factions.find(f=>f.key==='cuiyan');
 const p=training.configure({fac:'wudang',lvl:150},f.key,f.skills[0].id,false);
 const oldWeapon=structuredClone(p.eq.weapon);p.eq.armor=structuredClone(oldWeapon);p.eq.helm=structuredClone(oldWeapon);p.eq.horse=structuredClone(oldWeapon);
 p.attrPts+=3000;const budget=p.attrPts+Object.values(p.attr).reduce((a,b)=>a+b,0);
 const before=structuredClone(p),result=training.configure(p,next.key,next.skills[0].id,true,true);
 assert.deepEqual(Object.keys(result.eq),['weapon']);assert.ok(result.eq.weapon);assert.equal(result.fac,next.key);assert.equal(result.main,next.skills[0].id);
 assert.equal(result.attrPts+Object.values(result.attr).reduce((a,b)=>a+b,0),budget);
 assert.deepEqual(p,before,'profile input must remain isolated');
 const expected=native.withProgression(result,s=>{const code=s.j1(s.T[next.skills[0].id]);return [code>=100?1:0,code>=100?code-100:code===-1?6:code];});
 assert.deepEqual([result.eq.weapon.d,result.eq.weapon.k],expected);
});

test('SIM token defaults to monsters and applies checkbox changes to the selected actor',async()=>{
 const h=companionPanel([{id:20,number:1,name:'SIM#1',faction:'wudang',skill:1,map:2,hp:100000,maxHp:100000,attackPlayers:false,attackMonsters:true}]);
 await h.scope.api.open('sim_token');assert.equal(h.field('#training-players').checked,false);assert.equal(h.field('#training-monsters').checked,true);
 h.field('#training-players').checked=true;h.panel.onchange({target:{id:'training-players'}});await new Promise(setImmediate);
 assert.equal(h.posts[0].action,'simMode');assert.equal(h.posts[0].simId,20);assert.equal(h.posts[0].attackPlayers,true);assert.equal(h.posts[0].attackMonsters,true);
 h.field('#training-players').checked=false;h.field('#training-monsters').checked=false;h.panel.onchange({target:{id:'training-monsters'}});await new Promise(setImmediate);
 assert.equal(h.posts[1].attackPlayers,false);assert.equal(h.posts[1].attackMonsters,false);
 await h.scope.api.open('sim_token');assert.equal(h.field('#training-players').checked,false);assert.equal(h.field('#training-monsters').checked,false);
});

test('production blocks training APIs and token actions even with GM all and existing tokens',async()=>{
 const {createServer}=require('../src/server/index.ts'),{openDatabase}=require('../src/server/database.ts');
 const raw=progression.apply({fac:'wudang',lvl:150},{kind:'gm',action:'trainingTokens'},true);
 for(const mode of ['all','development']){
  for(const action of [{kind:'gm',action:'trainingTokens'},{kind:'gm',action:'testFaction',faction:'emei',skill:1060}])
   assert.throws(()=>progression.apply(raw,action,false,mode),{status:403});
  const db=openDatabase(':memory:'),{app}=createServer({db,development:false,gameMasterMode:mode,downloadAssets:false});
  try{
   const auth=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'prod_training',password:'secret123'}});
   const cookie=auth.headers['set-cookie'].split(';')[0];
   db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(auth.json().user.id,'jxidle',JSON.stringify(raw));
   assert.equal((await app.inject({url:'/api/multiplayer/training',headers:{cookie}})).statusCode,403);
   for(const action of ['sim','simMode','monster','dummy','clearSims','pin','finish'])
    assert.equal((await app.inject({method:'POST',url:'/api/multiplayer/training',headers:{cookie},payload:{slot:0,action}})).statusCode,403,action);
  }finally{await app.close();db.close();}
 }
});

test('SIM follow and owner-party options update one actor and survive panel reload',async()=>{
 const h=companionPanel([{id:20,number:1,name:'SIM#1',faction:'wudang',skill:1,map:2,hp:100000,maxHp:100000}]);
 await h.scope.api.open('sim_token');assert.equal(h.field('#training-follow').checked,false);assert.equal(h.field('#training-party').checked,false);
 assert.match(h.panel.innerHTML,/Theo sau chủ/);assert.match(h.panel.innerHTML,/Tự nhận lời mời tổ đội từ chủ/);
 h.field('#training-follow').checked=true;h.panel.onchange({target:{id:'training-follow'}});await new Promise(setImmediate);
 assert.equal(h.posts[0].simId,20);assert.equal(h.posts[0].followOwner,true);assert.equal(h.posts[0].autoAcceptParty,false);
 h.field('#training-party').checked=true;h.panel.onchange({target:{id:'training-party'}});await new Promise(setImmediate);
 assert.equal(h.posts[1].followOwner,true);assert.equal(h.posts[1].autoAcceptParty,true);
 await h.scope.api.open('sim_token');assert.equal(h.field('#training-follow').checked,true);assert.equal(h.field('#training-party').checked,true);
 await h.select(0);h.field('#training-follow').checked=true;h.panel.onchange({target:{id:'training-follow'}});
 await h.action('sim');assert.equal(h.posts[2].action,'sim');assert.equal(h.posts[2].followOwner,true);assert.equal(h.units.length,2);
});

test('training API validates and forwards follow and automatic party options under authenticated ownership',async()=>{
 const {createServer:http}=require('node:http'),{once}=require('node:events');
 const {createServer}=require('../src/server/index.ts'),{openDatabase}=require('../src/server/database.ts');
 const calls=[],control=http(async(req,res)=>{let text='';for await(const c of req)text+=c;res.setHeader('content-type','application/json');if(req.url==='/training'){calls.push(JSON.parse(text));res.end('{"id":123}');}else res.end('[]');});
 control.listen(0,'127.0.0.1');await once(control,'listening');
 const old=process.env.MULTIPLAYER_WT_CONTROL_URL;process.env.MULTIPLAYER_WT_CONTROL_URL='http://127.0.0.1:'+control.address().port;
 const db=openDatabase(':memory:'),{app}=createServer({db,development:true,downloadAssets:false});
 try{
  const auth=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'sim_party_user',password:'secret123'}}),account=auth.json().user.id,cookie=auth.headers['set-cookie'].split(';')[0];
  const raw=progression.apply({fac:'wudang',lvl:150},{kind:'gm',action:'trainingTokens'},true);
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify(raw));
  const send=payload=>app.inject({method:'POST',url:'/api/multiplayer/training',headers:{cookie},payload:{slot:0,action:'simMode',...payload}});
  assert.equal((await send({followOwner:true,autoAcceptParty:true,account:'forged'})).statusCode,200);
  assert.equal(calls[0].account,account);assert.equal(calls[0].followOwner,true);assert.equal(calls[0].autoAcceptParty,true);
  assert.equal((await send({})).statusCode,200);assert.equal(calls[1].followOwner,false);assert.equal(calls[1].autoAcceptParty,false);
  for(const key of ['followOwner','autoAcceptParty'])for(const value of ['true',1,null,{}])assert.equal((await send({[key]:value})).statusCode,400);
  assert.equal(calls.length,2,'invalid options must not reach Rust');
 }finally{await app.close();db.close();await new Promise(r=>control.close(r));if(old===undefined)delete process.env.MULTIPLAYER_WT_CONTROL_URL;else process.env.MULTIPLAYER_WT_CONTROL_URL=old;}
});

function companionPanel(initial=[],development=true){
 const vm=require('node:vm'),fs=require('node:fs'),fields=new Map(),posts=[];
 let units=structuredClone(initial),poll;
 const field=id=>{if(!fields.has(id))fields.set(id,{value:'100000',checked:false,textContent:'',innerHTML:''});return fields.get(id);};
 const panel={querySelector:field,querySelectorAll:()=>[],setAttribute(){},innerHTML:'',hidden:true};
 const factions=[{key:'wudang',name:'Võ Đang',skills:[{id:1,name:'Chiêu',tier:90,required:80}]},{key:'cuiyan',name:'Thúy Yên',skills:[{id:2,name:'Chiêu',tier:90,required:80}]}];
 const scope={window:{localGameConfig:{development},setInterval:fn=>{poll=fn;}},AbortSignal,r0:{},T:{1:{},2:{}},o:{fac:'wudang',main:1},l:{town:false},m0:0,k:msg=>{throw Error(msg);},D:String,
  onlineWorld:{state:{self:10}},OnlineProgression:{enabled:()=>true,flush:async()=>{}},
  document:{createElement:tag=>tag==='section'?panel:{},body:{appendChild(){}},head:{appendChild(){}},addEventListener(){}},
  fetch:async(url,options)=>{
   if(options?.method==='POST'){
    const body=JSON.parse(options.body);posts.push(body);assert.equal(url,'/api/multiplayer/companions');
    if(body.action==='simMode')Object.assign(units.find(u=>u.id===body.simId),body);
    if(body.action==='removeSim')units=units.filter(u=>u.id!==body.simId);
    let id=body.simId;
    if(body.action==='sim'){
     if(units.length>=3)return {ok:false,json:async()=>({error:'Mỗi nhân vật chỉ được có tối đa 3 SIM.'})};
     const number=[1,2,3].find(n=>!units.some(u=>u.number===n));id=100+number;
     units.push({...body,id,number,name:'SIM#'+number,map:2,maxHp:body.hp});
    }
    return {ok:true,json:async()=>({id,units:structuredClone(units)})};
   }
   assert.match(url,/^\/api\/multiplayer\/companions\?slot=0$/);
   return {ok:true,json:async()=>({factions,units:structuredClone(units)})};
  }
 };
 vm.runInNewContext(fs.readFileSync('src/client/dev/online-training-01.js','utf8')+';this.api=OnlineTraining;',scope);
 const click=(selector,dataset)=>panel.onclick({target:{closest:requested=>requested===selector?{dataset}:null}});
 return {scope,panel,field,posts,get units(){return units;},set units(value){units=value;},select:id=>click('[data-sim]',{sim:String(id)}),action:action=>click('[data-action]',{action}),poll:async()=>{poll();await new Promise(setImmediate);}};
}

test('companion avatars allow selection and explicit deletion of only the selected SIM in production',async()=>{
 const h=companionPanel([1,2,3].map((number,i)=>({id:20+number,number,name:'SIM#'+number,faction:i===1?'cuiyan':'wudang',skill:i===1?2:1,map:2,hp:1000,maxHp:1000})),false);
 await h.scope.api.open('sim_token');
 assert.match(h.field('#training-sims').innerHTML,/portraits\/cuiyan.webp/);assert.match(h.field('#training-sims').innerHTML,/SIM#3/);
 assert.match(h.panel.innerHTML,/Xóa SIM này/);assert.doesNotMatch(h.panel.innerHTML,/data-action="clearSims"/);
 await h.select(22);await h.action('removeSim');
 assert.equal(h.posts[0].simId,22);assert.deepEqual(h.units.map(u=>u.id),[21,23]);
 assert.match(h.field('#training-sims').innerHTML,/Thêm SIM/);
 await h.select(23);h.field('#training-follow').checked=true;h.panel.onchange({target:{id:'training-follow'}});await new Promise(setImmediate);
 assert.equal(h.posts[1].simId,23);assert.equal(h.units.find(u=>u.id===21).followOwner,undefined);
 // A death received while the panel is open removes that avatar and selection.
 h.units=h.units.filter(u=>u.id!==23);await h.poll();assert.doesNotMatch(h.field('#training-sims').innerHTML,/SIM#3/);
});

test('companion panel creates up to three SIMs without replacing existing avatars',async()=>{
 const h=companionPanel();await h.scope.api.open('sim_token');
 for(let i=0;i<3;i++){await h.select(0);await h.action('sim');}
 assert.deepEqual(h.units.map(u=>u.name),['SIM#1','SIM#2','SIM#3']);
 assert.doesNotMatch(h.field('#training-sims').innerHTML,/Thêm SIM/);
 await h.select(0);assert.match(h.panel.innerHTML,/data-action="sim" disabled/);
});

test('production companion API requires the SIM token, scopes selected IDs and forwards no test actions',async()=>{
 const {createServer:http}=require('node:http'),{once}=require('node:events');
 const {createServer}=require('../src/server/index.ts'),{openDatabase}=require('../src/server/database.ts');
 const calls=[],control=http(async(req,res)=>{
  let text='';for await(const chunk of req)text+=chunk;res.setHeader('content-type','application/json');
  if(req.url==='/companions'){
   const command=JSON.parse(text);calls.push(command);
   if(command.action==='sim'){res.statusCode=400;res.end(JSON.stringify({error:'Mỗi nhân vật chỉ được có tối đa 3 SIM.'}));}
   else res.end(JSON.stringify({id:command.simId||null,units:[{id:31,number:1,name:'SIM#1',faction:'wudang',hp:100,maxHp:100,map:2}]}));
  }else res.end('[]');
 });
 control.listen(0,'127.0.0.1');await once(control,'listening');
 const old=process.env.MULTIPLAYER_WT_CONTROL_URL;process.env.MULTIPLAYER_WT_CONTROL_URL='http://127.0.0.1:'+control.address().port;
 const db=openDatabase(':memory:'),{app}=createServer({db,development:false,downloadAssets:false});
 try{
  assert.equal((await app.inject({url:'/api/multiplayer/companions?slot=0'})).statusCode,401);
  const auth=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'companion_owner',password:'secret123'}});
  const account=auth.json().user.id,cookie=auth.headers['set-cookie'].split(';')[0];
  const raw=progression.apply({fac:'wudang',lvl:150},{kind:'gm',action:'trainingTokens'},true);
  raw.inv=raw.inv.filter(item=>item.ktc?.k!=='test_token');
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify(raw));
  const list=await app.inject({url:'/api/multiplayer/companions?slot=0',headers:{cookie}});
  assert.equal(list.statusCode,200);assert.equal(list.json().units[0].name,'SIM#1');assert.equal(calls[0].account,account);assert.equal(calls[0].action,'listSims');
  const send=payload=>app.inject({method:'POST',url:'/api/multiplayer/companions',headers:{cookie},payload:{slot:0,...payload}});
  assert.equal((await send({action:'removeSim',simId:31,account:'spoofed'})).statusCode,200);
  assert.equal(calls.at(-1).simId,31);assert.equal(calls.at(-1).account,account);
  assert.equal((await send({action:'simMode',simId:31,followOwner:true,autoAcceptParty:true})).statusCode,200);
  assert.equal(calls.at(-1).followOwner,true);assert.equal(calls.at(-1).autoAcceptParty,true);
  const before=calls.length;
  for(const simId of [undefined,null,0,-1,'31',4294967296])assert.equal((await send({action:'removeSim',simId})).statusCode,400);
  for(const action of ['pin','finish','monster','dummy','clearSims'])assert.equal((await send({action})).statusCode,400);
  assert.equal((await send({action:'simMode',simId:31,followOwner:'true'})).statusCode,400);
  assert.equal(calls.length,before);
  const faction=list.json().factions.find(f=>f.key==='wudang'),skill=faction.skills.find(s=>s.tier===90).id;
  const full=await send({action:'sim',faction:faction.key,skill,hp:100000,equipped:false});
  assert.equal(full.statusCode,400);assert.match(full.json().error,/tối đa 3/);
  assert.equal((await app.inject({url:'/api/multiplayer/training',headers:{cookie}})).statusCode,403);
  const other=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'no_companion',password:'secret123'}}),otherCookie=other.headers['set-cookie'].split(';')[0];
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(other.json().user.id,'jxidle',JSON.stringify({fac:'wudang',lvl:150}));
  assert.equal((await app.inject({url:'/api/multiplayer/companions?slot=0',headers:{cookie:otherCookie}})).statusCode,403);
 }finally{await app.close();db.close();await new Promise(r=>control.close(r));if(old===undefined)delete process.env.MULTIPLAYER_WT_CONTROL_URL;else process.env.MULTIPLAYER_WT_CONTROL_URL=old;}
});
