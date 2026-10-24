const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const acorn=require('acorn');
const {loadCombatEngine}=require('./helpers/combat-engine');
const {loadMapsEngine}=require('./helpers/maps-engine');
function declaration(s,file,name){
 const text=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 const node=acorn.parse(text,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));
 assert.ok(node,name);vm.runInContext(text.slice(node.start,node.end),s);
}
function world(){
 const s={Math,Set,Map,v:{x:0,y:0},l:{fx:[],enemies:[],life:1000,zoneShown:1},Y:{target:{x:400,y:0},mouse:true},
 QA:.81,Z0:{g:false},R2:()=>true,mt:()=>true,A0:{m:{},f:{},s:{}},Hi:{phys:'#fff'},Y3:()=>0,G3(){},x8(){},
 ws:()=>.4,kn:()=>0,Qa:.5,Mw(){throw Error('movement during lock');},W3(){},r0:{1:{anim:'monster'}},q0:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),_1:()=>s.l.enemies};
 vm.createContext(s);loadCombatEngine(s);
 s.mapNavigation=loadMapsEngine(s).createNavigationRuntime(actor=>s.actorActionLocked(actor));
 return s;
}
function run(s,seconds){for(let t=0;t<seconds-1e-9;t+=.01)s.advanceSkillContacts(.01);}

test('hurt starts at 15 percent of maximum HP per hit, interrupts actions and lasts half a second',()=>{
 const s=world(),a=s.v;Object.assign(a,{act:'at',moving:true,mv:true,castT:.4,atT:.7,actionRevision:3});
 const before={...a};
 for(const damage of [0,49,50,51,100,149.999]) {
  assert.equal(s.applyActorHurt(a,damage,1000),false);assert.deepEqual(a,before);
 }
 assert.equal(s.applyActorHurt(a,150,1000),true);
 assert.equal(a.act,'hurt');assert.equal(a.castT,0);assert.equal(a.atT,0);assert.equal(a.actionRevision,4);
 assert.equal(a.moving,false);assert.equal(a.mv,false);assert.equal(a.hurtT,.5);assert.equal(s.l.hurtT,.5);
 assert.equal(s.beginActorCast(a),false);run(s,.49);assert.equal(s.actorActionLocked(a),true);
 run(s,.02);assert.equal(s.actorActionLocked(a),false);assert.equal(a.act,'st');assert.equal(s.l.hurtT,0);
 for(const [damage,max]of [[Infinity,1000],[NaN,1000],[150,0],[150,-100],[150,Infinity]])assert.equal(s.applyActorHurt(a,damage,max),false);
 assert.equal(s.applyActorHurt({hurtProxy:true},1000,1000),false);
});

test('a primary cast stops movement and all locomotion APIs reject input until the pose ends',()=>{
 const s=world(),a=s.v;s.l.moveTo={x:300,y:0};s.l.pickTarget={};a.moving=true;
 for(const name of ['wa','Mw'])declaration(s,'src/client/core/attributes-01.js',name);
 declaration(s,'src/client/ui/legacy-panels-and-audio-03.js','Ah');
 const target={x:50,y:0,hp:100,r:17};s.l.enemies=[target];
 s.queueSkillContact(a,target,{parts:{phys:10},melee:true},()=>{});
 assert.equal(a.act,'at');assert.equal(a.moving,false);assert.equal(s.Y.target,null);assert.equal(s.l.moveTo,null);
 s.wa(a,300,0,100);s.Mw(a,300,0,100);assert.equal(s.Ah(.1),false);assert.equal(a.x,0);
 run(s,.41);s.wa(a,300,0,100);assert.equal(a.x,100);
});

test('hurt cancels an unreleased windup but preserves launched projectiles',()=>{
 for(const hitTime of [.02,.15]){
  const s=world(),a=s.v,target={x:100,y:0,hp:100,r:17};s.l.enemies=[target];let hits=0;
  s.queueSkillContact(a,target,{parts:{phys:10},melee:false,rad:500},()=>hits++);
  run(s,hitTime);s.applyActorHurt(a,500,1000);run(s,1);
  assert.equal(hits,hitTime<.12?0:1);
 }
});

