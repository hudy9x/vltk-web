const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),esbuild=require('esbuild');
const protocol=(()=>{const module={exports:{}};vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/state/protocol.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,{module,exports:module.exports,TextDecoder,Uint8Array,DataView});return module.exports;})();
test('public recruitment uses ten native level-200 factions with both learned skill tiers and Emei support',()=>{
  const d=require('../src/server/multiplayer/definitions/battlefield.cjs').definition();
  assert.equal(d.templates.length,10);assert.equal(new Set(d.templates.map(t=>t.faction)).size,10);
  for(const t of d.templates){assert.ok(Object.values(t.equipment).some(i=>i.set?.kind==='gold'),t.faction);assert.ok(Object.values(t.equipment).filter(i=>!i.set).every(i=>i.lvl===10),t.faction);assert.ok(['m','f'].includes(t.appearance.sx));assert.ok(t.appearance.rows.armor>=0&&t.appearance.rows.helm>=0&&t.appearance.rows.weapon>=0);assert.equal(t.profile.level,200);assert.ok(t.skills.length>=2,t.faction);assert.ok(t.profile.hp>0);assert.ok(t.profile.skills.every(s=>s.parts.every(Number.isFinite)));assert.ok(Array.isArray(t.profile.support.skills),t.faction);}
  const emei=d.templates.find(t=>t.faction==='emei');assert.ok(emei.profile.support.skills.some(s=>s.shared?.allres_p>0));assert.ok(emei.profile.support.skills.some(s=>s.shared?.lifemax_p>0));assert.ok(d.simSupport.some(s=>s.shared?.allres_p>0));
  assert.equal(d.soldiers.length,70);assert.equal(d.soldiers.filter(s=>s.team==='song').length,35);
  const world=require('../src/server/multiplayer/definitions/catalog.cjs').world();assert.ok(world.maps.some(m=>m.id===9003));assert.equal(world.battlefield,d);
});
test('public battlefield targets obey camps instead of alignment and PK toggle',()=>{
  const s={o:{mode:'farm'},l:{town:false},GameWebTransport:{newer:()=>false}};vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/pvp.js','utf8'),s);
  const actor=(id,team,alignment,ready=true)=>({id,x:id*10,y:10,hp:100,alignment,pk:false,battlefieldTeam:team,battlefieldReady:ready});
  const state={self:1,battlefield:{phase:'running'},actors:[actor(1,0,0),actor(2,1,0),actor(3,0,2),actor(4,1,0,false)]};
  assert.deepEqual(Array.from(s.OnlinePvp.targets(state),a=>a.id),[2]);assert.equal(s.OnlinePvp.nameColor(state),'#ffcc00');
  state.battlefield.phase='finished';assert.equal(s.OnlinePvp.targets(state).length,0);
});
test('wire accepts explicit join/leave commands but rejects invalid kinds',()=>{
  for(const kind of [19,20])assert.equal(protocol.encodeCommand(1,1,{kind,map:9003,target:1})[6],kind);
  assert.throws(()=>protocol.encodeCommand(1,1,{kind:21,map:9003}));
});
test('public merit reaches canonical storage exactly once without altering other currency',()=>{
  const {DatabaseSync}=require('node:sqlite');const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('merit-account','jxidle',JSON.stringify({fac:'vo0',lvl:1,gold:25,mats:{misc:{tk_merit:100}}}));
  try{const store=createCharacters(db),grant={id:'100-20-30-1-4',account:'merit-account',slot:0,xp:0,gold:0,merit:150};
    store.apply(grant);store.apply(grant);const saved=store.read('merit-account',0);assert.equal(saved.profile.mats.misc.tk_merit,250);assert.equal(saved.profile.gold,25);assert.equal(saved.revision,1);
    assert.throws(()=>store.apply({...grant,id:'100-20-31-1-4',merit:-1}));
  }finally{db.close();}
});
function worldPacket(count=1,patch={}){
  const start=43+55*count+13,base=Buffer.alloc(start);base.set([8,17]);base.writeUInt16LE(count,18);base.writeUInt32LE(9003,6);base.writeUInt32LE(500,10);
  const units=[];for(let i=0;i<count;i++){const at=43+55*i;base.writeUInt32LE(500+i,at);for(const offset of [12,16,20,24])base.writeFloatLE(100,at+offset);base.writeUInt32LE(1,at+39);
    units.push({id:500+i,name:'SIM '+i,faction:'emei',sex:0,skin:0,team:i%2,kind:1,tier:0,points:0,kills:0,online:true,moving:false,ready:true,level:200});}
  const state={id:99,starts:10,ends:1210,now:430,phase:'running',score:[100,200],team:0,entryRemaining:0,respawnRemaining:0,deaths:0,potions:[30,30],units,...patch};
  const json=Buffer.from(JSON.stringify(state)),header=Buffer.alloc(5);header[0]=0xe1;header.writeUInt32LE(json.length,1);return Buffer.concat([base,header,json]);
}
test('public snapshots carry more than 32 combatants and reject malformed room state',()=>{
  const b=worldPacket(94),state=protocol.decodeWorld(b);assert.equal(state.actors.length,94);assert.equal(state.battlefield.ends-state.battlefield.now,780);assert.equal(state.actors[1].battlefieldTeam,1);
  assert.throws(()=>protocol.decodeWorld(b.subarray(0,-1)),/battlefield size/);
  assert.throws(()=>protocol.decodeWorld(worldPacket(1,{score:[-1,0]})),/battlefield state/);
  assert.throws(()=>protocol.decodeWorld(worldPacket(1,{potions:[41,30]})),/battlefield state/);
  assert.throws(()=>protocol.decodeWorld(worldPacket(1,{units:[{id:500,team:3}]})),/battlefield state/);
});
test('shared combat does not flood the server with cosmetic client contact acknowledgements',()=>{
  let contact;const commands=[];
  const s={v:{},o:{ctrl:'manual'},l:{},Y:{},Z0:{key:9003},E0:{town:{id:37}},window:{},clearTimeout,
    GameWebTransport:{LocalMotion:class{receive(){} clear(){}}},OnlineSkillVisuals:fn=>{contact=fn;return {sync(){},reset(){}};}};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/legacy-pve.js','utf8'),s);
  s.onlineWorld.bind({authoritative:true,command:c=>(commands.push(c),1)});
  const next={map:9003,self:1,actors:[{id:1,hp:100,farming:false}],monsters:[],events:[],battlefield:{id:1}};
  s.onlineWorld.snapshot(next);contact({id:5,skill:150},2);assert.equal(commands.length,0);
  s.Z0.key=2;s.onlineWorld.snapshot({...next,map:2,battlefield:undefined});contact({id:6,skill:150},2);assert.equal(commands.length,1);assert.equal(commands[0].kind,16);
});


