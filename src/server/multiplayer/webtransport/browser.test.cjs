// Actual game, two accounts, pinned QUIC, binary protocol and real mouse input.
// Build Rust first. Set PLAYWRIGHT_MODULE if Playwright is installed outside this repo.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const net = require('node:net'), dgram = require('node:dgram');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname,'../../../..');
async function tcpPort() {
  const server=net.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}
async function udpPort() {
  const socket=dgram.createSocket('udp4');socket.bind(0,'127.0.0.1');await once(socket,'listening');
  const port=socket.address().port;socket.close();return port;
}
async function ready(url,child,logs) {
  for(let i=0;i<100;i++) {
    if(child.exitCode!==null) throw new Error(logs());
    try{if((await fetch(url)).ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error(`Server did not start: ${logs()}`);
}
test('game WebTransport binary: two human accounts, movement, rooms, appearance and reconnect', {timeout:180000}, async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vltk-online-'));
  await fs.mkdir(path.join(root,'output/multiplayer'),{recursive:true});
  const [http,control,udp]=await Promise.all([tcpPort(),tcpPort(),udpPort()]);
  const base=`http://127.0.0.1:${http}`,secret=randomBytes(32).toString('hex');
  let logs='';const clientTraces=[];
  const rust=spawn(path.join(__dirname,'target/debug/vltk-multiplayer-webtransport'),[],{cwd:root,env:{...process.env,
    ONLINE_DEBUG:"1",PVE_OUTBOX_FILE:path.join(directory,"outbox.jsonl"),MULTIPLAYER_SECRET:secret,WT_ORIGINS:base,WT_HTTP_BIND:`127.0.0.1:${control}`,WT_BIND:`127.0.0.1:${udp}`,
    WT_PUBLIC_URL:`https://127.0.0.1:${udp}/play`},stdio:['ignore','pipe','pipe']});
  const node=spawn(process.execPath,['src/server/index.ts'],{cwd:root,env:{...process.env,NODE_ENV:'development',
    PORT:String(http),DB_PATH:path.join(directory,'game.sqlite'),MULTIPLAYER_SECRET:secret,
    MULTIPLAYER_WT_CONTROL_URL:`http://127.0.0.1:${control}`},stdio:['ignore','pipe','pipe']});
  for(const child of [rust,node]) for(const output of [child.stdout,child.stderr]) output.on('data',bytes=>{logs+=bytes;});
  let browser;const errors=[];
  t.after(async()=>{
    await fs.mkdir(path.join(root,'output/multiplayer'),{recursive:true});
    const server=logs.split('\n').filter(line=>line.startsWith('[online:server] ')).flatMap(line=>{try{return [JSON.parse(line.slice(16))];}catch{return [];}});
    await fs.writeFile(path.join(root,'output/multiplayer/trace-'+(process.env.SKILL_FACTION||'kunlun')+'.json'),JSON.stringify({passed:t.passed!==false,server,client:clientTraces},null,2));
    if(errors.length)console.error(errors);
    if(t.passed===false)console.error(logs.slice(-6000));
    await browser?.close();
    for(const child of [rust,node]) {if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await once(child,'exit').catch(()=>{});}}
    await fs.rm(directory,{recursive:true,force:true});
  });
  await ready(`http://127.0.0.1:${control}/health`,rust,()=>logs);
  await ready(base+'/api/health',node,()=>logs);
  if(process.env.LIFECYCLE_TEST==='1'||process.env.AUTOMATION_TEST==='1'){
    const definitions=structuredClone(require('../definitions/catalog.cjs').world());
    for(const map of definitions.maps){
      if(process.env.LIFECYCLE_TEST==='1')map.monsters=[];
      else for(const mob of map.monsters){mob.hp=100;mob.damage=20;mob.cooldown=1.5;}
    }
    const response=await fetch(`http://127.0.0.1:${control}/catalog`,{method:'POST',headers:{'content-type':'application/json','x-multiplayer-secret':secret},body:JSON.stringify(definitions)});
    assert.ok(response.ok);
  }
  browser=await chromium.launch({headless:true,args:['--enable-quic']});
  async function player(username,name,advanced=false) {
    const context=await browser.newContext({viewport:{width:1280,height:850},serviceWorkers:process.env.ONLINE_TEST_SW==='1'?'allow':'block'});
    const register=await context.request.post(base+'/api/auth/register',{data:{username,password:'test-secret-123'}});
    assert.equal(register.status(),200,await register.text());
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{const line=message.text();if(line.startsWith('[online:client] ')){try{clientTraces.push({client:username,...JSON.parse(line.slice(16))});}catch{}}});
    // Observe game state without shipping debug globals in the production bundle.
    await page.route('**/app/game.js?*',async route=>{
      const response=await route.fetch();let body=await response.text();
      body=body.replace('const client = GameWebTransport.createClient({','const client = window.__onlineClient = GameWebTransport.createClient({');
      const at=body.lastIndexOf('\n})();');assert.ok(at>0);
      body=body.slice(0,at)+`
      window.__onlineDraws=0;
      window.__skillDraws={};window.__skillAttempts={};
      let drawingSkill=0;
      for(const kind of ['YP','CP']){
        const original=kind==='YP'?YP:CP;
        const draw=function(effect){const previous=drawingSkill;drawingSkill=effect.combat?.skill?.id||0;
          if(drawingSkill)window.__skillAttempts[drawingSkill]=(window.__skillAttempts[drawingSkill]||0)+1;
          try{return original(effect);}finally{drawingSkill=previous;}};
        if(kind==='YP')YP=draw;else CP=draw;
      }
      const originalDrawImage=W.drawImage;
      W.drawImage=function(...args){if(drawingSkill)window.__skillDraws[drawingSkill]=(window.__skillDraws[drawingSkill]||0)+1;return originalDrawImage.apply(this,args);};
      window.__guardFrames={};let drawingGuard=null;
      const originalSprite=Va;Va=function(...args){const previous=W.drawImage;if(drawingGuard&&args[1]==='run'){const id=drawingGuard.id;W.drawImage=function(...imageArgs){(window.__guardFrames[id]||=new Set()).add(imageArgs[1]);return previous.apply(this,imageArgs);};}try{return originalSprite(...args);}finally{W.drawImage=previous;}};
      window.__simCompositeDraws=0;let drawingSIM=false;const originalWarDraw=OnlineBattlefield.draw;OnlineBattlefield.draw=function(...args){drawingSIM=args[1].kind===1;drawingGuard=args[1].kind===2?args[1]:null;try{return originalWarDraw(...args);}finally{drawingSIM=false;drawingGuard=null;}};const originalComposite=It;It=function(...args){const result=originalComposite(...args);if(drawingSIM&&args[8]&&result)window.__simCompositeDraws++;return result;};
      window.__onlineColors={};window.__onlineHealth={};window.__supportDraws={};window.__selfSupportDraws={};
      const originalNameplate=L3,originalSupport=F3;
      L3=function(x,y,name,color,...rest){window.__onlineColors[name]=color;window.__onlineHealth[name]=rest[2];return originalNameplate(x,y,name,color,...rest);};
      F3=function(...args){if(args[8]&&args[8]!==v)window.__supportDraws[args[1].f]=args[1].pos;if(args[8]===v&&bA(args[1].f)?.naturalWidth)window.__selfSupportDraws[args[1].f]=args[1].pos;return originalSupport(...args);};
      const originalOnlineDraw=gameMultiplayer.draw;
      gameMultiplayer.draw=function(...args){window.__onlineDraws++;return originalOnlineDraw(...args);};
      window.__castEvents=[];window.__resolvedHits=[];const seenHits=new Set();
      const realSnapshot=onlineWorld.snapshot;
      onlineWorld.snapshot=function(state){
        for(const event of state.events)if(event.kind===1&&!window.__castEvents.some(e=>e.id===event.id))window.__castEvents.push(event);
        for(const event of state.events)if(event.kind===2&&!seenHits.has(event.id)){
          seenHits.add(event.id);window.__resolvedHits.push({...event,maxHp:state.monsters.find(m=>m.id===event.target)?.maxHp});
        }
        if(window.__snapshotDelay)setTimeout(()=>realSnapshot(state),window.__snapshotDelay);else realSnapshot(state);};
      window.__onlineTest={
        visualProbe:async()=>{
          const result=[],realWorld=l,realHero=v,realInput=Y,realProfile=o,realTown=l.town;
          const saved=JSON.stringify({life:l.life,mana:l.mana,xp:o.xp,gold:o.gold,inv:o.inv,target:Y.target});
          // The module namespace is immutable; observe native FX in the shared render queue.
          const ids=Object.keys(T).filter(id=>UA(T[id])&&A0.f[id]);
          l.town=false;
          try { for(const id of ids)for(const level of [1,25]){
            const probe=OnlineSkillVisuals(),native=F2(l.P,T[id],level),savedFX=l.fx.slice(),start=l.fx.length;
            const event={id:1,source:100,target:200,skill:+id,kind:1,tick:1,value:0,
              cast:{level,missiles:Math.max(1,Math.min(16,native.nMis||1)),flags:(native.melee?1:0)|(native.phys?2:0),range:native.rad||200,x:v.x,y:v.y,targetX:v.x+120,targetY:v.y+40}};
            probe.sync({self:100,actors:[{id:100,x:v.x,y:v.y}],monsters:[{id:200,x:v.x+120,y:v.y+40,hp:100}]});
            try{
              await probe.play(event,{faction:T[id].f,sex:0});
              const observed=new Set(l.fx.slice(start));
              for(let i=0;i<100;i++){probe.advance(.04);for(const fx of l.fx)observed.add(fx);}
              const fx=[...observed];
              if(!fx.length)throw Error('No native FX');
              for(const e of fx)for(const key of ['x','y','tx','ty'])if(e[key]!==undefined&&!Number.isFinite(e[key]))throw Error('Invalid FX coordinate '+key);
              result.push({id:+id,level,effects:fx.length,kinds:[...new Set(fx.map(e=>e.k))]});
            }catch(error){throw Error('Skill '+id+' level '+level+': '+error.message);}
            finally{probe.reset();l.fx=savedFX;}
            if(l!==realWorld||v!==realHero||Y!==realInput||o!==realProfile)throw Error('Visual context leaked');
          }
          } finally { l.town=realTown; }
          if(JSON.stringify({life:l.life,mana:l.mana,xp:o.xp,gold:o.gold,inv:o.inv,target:Y.target})!==saved)throw Error('Cosmetic replay changed gameplay');
          return result;
        },
        proximityProbe:async()=>{
          const result=[],town=l.town,saved=l.fx; l.town=false;
          try{for(const id of [1063,1080,1081]){
            const probe=OnlineSkillVisuals(),native=F2(l.P,T[id],25);l.fx=[];
            probe.sync({self:100,actors:[{id:100,x:v.x,y:v.y}],monsters:[{id:200,x:v.x+2,y:v.y,hp:100}]});
            await probe.play({id:1,source:100,target:200,skill:id,cast:{level:25,missiles:native.nMis||1,flags:(native.melee?1:0)|(native.phys?2:0),range:native.rad||512,x:v.x,y:v.y,targetX:v.x+2,targetY:v.y}},{faction:T[id].f,sex:0});
            const original=W.drawImage;let draws=0;
            W.drawImage=function(...args){draws++;return original.apply(this,args);};
            try{for(let frame=0;frame<20;frame++){probe.advance(1/60);for(const effect of l.fx){if(effect.k==='jm')YP(effect);else if(effect.k==='mis'||effect.k==='boom')CP(effect);}}}
            finally{W.drawImage=original;probe.reset();}
            result.push({id,draws});
          }}finally{l.town=town;l.fx=saved;}
          return result;
        },
        equipmentSetup:async()=>{await OnlineProgression.run({kind:'gm',action:'level150'});await OnlineProgression.run({kind:'join',faction:'shaolin'});await OnlineProgression.run({kind:'gm',action:'knb'});await OnlineProgression.run({kind:'potential',key:'str',amount:200});o.autoRide=false;},
        primarySetup:async()=>{await OnlineProgression.run({kind:'gm',action:'level150'});if(I[o.fac]?.novice)await OnlineProgression.run({kind:'join',faction:'shaolin'});if(o.eq.weapon)await OnlineProgression.run({kind:'unequip',slot:'weapon'});await OnlineProgression.run({kind:'gm',action:'learn150'});if(!o.sk[10])await OnlineProgression.run({kind:'skill',skill:10});await OnlineProgression.run({kind:'skillSlot',index:0,skill:10});await OnlineProgression.run({kind:'skillSlot',index:1,skill:1055});o.rot=false;o.potOff=true;$();},
        secondarySetup:async()=>{await OnlineProgression.run({kind:'skillSlot',index:2,skill:-1});await OnlineProgression.run({kind:'skillSlot',index:3,skill:-1});},
        dialogState:()=>({current:C2,tab:PA,win:document.body.classList.contains('u20win'),bag:dn(),party:!!document.getElementById('online-party')&&!document.getElementById('online-party').hidden,pots:o.potUsed||0,rot:o.rot,map:Z0.key,ctrl:o.ctrl}),
        secondaryChoice:()=>({skill:o.secondarySkill,main:o.main,slots:o.slots.slice(),mana:l.mana,cost:l.P.actives.find(s=>s.id===o.secondarySkill)?.cost,town:l.town}),
        skillDetails:id=>R8(id),
        equipmentPotentialSetup:async()=>{
          await OnlineProgression.run({kind:'gm',action:'level150'});
          if(I[o.fac]?.novice)await OnlineProgression.run({kind:'join',faction:'shaolin'});
          await OnlineProgression.run({kind:'equipmentTrader',operation:'item',selection:{kind:'blue',sex:o.sex||0,level:10,item:'5:0',series:0,lines:[111]}});
          const item=o.inv.find(i=>i.d===5);return {uid:item.uid,need:bt(item),attr:structuredClone(o.attr),points:o.attrPts};
        },
        equipmentDetail:uid=>He(xs(uid)),
        equipmentOpen:()=>equipmentTrader.open(),
        horseOpen:()=>horseTrader.open(),
        equipmentState:()=>({eq:structuredClone(o.eq),inv:structuredClone(o.inv),uid:o.uid,knb:o.knb,mounted:l.mounted,localSpeed:150*Ra(),serverSpeed:onlineWorld.state?.movement.speed}),
        equip:async uid=>{J1(o.inv.find(item=>item.uid===uid));await OnlineProgression.flush();},
        mount:async enabled=>{l.rideCd=0;Ka(enabled);await OnlineProgression.flush();},
        closeModal:()=>n0(true),
        staleProgressionSave:async()=>{o.lvl=150;o.stage=700;o.maxStage=700;o.autoMap=true;$();await window.localGameStorage?.flush();},
        progression:()=>({lvl:o.lvl,xp:o.xp,fac:o.fac,attr:structuredClone(o.attr),attrPts:o.attrPts,sk:structuredClone(o.sk),skPts:o.skPts,stage:o.stage,map:Z0.key,mapLevel:AA(o.stage).lo}),
        state:()=>({x:v.x,y:v.y,map:Z0.key,pve:onlineWorld.state,status:window.__onlineClient?.online,remote:gameMultiplayer.entities().filter(e=>e.remotePlayer).map(e=>e.remotePlayer),draws:window.__onlineDraws,
          target:Y.target,blocked:i0.blocked,hidden:document.hidden,modal:document.getElementById('modal').className}),
        assistant:()=>Hr('basic'),automationState:()=>({used:o.potUsed,gold:o.gold,hp:l.life,mp:l.mana,auto:o.ctrl,potOff:o.potOff,potHp:o.potHp,potMp:o.potMp}),
        minimapLabel:()=>{const labels=[],original=W.fillText;W.fillText=function(text,...args){labels.push(text);return original.call(this,text,...args);};try{SP(W);}finally{W.fillText=original;}return labels;},
        mapPresentation:()=>({map:Z0.key,bg:l.bgImg?.src,ready:!!l.bgImg?.complete&&!!l.bgImg?.naturalWidth,scene:mapScene.hasMap()}),
        publicSprites:()=>gameMultiplayer.entities().filter(e=>e.remotePlayer?.battlefieldUnit).map(e=>{const a=e.remotePlayer,anim=(a.kind===1?Jt(a.f,a.s):r0[a.skin])?.anim;return {id:a.id,kind:a.kind,action:a.act,time:a.actT,run:!!E0.anim?.[anim]?.run,stand:!!E0.anim?.[anim]?.st};}),
        simOutfitProbe:()=>{
          let canvas=document.getElementById('sim-outfit-probe');if(!canvas){canvas=document.createElement('canvas');canvas.id='sim-outfit-probe';canvas.width=1100;canvas.height=400;canvas.style.cssText='position:fixed;left:0;top:0;z-index:250000';document.body.appendChild(canvas);}
          const ctx=canvas.getContext('2d');ctx.fillStyle='#20251d';ctx.fillRect(0,0,1100,400);const previous=W;W=ctx;let loaded=0;
          try{const units=onlineWorld.state.battlefield.units.filter(u=>u.kind===1&&u.team===0);units.forEach((u,i)=>{const look=lB({sx:u.appearance.sx,ride:0,r:u.appearance.rows});look.mg=u.appearance.mg;const x=110+i%5*220,y=165+Math.floor(i/5)*200;if(It('st',0,.2,x,y,2,1,Jt(u.faction,u.sex)?.anim,look))loaded++;ctx.fillStyle='#f3d88a';ctx.textAlign='center';ctx.font='14px monospace';ctx.fillText(u.name,x,25+Math.floor(i/5)*200);});}finally{W=previous;}return loaded;
        },
        recruitNPC:team=>equipmentTrader.entities().find(n=>n.mapNpc?.npcId===(team===0?'song-recruiter':'jin-recruiter')).onInteract(),
        gm:action=>gameMaster.grant(action),purse:()=>({gold:o.gold,knb:o.knb,xp:o.xp,lvl:o.lvl}),
        publicPharmacy:()=>equipmentTrader.entities().find(n=>n.mapNpc?.npcId==='pharmacy').onInteract(),
        warStock:()=>[OnlineBattlefield.slot(0),OnlineBattlefield.slot(1)],warAuto:()=>o.ctrl,warWalk:()=>Y.moveTarget(v.x+40,v.y),warQuietPotions:()=>{o.potOff=true;},
        respawnPreview:()=>{window.__snapshotDelay=2000;const next=structuredClone(onlineWorld.state);next.actors.find(a=>a.id===next.self).hp=0;next.battlefield.respawnRemaining=5;OnlineBattlefield.sync(next,()=>0);},
        respawnPreviewEnd:()=>{window.__snapshotDelay=0;OnlineBattlefield.sync(onlineWorld.state,()=>0);},
        publicPanel:()=>arenaSimulator.openSettings(),publicJoin:team=>onlineWorld.joinBattlefield(team),publicLeave:()=>onlineWorld.leaveBattlefield(),publicRanking:()=>OnlineBattlefield.ranking(),
        battlefieldStart:()=>arenaSimulator.battlefield.start('song'),battlefieldExit:()=>arenaSimulator.battlefield.reset(),
        town:()=>nc(true),field:()=>en(AA(1)),travelReady:()=>!(l.tpCd>0),
        travel:id=>{const index=k0.findIndex(z=>z.id===id);if(index<0)throw Error('Unknown map');return On(index,'Travel test',false,true);},
        screen:(x,y)=>{const r=lA.getBoundingClientRect();return {x:r.left+(x-B0.x)*$8(),y:r.top+(y-B0.y)*$8()};},
        monsterTarget:()=>{const m=l.enemies.filter(e=>!e.dead).sort((a,b)=>Math.hypot(a.x-v.x,a.y-v.y)-Math.hypot(b.x-v.x,b.y-v.y))[0];const r=lA.getBoundingClientRect();return {id:m.id,x:r.left+(m.x-B0.x)*$8(),y:r.top+(m.y-20-B0.y)*$8()};},
        tutorialDone:()=>{o.tut=999;},
        coldChildAssets:id=>{
          const files=skillId=>{const effect=A0.f?.[skillId],missile=A0.m?.[effect?.c||A0.s?.[skillId]];return Object.values(missile||{}).filter(s=>s&&typeof s==='object'&&s.f).map(s=>s.f);};
          const primary=new Set(files(id));
          const children=[...new Set([T[id]?.child,...F5(F2(l.P,T[id],25)).map(e=>e.sid)].flatMap(files))].filter(url=>!primary.has(url));
          for(const url of children)delete of[url];return children;
        },
        cameraAway:()=>{rf=()=>[-10000,-10000];},
        follow:id=>{rf=()=>{const p=onlineWorld.state?.actors.find(a=>a.id===id)||v;return [E(p.x-M0.w/2,0,Math.max(0,O0.w-M0.w)),E(p.y-M0.h*.55,0,Math.max(0,O0.h-M0.h))];};},
        farm:()=>onlineWorld.farm(true),
        stop:()=>onlineWorld.farm(false),
        deathWallet:async()=>{await OnlineProgression.run({kind:'gm',action:'gold'});return o.gold;},initialPosition:{x:v.x,y:v.y,map:Z0.key},
        moveProbe:()=>{const [x,y]=X0(v.x+90,v.y+35);onlineWorld.move(x,y);return {x,y};},
        controls:()=>({ctrl:o.ctrl,main:o.main,locked:o.mainLock,effective:l.P.main?.id,slots:o.slots}),
        fxState:()=>({self:onlineWorld.state?.actors.find(a=>a.id===onlineWorld.state.self),draws:window.__skillDraws,attempts:window.__skillAttempts,town:l.town,zone:l.zoneShown,fx:l.fx.map(e=>({kind:e.k,id:e.combat?.skill?.id,age:e.age,life:e.life,frame:e.t,sprite:e.s?.f||e.m?.fly?.f,zone:e.combat?.zone}))}),
        stats:()=>({stats:j0(),profile:structuredClone(o),allies:nm()}),
        skillDetail:id=>R8(id),
        curseReady:async()=>{for(const id of [67,70,64,73,356,72])if((o.sk[id]||0)<20)await OnlineProgression.run({kind:'skillMax',skill:id});await OnlineProgression.run({kind:'gm',action:'learn90'});await OnlineProgression.run({kind:'secondarySkill',skill:72});},
        curseAuto:enabled=>{o.autoCurse=enabled;},
        curseView:()=>({self:v.curse,monsters:l.enemies.map(m=>({id:m.id,curse:m.curse,level:m.curseL})),hud:a6()}),
        alliedBuffs:()=>({allies:nm(),hud:a6(),sprites:JP().map(s=>s.f),self:onlineWorld.state?.actors.find(a=>a.id===onlineWorld.state.self)}),
        supportFiles:ids=>ids.map(id=>U1[id]?.f).filter(Boolean),
        prepareSkill:async advanced=>{
          o.potOff=true;o.potStock={life:{1:10},mana:{1:10},both:{1:3}};o.potSlot=['life:1','mana:1'];
          o.ctrl='manual';o.fac=advanced==='cuiyan'?'cuiyan':advanced?'kunlun':'shaolin';
          if(advanced){o.lvl=158;o.sk={171:20,173:20,372:20,375:20,1080:25,1081:25};o.slots=[1080,1081,375,-1];o.main=1081;
            o.eq.weapon={d:0,k:1,lvl:10,g:0,n:'Fixture sword',nat:0,base:[],mods:[],magic:[]};}
          if(advanced==='cuiyan'){o.sk={269:20,100:20,109:20,99:19,105:20,108:20,114:30,336:20,1063:25};o.slots=[1063,336,108,-1];o.main=1063;}
          else if(!advanced){o.sk[216]=1;o.main=216;o.slots[0]=216;}
          if(advanced==='emei'){o.fac='emei';o.sex=1;o.sk={252:20,93:20,86:20,89:20,92:20,282:20,332:20};o.main=252;o.slots=[252,-1,-1,-1];o.bkOk={332:1};o.skL={332:{lv:20,xp:0}};}
          if(advanced==='shaolin-support'){o.fac='shaolin';o.sk={10:20,15:20,16:20,273:20};o.main=10;o.slots=[10,-1,-1,-1];}
          if(advanced==='wudu'){o.fac='wudu';o.sk={63:20};o.main=63;o.slots=[63,-1,-1,-1];o.skPts=200;o.autoCurse=false;}
          if(advanced)o.attr.vit=2000;
          if(${process.env.AUTOMATION_TEST==='1'}){o.lvl=10;o.sk[10]=1;o.main=10;o.slots=[10,-1,-1,-1];o.gold=100000;o.potStock={};o.autoMap=false;}
          o.mainLock=true;l.dirty=true;D0();$();await window.localGameStorage?.flush();
        },
        unlockSkill:()=>{o.mainLock=false;l.dirty=true;D0();return o.slots.findIndex(id=>T[id]&&UA(T[id]));},
        outfit:()=>{o.sex=1;l.jx=null;},
        faction:(f)=>{o.fac=f;},
        support:(enabled)=>{
          const picked={},ids=[];
          for(const id of Object.keys(U1)){
            const skill=T[id],sprite=U1[id];
            if(!skill||UA(skill)||wn(skill)!=='passive'||picked[sprite.pos])continue;
            picked[sprite.pos]=true;ids.push(+id);o.sk[id]=enabled?1:0;ba().buff[id]=enabled?ya()+60:0;
          }
          l.stKey=null;
          return JP().map(sprite=>sprite.f);
        },
        target:()=>{const [x,y]=X0(v.x+90,v.y+35);const rect=lA.getBoundingClientRect();
          return {x:rect.left+(x-B0.x)*$8(),y:rect.top+(y-B0.y)*$8()};}
      };`+body.slice(at);
      await route.fulfill({response,body});
    });
    let preparedSkill=false;
    await page.route('**/api/multiplayer/webtransport/session',async route=>{
      if(!preparedSkill){
        preparedSkill=true;
        // Import one learned level-zero-requirement attack with the original save,
        // so Rust's canonical profile and the browser have the same skill catalog.
        if(process.env.PROGRESSION_TEST!=='1')await page.evaluate(value=>window.__onlineTest.prepareSkill(value),advanced);
      }
      if(process.env.LIFECYCLE_TEST==='1')await new Promise(resolve=>setTimeout(resolve,1500));
      await route.continue();
    });
    await page.goto(base);
    await page.waitForSelector('#csNew, #ncName');
    if(await page.locator('#csNew').isVisible()) await page.locator('#csNew').click();
    await page.locator('#ncName').fill(name);await page.locator('#ncGo').click();
    await page.waitForFunction(()=>window.__onlineClient?.online,null,{timeout:60000});
    const understood=page.getByRole('button',{name:'Đã hiểu',exact:true});
    if(await understood.isVisible())await understood.click();
    await page.evaluate(()=>window.__onlineTest.tutorialDone());
    if(await page.locator('#mClose').isVisible())await page.locator('#mClose').click();
    await page.evaluate(()=>window.__onlineTest.town());
    const parity=await page.evaluate(()=>window.__onlineTest.stats());
    const nativeStats=require('../definitions/runtime.cjs').buildCharacter(parity.profile,[],null,parity.allies||[]).stats;
    assert.equal(parity.stats.life,nativeStats.life,'browser/server HP uses identical profile bonuses');
    for(const skill of parity.stats.actives){
      const server=nativeStats.actives.find(s=>s.id===skill.id);
      assert.ok(server,'same learned skill eligibility '+skill.id);
      assert.deepEqual(skill.parts,server.parts,'browser/server damage parts '+skill.id);
    }
    return {page,context,account:(await register.json()).user.id};
  }
  const a=await player('online_a','Kiếm Khách',process.env.CURSE_TEST==='1'?'wudu':false),b=await player('online_b','Nữ Hiệp',process.env.PARTY_TEST==='1'?'cuiyan':process.env.ALLIED_SUPPORT_TEST==='1'?'emei':false);
  await a.page.waitForTimeout(1700);
  for(const {page} of [a,b]) await page.waitForFunction(()=>window.__onlineTest.state().remote.length===1);
  assert.ok((await a.page.evaluate(()=>window.__onlineTest.state())).draws>0);
  if(process.env.PUBLIC_WAR_TEST==='1'){
    await b.page.evaluate(()=>window.__onlineTest.gm('knb'));
    const gmBalance=await b.page.evaluate(()=>window.__onlineTest.purse());
    await a.page.screenshot({path:path.join(root,'output/multiplayer/recruiters.png')});
    await a.page.evaluate(()=>window.__onlineTest.recruitNPC(0));
    assert.ok((await a.page.locator('#public-war-recruitment').innerText()).includes('Tống Quốc Chiêu Binh quan'));
    assert.equal(await a.page.locator('#public-war-recruitment select').count(),0);
    await a.page.click('#public-war-recruit-join');
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve?.battlefield?.phase==='running'&&window.__onlineTest.state().map===9003,null,{timeout:15000});
    await a.page.waitForFunction(()=>window.__onlineTest.mapPresentation().ready);
    assert.match((await a.page.evaluate(()=>window.__onlineTest.mapPresentation())).bg,/9003\/assets\/ground/);
    assert.ok((await a.page.evaluate(()=>window.__onlineTest.minimapLabel())).includes('Tống Kim · Hoang Nguyên'));
    await a.page.waitForFunction(()=>document.querySelector('#u20zn')?.textContent==='Tống Kim · Hoang Nguyên');
    const sprites=await a.page.evaluate(()=>window.__onlineTest.publicSprites());
    assert.equal(sprites.length,90);assert.ok(sprites.every(s=>s.run&&s.stand),'all SIM and soldiers have native moving and standing sprites');
    const first=await a.page.evaluate(()=>window.__onlineTest.state().pve);
    assert.equal(first.battlefield.units.filter(u=>u.kind===1&&u.team===0).length,10);
    assert.equal(first.battlefield.units.filter(u=>u.kind===1&&u.team===1).length,10);
    assert.equal(first.battlefield.units.filter(u=>u.kind===2).length,70);
    assert.deepEqual(first.battlefield.potions,[0,0]);
    await a.page.evaluate(()=>window.__onlineTest.warQuietPotions());
    await a.page.evaluate(()=>window.__onlineTest.gm('gold'));
    await a.page.evaluate(()=>window.__onlineTest.publicPharmacy());
    await a.page.locator('#public-war-pharmacy [data-quantity="20"]').first().click();
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve.battlefield.potions[0]===20);
    await a.page.waitForFunction(()=>document.querySelector('#public-war-shop-message')?.textContent==='Đã mua thuốc và chọn vào ô.');
    await a.page.locator('#public-war-pharmacy [data-quantity="20"]').first().click();
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve.battlefield.potions[0]===40);
    await a.page.locator('#public-war-pharmacy [data-war-slot="1"]').click();
    await a.page.waitForFunction(()=>document.querySelector('#public-war-shop-message')?.textContent==='Đã mua thuốc và chọn vào ô.');
    await a.page.locator('#public-war-pharmacy [data-quantity="20"]').first().click();
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve.battlefield.potions[1]===20);
    await a.page.waitForFunction(()=>document.querySelector('#public-war-shop-message')?.textContent==='Đã mua thuốc và chọn vào ô.');
    const gold20=(await a.page.evaluate(()=>window.__onlineTest.purse())).gold;
    for(let count=21;count<=24;count++){
      await a.page.locator('#public-war-pharmacy [data-quantity="1"]').first().click();
      await a.page.waitForFunction(n=>window.__onlineTest.state().pve.battlefield.potions[1]===n,count);
      await a.page.waitForFunction(()=>document.querySelector('#public-war-shop-message')?.textContent==='Đã mua thuốc và chọn vào ô.');
    }
    const gold24=(await a.page.evaluate(()=>window.__onlineTest.purse())).gold;
    assert.equal(await a.page.locator('#public-war-pharmacy [data-quantity="20"]').first().isEnabled(),true);
    await a.page.locator('#public-war-pharmacy [data-quantity="20"]').first().click();
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve.battlefield.potions[1]===40);
    await a.page.waitForFunction(()=>document.querySelector('#public-war-shop-message')?.textContent==='Đã mua thuốc và chọn vào ô.');
    assert.equal(gold24-(await a.page.evaluate(()=>window.__onlineTest.purse())).gold,(gold20-gold24)/4*16);
    assert.equal(await a.page.locator('#public-war-pharmacy [data-quantity="20"]').first().isDisabled(),true);
    await a.page.waitForFunction(()=>document.querySelector('#bHp em')?.textContent==='40'&&document.querySelector('#bMp em')?.textContent==='40');
    assert.ok((await a.page.evaluate(()=>window.__onlineTest.warStock())).every(s=>s.n===40&&s.ic));
    await a.page.screenshot({path:path.join(root,'output/multiplayer/public-pharmacy.png')});
    await a.page.locator('#public-war-pharmacy .war-close').click();
    if(await a.page.evaluate(()=>window.__onlineTest.warAuto())!=='auto')await a.page.locator('#ctrlBtn').click();
    await a.page.evaluate(()=>window.__onlineTest.warWalk());await a.page.waitForTimeout(700);
    assert.equal(await a.page.evaluate(()=>window.__onlineTest.warAuto()),'auto');
    await a.page.keyboard.press('f');assert.equal(await a.page.evaluate(()=>window.__onlineTest.warAuto()),'manual');

    assert.ok(first.battlefield.units.filter(u=>u.kind===1).every(u=>u.appearance&&u.appearance.rows.armor>=0&&u.appearance.rows.weapon>=0),'every SIM has authoritative equipment appearance');
    await a.page.waitForFunction(()=>window.__onlineTest.simOutfitProbe()===10);
    await a.page.locator('#sim-outfit-probe').screenshot({path:path.join(root,'output/multiplayer/sim-outfits.png')});
    await a.page.locator('#sim-outfit-probe').evaluate(node=>node.remove());
    assert.ok(first.actors.filter(a=>a.battlefieldKind===1).every(a=>a.supports?.some(s=>s.skill===332&&s.active)),'all SIM receive Emei support');
    assert.equal((await b.page.evaluate(()=>window.__onlineTest.state().pve)).map,37,'not enrolled players cannot see the shared room');
    await b.page.evaluate(()=>window.__onlineTest.recruitNPC(1));
    assert.ok((await b.page.locator('#public-war-recruitment').innerText()).includes('Kim Quốc Chiêu Binh quan'));
    await b.page.click('#public-war-recruit-join');
    await b.page.waitForFunction(()=>window.__onlineTest.state().pve?.battlefield?.entryRemaining>0);
    assert.equal((await b.page.evaluate(()=>window.__onlineTest.state().pve)).map,9004,'entry uses a separate waiting map');
    await b.page.waitForFunction(()=>window.__onlineTest.mapPresentation().ready&&window.__onlineTest.mapPresentation().map===9004);
    assert.ok((await b.page.evaluate(()=>window.__onlineTest.minimapLabel())).includes('Tống Kim · Khu chờ'));
    await b.page.waitForFunction(()=>document.querySelector('#u20zn')?.textContent==='Tống Kim · Khu chờ');
    await b.page.screenshot({path:path.join(root,'output/multiplayer/public-waiting.png')});
    await b.page.waitForFunction(()=>window.__onlineTest.state().map===9003,null,{timeout:15000});
    const second=await b.page.evaluate(()=>window.__onlineTest.state().pve);
    assert.equal(second.battlefield.id,first.battlefield.id);assert.equal(second.battlefield.ends,first.battlefield.ends);
    assert.ok(second.battlefield.now-first.battlefield.now>=4);
    await a.page.keyboard.press('Backquote');
    await a.page.waitForFunction(()=>!document.getElementById('public-war-ranking').hidden);
    assert.equal(await a.page.locator('#public-war-ranking').getAttribute('class'),'war-dialog');
    const timer=await a.page.locator('#public-war-hud').evaluate(node=>({text:node.textContent,font:getComputedStyle(node).fontFamily,size:getComputedStyle(node).fontSize,buttons:node.querySelectorAll('button').length}));
    assert.match(timer.text,/^\d+:\d{2}$/);assert.equal(timer.size,'20px');assert.ok(timer.font.includes('WarCalligraphy'));assert.equal(timer.buttons,0);
    assert.equal(await a.page.locator('#modeSw').isVisible(),false);assert.equal(await a.page.locator('#rotBtn').isVisible(),false);assert.equal(await a.page.locator('#ctrlBtn').isVisible(),true);
    assert.equal(await a.page.locator('#public-war-prefer input').isChecked(),true);
    await a.page.locator('#public-war-prefer input').uncheck();assert.equal(await a.page.locator('#public-war-prefer input').isChecked(),false);
    await a.page.locator('#public-war-prefer input').check();
    assert.ok((await a.page.locator('#public-war-status').innerText()).includes('Phe của bạn: Tống'));
    assert.ok((await a.page.locator('#public-war-teams').innerText()).includes('quân trạng'));
    assert.ok((await a.page.locator('#public-war-potions').innerText()).includes('HP /'));
    assert.equal(await a.page.locator('#public-war-leave').innerText(),'Rời chiến trường');
    await a.page.keyboard.press('Backquote');
    assert.equal(await a.page.locator('#public-war-ranking').isVisible(),false);
    await a.page.locator('#u20txt').focus();await a.page.keyboard.press('Backquote');
    assert.equal(await a.page.locator('#public-war-ranking').isVisible(),false,'typing in chat does not open rankings');
    await a.page.locator('#u20txt').fill('');await a.page.locator('#u20txt').blur();
    await a.page.keyboard.press('Backquote');await a.page.keyboard.press('Escape');
    assert.equal(await a.page.locator('#public-war-ranking').isVisible(),false,'Escape closes rankings before global menus');
    await a.page.keyboard.press('Backquote');
    assert.ok((await a.page.locator('#public-war-ranking').innerText()).includes('Kiếm Khách'));
    await b.page.evaluate(()=>window.__onlineTest.publicRanking());
    assert.ok((await b.page.locator('#public-war-ranking').innerText()).includes('Nữ Hiệp'));
    await a.page.screenshot({path:path.join(root,'output/multiplayer/public-war.png')});
    await a.page.click('#public-war-ranking .war-close');
    await a.page.waitForFunction(()=>window.__simCompositeDraws>0);
    await a.page.waitForFunction(()=>Object.values(window.__guardFrames).some(frames=>frames.size>=3),null,{timeout:15000});
    const guardFrames=await a.page.evaluate(()=>Object.fromEntries(Object.entries(window.__guardFrames).map(([id,frames])=>[id,[...frames]])));
    assert.ok(Object.values(guardFrames).some(frames=>frames.length>=3),'visible moving guards draw several different native footstep frames');
    await a.page.screenshot({path:path.join(root,'output/multiplayer/public-battlefield.png')});
    await a.page.evaluate(()=>window.__onlineTest.respawnPreview());
    await a.page.waitForSelector('#public-war-respawn',{state:'visible'});
    assert.match(await a.page.locator('#public-war-respawn').innerText(),/Tái xuất chiến sau [1-5] giây/);
    await a.page.screenshot({path:path.join(root,'output/multiplayer/public-respawn.png')});
    await a.page.evaluate(()=>window.__onlineTest.respawnPreviewEnd());
    await a.page.keyboard.press('Backquote');
    await a.page.click('#public-war-leave');
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve?.map===37&&!window.__onlineTest.state().pve?.battlefield);
    assert.ok((await b.page.evaluate(()=>window.__onlineTest.state().pve)).battlefield,'creator leaving does not end the room');
    await b.page.reload({waitUntil:'domcontentloaded',timeout:20000});
    await b.page.waitForFunction(()=>window.__onlineTest?.state()?.map===9003&&window.__onlineTest.state().pve?.battlefield?.entryRemaining===0,null,{timeout:30000});
    const rejoined=await b.page.evaluate(()=>window.__onlineTest.state().pve.battlefield);
    assert.equal((await b.page.evaluate(()=>window.__onlineTest.purse())).knb,gmBalance.knb);
    assert.equal(rejoined.id,first.battlefield.id);assert.equal(rejoined.team,1);assert.equal(rejoined.ends,first.battlefield.ends);
    assert.deepEqual(errors,[]);
    rust.kill('SIGTERM');await once(rust,'exit');
    await a.page.waitForSelector('#serverDisconnect',{state:'visible',timeout:15000});
    assert.equal(await a.page.locator('#serverDisconnect').getAttribute('role'),'alertdialog');
    await a.page.screenshot({path:path.join(root,'output/multiplayer/server-disconnect.png')});
    await Promise.all([a.page.waitForEvent('request',{predicate:r=>r.isNavigationRequest()}),a.page.click('#serverDisconnectReload')]);return;
  }
  if(process.env.CURSE_TEST==='1'){
    await a.page.evaluate(()=>window.__onlineTest.skillDetail(67));
    assert.equal(await a.page.locator('#skPlus').isEnabled(),true);
    await a.page.locator('#skPlus').click();
    await a.page.waitForFunction(()=>window.__onlineTest.progression().sk[67]===1);
    assert.equal(await a.page.locator('#mBody h4').count(),1);
    await a.page.waitForFunction(()=>document.querySelector('#mBody')?.innerText.includes('Cấp kỹ năng: 1/20'));
    await a.page.locator('#skMax').click();
    await a.page.waitForFunction(()=>document.querySelector('#mBody')?.innerText.includes('Cấp kỹ năng: 20/20'));
    assert.equal((await a.page.evaluate(()=>window.__onlineTest.progression())).sk[67],20);
    await a.page.locator('#mClose').click();
    await a.page.evaluate(()=>window.__onlineTest.curseReady());
    await a.page.evaluate(()=>window.__onlineTest.field());
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve?.monsters.some(m=>m.hp>0));
    await a.page.waitForTimeout(800);
    const target=await a.page.evaluate(()=>window.__onlineTest.monsterTarget());
    await a.page.mouse.click(target.x,target.y,{button:'right'});
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve.monsters.some(m=>m.curses?.some(c=>c.skill===72)),null,{timeout:20000});
    const affected=await a.page.evaluate(()=>window.__onlineTest.state().pve.monsters.filter(m=>m.curses?.length));
    assert.ok(affected.every(m=>m.hp===m.maxHp),'curse reduces resistance without direct HP damage');
    const view=await a.page.evaluate(()=>window.__onlineTest.curseView());
    assert.ok(view.monsters.some(m=>m.curse?.[72]>0),'native monster FX receives the server debuff');
    await a.page.evaluate(()=>window.__onlineTest.curseAuto(true));
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve.monsters.some(m=>(m.curses||[]).length>=3),null,{timeout:20000});
    await a.page.screenshot({path:path.join(root,'output/multiplayer/wudu-curses.png')});
    const saved=(await (await a.context.request.get(base+'/api/multiplayer/character?slot=0')).json()).profile;
    assert.equal(saved.sk[67],20);assert.equal(saved.sk[72],20);
    assert.deepEqual(errors,[]);console.log('Curse browser: canonical point allocation, current dialog, max points, right mouse curse contact, native monster FX, automatic curses and persistence passed.');return;
  }
  if(process.env.ALLIED_SUPPORT_TEST==='1'){
    const ids=[86,89,92,282,332];
    await a.page.waitForFunction(ids=>ids.every(id=>window.__onlineTest.alliedBuffs().allies.some(([skill])=>skill===id)),ids);
    let received=await a.page.evaluate(()=>window.__onlineTest.alliedBuffs());
    assert.deepEqual(received.allies.map(([id])=>id).sort((a,b)=>a-b),ids);
    assert.equal(received.hud.filter(h=>h.n.includes('Đồng minh')).length,5);
    const files=await a.page.evaluate(ids=>window.__onlineTest.supportFiles(ids),ids);
    assert.ok(files.length>0);assert.ok(files.every(file=>received.sprites.includes(file)),'native self FX includes received buffs');
    await a.page.waitForFunction(files=>files.every(file=>window.__selfSupportDraws[file]),files);
    await b.page.waitForFunction(files=>files.every(file=>window.__supportDraws[file]),files);
    let stats=await a.page.evaluate(()=>window.__onlineTest.stats());
    assert.ok(Math.abs(stats.stats.life-received.self.maxHp)<.1,'client/server share exactly the same max HP');
    // Another caster shares only La Han Tran; its self buffs must stay on itself.
    const c=await player('online_c','Thiếu Lâm','shaolin-support');
    await a.page.waitForFunction(()=>window.__onlineTest.alliedBuffs().allies.some(([id])=>id===16));
    received=await a.page.evaluate(()=>window.__onlineTest.alliedBuffs());
    assert.equal(received.allies.length,6);assert.ok(!received.allies.some(([id])=>id===15||id===273));
    const defense=await a.page.evaluate(()=>window.__onlineTest.stats().stats.def);
    assert.ok(defense>700,'La Han Tran grants defense to the recipient');
    await a.page.screenshot({path:path.join(root,'output/multiplayer/allied-support-active.png')});
    // Same learned buff on multiple casters cannot stack; source disconnect removes only its buffs.
    await c.context.close();
    await a.page.waitForFunction(()=>!window.__onlineTest.alliedBuffs().allies.some(([id])=>id===16));
    assert.equal((await a.page.evaluate(()=>window.__onlineTest.alliedBuffs())).allies.length,5);
    await b.context.close();
    await a.page.waitForFunction(()=>window.__onlineTest.alliedBuffs().allies.length===0);
    const cleared=await a.page.evaluate(()=>window.__onlineTest.alliedBuffs());
    assert.equal(cleared.hud.filter(h=>h.n.includes('Đồng minh')).length,0);
    stats=await a.page.evaluate(()=>window.__onlineTest.stats());
    assert.ok(Math.abs(stats.stats.life-cleared.self.maxHp)<.1);
    await a.page.screenshot({path:path.join(root,'output/multiplayer/allied-support.png')});
    assert.deepEqual(errors,[]);console.log('Allied support browser: five Emei buffs, La Han Tran, native stats/HUD/self FX and disconnect cleanup passed.');return;
  }
  if(process.env.EQUIP_POTENTIAL_TEST==='1'){
    const page=a.page;
    const before=await page.evaluate(()=>window.__onlineTest.equipmentPotentialSetup());
    const cost=Object.values(before.need).reduce((sum,value)=>sum+value,0);assert.ok(cost>0);
    const canonicalBefore=await (await a.context.request.get(base+'/api/multiplayer/character?slot=0')).json();
    await page.evaluate(uid=>window.__onlineTest.equipmentDetail(uid),before.uid);
    assert.equal(await page.locator('#bEq').isDisabled(),true);
    await page.locator('#bReqPts').click();
    await page.waitForFunction(uid=>window.__onlineTest.equipmentState().eq.boot?.uid===uid,before.uid);
    await page.waitForSelector('#modal.hidden',{state:'attached'});
    const after=await page.evaluate(()=>window.__onlineTest.progression());
    assert.equal(after.attrPts,before.points-cost);
    for(const [key,points]of Object.entries(before.need))assert.equal(after.attr[key],before.attr[key]+points);
    const saved=await (await a.context.request.get(base+'/api/multiplayer/character?slot=0')).json();
    assert.equal(saved.profile.eq.boot.uid,before.uid);assert.deepEqual(saved.profile.attr,after.attr);assert.equal(saved.profile.attrPts,after.attrPts);
    assert.equal(saved.revision,canonicalBefore.revision+1,'allocation and equip commit as one revision');
    await page.waitForFunction(()=>{const s=window.__onlineTest.equipmentState();return Math.abs(s.serverSpeed-s.localSpeed)<.01&&s.serverSpeed>150;});
    await page.keyboard.press('q');
    await page.screenshot({path:path.join(root,'output/multiplayer/equipment-potential-sync.png')});
    assert.deepEqual(errors,[]);console.log('Equipment potential browser: actual Cộng điểm button allocates and equips immediately, SQLite/client/Rust agree without reload.');return;
  }
  if(process.env.HOTKEY_TEST==='1'){
    const page=a.page;
    await page.waitForSelector('#u20menu');await page.waitForSelector('#online-party-toggle');
    const initial=await page.evaluate(()=>window.__onlineTest.dialogState());
    const isOpen=type=>{const d=window.__onlineTest.dialogState();return type==='party'?d.party:type==='inv'?d.bag||d.win&&d.current==='inv':d.win&&d.current===type;};
    for(const [key,type]of[['Escape','more'],['q','char'],['w','inv'],['e','skill'],['r','forge'],['t','quest'],['p','party']]){
      await page.keyboard.press(key);await page.waitForFunction(isOpen,type);
      await page.keyboard.press(key);await page.waitForFunction(type=>{const d=window.__onlineTest.dialogState();return type==='party'?!d.party:type==='inv'?!d.bag&&!(d.win&&d.current==='inv'):!(d.win&&d.current===type);},type);
    }
    const after=await page.evaluate(()=>window.__onlineTest.dialogState());
    for(const key of ['pots','rot','map','ctrl'])assert.equal(after[key],initial[key],key+' is not changed by dialog keys');
    await page.keyboard.down('Q');await page.keyboard.down('Q');await page.keyboard.up('Q');await page.waitForFunction(isOpen,'char');
    await page.keyboard.press('q');await page.waitForFunction(()=>!window.__onlineTest.dialogState().win);
    await page.locator('#u20txt').fill('');await page.locator('#u20txt').focus();await page.keyboard.type('qwertp');
    assert.equal(await page.locator('#u20txt').inputValue(),'qwertp');assert.equal((await page.evaluate(()=>window.__onlineTest.dialogState())).win,false);
    await page.locator('#u20txt').fill('');await page.locator('#u20txt').evaluate(e=>e.blur());
    await page.keyboard.press('p');await page.waitForFunction(isOpen,'party');
    await page.keyboard.press('Escape');await page.waitForFunction(isOpen,'more');
    assert.equal((await page.evaluate(()=>window.__onlineTest.dialogState())).party,false);
    assert.match(await page.locator('#u20wt').innerText(),/Hệ thống/);
    await page.screenshot({path:path.join(root,'output/multiplayer/hotkeys-system.png')});
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.__onlineTest.dialogState().win);
    assert.deepEqual(errors,[]);console.log('Hotkeys browser: all seven dialog toggles, repeat suppression, typing protection and unchanged potions/rotation/map/control passed.');return;
  }
  if(process.env.SECONDARY_SKILL_TEST==='1'){
    const page=a.page;
    await page.evaluate(()=>window.__onlineTest.primarySetup());
    await page.evaluate(()=>window.__onlineTest.secondarySetup());
    await page.locator('#pad .sk[data-i="0"]').click();
    await page.waitForFunction(()=>window.__onlineTest.controls().main===10);
    const before=await page.evaluate(()=>window.__onlineTest.secondaryChoice());
    await page.locator('#bSecondary').click();
    assert.match(await page.locator('#skPick .nm').innerText(),/Chiêu phụ · Chuột phải/);
    await page.locator('#skPick [data-ss="1055"]').click();
    await page.waitForFunction(()=>window.__onlineTest.secondaryChoice().skill===1055);
    const selected=await page.evaluate(()=>window.__onlineTest.secondaryChoice());
    assert.equal(selected.main,before.main);assert.deepEqual(selected.slots,before.slots);
    await page.evaluate(()=>window.__onlineTest.stop());
    await page.waitForFunction(()=>window.__onlineTest.controls().ctrl==='manual');
    await page.evaluate(()=>window.__onlineTest.field());
    await page.waitForFunction(()=>window.__onlineTest.state().pve?.map===140);
    await page.waitForTimeout(700);
    const victim=await page.evaluate(()=>window.__onlineTest.monsterTarget());
    await page.mouse.click(victim.x,victim.y,{button:'right'});
    await page.waitForFunction(()=>window.__castEvents.some(e=>e.skill===1055),null,{timeout:30000});
    await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(()=>window.__castEvents.filter(e=>e.skill===1055).length),1,'one right click casts the secondary once');
    const after=await page.evaluate(()=>window.__onlineTest.secondaryChoice());
    assert.equal(after.main,10);assert.deepEqual(after.slots,before.slots);
    const primaryTarget=await page.evaluate(()=>window.__onlineTest.monsterTarget());
    await page.mouse.click(primaryTarget.x,primaryTarget.y);
    await page.waitForFunction(()=>window.__castEvents.some(e=>e.skill===10),null,{timeout:30000});
    await page.evaluate(()=>window.__onlineTest.stop());
    await page.reload();await page.waitForFunction(()=>window.__onlineClient?.online,null,{timeout:30000});
    const restored=await page.evaluate(()=>window.__onlineTest.secondaryChoice());
    assert.equal(restored.skill,1055);assert.equal(restored.main,10);assert.deepEqual(restored.slots,before.slots);
    assert.match(await page.locator('#bSecondary i').evaluate(e=>e.style.backgroundImage),/url\(/,'reload displays the saved secondary icon');
    await page.screenshot({path:path.join(root,'output/multiplayer/secondary-skill.png')});
    assert.deepEqual(errors,[]);console.log('Secondary browser: independent picker, right-click one-shot attack, left-click primary and reload persistence passed.');return;
  }
  if(process.env.HUD_TEST==='1'){
    const page=a.page;
    for(const selector of ['#status-log-toggle','#status-log-panel','#multiplayerStatus','#multiplayerFarm','#townBar'])assert.equal(await page.locator(selector).count(),0,selector+' was removed');
    await page.waitForSelector('#online-party-toggle');
    await page.waitForSelector('#u20travel #bBack:not(.hidden)');
    const positions=await page.evaluate(()=>({back:document.getElementById('bBack').getBoundingClientRect().toJSON(),party:document.getElementById('online-party-toggle').getBoundingClientRect().toJSON()}));
    assert.ok(Math.abs(positions.back.x+positions.back.width/2-positions.party.x-positions.party.width/2)<2,'travel and party share one column');
    assert.ok(positions.back.bottom<positions.party.y,'return icon sits above the party icon');
    assert.equal(await page.locator('#bBack').getAttribute('aria-label'),'Trở lại bãi luyện công');
    await page.screenshot({path:path.join(root,'output/multiplayer/hud-town.png')});
    const townMap=await page.evaluate(()=>window.__onlineTest.state().pve.map);
    await page.waitForFunction(()=>window.__onlineTest.travelReady());
    await page.locator('#bBack').click();
    await page.waitForFunction(map=>{const s=window.__onlineTest.state().pve;return s&&s.map!==map;},townMap);
    await page.waitForSelector('#bBack.hidden',{state:'attached'});
    await page.screenshot({path:path.join(root,'output/multiplayer/hud-field.png')});
    await page.evaluate(()=>window.__onlineTest.town());
    await page.waitForFunction(map=>window.__onlineTest.state().pve?.map===map,townMap);
    await page.waitForSelector('#u20travel #bBack:not(.hidden)');
    await page.setViewportSize({width:900,height:500});
    await page.waitForFunction(()=>document.getElementById('bBack').getBoundingClientRect().width>0);
    await page.screenshot({path:path.join(root,'output/multiplayer/hud-town-compact.png')});
    assert.deepEqual(errors,[]);console.log('HUD browser: obsolete controls removed, return icon beside party, real town-to-field travel and compact layout passed.');return;
  }
  if(process.env.AUTOMATION_TEST==='1'){
    const page=a.page;
    await page.evaluate(()=>window.__onlineTest.field());
    await page.waitForFunction(()=>window.__onlineTest.state().pve?.map===140);
    // Drain enough mana on the first attack to exercise the real auto-potion UI.
    // The GM grant advances SQLite to the same revision, keeping later stock
    // refreshes ordered normally once automatic purchases begin.
    const saved=await (await a.context.request.get(base+'/api/multiplayer/character?slot=0')).json();
    const native=require('../definitions/catalog.cjs').character(saved.profile);
    native.support=null;native.manaRegen=0;native.skills.find(s=>s.id===10).cost=10;
    const refresh=await fetch(`http://127.0.0.1:${control}/refresh`,{method:'POST',headers:{'content-type':'application/json','x-multiplayer-secret':secret},body:JSON.stringify({account:a.account,slot:0,revision:saved.revision+1,nonce:'',profile:native})});
    assert.ok(refresh.ok);
    const fundedBalance=await page.evaluate(()=>window.__onlineTest.deathWallet());
    await page.evaluate(()=>window.__onlineTest.assistant());
    await page.locator('#tPot').check();await page.locator('#tBuy').check();
    await page.locator('[data-pk="potHp"]').selectOption('90');await page.locator('[data-pk="potMp"]').selectOption('90');
    await page.locator('#tAuto').check();
    if(await page.locator('#u20wx').isVisible())await page.locator('#u20wx').click();else await page.locator('#mClose').click();
    await page.waitForFunction(()=>{const s=window.__onlineTest.state().pve;return s?.actors.find(a=>a.id===s.self)?.farming;});
    await page.waitForFunction(async()=>{const p=(await (await fetch('/api/multiplayer/character?slot=0')).json()).profile;return p.onlinePotionSpent?.life?.[1]>0&&p.onlinePotionSpent?.mana?.[1]>0;},null,{timeout:30000});
    await page.waitForFunction(()=>{const s=window.__onlineTest.state().pve;return s.events.some(e=>e.kind===4&&e.source===s.self);},null,{timeout:30000});
    await page.waitForFunction(async()=>{const p=(await (await fetch('/api/multiplayer/character?slot=0')).json()).profile;return p.xp>0&&p.onlinePotionSpent?.life?.[1]>0&&p.onlinePotionSpent?.mana?.[1]>0;});
    const canonical=(await (await a.context.request.get(base+'/api/multiplayer/character?slot=0')).json()).profile;
    assert.ok(canonical.potUsed>=2);assert.ok(canonical.gold<fundedBalance,'bottles are purchased using canonical silver');
    await page.evaluate(()=>window.__onlineTest.assistant());await page.locator('#tAuto').uncheck();
    await page.waitForFunction(()=>{const s=window.__onlineTest.state().pve;return !s.actors.find(a=>a.id===s.self).farming;});
    await page.screenshot({path:path.join(root,'output/multiplayer/automation-assistant-audit.png')});
    assert.deepEqual(errors,[]);console.log('Automation browser: real assistant checkbox starts/stops Rust farming, kills and loots silver; HP/MP thresholds buy empty-stock bottles and persist canonical potion debits.');return;
  }
  if(process.env.PRIMARY_SKILL_TEST==='1'){
    const page=a.page;
    await page.evaluate(()=>window.__onlineTest.primarySetup());
    await page.locator('#pad .sk[data-i="1"]').click();
    await page.waitForFunction(()=>{const c=window.__onlineTest.controls();return c.main===1055&&c.locked&&c.effective===1055;});
    await page.evaluate(()=>window.__onlineTest.field());
    await page.waitForFunction(()=>window.__onlineTest.state().pve?.map===140);
    await page.evaluate(()=>window.__onlineTest.farm());
    await page.waitForFunction(()=>{const s=window.__onlineTest.state().pve;return s.events.filter(e=>e.kind===1&&e.source===s.self&&e.skill===1055).length>=2;},null,{timeout:30000});
    await page.evaluate(()=>window.__onlineTest.stop());
    const selected=await (await a.context.request.get(base+'/api/multiplayer/character?slot=0')).json();assert.equal(selected.profile.main,1055);assert.equal(selected.profile.mainLock,true);
    assert.equal((await page.evaluate(()=>window.__onlineTest.controls())).main,1055);
    await page.locator('#pad .sk[data-i="0"]').click();
    await page.waitForFunction(()=>window.__onlineTest.controls().main===10);
    await page.evaluate(()=>window.__onlineTest.skillDetails(1055));await page.locator('#skMain').click();
    await page.waitForFunction(()=>window.__onlineTest.controls().main===1055);await page.locator('#mClose').click();
    await page.reload();await page.waitForFunction(()=>window.__onlineClient?.online,null,{timeout:30000});
    const restored=await page.evaluate(()=>window.__onlineTest.controls());assert.equal(restored.main,1055);assert.equal(restored.locked,true);assert.equal(restored.slots[1],1055);
    await page.screenshot({path:path.join(root,'output/multiplayer/primary-skill-restored.png')});
    assert.deepEqual(errors,[]);console.log('Primary skill: real F-slot and detail clicks, repeated level-150 casts, rewards and reload retain canonical main and slots.');return;
  }
  if(process.env.LIFECYCLE_TEST==='1'){
    for(const {page}of[a,b])await page.evaluate(()=>window.__onlineTest.field());
    await a.page.waitForFunction(()=>{const s=window.__onlineTest.state();return s.pve&&s.pve.map!==37&&s.pve.map===s.map;});
    for(const {page}of[a,b]){
      await page.waitForFunction(()=>window.__onlineTest.travelReady());await page.evaluate(()=>window.__onlineTest.travel(340));
      try{await page.waitForFunction(()=>window.__onlineTest.state().pve?.map===340,{},{timeout:12000});}catch(error){console.error('Travel state',await page.evaluate(()=>window.__onlineTest.state()));throw error;}
    }
    const origin=await a.page.evaluate(()=>window.__onlineTest.state());
    await a.page.evaluate(()=>window.__onlineTest.moveProbe());
    await a.page.waitForFunction(({x,y})=>{const s=window.__onlineTest.state(),me=s.pve?.actors.find(a=>a.id===s.pve.self);return me&&Math.hypot(me.x-x,me.y-y)>20&&s.pve.movement.motion===2;},origin);
    const saved=await a.page.evaluate(()=>{const s=window.__onlineTest.state().pve;return {map:s.map,...s.actors.find(a=>a.id===s.self)};});
    await a.page.reload();await a.page.waitForFunction(()=>window.__onlineTest);
    const preview=await a.page.evaluate(()=>({initial:window.__onlineTest.initialPosition,pve:window.__onlineTest.state().pve}));
    assert.equal(preview.pve,null,'local preview appears before server session');assert.equal(preview.initial.map,saved.map);assert.ok(Math.hypot(preview.initial.x-saved.x,preview.initial.y-saved.y)<.2,'first frame restores local position');
    await a.page.waitForFunction(()=>window.__onlineClient?.online,null,{timeout:30000});
    const restored=await a.page.evaluate(()=>{const s=window.__onlineTest.state();return {map:s.pve.map,x:s.x,y:s.y};});
    assert.equal(restored.map,saved.map);assert.ok(Math.hypot(restored.x-saved.x,restored.y-saved.y)<.2,'reload keeps exact server position');
    const balance=await b.page.evaluate(()=>window.__onlineTest.deathWallet());
    for(const [p,victim]of[[a,false],[b,true]]){
      const savedProfile=await (await p.context.request.get(base+'/api/multiplayer/character?slot=0')).json();
      const native=require('../definitions/catalog.cjs').character(savedProfile.profile);
      native.support=null;native.regen=0;native.alignment=victim?1:0;
      if(victim)native.hp=1;else for(const skill of native.skills){skill.parts=[10000,0,0,0,0];skill.cost=0;skill.cooldown=100;skill.range=1;}
      const response=await fetch(`http://127.0.0.1:${control}/refresh`,{method:'POST',headers:{'content-type':'application/json','x-multiplayer-secret':secret},body:JSON.stringify({account:p.account,slot:0,revision:9999,nonce:'',profile:native})});assert.ok(response.ok);
    }
    await b.page.waitForFunction(()=>{const s=window.__onlineTest.state().pve;return s.actors.find(a=>a.id===s.self)?.maxHp===1;});
    await a.page.locator('#mswBtn').click();await a.page.locator('[data-msw="slaughter"]').click();
    const victim=await b.page.evaluate(()=>window.__onlineTest.state().pve.self);
    await a.page.waitForFunction(id=>window.__onlineTest.state().remote.some(p=>p.id===id),victim);
    await a.page.evaluate(id=>window.__onlineTest.follow(id),victim);await a.page.waitForTimeout(150);
    const target=await a.page.evaluate(id=>{const p=window.__onlineTest.state().remote.find(p=>p.id===id);return window.__onlineTest.screen(p.x,p.y-22);},victim);
    await a.page.mouse.click(target.x,target.y);
    await b.page.waitForSelector('#onlineDeath');assert.ok((await b.page.locator('#onlineDeath').innerText()).includes('Kiếm Khách'));
    await a.page.waitForFunction(id=>!window.__onlineTest.state().remote.some(p=>p.id===id),victim);
    assert.equal(await b.page.locator('#onlineDeath .online-death-killer').innerText(),'Kiếm Khách');
    await b.page.evaluate(()=>document.fonts.ready);
    assert.ok(await b.page.locator('#onlineDeathTitle').evaluate(el=>getComputedStyle(el).fontFamily.includes('OnlineDeathCharm')));
    const loss=Math.min(1000000,Math.floor(balance/5));
    await a.page.waitForFunction(amount=>window.__onlineTest.state().pve.loot.filter(d=>d.gold).reduce((n,d)=>n+d.gold,0)===amount,loss);
    await fs.mkdir(path.join(root,'output/multiplayer'),{recursive:true});
    await b.page.screenshot({path:path.join(root,'output/multiplayer/death-recovery.png')});
    await b.page.setViewportSize({width:390,height:844});
    await b.page.screenshot({path:path.join(root,'output/multiplayer/death-recovery-mobile.png')});
    const card=await b.page.locator('#onlineDeath .online-death-card').boundingBox();assert.ok(card.x>=0&&card.x+card.width<=390);
    assert.ok(await b.page.getByRole('button',{name:'Về thành',exact:true}).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'chat must not cover the return button');
    await b.page.setViewportSize({width:1280,height:850});
    await a.page.screenshot({path:path.join(root,'output/multiplayer/death-gold-piles.png')});
    await b.page.reload();await b.page.waitForFunction(()=>window.__onlineClient?.online,null,{timeout:30000});await b.page.waitForSelector('#onlineDeath');
    assert.ok((await b.page.locator('#onlineDeath').innerText()).includes('Kiếm Khách'));
    assert.equal((await (await b.context.request.get(base+'/api/multiplayer/character?slot=0')).json()).profile.gold,balance-loss);
    await b.page.getByRole('button',{name:'Về thành',exact:true}).click();
    await b.page.waitForFunction(()=>{const s=window.__onlineTest.state().pve;return s?.map===37&&s.actors.find(a=>a.id===s.self)?.hp>0;});
    assert.equal(await b.page.locator('#onlineDeath').count(),0);
    const pile=await a.page.evaluate(()=>window.__onlineTest.state().pve.loot.find(d=>d.gold));assert.ok(pile.mine);
    const oldBalance=(await (await a.context.request.get(base+'/api/multiplayer/character?slot=0')).json()).profile.gold||0;
    const loot=await a.page.evaluate(d=>window.__onlineTest.screen(d.x,d.y),pile);await a.page.mouse.click(loot.x,loot.y);
    await a.page.waitForFunction(id=>!window.__onlineTest.state().pve.loot.some(d=>d.id===id),pile.id);
    await a.page.waitForFunction(async expected=>{const r=await fetch('/api/multiplayer/character?slot=0');return (await r.json()).profile.gold===expected;},oldBalance+pile.gold);
    await b.page.reload();await b.page.waitForFunction(()=>window.__onlineClient?.online,null,{timeout:30000});
    await b.page.waitForFunction(()=>{const p=window.__onlineTest.mapPresentation();return p.map==='town'&&p.ready&&p.scene&&p.bg.includes('/37/assets/ground.jpg');});
    await b.page.screenshot({path:path.join(root,'output/multiplayer/town-restored.png')});
    await b.page.evaluate(()=>window.__onlineTest.battlefieldStart());
    await b.page.waitForFunction(()=>{const p=window.__onlineTest.mapPresentation();return p.map===9003&&p.ready&&p.scene&&p.bg.includes('/9003/assets/ground.jpg');});
    await b.page.screenshot({path:path.join(root,'output/multiplayer/tong-kim-restored.png')});
    await b.page.evaluate(()=>window.__onlineTest.battlefieldExit());
    await b.page.waitForFunction(()=>{const p=window.__onlineTest.mapPresentation();return p.map==='town'&&p.ready&&p.scene;});
    assert.deepEqual(errors,[]);console.log('Lifecycle browser: exact map/position reload, named PvP death, 20% public silver piles, corpse reload, town button and real pickup passed.');return;
  }
  if(process.env.EQUIPMENT_TEST==='1'){
    const page=a.page;
    await page.evaluate(()=>window.__onlineTest.equipmentSetup());
    await page.evaluate(()=>window.__onlineTest.equipmentOpen());
    await page.locator('[data-trader-choice="slot"][data-value="5"]').click();
    await page.locator('[data-trader-receive]').click();
    await page.waitForFunction(()=>window.__onlineTest.equipmentState().inv.some(item=>item.d===5));
    let saved=await page.evaluate(()=>window.__onlineTest.equipmentState());
    await page.evaluate(uid=>window.__onlineTest.equip(uid),saved.inv.find(item=>item.d===5).uid);
    assert.ok((await page.evaluate(()=>window.__onlineTest.equipmentState())).eq.boot,'boots are actually equipped');
    await page.evaluate(()=>{window.__onlineTest.closeModal();window.__onlineTest.horseOpen();});
    // Use the actual Mã Phu buy button and authenticated canonical response.
    await page.locator('[data-horse-buy]').first().click();
    await page.waitForFunction(()=>window.__onlineTest.equipmentState().inv.some(item=>item.d===10));
    saved=await page.evaluate(()=>window.__onlineTest.equipmentState());
    await page.evaluate(uid=>window.__onlineTest.equip(uid),saved.inv.find(item=>item.d===10).uid);
    await page.evaluate(()=>window.__onlineTest.mount(true));
    await page.waitForFunction(()=>{const s=window.__onlineTest.equipmentState();return s.mounted&&Math.abs(s.serverSpeed-s.localSpeed)<.01;});
    const expected=await page.evaluate(()=>window.__onlineTest.equipmentState());
    assert.ok(expected.serverSpeed>172.5,'horse increases physical movement speed');
    await page.reload();await page.waitForFunction(()=>window.__onlineClient?.online,null,{timeout:30000});
    await page.waitForFunction(()=>{const s=window.__onlineTest.equipmentState();return s.serverSpeed>172.5&&s.mounted;});
    const actual=await page.evaluate(()=>window.__onlineTest.equipmentState());
    for(const key of ['eq','inv','uid','knb'])assert.deepEqual(actual[key],expected[key],key+' survives reload');
    assert.ok(Math.abs(actual.serverSpeed-actual.localSpeed)<.01);
    await page.screenshot({path:path.join(root,'output/multiplayer/equipment-reload.png')});
    assert.deepEqual(errors,[]);console.log('Equipment browser: native NPC purchases, equip, mounted speed and canonical reload passed.',JSON.stringify(actual));return;
  }
  if(process.env.PROGRESSION_TEST==='1'){
    const page=a.page;
    // Reproduce the old split-brain save: legacy level 150, canonical level 1.
    await page.evaluate(()=>window.__onlineTest.staleProgressionSave());
    await page.reload();await page.waitForFunction(()=>window.__onlineClient?.online,null,{timeout:30000});
    await page.waitForFunction(()=>window.__onlineTest.state().pve?.actors.some(a=>a.id===window.__onlineTest.state().pve.self));
    const repaired=await page.evaluate(()=>window.__onlineTest.progression());
    assert.equal(repaired.lvl,1);assert.ok(repaired.mapLevel<=1,'canonical level is applied before selecting a map');
    await page.locator('#gm-toggle').click();
    await page.locator('[data-gm="level150"]').click();
    await page.waitForFunction(()=>window.__onlineTest.progression().lvl===150);
    await page.locator('#u20menu [data-u="skill"]').click();
    await page.locator('#bJoin').click();await page.locator('[data-j="shaolin"]').click();
    await page.waitForFunction(()=>window.__onlineTest.progression().fac==='shaolin');
    await page.locator('#gm-toggle').click();
    await page.locator('#u20menu [data-u="char"]').click();
    await page.locator('#t-char .plus[data-a="vit"]').click();
    await page.locator('#apN').fill('12');await page.locator('#apOk').click();
    await page.waitForFunction(()=>window.__onlineTest.progression().attr.vit===12);
    await page.locator('#u20menu [data-u="skill"]').click();
    await page.locator('#t-skill .plus[data-id="10"]').click();
    await page.waitForFunction(()=>window.__onlineTest.progression().sk[10]===2);
    // Same-level allocation must update Rust immediately, not only after a level-up.
    await page.waitForFunction(()=>{const s=window.__onlineTest.state().pve,profile=window.__onlineTest.stats().stats;return Math.abs(s.actors.find(a=>a.id===s.self).maxHp-profile.life)<.1;});
    await page.locator('#gm-toggle').click();
    await page.locator('[data-gm="learn90"]').click();await page.waitForFunction(()=>window.__onlineTest.progression().sk[319]>=1);
    await page.locator('[data-gm="learn150"]').click();await page.waitForFunction(()=>window.__onlineTest.progression().sk[1056]>=1);
    await page.locator('[data-gm="xp"]').click();await page.waitForFunction(()=>window.__onlineTest.progression().xp>0);
    const expected=await page.evaluate(()=>window.__onlineTest.progression());
    await page.reload();
    await page.waitForFunction(()=>window.__onlineClient?.online,null,{timeout:30000});
    await page.waitForFunction(()=>window.__onlineTest.state().pve?.actors.some(a=>a.id===window.__onlineTest.state().pve.self));
    const actual=await page.evaluate(()=>window.__onlineTest.progression());
    for(const key of ['lvl','xp','fac','attr','attrPts','sk','skPts'])assert.deepEqual(actual[key],expected[key],'canonical '+key+' survives reload');
    assert.ok(actual.mapLevel<=actual.lvl,'map selection uses canonical level on startup');
    await page.screenshot({path:path.join(root,'output/multiplayer/progression-reload.png')});
    assert.deepEqual(errors,[]);console.log('Progression browser: real GM, faction join, potential and skill buttons, same-level Rust refresh and reload passed.',JSON.stringify(actual));
    return;
  }
  if(process.env.PARTY_TEST==='1'){
    const pages=[a.page,b.page];
    const initial=await a.page.evaluate(()=>window.__onlineTest.state().pve);
    assert.notEqual(initial.actors[0].alignment,initial.actors[1].alignment);
    for(const page of pages)await page.waitForSelector('#online-party-toggle');
    const positions=await a.page.evaluate(()=>({party:document.getElementById('online-party-toggle').getBoundingClientRect().toJSON(),prior:document.getElementById('u20tt').getBoundingClientRect().toJSON()}));
    assert.ok(positions.party.top>=positions.prior.bottom,'party icon sits below the assistant icon');
    await a.page.locator('#online-party-toggle').click();
    await a.page.getByRole('button',{name:'Nữ Hiệp',exact:true}).click();
    await a.page.locator('#online-party-send').click();
    await b.page.locator('#online-party-decline').click();
    await b.page.waitForFunction(()=>!window.__onlineTest.state().pve.party.invitations.length);
    assert.equal((await a.page.evaluate(()=>window.__onlineTest.state().pve.party.members)).length,0);
    await a.page.locator('#online-party-send').click();
    await b.page.locator('#online-party-accept').click();
    for(const page of pages)await page.waitForFunction(()=>window.__onlineTest.state().pve.party.members.length===2);
    const joined=await a.page.evaluate(()=>window.__onlineTest.state().pve);
    assert.equal(joined.party.leader,joined.self);assert.equal(joined.actors[0].alignment,joined.actors[1].alignment);
    await a.page.getByRole('button',{name:'Đóng tổ đội',exact:true}).click();
    await b.page.locator('#mswBtn').click();await b.page.locator('[data-msw="slaughter"]').click();
    for(const page of pages)await page.waitForFunction(()=>Object.values(window.__onlineHealth).includes('#ff79b0'));
    await a.page.screenshot({path:path.join(root,'output/multiplayer/party-pink-hp.png')});
    await a.page.locator('#online-party-toggle').click();
    await a.page.screenshot({path:path.join(root,'output/multiplayer/party-dialog.png')});
    await b.page.locator('#online-party-toggle').click();await b.page.locator('#online-party-leave').click();
    for(const page of pages)await page.waitForFunction(()=>window.__onlineTest.state().pve.party.members.length===0);
    await a.page.waitForFunction(()=>window.__onlineHealth['Nữ Hiệp']==='#ef4242');
    await b.page.waitForFunction(()=>window.__onlineColors['Nữ Hiệp']==='#7ee07e');
    // Reproduce a camera pan away from actors while staying in the same map.
    await a.page.evaluate(()=>window.__onlineTest.cameraAway());
    await a.page.waitForFunction(()=>!document.querySelector('#online-party-nearby [data-party-player]'));
    await a.page.evaluate(()=>window.__onlineTest.follow(window.__onlineTest.state().pve.self));
    await a.page.waitForSelector('#online-party-nearby [data-party-player]');
    await a.page.getByRole('button',{name:'Đóng tổ đội',exact:true}).click();
    await b.page.getByRole('button',{name:'Đóng tổ đội',exact:true}).click();
    // Membership persists across maps and disconnect cleans it on the surviving client.
    await a.page.locator('#online-party-toggle').click();
    await a.page.getByRole('button',{name:'Nữ Hiệp',exact:true}).click();await a.page.locator('#online-party-send').click();
    await b.page.locator('#online-party-accept').click();
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve.party.members.length===2);
    await a.page.getByRole('button',{name:'Đóng tổ đội',exact:true}).click();
    await b.page.evaluate(()=>window.__onlineTest.field());
    await a.page.waitForFunction(()=>{const s=window.__onlineTest.state().pve;return s.party.members.some(m=>m.map!==s.map);});
    await a.page.locator('#online-party-toggle').click();
    await a.page.waitForFunction(()=>!document.querySelector('#online-party-nearby [data-party-player]'));
    await b.context.close();
    await a.page.waitForFunction(()=>window.__onlineTest.state().pve.party.members.length===0);
    assert.deepEqual(errors,[]);console.log('Party browser: invite, decline, accept, roster, leader color, pink/red HP, leave, map travel and disconnect passed.');
    return;
  }

  await a.page.evaluate(()=>window.__onlineTest.faction('shaolin'));
  await b.page.waitForFunction(()=>window.__onlineColors['Kiếm Khách']==='#ffb347');
  const effects=await a.page.evaluate(()=>window.__onlineTest.support(true));
  assert.ok(effects.length>=2,'fixture has support effects from actual game catalog');
  await b.page.waitForFunction(files=>files.every(file=>window.__supportDraws[file]),effects);
  await a.page.evaluate(()=>window.__onlineTest.support(false));
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote[0]?.appearance.effects.length===0);
  await a.page.evaluate(()=>window.__onlineTest.support(true));
  const slot=await a.page.evaluate(()=>window.__onlineTest.unlockSkill());
  assert.ok(slot>=0,'new character has a learned attack on the hotbar');
  await a.page.locator('#pad .sk[data-i="'+slot+'"]').click({position:{x:12,y:12}});
  await a.page.waitForFunction(slot=>{const c=window.__onlineTest.controls();return c.locked&&c.main===c.slots[slot]&&c.effective===c.main;},slot);
  await a.page.locator('#ctrlBtn').click();
  await a.page.waitForFunction(()=>{const s=window.__onlineTest.state();return window.__onlineTest.controls().ctrl==='auto'&&s.pve.actors.find(p=>p.id===s.pve.self)?.farming;});
  await a.page.waitForTimeout(350);
  assert.equal(await a.page.locator('#ctrlBtn').evaluate(e=>e.classList.contains('on')),true,'Auto stays on across render frames');
  await a.page.keyboard.press('f');
  await a.page.waitForFunction(()=>{const s=window.__onlineTest.state();return window.__onlineTest.controls().ctrl==='manual'&&!s.pve.actors.find(p=>p.id===s.pve.self)?.farming;});
  await a.page.locator('#ctrlBtn').click();
  await a.page.waitForFunction(()=>window.__onlineTest.controls().ctrl==='auto');
  await a.page.locator('#ctrlBtn').click();
  await a.page.waitForFunction(()=>{const s=window.__onlineTest.state();return window.__onlineTest.controls().ctrl==='manual'&&!s.pve.actors.find(p=>p.id===s.pve.self)?.farming;});
  const initial=await a.page.evaluate(()=>window.__onlineTest.state());
  for(const key of ['ArrowRight','w','a','s','d']) {await a.page.keyboard.down(key);await a.page.waitForTimeout(200);await a.page.keyboard.up(key);}
  const afterKeys=await a.page.evaluate(()=>window.__onlineTest.state());
  assert.ok(Math.hypot(initial.x-afterKeys.x,initial.y-afterKeys.y)<1,'keyboard cannot move online player');
  const visuals=await a.page.evaluate(()=>window.__onlineTest.visualProbe());
  assert.ok(visuals.length>=50,'native offensive skills tested at levels 1 and 25');
  for(const id of [336,337,339,365,1078,1081])assert.ok(visuals.some(v=>v.id===id),String(id));
  console.log('Native online skill cases:',visuals.length);
  const proximity=await a.page.evaluate(()=>window.__onlineTest.proximityProbe());console.log('Proximity FX',proximity);
  for(const item of proximity)assert.ok(item.draws>0,'skill '+item.id+' draws even at point blank');
  await a.page.evaluate(()=>{window.__snapshotDelay=175;});
  const target=await a.page.evaluate(()=>window.__onlineTest.target());
  await a.page.mouse.click(target.x,target.y,{button:'right'});await a.page.waitForTimeout(250);
  assert.ok(Math.hypot(initial.x-(await a.page.evaluate(()=>window.__onlineTest.state())).x,initial.y-(await a.page.evaluate(()=>window.__onlineTest.state())).y)<1);
  const motion=b.page.evaluate(()=>new Promise(resolve=>{
    const samples=[],start=performance.now();
    function frame(time){const p=window.__onlineTest.state().remote[0];if(p)samples.push({time,x:p.x,y:p.y});
      if(time-start<1500)requestAnimationFrame(frame);else resolve(samples);}
    requestAnimationFrame(frame);
  }));
  const ownMotion=a.page.evaluate(()=>new Promise(resolve=>{
    const samples=[],started=performance.now();
    function frame(time){const p=window.__onlineTest.state();samples.push({x:p.x,y:p.y});
      if(time-started<2300)requestAnimationFrame(frame);else resolve(samples);}
    requestAnimationFrame(frame);
  }));
  await a.page.mouse.click(target.x,target.y);
  await a.page.waitForFunction(({x,y})=>{const p=window.__onlineTest.state();return Math.hypot(p.x-x,p.y-y)>20;},{x:initial.x,y:initial.y});
  const frames=await motion;
  const distances=frames.slice(1).map((p,i)=>Math.hypot(p.x-frames[i].x,p.y-frames[i].y));
  const first=distances.findIndex(d=>d>0.1),last=distances.findLastIndex(d=>d>0.1);
  assert.ok(last>first,'observer sees real movement');
  const middle=distances.slice(first,last+1);
  assert.ok(middle.filter(d=>d<0.02).length/middle.length<0.25,'observer movement has no repeated-snapshot stop-go cadence');
  const ownFrames=await ownMotion;
  const finish=ownFrames.at(-1),dx=finish.x-initial.x,dy=finish.y-initial.y,length=Math.hypot(dx,dy);
  assert.ok(length>20,'local avatar moved');
  const progress=ownFrames.map(p=>((p.x-initial.x)*dx+(p.y-initial.y)*dy)/length);
  for(let i=1;i<progress.length;i++)assert.ok(progress[i]>=progress[i-1]-2,'no local rollback under delayed WORLD snapshots');
  await a.page.evaluate(()=>{window.__snapshotDelay=0;});
  await a.page.waitForTimeout(250);
  const local=await a.page.evaluate(()=>window.__onlineTest.state());
  await b.page.waitForFunction(({x,y})=>{const p=window.__onlineTest.state().remote[0];return p&&Math.hypot(p.x-x,p.y-y)<3;},{x:local.x,y:local.y});
  await a.page.evaluate(()=>window.__onlineTest.outfit());
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote[0]?.appearance.sex===1);
  await a.page.evaluate(()=>window.__onlineTest.field());

  await b.page.waitForFunction(()=>window.__onlineTest.state().remote.length===0);
  await a.page.evaluate(()=>window.__onlineTest.town());
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote.length===1);
  await a.page.evaluate(()=>window.__onlineClient.retry());
  await a.page.waitForFunction(()=>window.__onlineClient?.online);
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote.length===1);
  // Shared PvE world: a real click starts the server attack, both clients see the same death.
  for(const {page} of [a,b]){await page.waitForTimeout(700);await page.evaluate(()=>window.__onlineTest.field());}
  for(const {page} of [a,b])await page.waitForFunction(()=>window.__onlineTest.state().pve?.monsters.length===24);
  const mobsA=await a.page.evaluate(()=>window.__onlineTest.state().pve.monsters.map(m=>m.id));
  assert.deepEqual(await b.page.evaluate(()=>window.__onlineTest.state().pve.monsters.map(m=>m.id)),mobsA);
  await a.page.locator('#ctrlBtn').click();
  await a.page.waitForFunction(()=>{const s=window.__onlineTest.state(),c=window.__onlineTest.controls();return s.pve.events.some(e=>e.kind===1&&e.source===s.pve.self&&e.skill===c.effective);});
  await a.page.locator('#ctrlBtn').click();
  await a.page.waitForFunction(()=>{const s=window.__onlineTest.state();return !s.pve.actors.find(p=>p.id===s.pve.self)?.farming;});
  const victim=await a.page.evaluate(()=>window.__onlineTest.monsterTarget());
  await a.page.mouse.click(victim.x,victim.y);
  for(const {page} of [a,b])await page.waitForFunction(id=>{const m=window.__onlineTest.state().pve?.monsters.find(m=>m.id===id);return m&&m.hp<m.maxHp;},victim.id);
  for(const {page} of [a,b])await page.waitForFunction(id=>window.__onlineTest.state().pve?.monsters.find(m=>m.id===id)?.hp===0,victim.id);
  await a.page.waitForFunction(()=>window.__onlineTest.state().pve?.loot.some(d=>d.mine));
  const drop=await a.page.evaluate(()=>window.__onlineTest.state().pve.loot.find(d=>d.mine));
  assert.equal(await b.page.evaluate(id=>window.__onlineTest.state().pve.loot.find(d=>d.id===id)?.mine,drop.id),false);
  // Ownership belongs to the authenticated account, so reconnect cannot lose the right to pick up.
  await a.page.evaluate(()=>window.__onlineClient.retry());
  await a.page.waitForFunction(()=>window.__onlineClient?.online);
  await a.page.waitForFunction(id=>window.__onlineTest.state().pve?.loot.some(d=>d.id===id&&d.mine),drop.id);
  const point=await a.page.evaluate(d=>window.__onlineTest.screen(d.x,d.y),drop);
  await a.page.mouse.click(point.x,point.y);
  for(const {page} of [a,b])await page.waitForFunction(id=>!window.__onlineTest.state().pve?.loot.some(d=>d.id===id),drop.id);
  await a.page.waitForFunction(async()=>{const r=await fetch('/api/multiplayer/character?slot=0');const p=await r.json();return p.profile.gold>0&&p.profile.xp>0;});
  const secondTarget=await b.page.evaluate(()=>window.__onlineTest.target());
  await b.page.mouse.click(secondTarget.x,secondTarget.y);
  await b.page.waitForTimeout(1800);
  await fs.mkdir(path.join(root,'output/multiplayer'),{recursive:true});
  await b.page.screenshot({path:path.join(root,'output/multiplayer/game-webtransport.png')});
  // Map level is monster strength, not a travel gate. Both level-one accounts
  // can join the actual high-level map and receive each other's presence.
  for(const {page} of [a,b])await page.evaluate(()=>window.__onlineTest.travel(140));
  for(const {page} of [a,b])await page.waitForFunction(()=>window.__onlineTest.state().pve?.map===140);
  for(const {page} of [a,b])await page.evaluate(()=>window.__onlineTest.travel(340));
  for(const {page} of [a,b])await page.waitForFunction(()=>{
    const s=window.__onlineTest.state();return s.map===340&&s.pve?.map===340&&s.remote.length===1;
  },null,{timeout:8000});
  const beforeTravelMove=await a.page.evaluate(()=>window.__onlineTest.state());
  const travelTarget=await a.page.evaluate(()=>window.__onlineTest.target());
  await a.page.mouse.click(travelTarget.x,travelTarget.y);
  await a.page.waitForFunction(({x,y})=>{const p=window.__onlineTest.state();return Math.hypot(p.x-x,p.y-y)>10;},beforeTravelMove,{timeout:3000});
  await a.context.close();
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote.length===0);
  await b.page.evaluate(()=>window.__onlineTest.town());
  // Real advanced skills: the prior low-level fixture could not catch a server
  // staying on its default basic attack when a Manual player selects a hotbar slot.
  await b.page.route('**/fx/**',async route=>{await new Promise(resolve=>setTimeout(resolve,2500));await route.continue().catch(()=>{});});
  const cuiyan=process.env.SKILL_FACTION==='cuiyan';
  const c=await player('online_advanced','Advanced',cuiyan?'cuiyan':true);
  for(const slot of [0,1]){
    await c.page.locator('#pad .sk[data-i="'+slot+'"]').click({position:{x:12,y:12}});
    await c.page.waitForFunction(slot=>{
      const selected=document.querySelector('#pad .sk[data-i="'+slot+'"]');
      const controls=window.__onlineTest.controls();
      return selected?.getAttribute('aria-pressed')==='true'&&selected.classList.contains('cur')&&getComputedStyle(selected,'::after').borderTopWidth==='2px'&&controls.main===controls.slots[slot];
    },slot);
  }
  assert.match(await c.page.locator('#bMain').getAttribute('title'),cuiyan?/Băng Tung/:/Thiên Lôi Chấn Nhạc/);
  await c.page.waitForFunction(()=>window.__onlineTest.travelReady());
  await c.page.evaluate(map=>map?window.__onlineTest.travel(map):window.__onlineTest.field(),Number(process.env.SKILL_MAP)||0);
  await c.page.waitForFunction(()=>window.__onlineTest.state().pve?.monsters.length===24);
  await b.page.waitForFunction(()=>window.__onlineTest.travelReady());
  await b.page.evaluate(map=>map?window.__onlineTest.travel(map):window.__onlineTest.field(),Number(process.env.SKILL_MAP)||0);
  await b.page.waitForFunction(()=>window.__onlineTest.state().remote.length===1);
  const optional=await c.page.evaluate(id=>window.__onlineTest.coldChildAssets(id),cuiyan?1063:1081);
  assert.ok(optional.length>0,'real advanced skill has optional child sprites');
  await c.page.route('**/fx/**',async route=>{
    if(optional.some(url=>new URL(route.request().url()).pathname==='/'+url))await new Promise(resolve=>setTimeout(resolve,8000));
    await route.continue().catch(()=>{});
  });
  for(const [slot,skill]of (cuiyan?[[0,1063],[1,336]]:[[0,1080],[1,1081],[2,375]])){
    await c.page.locator('#pad .sk[data-i="'+slot+'"]').click({position:{x:12,y:12}});
    await c.page.waitForFunction(skill=>{const s=window.__onlineTest.state();return s.pve.events.some(e=>e.kind===1&&e.source===s.pve.self&&e.skill===skill);},skill,{timeout:10000});
    await c.page.evaluate(()=>window.__onlineTest.stop()).catch(()=>{});
    try{
      for(const {page}of [c,b])await page.waitForFunction(skill=>(window.__skillDraws[skill]||0)>2,skill,{timeout:page===c.page?4000:8000});
    }catch(error){console.error('Local FX',await c.page.evaluate(()=>window.__onlineTest.fxState()));console.error('Remote FX',await b.page.evaluate(()=>window.__onlineTest.fxState()));throw error;}
    assert.equal(await c.page.locator('#pad .sk[data-i="'+slot+'"]').getAttribute('aria-pressed'),'true');
  }
  // Each new Auto session must draw again; cumulative counters from a first
  // successful Manual cast must never hide later missing animations.
  await c.page.locator('#pad .sk[data-i="0"]').click({position:{x:12,y:12}});
  const caster=await c.page.evaluate(()=>window.__onlineTest.state().pve.self);
  await b.page.evaluate(id=>window.__onlineTest.follow(id),caster);
  for(let round=0;round<2;round++){
    await c.page.waitForTimeout(3500);
    const before=await Promise.all([c,b].map(({page})=>page.evaluate(()=>({...window.__skillDraws}))));
    await c.page.evaluate(()=>window.__onlineTest.farm());
    const skill=cuiyan?1063:1080;
    try{
      for(const [index,{page}]of [c,b].entries())await page.waitForFunction(({skill,before})=>(window.__skillDraws[skill]||0)>before+2,{skill,before:before[index][skill]||0},{timeout:30000});
    }catch(error){console.error('Auto local',await c.page.evaluate(()=>window.__onlineTest.fxState()));console.error('Auto remote',await b.page.evaluate(()=>window.__onlineTest.fxState()));throw error;}
    await c.page.evaluate(()=>window.__onlineTest.stop());
    await c.page.waitForTimeout(1000);
  }
  const buffIds=cuiyan?[100,109]:[171,173];
  await c.page.waitForFunction(ids=>{const state=window.__onlineTest.state().pve;return ids.every(id=>state.actors.find(a=>a.id===state.self)?.supports?.some(s=>s.skill===id&&s.active));},buffIds);
  const buffActor=await c.page.evaluate(()=>window.__onlineTest.state().pve.self);
  await b.page.waitForFunction(({owner,ids})=>ids.every(id=>window.__onlineTest.state().pve.actors.find(a=>a.id===owner)?.supports?.some(s=>s.skill===id&&s.active)),{owner:buffActor,ids:buffIds});
  const buffFiles=await c.page.evaluate(ids=>window.__onlineTest.supportFiles(ids),buffIds);
  assert.ok(buffFiles.length>0,'buffs have native support sprites');
  await b.page.waitForFunction(files=>files.every(file=>window.__supportDraws[file]),buffFiles);
  console.log('Authoritative auto buffs and remote FX on both clients',buffIds,buffFiles);
  const source=await c.page.evaluate(()=>window.__onlineTest.state().pve.self);
  const firstDraw=clientTraces.find(e=>e.client==='online_advanced'&&e.stage==='canvas-draw'&&e.source===source);
  assert.ok(firstDraw,'production diagnostics confirms actual Canvas drawing');
  assert.ok(clientTraces.some(e=>e.client==='online_advanced'&&e.stage==='cast-received'&&e.event===firstDraw.event),'same CAST ID received and drawn');
  const serverTrace=logs.split('\n').filter(line=>line.startsWith('[online:server] ')).flatMap(line=>{try{return [JSON.parse(line.slice(16))];}catch{return [];}});
  assert.ok(serverTrace.some(e=>e.stage==='cast-generated'&&e.details.event===firstDraw.event),'same CAST ID originated on Rust');
  assert.ok(serverTrace.some(e=>e.stage==='world-sent'&&e.details.events.some(event=>event.event===firstDraw.event)),'CAST written to QUIC');
  console.log('Correlated CAST',JSON.stringify({event:firstDraw.event,skill:firstDraw.skill,stages:['cast-generated','world-sent','cast-received','visual-release','canvas-draw']}));
  const dealt=await c.page.evaluate(()=>{const self=window.__onlineTest.state().pve.self;return window.__resolvedHits.find(e=>e.source===self&&e.maxHp&&e.value>e.maxHp);});
  assert.ok(dealt,'resolved hit label exceeds low-level monster HP instead of being capped');
  const observed=await b.page.evaluate(id=>window.__resolvedHits.find(e=>e.id===id),dealt.id);
  assert.equal(observed?.value,dealt.value,'both players receive the same uncapped damage');
  await c.page.screenshot({path:path.join(root,'output/multiplayer/advanced-skill-local.png')});
  await b.page.screenshot({path:path.join(root,'output/multiplayer/advanced-skill-remote.png')});
  // Use the real buttons; resources/stock must come back from Rust and persist.
  await c.page.evaluate(()=>window.__onlineTest.farm());
  await c.page.waitForFunction(()=>{const s=window.__onlineTest.state().pve,a=s?.actors.find(a=>a.id===s.self);return a&&a.mp<a.maxMp-5;},null,{timeout:15000});
  await c.page.locator('#bMp').click({position:{x:12,y:12}});
  await c.page.waitForFunction(()=>window.__onlineTest.state().pve.events.some(e=>e.kind===5&&e.source===window.__onlineTest.state().pve.self&&e.skill===101));
  await c.page.waitForFunction(async()=>{const r=await fetch('/api/multiplayer/character?slot=0');const p=await r.json();return p.profile.potStock?.mana?.[1]===9;});
  const hpAccount=cuiyan?c:b;
  await hpAccount.page.waitForFunction(()=>{const s=window.__onlineTest.state().pve,a=s?.actors.find(a=>a.id===s.self);return a&&a.hp>0&&a.hp<a.maxHp-.1;},null,{timeout:15000});
  await hpAccount.page.locator('#bHp').click({position:{x:12,y:12}});
  await hpAccount.page.waitForFunction(()=>window.__onlineTest.state().pve.events.some(e=>e.kind===5&&e.source===window.__onlineTest.state().pve.self&&e.skill===1));
  await hpAccount.page.waitForFunction(async()=>{const r=await fetch('/api/multiplayer/character?slot=0');const p=await r.json();return p.profile.potStock?.life?.[1]===9;});
  await c.page.evaluate(()=>window.__onlineTest.stop());
  console.log('Potion buttons: HP/MP accepted by Rust; both stocks persisted 10 → 9');
  {
  // Real mode menu and mouse click: canonical green vs orange, server PvP hit.
  await c.page.locator('#mswBtn').click();
  await c.page.locator('[data-msw="slaughter"]').click();
  await c.page.waitForFunction(()=>{const s=window.__onlineTest.state().pve;return s.actors.find(a=>a.id===s.self)?.pk;});
  const victim=await b.page.evaluate(()=>window.__onlineTest.state().pve.self);
  await b.page.waitForFunction(()=>{const s=window.__onlineTest.state().pve;return s.actors.find(a=>a.id===s.self)?.hp>0;});
  await c.page.evaluate(id=>window.__onlineTest.follow(id),victim);
  await c.page.waitForTimeout(150);
  const peer=await c.page.evaluate(id=>{const p=window.__onlineTest.state().remote.find(p=>p.id===id);return window.__onlineTest.screen(p.x,p.y-22);},victim);
  await c.page.mouse.click(peer.x,peer.y);
  await c.page.waitForFunction(id=>{const s=window.__onlineTest.state().pve;return s.events.some(e=>e.kind===2&&e.source===s.self&&e.target===id&&e.value>0);},victim,{timeout:20000});
  const pvpHit=await c.page.evaluate(id=>{const s=window.__onlineTest.state().pve;return s.events.find(e=>e.kind===2&&e.source===s.self&&e.target===id);},victim);
  await b.page.waitForFunction(id=>window.__resolvedHits.some(e=>e.id===id),pvpHit.id);
  assert.ok(logs.split('\n').some(line=>line.startsWith('[online:server] ')&&line.includes('"stage":"pvp-hit"')&&line.includes('"scale":0.2')),'Rust records shared Tong Kim multiplier');
  console.log('Slaughter menu + real mouse target:',JSON.stringify(pvpHit));
  await c.page.screenshot({path:path.join(root,'output/multiplayer/slaughter-mode.png')});
  await c.page.evaluate(()=>window.__onlineTest.stop());
  }

  await c.context.close();await b.context.close();
  assert.deepEqual(errors,[]);
});