test('monster AI waits for hurt to end before attacking',()=>{
 const s=world(),monster={x:50,y:0,hp:100,max:100,r:17,tid:1,spd:100,ar:10,reach:100,atkCd:0,cd:1};
 s.v.x=70;s.l.enemies=[monster];declaration(s,'src/client/core/state-and-save-01.js','$d');
 s.applyActorHurt(monster,60,100);s.$d(monster,.1);assert.ok(!s.l.combatProjectiles?.length);
 run(s,.51);s.$d(monster,.1);assert.ok(monster.castT>0);assert.equal(s.l.combatProjectiles?.length||0,0);run(s,1);assert.ok(s.l.combatProjectiles.length>0);
});

test('auto ground input cancels unreleased windups but preserves launched projectiles',()=>{
 for(const elapsed of [.02,.15]){
  const s=world(),target={x:100,y:0,hp:100,r:17};let hits=0;
  s.hA=()=>false;
  declaration(s,'src/client/ui/legacy-panels-and-audio-04.js','Y');
  s.l.enemies=[target];
  s.queueSkillContact(s.v,target,{parts:{phys:10},melee:false,rad:500},()=>hits++);
  run(s,elapsed);s.Y.moveTarget(300,0);
  assert.equal(s.actorActionLocked(s.v),false);assert.equal(s.Y.tmp,true);
  run(s,1);assert.equal(hits,elapsed<.12?0:1);
 }
});

test('manual movement immediately interrupts automatic buff locks in both modes and auto buffs wait until movement stops',()=>{
 for(const manual of [false,true])for(const input of ['ground','keyboard','joystick','gamepad']) {
  const s=world(),buffs={buff:{},cd:{}};
  Object.assign(s,{hA:()=>manual,T1:{v:[0,0]},an:45,
   o:{fac:'test',sk:{1:1,2:1}},v7(){},k4:0,ya:()=>1,ba:()=>buffs,
   T:{1:{n:'Buff 1'},2:{n:'Buff 2'}},wn:()=> 'buff',zi:()=>1,M7:()=>10,ae:()=>10,
   i4:()=>false,b4:id=>buffs.buff[id]>1,Ra:()=>1,H5:(x,y)=>[x,y],
   gt:(actor,x,y)=>{Object.assign(actor,{x,y,moving:true});return true;}});
  s.l.P={life:1000,mana:1000};s.l.mana=1000;
  declaration(s,'src/client/ui/legacy-panels-and-audio-04.js','Y');
  for(const name of ['Qv','Ah'])declaration(s,'src/client/ui/legacy-panels-and-audio-03.js',name);
  declaration(s,'src/client/gameplay/shop-and-books-01.js','A6');
  s.A6(.5);assert.ok(s.v.castT>0);assert.equal(s.l.mana,990);
  if(input==='ground')s.Y.moveTarget(300,0);
  if(input==='keyboard')s.Y.keys.d=true;
  if(input==='joystick')Object.assign(s.Y,{active:true,moved:true,ox:0,oy:0,x:45,y:0});
  if(input==='gamepad')s.T1.v=[1,0];
  for(let tick=0;tick<4;tick++) {
   s.A6(.5);assert.equal(s.Ah(.1),true,`${manual}/${input}`);
  }
  assert.ok(s.v.x>0);assert.equal(s.v.castT,0);assert.equal(s.l.mana,990);
  assert.equal(buffs.buff[2],undefined,'buff sequence cannot re-lock a moving player');
  assert.equal(buffs.buff[1],11,'interrupting the pose preserves an already applied buff');
  Object.assign(s.Y,{active:false,moved:false,target:null,keys:{}});s.T1.v=[0,0];
  s.A6(.5);assert.equal(s.l.mana,980);assert.equal(buffs.buff[2],11,'auto buff resumes after stopping');
 }
});