test('public combatants interpolate snapshots and advance native run, attack and death sprites',()=>{
  const module={exports:{}};vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/webtransport/interpolation.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,{module,exports:module.exports,TextEncoder,TextDecoder,Uint8Array,DataView});
  let now=100,pose=null;const draws=[],s={performance:{now:()=>now},GameWebTransport:module.exports,onlineWorld:{pose:()=>pose},kn:()=>2,Jn:1,Ua:1.35,
    Jt:()=>({anim:'hero'}),r0:{7:{anim:'soldier',sz:60}},Va:(...args)=>(draws.push(args),80),ws:()=>.6,U1:{},L3(){},OnlinePvp:{healthColor:()=>''},nameplateOffset:()=>65};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/battlefield.js','utf8'),s);
  const next={tick:2,map:9003,battlefield:{units:[{id:9,kind:2,online:true,moving:true,skin:7,name:'Binh sĩ',team:0}]},actors:[{id:9,x:0,y:0,hp:100,maxHp:100,life:1}]};
  const ctx={beginPath(){},ellipse(){},fill(){}};
  let body=s.OnlineBattlefield.entities(next)[0].remotePlayer;assert.equal(body.x,0);
  now=200;next.tick=4;next.actors[0].x=100;s.OnlineBattlefield.entities(next);
  now=300;body=s.OnlineBattlefield.entities(next)[0].remotePlayer;assert.equal(body.x,50);assert.equal(body.mv,true);assert.equal(body.dir,2);
  s.OnlineBattlefield.draw(ctx,body,next);assert.equal(draws.at(-1)[0],'soldier');assert.equal(draws.at(-1)[1],'run');
  now=320;body=s.OnlineBattlefield.entities(next)[0].remotePlayer;s.OnlineBattlefield.draw(ctx,body,next);assert.ok(draws.at(-1)[3]>0);
  pose={atT:.2,atD:.4,dir:3};now=330;body=s.OnlineBattlefield.entities(next)[0].remotePlayer;s.OnlineBattlefield.draw(ctx,body,next);assert.equal(draws.at(-1)[1],'run','stale attack pose must not make moving soldiers slide');
  const gait=body.actT;
  now=360;body=s.OnlineBattlefield.entities(next)[0].remotePlayer;s.OnlineBattlefield.draw(ctx,body,next);assert.equal(draws.at(-1)[1],'at');assert.ok(Math.abs(draws.at(-1)[3]-.3)<1e-6);
  next.tick=8;next.actors[0].x=200;now=400;s.OnlineBattlefield.entities(next);
  now=450;body=s.OnlineBattlefield.entities(next)[0].remotePlayer;assert.equal(body.act,'run');assert.ok(body.actT>gait,'gait continues across short pauses');
  const other={...next.battlefield.units[0],id:10};next.battlefield.units.push(other);next.actors.push({...next.actors[0],id:10});
  s.OnlineBattlefield.entities(next);next.tick=10;next.actors.forEach(a=>a.x+=100);now=500;s.OnlineBattlefield.entities(next);
  now=550;const pair=s.OnlineBattlefield.entities(next);assert.equal(pair[1].remotePlayer.act,'run');assert.notEqual(pair[0].remotePlayer.actT,pair[1].remotePlayer.actT,'each soldier has its own footstep phase');
  next.battlefield.units.pop();next.actors.pop();
  next.actors[0].hp=0;now=400;assert.equal(s.OnlineBattlefield.entities(next).length,0,'dead soldiers have no render entity, shadow or nameplate');
  next.battlefield.units[0].kind=1;assert.equal(s.OnlineBattlefield.entities(next).length,0,'dead SIM have no sprite, name or shadow');
  next.battlefield.units[0].kind=2;
  next.actors[0].hp=100;next.actors[0].life=2;next.actors[0].x=900;next.tick=8;pose=null;now=500;body=s.OnlineBattlefield.entities(next)[0].remotePlayer;assert.equal(body.x,900);assert.equal(body.hpMax,100);
  next.battlefield.units[0].kind=1;next.battlefield.units[0].faction='emei';body=s.OnlineBattlefield.entities(next)[0].remotePlayer;s.OnlineBattlefield.draw(ctx,body,next);assert.equal(draws.at(-1)[0],'hero');
  next.battlefield.units[0].appearance={sx:'m',rows:{helm:5,armor:29,weapon:21,horse:-1},ride:0,mg:true};
  let composite;s.lB=look=>({sx:look.sx,rows:look.r,asc:{}});s.It=(...args)=>(composite=args,90);
  body=s.OnlineBattlefield.entities(next)[0].remotePlayer;s.OnlineBattlefield.draw(ctx,body,next);assert.equal(composite[8].rows.armor,29);assert.equal(composite[8].rows.weapon,21);assert.equal(composite[8].mg,true);
  assert.equal(s.OnlineBattlefield.entities({...next,map:9004}).length,0);
});


