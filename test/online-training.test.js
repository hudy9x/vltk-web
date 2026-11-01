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

test('SIM token defaults to monsters and applies checkbox changes immediately without recreating the actor',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),fields=new Map(),posts=[];
 const field=id=>{if(!fields.has(id))fields.set(id,{value:'100000',checked:false,textContent:'',innerHTML:''});return fields.get(id);};
 const panel={querySelector:field,querySelectorAll:()=>[],setAttribute(){},innerHTML:'',hidden:true};
 const s={AbortSignal,r0:{},T:{1:{ic:'img/s/1.png'}},o:{fac:'wudang',main:1},l:{town:false},m0:0,k:msg=>{throw Error(msg);},D:String,
  onlineWorld:{state:{self:10}},OnlineProgression:{enabled:()=>true,flush:async()=>{}},
  document:{createElement:tag=>tag==='section'?panel:{},body:{appendChild(){}},head:{appendChild(){}},addEventListener(){}},
  fetch:async(_url,options)=>{if(options)posts.push(JSON.parse(options.body));return {ok:true,json:async()=>options?{id:20}:{factions:[{key:'wudang',name:'Võ Đang',skills:[{id:1,name:'Chiêu',tier:90,required:80}]}]}};}
 };
 vm.runInNewContext(fs.readFileSync('src/client/dev/online-training-01.js','utf8')+';this.api=OnlineTraining;',s);
 await s.api.open('sim_token');assert.equal(field('#training-players').checked,false);assert.equal(field('#training-monsters').checked,true);
 field('#training-players').checked=true;panel.onchange({target:{id:'training-players'}});await new Promise(setImmediate);
 assert.equal(posts[0].action,'simMode');assert.equal(posts[0].attackPlayers,true);assert.equal(posts[0].attackMonsters,true);
 field('#training-players').checked=false;field('#training-monsters').checked=false;panel.onchange({target:{id:'training-monsters'}});await new Promise(setImmediate);
 assert.equal(posts[1].action,'simMode');assert.equal(posts[1].attackPlayers,false);assert.equal(posts[1].attackMonsters,false);
 s.onlineWorld.state.training={units:[{owner:10,attackPlayers:true,attackMonsters:false}]};await s.api.open('sim_token');
 assert.equal(field('#training-players').checked,true);assert.equal(field('#training-monsters').checked,false);
});