test('manual movement cancels a pending automatic curse without replaying or refunding it',()=>{
 const s=world(),buffs={buff:{},cd:{}},target={x:100,y:0,hp:100,cls:'boss'};
 Object.assign(s,{hA:()=>true,o:{fac:'test',sk:{1:1}},v7(){},k4:0,ya:()=>1,ba:()=>buffs,
  T:{1:{n:'Curse'}},wn:()=> 'curse',zi:()=>1,M7:()=>10,ae:()=>10,i4:()=>false,b4:()=>false});
 s.l.P={life:1000,mana:1000};s.l.mana=1000;s.l.enemies=[target];
 declaration(s,'src/client/ui/legacy-panels-and-audio-04.js','Y');
 declaration(s,'src/client/gameplay/shop-and-books-01.js','A6');
 s.A6(.5);assert.equal(s.l.mana,990);assert.ok(s.v.castT>0);
 s.Y.moveTarget(300,0);assert.equal(s.v.castT,0);
 run(s,1);assert.equal(target.curse,undefined);assert.equal(s.l.mana,990);
 s.A6(.5);assert.equal(s.l.mana,990,'no new curse while the move command remains active');
});

test('hurt blocks automatic buffs until recovery',()=>{
 const s=world(),buffs={buff:{},cd:{}};
 Object.assign(s,{o:{fac:'test',sk:{1:1}},v7(){},k4:0,ya:()=>1,ba:()=>buffs,T:{1:{n:'Buff'}},wn:()=> 'buff',zi:()=>1,M7:()=>10,ae:()=>10,i4:()=>false,b4:()=>false});
 s.l.P={life:1000,mana:1000};s.l.mana=1000;
 declaration(s,'src/client/gameplay/shop-and-books-01.js','A6');
 s.applyActorHurt(s.v,500,1000);s.v.moving=true;s.A6(.5);
 assert.equal(s.l.mana,1000);assert.equal(buffs.buff[1],undefined);run(s,.51);s.A6(.5);
 assert.equal(s.l.mana,990);assert.equal(s.v.moving,false);assert.ok(s.v.castT>0);assert.equal(buffs.buff[1],11);
});

test('allies enter hurt on large hits and continue taking damage',()=>{
 const s=world(),ally={x:100,y:0,n:'ally',owner:'ally',hp:100,hpMax:100,def:0,res:0,se:0,t:0,atkT:0,act:'st',mv:true};
 Object.assign(s,{Pe:()=>100,Z:()=>1,y1:()=>false,showDamageNumber(){},Dw:['phys']});
 s.l.allies=[ally];declaration(s,'src/client/online/party-01.js','hB');
 s.hB(ally,{ar:100,dmg:60,series:0});assert.equal(ally.hp,40);
 assert.equal(ally.act,'hurt');assert.equal(ally.mv,false);assert.equal(ally.hurtT,.5);
 s.hB(ally,{ar:100,dmg:15,series:0});assert.equal(ally.hp,25);assert.equal(ally.hurtT,.5);
});

test('hurt blocks keyboard, joystick and path movement until recovery',()=>{
 const s=world();for(const name of ['wa','Mw'])declaration(s,'src/client/core/attributes-01.js',name);
 declaration(s,'src/client/ui/legacy-panels-and-audio-03.js','Ah');
 Object.assign(s,{hA:()=>false,Qv:()=>[1,0],Ra:()=>1,H5:(x,y)=>[x,y],gt:(a,x,y)=>Object.assign(a,{x,y})});
 s.applyActorHurt(s.v,500,1000);s.wa(s.v,300,0,100);assert.equal(s.v.x,0);
 assert.equal(s.Ah(.1),false);s.Mw(s.v,300,0,100);assert.equal(s.v.x,0);
 run(s,.51);s.wa(s.v,300,0,100);assert.equal(s.v.x,100);
 assert.equal(s.Ah(.1),true);assert.equal(s.v.x,115);
 s.Mw(s.v,300,0,100);assert.ok(s.v.x>115);assert.ok(!(s.v.hurtT>0));
});