test('own respawn notice follows server time and clears on revival or leaving',()=>{
  const nodes=new Map();let now=0;
  const element=()=>({children:[],style:{},hidden:false,classList:{remove(){},toggle(){}},setAttribute(){},append(...items){this.children.push(...items);for(const child of items)if(child?.id)nodes.set(child.id,child);},appendChild(child){this.append(child);},remove(){nodes.delete(this.id);}});
  const s={performance:{now:()=>now},document:{createElement:element,head:element(),body:element(),getElementById:id=>nodes.get(id)},window:{},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},m0:0,l:{},R:false};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/battlefield.js','utf8'),s);
  const next={map:9003,self:1,actors:[{id:1,hp:0}],battlefield:{id:1,now:100,ends:1200,phase:'running',team:0,score:[0,0],potions:[0,0],units:[],entryRemaining:0,respawnRemaining:5,deaths:1}};
  s.OnlineBattlefield.sync(next,()=>1);assert.equal(nodes.get('public-war-respawn').hidden,false);assert.equal(nodes.get('public-war-respawn').textContent,'Tái xuất chiến sau 5 giây');
  now=2100;s.OnlineBattlefield.entities(next);assert.equal(nodes.get('public-war-respawn').textContent,'Tái xuất chiến sau 3 giây');
  next.actors[0].hp=100;next.battlefield.respawnRemaining=0;s.OnlineBattlefield.sync(next,()=>1);assert.equal(nodes.get('public-war-respawn').hidden,true);
  next.actors[0].hp=0;next.battlefield.respawnRemaining=7;s.OnlineBattlefield.sync(next,()=>1);assert.equal(nodes.get('public-war-respawn').hidden,false);
  delete next.battlefield;s.OnlineBattlefield.sync(next,()=>1);assert.equal(nodes.get('public-war-respawn').hidden,true);
});

