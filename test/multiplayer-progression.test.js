const {test}=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
const progression=require('../src/server/multiplayer/definitions/progression.cjs');
function store(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');for(const account of ['one','two'])for(const slot of [0,1])db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,slot?'jxidle_2':'jxidle',JSON.stringify({fac:'vo0',lvl:1,xp:0,attrPts:0,skPts:1}));return {db,s:createCharacters(db)};}
test('canonical progression persists GM, joining, learning and potential across reload; stale legacy saves cannot revert it',()=>{
  const {db,s}=store();let n=0;const act=action=>s.mutate('one',0,'command-'+String(++n).padStart(3,'0'),action,true);
  try{
    act({kind:'gm',action:'level150'});let p=act({kind:'join',faction:'shaolin'}).profile;
    assert.equal(p.fac,'shaolin');assert.equal(p.lvl,150);assert.equal(p.attrPts,745);assert.equal(p.skPts,149);
    p=act({kind:'potential',key:'str',amount:12}).profile;assert.equal(p.attr.str,12);assert.equal(p.attrPts,733);
    p=act({kind:'skill',skill:10}).profile;assert.equal(p.sk[10],2);assert.equal(p.skPts,148);
    act({kind:'gm',action:'learn90'});p=act({kind:'gm',action:'learn150'}).profile;assert.ok(p.sk[319]);assert.ok(p.sk[1056]);
    db.prepare('UPDATE account_storage SET value=? WHERE account_id=?').run(JSON.stringify({fac:'vo0',lvl:1,attrPts:0,skPts:1}),'one');
    const reloaded=createCharacters(db).read('one',0).profile;assert.equal(reloaded.lvl,150);assert.equal(reloaded.fac,'shaolin');assert.equal(reloaded.attr.str,12);assert.equal(reloaded.sk[10],2);assert.ok(reloaded.sk[1056]);
    assert.equal(s.read('two',0).profile.lvl,1);assert.equal(s.read('one',1).profile.lvl,1);
  }finally{db.close();}
});
test('commands are idempotent, validated and atomic; profile refresh remains queued until current revision is acknowledged',()=>{
  const {db,s}=store();try{
    const action={kind:'gm',action:'potential'};
    const first=s.mutate('one',0,'same-action',action,true);const again=s.mutate('one',0,'same-action',action,true);
    assert.equal(again.revision,first.revision);assert.equal(again.profile.attrPts,3000);
    assert.throws(()=>s.mutate('one',0,'same-action',{kind:'gm',action:'level150'},true),/đã được dùng/);
    assert.throws(()=>s.mutate('one',0,'bad-budget',{kind:'potential',key:'str',amount:3001},true),/Không đủ/);
    assert.throws(()=>s.mutate('one',0,'bad-key-1',{kind:'potential',key:'hp',amount:1},true),/không hợp lệ/);
    assert.throws(()=>s.mutate('one',0,'bad-skill',{kind:'skill',skill:1056},true),/môn phái/);
    assert.equal(s.read('one',0).revision,first.revision);
    const last=s.mutate('one',0,'next-action',{kind:'potential',key:'vit',amount:1},true);
    s.ackProfile('one',0,first.revision);assert.equal(s.pendingProfiles().length,1);
    assert.equal(createCharacters(db).pendingProfiles()[0].revision,last.revision);
    s.ackProfile('one',0,last.revision);assert.equal(s.pendingProfiles().length,0);
  }finally{db.close();}
});
test('native requirements, skill books, refunds and bulk allocation use the same rules as manual clicks',()=>{
  let p=progression.apply({fac:'vo0',lvl:1},{kind:'gm',action:'level150'},true);
  p=progression.apply(p,{kind:'join',faction:'shaolin'});
  assert.throws(()=>progression.apply(p,{kind:'skill',skill:319}),/bí kíp/);
  assert.throws(()=>progression.apply(p,{kind:'skill',skill:152}),/môn phái/);
  p=progression.apply(p,{kind:'skillRoute',route:'staff'});assert.equal(p.skPts,0);
  p=progression.apply(p,{kind:'potentialRoute',route:'staff'});assert.equal(p.attrPts,0);assert.equal(Object.values(p.attr).reduce((a,b)=>a+b,0),745);
  p=progression.apply(p,{kind:'reset',attributes:true,skills:true});assert.equal(p.attrPts,745);assert.equal(p.skPts,150);
  assert.equal(progression.apply(p,{kind:'gm',action:'potential'},false,'all').attrPts,p.attrPts+3000);
  assert.throws(()=>progression.apply(p,{kind:'gm',action:'potential'},false,'development'),{status:403});
  assert.equal(progression.apply(p,{kind:'gm',action:'potential'},true,'development').attrPts,p.attrPts+3000);
});
test('real XP rewards preserve spent points and learned skills when the next level is committed',()=>{
  const {db,s}=store();try{
    s.mutate('one',0,'gm-points',{kind:'gm',action:'potential'},true);
    s.mutate('one',0,'spend-pts',{kind:'potential',key:'str',amount:10},false);
    s.apply({id:'123-1',account:'one',slot:0,xp:105,gold:1});
    const p=s.read('one',0).profile;assert.equal(p.lvl,2);assert.equal(p.attr.str,10);assert.equal(p.attrPts,2995);assert.equal(p.skPts,2);
    s.apply({id:'123-1',account:'one',slot:0,xp:105,gold:1});assert.equal(s.read('one',0).profile.attrPts,2995);
  }finally{db.close();}
});
test('authenticated production API respects gameMasterMode ("all" vs "development"), isolates accounts and replays mutations only once',async()=>{
  const {openDatabase}=require('../src/server/database.ts'),{createServer}=require('../src/server/index.ts');
  const db=openDatabase(':memory:'),{app}=createServer({db,downloadAssets:false,development:false,gameMasterMode:'all'});
  try{
    const registered=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'progress_user',password:'secret123'}}),account=registered.json().user.id,cookie=registered.headers['set-cookie'].split(';')[0];
    db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify({fac:'vo0',lvl:1,xp:0,attrPts:10,skPts:1}));
    const body={slot:0,id:'api-command',action:{kind:'potential',key:'str',amount:3},account:'spoofed'};
    assert.equal((await app.inject({method:'POST',url:'/api/multiplayer/progression',payload:body})).statusCode,401);
    const call=payload=>app.inject({method:'POST',url:'/api/multiplayer/progression',headers:{cookie},payload});
    const gmCommand={...body,id:'gm-command',action:{kind:'gm',action:'gold'}};
    const gm=await call(gmCommand);assert.equal(gm.statusCode,200);assert.equal(gm.json().profile.gold,1000000000000);
    const gmReplay=await call(gmCommand);assert.equal(gmReplay.json().profile.gold,gm.json().profile.gold);assert.equal(gmReplay.json().revision,gm.json().revision);
    assert.equal((await call({...body,id:'unknown-gm',action:{kind:'gm',action:'arbitrary'}})).statusCode,400);
    const first=await call(body),second=await call(body);assert.equal(first.statusCode,200);assert.equal(second.json().profile.attr.str,3);assert.equal(second.json().revision,first.json().revision);
    assert.equal((await call({...body,slot:-1})).statusCode,400);
    const reload=await app.inject({url:'/api/multiplayer/character?slot=0',headers:{cookie}});assert.equal(reload.json().profile.attrPts,7);assert.equal(reload.json().profile.gold,1000000000000);
  }finally{await app.close();db.close();}
  const restrictedDb=openDatabase(':memory:'),{app:restrictedApp}=createServer({db:restrictedDb,downloadAssets:false,development:false,gameMasterMode:'development'});
  try{
    const cfg=await restrictedApp.inject({url:'/api/config'});
    assert.deepEqual(cfg.json(),{development:false,gameMasterMode:'development'});
    const registered=await restrictedApp.inject({method:'POST',url:'/api/auth/register',payload:{username:'restricted_user',password:'secret123'}}),account=registered.json().user.id,cookie=registered.headers['set-cookie'].split(';')[0];
    restrictedDb.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify({fac:'vo0',lvl:1,xp:0,attrPts:10,skPts:1}));
    const gm=await restrictedApp.inject({method:'POST',url:'/api/multiplayer/progression',headers:{cookie},payload:{slot:0,id:'blocked-gm',action:{kind:'gm',action:'gold'}}});
    assert.equal(gm.statusCode,403);
  }finally{await restrictedApp.close();restrictedDb.close();}
});
test('90 skill metadata matches the browser: one canonical book, zero point cost, training state retained',()=>{
  let p=progression.apply({fac:'vo0',lvl:1},{kind:'gm',action:'level150'},true);p=progression.apply(p,{kind:'join',faction:'shaolin'});
  p.mats||={};p.mats.misc||={};p.mats.misc.bk90=1;const points=p.skPts;
  p=progression.apply(p,{kind:'skill',skill:319});assert.equal(p.sk[319],1);assert.equal(p.skL[319].lv,1);assert.equal(p.skPts,points);assert.equal(p.mats.misc.bk90||0,0);
  assert.throws(()=>progression.apply(p,{kind:'skill',skill:319}),/bí kíp/);
});
test('a Rust refresh failure retains the committed intent; retry does not spend points twice',async()=>{
  const {createServer:controlServer}=require('node:http'),{once}=require('node:events');
  const oldControl=process.env.MULTIPLAYER_WT_CONTROL_URL,oldSecret=process.env.MULTIPLAYER_SECRET;
  let fail=true;const received=[];
  const control=controlServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;res.setHeader('content-type','application/json');if(req.url==='/refresh'){received.push(JSON.parse(body));res.statusCode=fail?503:200;res.end(JSON.stringify(!fail));}else res.end('[]');});
  control.listen(0,'127.0.0.1');await once(control,'listening');
  process.env.MULTIPLAYER_WT_CONTROL_URL=`http://127.0.0.1:${control.address().port}`;process.env.MULTIPLAYER_SECRET='test-refresh-failure-secret-0123456789';
  const {openDatabase}=require('../src/server/database.ts'),{createServer}=require('../src/server/index.ts');
  const db=openDatabase(':memory:'),{app}=createServer({db,downloadAssets:false,development:true});
  try{
    const registered=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'progress_retry',password:'secret123'}}),account=registered.json().user.id,cookie=registered.headers['set-cookie'].split(';')[0];
    db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify({fac:'vo0',lvl:1,xp:0,attrPts:10,skPts:1}));
    const payload={id:'retry-command',slot:0,action:{kind:'potential',key:'str',amount:4}};
    const call=()=>app.inject({method:'POST',url:'/api/multiplayer/progression',headers:{cookie},payload});
    assert.equal((await call()).statusCode,503);
    assert.equal(createCharacters(db).read(account,0).profile.attrPts,6);assert.equal(createCharacters(db).pendingProfiles().length,1);
    fail=false;const response=await call();assert.equal(response.statusCode,200);assert.equal(response.json().profile.attrPts,6);assert.equal(response.json().revision,1);
    assert.ok(received.every(p=>p.revision===1&&p.account===account));assert.equal(createCharacters(db).pendingProfiles().length,0);
  }finally{await app.close();db.close();await new Promise(resolve=>control.close(resolve));if(oldControl===undefined)delete process.env.MULTIPLAYER_WT_CONTROL_URL;else process.env.MULTIPLAYER_WT_CONTROL_URL=oldControl;if(oldSecret===undefined)delete process.env.MULTIPLAYER_SECRET;else process.env.MULTIPLAYER_SECRET=oldSecret;}
});

