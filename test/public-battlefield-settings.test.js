const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {createPublicBattlefieldSettings}=require('../src/server/multiplayer/persistence/battlefield-settings.ts');
const config=require('../src/server/multiplayer/definitions/battlefield-settings.cjs');
test('public configuration persists and builds native attacks and independent elemental marshal resistances',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    const store=createPublicBattlefieldSettings(db),value=store.read(),options=store.options();
    value.simPerTeam=23;value.durationSeconds=30;value.privateDurationSeconds=45;value.dropRates.captain=100;value.dropRates.soldier=0;
    value.soldiers.soldier.hp=123456;value.soldiers.soldier.skills=[11,19];
    value.soldiers.captain.count=0;
    value.marshals.song={...value.marshals.song,hp:765432,res:[10,20,30,40,50]};
    const base={battlefield:require('../src/server/multiplayer/definitions/battlefield.cjs').definition()};
    store.save(value,base);
    const reload=createPublicBattlefieldSettings(db);assert.deepEqual(reload.read(),value);
    const built=reload.world(base).battlefield;assert.equal(built.simPerTeam,23);assert.equal(built.durationSeconds,30);assert.equal(built.dropRates.captain,100);assert.equal(built.dropRates.soldier,0);assert.equal(built.itemKinds.length,26);
    for(const rate of [-1,101,NaN])assert.throws(()=>config.validate({...value,dropRates:{...value.dropRates,captain:rate}}),/Tỉ lệ/);
    for(const seconds of [0,9,7201,10.5])assert.throws(()=>config.validate({...value,durationSeconds:seconds}),/Thời lượng/);
    assert.equal(built.soldiers.filter(s=>s.rank==='captain').length,0);
    assert.ok(built.soldiers.filter(s=>s.rank==='soldier').every(s=>s.hp===123456&&s.attackSkills.length===2&&s.attackSkills.every(s=>s.cost===0&&s.parts.some(n=>n>0))));
    const native=require('../src/server/multiplayer/definitions/runtime.cjs').catalog();
    for(const team of ['song','jin'])for(const [element,profile]of built.marshalVariants[team].entries()){
      assert.equal(profile.series,element);assert.equal(profile.hp,value.marshals[team].hp);assert.deepEqual(profile.res,value.marshals[team].res);
      for(const key of ['stunReduction','poisonReduction','coldReduction','hurtReduction'])assert.equal(profile.protection[key],40);
      assert.ok(profile.skills.every(s=>s.attackPercent===200));assert.ok(profile.timing);assert.equal(profile.timing.runPercent,100);
      assert.equal(built.marshalMovementRadius[team],500);assert.ok(profile.speed>0);
      assert.deepEqual(profile.skills.map(s=>native.skills[s.id].req),[80,150]);assert.equal(profile.support.skills.length,1);
      for(const variant of profile.support.variants){assert.equal(variant.profile.hp,profile.hp);assert.deepEqual(variant.profile.res,profile.res);assert.equal(variant.profile.skills.length,2);}
    }
    assert.equal(base.battlefield.soldiers[0].hp,50000,'base catalog remains immutable');
    value.marshals.song.res=[101,0,0,0,0];
    assert.throws(()=>store.save(value,base),/Nguyên soái/);
    assert.deepEqual(reload.read().marshals.song.res,[10,20,30,40,50]);
  }finally{db.close();}
});
test('Escape closes focused dialog before online hotkeys or system menu, including focused inputs',()=>{
  const vm=require('node:vm'),fs=require('node:fs');let closed='',online=0;
  const dialog=id=>({hidden:false,classList:{contains:()=>false},getClientRects:()=>[{}],querySelector:()=>({click:()=>closed=id})});
  const a=dialog('focused'),b=dialog('top');
  const scope={window:{addEventListener(){}},document:{querySelectorAll:()=>[a,b],getElementById:()=>null},getComputedStyle:node=>({zIndex:node===b?100:1}),OnlineBattlefield:{handleKey:()=>online++}};
  vm.runInNewContext(fs.readFileSync('src/client/ui/keyboard-shortcuts-01.js','utf8'),scope);
  let stopped=false;scope.dialogHotkeys.handle({key:'Escape',target:{tagName:'INPUT',closest:()=>a},preventDefault(){},stopImmediatePropagation(){stopped=true;}});
  assert.equal(closed,'focused');assert.equal(online,0);assert.equal(stopped,true);
});
test('settings API requires authentication and GM permission and reloads server data',async()=>{
  const {openDatabase}=require('../src/server/database.ts'),{createServer}=require('../src/server/index.ts');
  for(const mode of ['all','development']){
    const db=openDatabase(':memory:'),{app}=createServer({db,downloadAssets:false,development:false,gameMasterMode:mode});
    try{
      assert.equal((await app.inject({url:'/api/multiplayer/battlefield-settings'})).statusCode,401);
      const registration=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:mode==='all'?'pvp_all':'pvp_dev',password:'secret123'}}),cookie=registration.headers['set-cookie'].split(';')[0];
      const read=await app.inject({url:'/api/multiplayer/battlefield-settings',headers:{cookie}});assert.equal(read.statusCode,200);
      const value=read.json().settings;value.marshals.song.hp=345678;value.durationSeconds=60;value.privateDurationSeconds=90;
      const save=await app.inject({method:'POST',url:'/api/multiplayer/battlefield-settings',headers:{cookie},payload:value});
      assert.equal(save.statusCode,mode==='all'?200:403,save.body);
      const reload=await app.inject({url:'/api/multiplayer/battlefield-settings',headers:{cookie}});
      assert.equal(reload.json().settings.marshals.song.hp,mode==='all'?345678:200000);
      assert.equal(reload.json().settings.durationSeconds,mode==='all'?60:1200);
      assert.equal(reload.json().settings.privateDurationSeconds,mode==='all'?90:1200);
    }finally{await app.close();db.close();}
  }
});
test('Escape closes an existing classic window without switching to the system menu',()=>{
  const vm=require('node:vm'),fs=require('node:fs');let closed=0,opened=0;
  const scope={window:{addEventListener(){}},document:{querySelectorAll:()=>[],getElementById:()=>null,body:{classList:{contains:name=>name==='u20win'}}},o:{fac:'shaolin'},PA:'log',Bm:()=>true,O2:()=>false,_r:()=>closed++,bB:()=>opened++};
  vm.runInNewContext(fs.readFileSync('src/client/ui/keyboard-shortcuts-01.js','utf8'),scope);
  scope.dialogHotkeys.handle({key:'Escape',target:{blur(){}},preventDefault(){},stopImmediatePropagation(){}});
  assert.equal(closed,1);assert.equal(opened,0);
});
test('legacy saved configuration without durations uses 20-minute defaults without losing other settings',()=>{
 const db=new DatabaseSync(':memory:');try{
   const store=createPublicBattlefieldSettings(db),old=config.defaults();delete old.durationSeconds;delete old.privateDurationSeconds;delete old.dropRates;old.marshals.song.hp=999999;
   db.prepare('INSERT INTO public_battlefield_settings VALUES(1,?)').run(JSON.stringify(old));
   assert.equal(store.read().durationSeconds,1200);assert.equal(store.read().privateDurationSeconds,1200);assert.equal(store.read().dropRates.captain,3);assert.equal(store.read().marshals.song.hp,999999);
 }finally{db.close();}
});
test('settings tabs preserve all groups and save minutes as seconds with only marshal HP and resistance',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');const nodes=new Map(),created=[],html=[];let saved;
 const fields=[{dataset:{setting:'durationSeconds'},value:'1.5'},{dataset:{setting:'privateDurationSeconds'},value:'2.25'},{dataset:{setting:'simPerTeam'},value:'11'},{dataset:{setting:'marshals.song.hp'},value:'456789'},{dataset:{setting:'marshals.song.res.2'},value:'55'},{dataset:{setting:'marshals.song.stunReduction'},value:'60'},{dataset:{setting:'marshals.song.attackSpeedPercent'},value:'250'},{dataset:{setting:'marshals.song.movementRadius'},value:'700'}];
 function element(tag='div'){
   const children=[],queries=new Map(),node={tag,children,style:{},hidden:false,classList:{remove(){},toggle(){}},setAttribute(){},remove(){nodes.delete(this.id);},append(...items){children.push(...items);for(const item of items)if(item?.id)nodes.set(item.id,item);},appendChild(item){this.append(item);},querySelector(key){if(!queries.has(key))queries.set(key,element());return queries.get(key);},querySelectorAll:()=>fields};
   Object.defineProperty(node,'innerHTML',{set(value){html.push(value);},get(){return '';}});created.push(node);return node;
 }
 const data={settings:config.defaults(),...config.options(),editable:true};
 const scope={window:{},document:{head:element(),body:element(),createElement:element,getElementById:id=>nodes.get(id)},fetch:async(_url,options)=>{if(options?.method==='POST'){saved=JSON.parse(options.body);return {ok:true,json:async()=>({settings:saved})};}return {ok:true,json:async()=>structuredClone(data)};}};
 vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/battlefield.js','utf8'),scope);
 await scope.OnlineBattlefield.settings();
 const markup=html.join('\n');assert.match(markup,/Thời lượng PvP \(phút\)/);assert.match(markup,/data-setting="durationSeconds"[^>]*value="20"/);
 assert.ok(!/data-setting="marshals\.(song|jin)\.(element|skills)/.test(markup));
 const keys=['match','sims','soldiers','marshals','drops'];
 for(const key of keys){
  const tab=created.find(node=>node.id==='public-war-tab-'+key);assert.ok(tab);tab.onclick();
  for(const other of keys)assert.equal(created.find(node=>node.id==='public-war-page-'+other).hidden,other!==key);
 }
 const save=created.find(node=>node.textContent==='Lưu cấu hình lên server');await save.onclick();assert.equal(saved.simPerTeam,11);
 assert.equal(saved.durationSeconds,90);assert.equal(saved.privateDurationSeconds,135);
 assert.deepEqual(Object.keys(saved.marshals.song).sort(),Object.keys(config.defaults().marshals.song).sort());
 assert.equal(saved.marshals.song.hp,456789);assert.equal(saved.marshals.song.res[2],55);
 assert.deepEqual(saved.marshals.jin,saved.marshals.song);
 assert.equal(saved.marshals.jin.stunReduction,60);assert.equal(saved.marshals.jin.attackSpeedPercent,250);assert.equal(saved.marshals.jin.movementRadius,700);
 assert.ok(!markup.includes('data-setting="marshals.jin.'));
 assert.match(markup,/cài đặt chung hai phe/);
});
test('old saved marshal element and skills are migrated away while preserving HP and resistances',()=>{
 const db=new DatabaseSync(':memory:');try{
   const store=createPublicBattlefieldSettings(db),old=config.defaults();old.marshals.song={hp:543210,res:[1,2,3,4,5],element:4,skills:[365]};
   db.prepare('INSERT INTO public_battlefield_settings VALUES(1,?)').run(JSON.stringify(old));
   assert.deepEqual(store.read().marshals.song,{...config.defaults().marshals.song,hp:543210,res:[1,2,3,4,5]});
 }finally{db.close();}
});