test('SIM support visuals clear when a snapshot omits expired shared support and return on re-entry',()=>{
  const module={exports:{}};
  vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/webtransport/interpolation.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,{module,exports:module.exports,TextEncoder,TextDecoder,Uint8Array,DataView});
  let now=100;const effects=[];
  const s={performance:{now:()=>now},GameWebTransport:module.exports,onlineWorld:{pose:()=>null},kn:()=>0,Jn:1,Ua:1,
    Jt:()=>({anim:'hero'}),Va:()=>80,ws:()=>1,U1:{92:{pos:'foot'}},F3:(_ctx,sprite)=>effects.push(sprite),L3(){},OnlinePvp:{healthColor:()=>''},nameplateOffset:()=>65};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/battlefield.js','utf8'),s);
  const next={tick:2,map:9003,battlefield:{units:[{id:9,kind:1,online:true,moving:false,faction:'wudu',name:'Ngũ Độc',team:0}]},actors:[{id:9,x:100,y:100,hp:100,maxHp:100,life:1,supports:[{skill:92,active:true,shared:true,aura:true}]}]};
  const ctx={beginPath(){},ellipse(){},fill(){}};
  const draw=()=>{now+=50;next.tick++;const body=s.OnlineBattlefield.entities(next)[0].remotePlayer;s.OnlineBattlefield.draw(ctx,body,next);return body;};
  const initial=draw();assert.equal(effects.length,1);
  delete next.actors[0].supports;
  const outside=draw();assert.equal(outside,initial,'reuse the existing rendered SIM');
  assert.equal(outside.supports.length,0);assert.equal(effects.length,1,'old aura must stop drawing');
  next.actors[0].supports=[{skill:92,active:true,shared:true,aura:true}];
  draw();assert.equal(effects.length,2,'receiving support again restores the FX');
  next.actors[0].supports=[];draw();assert.equal(effects.length,2);
});