test('main skill and F slots persist independently through rewards, potion changes and reload',()=>{
  const {db,s}=store();let n=0;const act=action=>s.mutate('one',0,'skill-choice-'+(++n),action,true);
  try{
    act({kind:'gm',action:'level150'});act({kind:'join',faction:'shaolin'});act({kind:'gm',action:'learn150'});
    let chosen=act({kind:'mainSkill',skill:1055}).profile;assert.equal(chosen.main,1055);assert.equal(chosen.mainLock,true);
    const originalSlots=chosen.slots.slice();
    chosen=act({kind:'secondarySkill',skill:1056}).profile;
    assert.equal(chosen.secondarySkill,1056);assert.equal(chosen.main,1055);assert.deepEqual(chosen.slots,originalSlots);
    const before=chosen.slots.slice();chosen=act({kind:'skillSlot',index:2,skill:1056}).profile;
    assert.equal(chosen.slots[2],1056);assert.equal(chosen.main,1055,'rotation slots must not replace the primary');
    s.apply({id:'987-1-0',account:'one',slot:0,xp:50,gold:10000});
    act({kind:'potionBuy',potion:'life',tier:1});
    s.apply({id:'987-2-0',account:'one',slot:0,xp:50,gold:1});
    const reloaded=createCharacters(db).read('one',0).profile;
    assert.equal(reloaded.secondarySkill,1056);
    assert.equal(reloaded.main,1055);assert.equal(reloaded.mainLock,true);assert.equal(reloaded.slots[2],1056);
    assert.equal(act({kind:'mainSkill',skill:1056}).profile.main,1056);
    assert.equal(act({kind:'mainSkill',skill:'basic'}).profile.main,'basic');
    assert.equal(act({kind:'mainSkill',skill:null}).profile.mainLock,false);
    assert.equal(s.read('two',0).profile.main,undefined);
    assert.throws(()=>act({kind:'secondarySkill',skill:1081}),/đã học/);
    assert.throws(()=>act({kind:'secondarySkill',skill:'1055'}),/đã học/);
    assert.throws(()=>act({kind:'mainSkill',skill:1081}),/đã học/);
    assert.throws(()=>act({kind:'mainSkill',skill:'1055'}),/đã học/);
    assert.throws(()=>act({kind:'skillSlot',index:4,skill:1055}),/không hợp lệ/);
    assert.throws(()=>act({kind:'skillSlot',index:0,skill:1081}),/không hợp lệ/);
    const slots=act({kind:'skillSlot',index:1,skill:1056}).profile.slots;
    assert.equal(slots[1],1056);assert.equal(slots.filter(id=>id===1056).length,1);
    assert.equal(act({kind:'skillSlot',index:1,skill:-1}).profile.slots[1],-1);
  }finally{db.close();}
});
test('Wudu curses allocate single/max points, refund and persist atomically without bypassing books',()=>{
  const {db,s}=store();
  try{
    db.prepare('UPDATE account_storage SET value=? WHERE account_id=? AND key=?').run(JSON.stringify({fac:'wudu',lvl:150,skPts:100,sk:{},attrPts:0}),'one','jxidle');
    let p=s.mutate('one',0,'curse-learn-67',{kind:'skill',skill:67}).profile;
    assert.equal(p.sk[67],1);assert.equal(p.skPts,99);
    const result=s.mutate('one',0,'curse-max-67',{kind:'skillMax',skill:67});
    assert.equal(result.profile.sk[67],20);assert.equal(result.profile.skPts,80);
    assert.equal(s.mutate('one',0,'curse-max-67',{kind:'skillMax',skill:67}).revision,result.revision);
    p=createCharacters(db).read('one',0).profile;assert.equal(p.sk[67],20);
    assert.throws(()=>s.mutate('one',0,'curse-no-book',{kind:'skillMax',skill:390}),/bí kíp/);
    assert.throws(()=>s.mutate('one',0,'curse-other-class',{kind:'skillMax',skill:16}),/môn phái/);
    p=s.mutate('one',0,'curse-clear-67',{kind:'unlearnAll',skill:67}).profile;
    assert.equal(p.sk[67]||0,0);assert.equal(p.skPts,100);
  }finally{db.close();}
});


