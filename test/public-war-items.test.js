const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
const apply=require('../src/server/multiplayer/definitions/progression.cjs').apply;
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const npc=require('../src/client/maps/content/9003/map.json').npcs.find(n=>n.npcId==='quartermaster'&&n.team==='song');
const room={matchId:7,starts:100,now:110,ready:true,alive:true,map:9003,team:0,...npc.position};
const profile=()=>native.withProgression({fac:'wudu',lvl:150},s=>{s.o.mats={misc:{tk_merit:20000}};return s.o;});

test('all 26 quartermaster products buy and consume using the server price and a bounded receipt',()=>{
 const vm=require('node:vm'),{compileTypeScriptEntry}=require('../tools/build-app');
 const scope={};vm.runInNewContext(compileTypeScriptEntry('gameplay/quartermaster/model.ts','Model').code,scope);
 for(const [item,price]of Object.entries(scope.Model.WAR_PRICES)){
  const bought=apply(profile(),{kind:'warItemBuy',item,quantity:2,room});
  assert.equal(bought.mats.misc.tk_merit,20000-2*price,item);
  assert.equal(bought.mats.misc['tk_'+item],2,item);
  const used=apply(bought,{kind:'warItemUse',item,room});
  assert.equal(used.mats.misc['tk_'+item],1,item);
  assert.deepEqual(used.warSupplies.itemUses,[{seq:1,kind:item,at:110,x:room.x,y:room.y}]);
 }
});

test('item intents reject dead/waiting/outside participants, hostile vendors, forged names and empty stock',()=>{
 const p=profile();
 for(const patch of [{alive:false},{ready:false},{map:37},{x:0,y:0},{team:1}])
  assert.throws(()=>apply(p,{kind:'warItemBuy',item:'drum',quantity:1,room:{...room,...patch}}));
 assert.throws(()=>apply(p,{kind:'warItemUse',item:'drum',room}),/Chưa có/);
 assert.throws(()=>apply(p,{kind:'warItemBuy',item:'__proto__',room}),/không hợp lệ/);
 assert.throws(()=>apply(p,{kind:'warItemBuy',item:'drum',quantity:100,room}),/Số lượng/);
});

test('persisted item use is atomic and network retries never consume twice',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
 db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('a','jxidle',JSON.stringify(profile()));
 const store=createCharacters(db);
 try{
  store.mutate('a',0,'buy-drum',{kind:'warItemBuy',item:'drum',quantity:2,room});
  const command={kind:'warItemUse',item:'drum',room};
  const first=store.mutate('a',0,'use-drum',command);
  const retry=store.mutate('a',0,'use-drum',{...command,room:{...room,now:115,x:1000}});
  assert.equal(first.revision,retry.revision);
  assert.equal(retry.profile.mats.misc.tk_drum,1);
  assert.equal(retry.profile.warSupplies.itemUses.length,1);
  const before=store.read('a',0);
  assert.throws(()=>store.mutate('a',0,'use-no-stock',{kind:'warItemUse',item:'command',room}));
  assert.deepEqual(store.read('a',0),before);
 }finally{db.close();}
});

test('each thunder support reaches its new cap and equipment levels do not extrapolate above it',()=>{
 const maxima=require('../src/shared/thunder-support.json');
 native.withProgression({fac:'kunlun',lvl:158},s=>{
  for(const [id,maximum]of Object.entries(maxima)){
   assert.equal(s.b0(s.T[id],'addskilldamage150_1109',20)[2],maximum);
   assert.equal(s.b0(s.T[id],'addskilldamage150_1109',35)[2],maximum);
   assert.ok(s.b0(s.T[id],'addskilldamage150_1109',19)[2]>=150);
  }
  s.o.sk={172:20,179:20,182:20,375:20,1081:25};
  s.W5();const stats=s.j0();
  assert.equal(stats.skillBonus[1109],850);
  return true;
 });
});

test('online Wudu and thunder export real native secondary parts with their own support bonus',()=>{
 const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
 for(const [fac,ids,weapon]of [['wudu',[353,355,1066,1067],0],['kunlun',[172,179,182,375,1081],1]]){
  const p={fac,lvl:158,sk:Object.fromEntries(ids.map(id=>[id,id>=1000?25:20])),eq:{weapon:{d:0,k:weapon,lvl:1,g:0,base:[],mag:[]}}};
  const original=native.buildCharacter(p),resolved=catalog.character(p);
  for(const skill of original.skills){
   const followups=original.followups?.[skill.id];if(!followups?.length)continue;
   const exported=resolved.skills.find(row=>row.id===skill.id).followups;
   assert.ok(exported?.length,skill.id+' must retain native secondary damage online');
   for(let i=0;i<followups.length;i++)assert.deepEqual(exported[i].parts,['phys','poison','cold','fire','light'].map(k=>followups[i].parts[k]||0));
  }
  const target=resolved.skills.find(row=>row.id===(fac==='wudu'?353:1081));
  assert.ok(target.followups.some(event=>event.id===(fac==='wudu'?354:1109)));
  if(fac==='kunlun')assert.ok(Math.abs(target.followups[0].parts[4]/target.parts[4]-.55*9.5)<1e-9);
 }
});