test('SIM per team validates independently and old settings retain ten per side',()=>{
 const value=config.defaults();assert.equal(value.simPerTeam,10);
 for(const count of [0,1,10,100])assert.equal(config.validate({...value,simPerTeam:count}).simPerTeam,count);
 for(const count of [-1,101,1.5,NaN,'10'])assert.throws(()=>config.validate({...value,simPerTeam:count}),/SIM mỗi bên/);
 delete value.simPerTeam;assert.equal(config.validate(value).simPerTeam,10);
});

test('marshal defaults migrate old saves and validate percentage and movement settings',()=>{
 const defaults=require('../src/shared/marshal-settings.json'),value=config.defaults();
 for(const team of ['song','jin']){
  assert.deepEqual(Object.fromEntries(Object.keys(defaults).map(k=>[k,value.marshals[team][k]])),defaults);
  const old={...value,marshals:{...value.marshals,[team]:{hp:123456,res:[1,2,3,4,5]}}};
  assert.deepEqual(config.validate(old).marshals[team],{...defaults,hp:123456,res:[1,2,3,4,5]});
  for(const [key,bad]of [['stunReduction',101],['poisonReduction',-1],['coldReduction',NaN],['hurtReduction',101],['attackSpeedPercent',0],['attackSpeedPercent',301],['movementRadius',-1],['movementRadius',1601]]){
   assert.throws(()=>config.validate({...value,marshals:{...value.marshals,[team]:{...value.marshals[team],[key]:bad}}}),/Nguyên soái/);
  }
 }
});