test('war purchases select the slot, cap each slot at forty, charge once, and survive profile reload',()=>{
 const {db,s}=store();try{
  s.mutate('one',0,'war-level-150',{kind:'gm',action:'level150'},true);s.mutate('one',0,'war-fund-gold',{kind:'gm',action:'gold'},true);
  const buy={kind:'warPotionBuy',matchId:99,starts:100,spent:[0,0],slot:0,potion:'life',tier:1,quantity:20};
  const first=s.mutate('one',0,'war-buy-first',buy,true);assert.equal(first.profile.warSupplies.bought[0][1],20);assert.equal(first.profile.warSupplies.selected[0],1);
  assert.ok(first.profile.gold<1000000000000);const replay=s.mutate('one',0,'war-buy-first',{...buy,spent:[1,0]},true);assert.equal(replay.revision,first.revision);assert.equal(replay.profile.gold,first.profile.gold);
  const second=s.mutate('one',0,'war-buy-second',buy,true);assert.throws(()=>s.mutate('one',0,'war-over-cap',buy,true),/40/);
  const mana20=s.mutate('one',0,'war-buy-mana',{...buy,slot:1,potion:'mana'},true);
  const mana24=s.mutate('one',0,'war-buy-mana-four',{...buy,slot:1,potion:'mana',quantity:4},true);
  const unitPrice=(mana20.profile.gold-mana24.profile.gold)/4;
  const mana40=s.mutate('one',0,'war-buy-mana-partial',{...buy,slot:1,potion:'mana'},true);
  assert.equal(mana40.profile.warSupplies.bought[1][101],40);
  assert.equal(mana24.profile.gold-mana40.profile.gold,16*unitPrice,'charge sixteen bottles when x20 fills 24 to 40');
  const replayPartial=s.mutate('one',0,'war-buy-mana-partial',{...buy,slot:1,potion:'mana',spent:[0,1]},true);
  assert.equal(replayPartial.profile.gold,mana40.profile.gold,'partial purchase is charged only once');
  assert.throws(()=>s.mutate('one',0,'war-buy-mana-full',{...buy,slot:1,potion:'mana'},true),/40/);

  const saved=createCharacters(db).read('one',0).profile;assert.equal(saved.warSupplies.bought[0][1],40);assert.equal(saved.warSupplies.bought[1][101],40);
  assert.equal(s.read('two',0).profile.warSupplies,undefined);
  const beforeRefill=s.read('one',0).profile;const refilled=s.mutate('one',0,'war-after-use',{...buy,spent:[1,0],quantity:20},true);assert.equal(refilled.profile.warSupplies.bought[0][1],41);assert.equal(beforeRefill.gold-refilled.profile.gold,(first.profile.gold-second.profile.gold)/20);
 }finally{db.close();}
});