test('online inventory dispatches use to persistence and never consumes a private SIM item',async()=>{
 const vm=require('node:vm'),{compileTypeScriptEntry}=require('../tools/build-app');
 let click,local=0,refresh=0;const commands=[];
 const scope={document:{addEventListener:(_name,fn)=>{click=fn;}},OnlineProgression:{enabled:()=>true,run:async command=>commands.push(command)}};
 vm.runInNewContext(compileTypeScriptEntry('simulator/war-inventory.ts','Inventory').code,scope);
 scope.Inventory.createWarInventory({active:()=>true,rewards:{use(){local++;},state:{inventory:{drum:1}}},refresh(){refresh++;},error(error){throw new Error(error);}});
 await click({target:{closest:()=>({dataset:{warItem:'drum'}})},stopPropagation(){}});
 assert.equal(local,0);assert.equal(refresh,1);assert.equal(commands[0].kind,'warItemUse');assert.equal(commands[0].item,'drum');
});
test('ground item delivery persists exactly once, preserves merit, respects stack space and keeps full drops retryable',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
 db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('a','jxidle',JSON.stringify(profile()));
 const store=createCharacters(db);try{
   const before=store.read('a',0).profile;
   const grant={id:'1700000000000-1-100-5',account:'a',slot:0,xp:0,gold:0,warItem:'drum'};
   store.apply(grant);assert.equal(store.read('a',0).profile.mats.misc.tk_drum,1);
   store.apply(grant);assert.equal(store.read('a',0).profile.mats.misc.tk_drum,1);
   assert.equal(store.read('a',0).profile.mats.misc.tk_merit,before.mats.misc.tk_merit);
   const p=store.read('a',0).profile,capacity=native.withProgression(p,s=>s.INV_MAX);
   p.inv=Array.from({length:capacity-1},(_,i)=>({uid:i+1}));p.mats.misc.tk_drum=50;
   db.prepare('UPDATE multiplayer_characters SET profile=? WHERE account=? AND slot=0').run(JSON.stringify(p),'a');
   const next={...grant,id:'1700000000000-1-101-5'};
   assert.equal(store.apply(next),false);assert.equal(store.read('a',0).profile.mats.misc.tk_drum,50);
   assert.equal(db.prepare('SELECT 1 FROM multiplayer_rewards WHERE id=?').get(next.id),undefined);
   p.mats.misc.tk_drum=49;db.prepare('UPDATE multiplayer_characters SET profile=? WHERE account=? AND slot=0').run(JSON.stringify(p),'a');
   store.apply(next);assert.equal(store.read('a',0).profile.mats.misc.tk_drum,50,'existing partial stack accepts item even when slots are full');
   p.inv.pop();db.prepare('UPDATE multiplayer_characters SET profile=? WHERE account=? AND slot=0').run(JSON.stringify(p),'a');
   const fresh={...grant,id:'1700000000000-1-102-5'};store.apply(fresh);assert.equal(store.read('a',0).profile.mats.misc.tk_drum,50);
   assert.throws(()=>store.apply({...grant,id:'1700000000000-1-103-5',warItem:'__proto__'}));
   assert.equal(createCharacters(db).read('a',0).profile.mats.misc.tk_drum,50);
 }finally{db.close();}
});
test('public drop polling retries a lost acknowledgement without awarding a second item',async()=>{
 const {createServer:httpServer}=require('node:http'),{once}=require('node:events');
 const oldUrl=process.env.MULTIPLAYER_WT_CONTROL_URL,oldSecret=process.env.MULTIPLAYER_SECRET;
 let account='',acknowledged=false,attempts=0,refreshes=0;
 const control=httpServer(async(req,res)=>{
   let body='';for await(const chunk of req)body+=chunk;
   res.setHeader('content-type','application/json');
   if(req.url==='/battlefield/drops')res.end(JSON.stringify(account&&!acknowledged?[{id:'1700000000000-7-99-5',warItem:'drum',candidates:[{account,slot:0}]}]:[]));
   else if(req.url==='/battlefield/drops/ack'){attempts++;if(attempts===1){res.statusCode=503;res.end('{}');}else{acknowledged=true;res.end('true');}}
   else if(req.url==='/refresh'){refreshes++;res.end('true');}
   else res.end('[]');
 });
 control.listen(0,'127.0.0.1');await once(control,'listening');
 process.env.MULTIPLAYER_WT_CONTROL_URL=`http://127.0.0.1:${control.address().port}`;process.env.MULTIPLAYER_SECRET='test-drop-control-secret-01234567890';
 const {openDatabase}=require('../src/server/database.ts'),{createServer}=require('../src/server/index.ts');
 const db=openDatabase(':memory:'),{app}=createServer({db,downloadAssets:false,development:true});
 try{
   const registration=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'drop_retry',password:'secret123'}});account=registration.json().user.id;
   db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify(profile()));
   const until=Date.now()+6000;while((!acknowledged||!refreshes)&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,30));
   assert.equal(acknowledged,true);assert.ok(attempts>=2);assert.ok(refreshes>=1);
   assert.equal(createCharacters(db).read(account,0).profile.mats.misc.tk_drum,1);
 }finally{
   await app.close();db.close();control.close();await once(control,'close');
   if(oldUrl===undefined)delete process.env.MULTIPLAYER_WT_CONTROL_URL;else process.env.MULTIPLAYER_WT_CONTROL_URL=oldUrl;
   if(oldSecret===undefined)delete process.env.MULTIPLAYER_SECRET;else process.env.MULTIPLAYER_SECRET=oldSecret;
 }
});