test('all production GM grants persist level, skills, points, currency, merit and chests when gameMasterMode is all',()=>{
 const {db,s}=store();try{
  assert.throws(()=>s.mutate('one',0,'dev-only-gm',{kind:'gm',action:'gold'},false,'development'),{status:403});
  const grant=action=>s.mutate('one',0,'prod-gm-'+action,{kind:'gm',action},false,'all').profile;
  assert.throws(()=>grant('chest'),/gia nhập môn phái/);
  let p=grant('level150');assert.equal(p.lvl,150);
  s.mutate('one',0,'prod-join-sect',{kind:'join',faction:'shaolin'},false,'all');
  for(const action of ['learn90','learn120','learn150','max90'])p=grant(action);
  assert.ok(Object.keys(p.sk).length>0);const points=p.attrPts;
  p=grant('potential');assert.equal(p.attrPts,points+3000);
  p=grant('gold');assert.equal(p.gold,1000000000000);
  p=grant('knb');assert.equal(p.knb,100000);
  p=grant('warMerit');assert.equal(p.mats.misc.tk_merit,10000);
  p=grant('xp');p=grant('chest');
  const chest=p.inv.find(i=>i.ktc?.k==='gm_hk_shaolin');assert.equal(chest?.ktc.c,100);
  p=s.mutate('one',0,'prod-gm-open-chest',{kind:'gm',action:'openChest',uid:chest.uid},false,'all').profile;
  assert.equal(p.inv.find(i=>i.uid===chest.uid)?.ktc.c,99);
  const reward=p.inv.at(-1);assert.equal(reward?.lock,true);assert.equal(reward?.r,4);
  const goldBeforeSale=p.gold;
  p=s.mutate('one',0,'prod-gm-quick-sale',{kind:'gm',action:'quickSale',uid:reward.uid},false,'all').profile;
  assert.ok(!p.inv.some(i=>i.uid===reward.uid));assert.ok(p.gold>goldBeforeSale);
  const saved=createCharacters(db).read('one',0).profile;assert.deepEqual(saved,p);
  assert.equal(s.read('two',0).profile.gold||0,0);
 }finally{db.close();}
});

test('GM gold, KNB and XP survive canonical profile recreation and stale browser saves',()=>{
 const {db,s}=store();try{
  for(const action of ['gold','knb','xp'])s.mutate('one',0,'gm-money-'+action,{kind:'gm',action},true);
  const before=s.read('one',0).profile;db.prepare('UPDATE account_storage SET value=? WHERE account_id=?').run(JSON.stringify({fac:'vo0',lvl:1,gold:0,knb:0,xp:0}),'one');
  const after=createCharacters(db).read('one',0).profile;for(const key of ['gold','knb','lvl','xp'])assert.equal(after[key],before[key]);
 }finally{db.close();}
});
