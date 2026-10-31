const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
function fixture(){
  const image=new EventTarget();image.complete=false;
  const calls=[];
  const game={A0:{f:{1063:{c:1}},m:{1:{fly:{f:'fx/cold.webp'}}}},T:{1063:{}},
    F5:()=>[],F2:(_stats,skill)=>({id:skill===game.T[1082]?1082:1063}),bA:()=>image,Jt:()=>({anim:'hero'}),kn:()=>0,
    l:{fx:[],P:{basic:{}},town:false,zoneShown:140},v:{},o:{fac:'cuiyan',sk:{},eq:{}},Y:{},
    skillVisualContext:null,GameWebTransport:{castSkillVisual:(...args)=>calls.push(args)},setTimeout,clearTimeout};
  vm.createContext(game);vm.runInContext(fs.readFileSync('src/client/multiplayer/state/skill-visuals.js','utf8'),game);
  const visuals=game.OnlineSkillVisuals();
  visuals.sync({self:1,actors:[{id:1,x:10,y:20}],monsters:[{id:2,x:60,y:20,hp:100}]});
  const event={source:1,target:2,skill:1063,cast:{level:25,missiles:3,flags:2,range:200,x:10,y:20,targetX:60,targetY:20}};
  return {visuals,event,calls,game,load(){image.complete=true;image.dispatchEvent(new Event('load'));}};
}
test('cold skill sprite starts its animation after download, with frozen CAST anchors',async()=>{
  const f=fixture(),pending=f.visuals.play(f.event);
  assert.equal(f.calls.length,0);
  f.visuals.sync({self:1,actors:[{id:1,x:90,y:90}],monsters:[{id:2,x:100,y:90,hp:100}]});
  f.load();await pending;
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0][0].x,10);assert.equal(f.calls[0][1].x,60);
  f.visuals.play(f.event);assert.equal(f.calls.length,2,'warm sprites replay immediately');
});
test('map reset discards a cast waiting for its sprite',async()=>{
  const f=fixture(),pending=f.visuals.play(f.event);
  f.visuals.reset();f.load();await pending;
  assert.equal(f.calls.length,0);
});

test('a pending optional child sprite never blocks an already loaded primary animation',()=>{
  const f=fixture();f.load();
  const child=new EventTarget();child.complete=false;
  f.game.A0.f[1082]={c:2};f.game.A0.m[2]={fly:{f:'fx/child.webp'}};f.game.T[1082]={};
  f.game.F5=skill=>skill.id===1063?[{sid:1082}]:[];
  const primary=f.game.bA();f.game.bA=url=>url==='fx/child.webp'?child:primary;
  f.visuals.play(f.event);
  assert.equal(f.calls.length,1,'primary release must not wait on an optional secondary download');
  f.visuals.reset();
});

test('form-12 child used as the main projectile remains required before release',async()=>{
  const f=fixture();f.load();
  const child=new EventTarget();child.complete=false;
  f.game.T[1063].child=1082;f.game.T[1082]={};
  f.game.A0.g={1063:[12],1082:[1]};f.game.A0.f[1082]={c:2};f.game.A0.m[2]={fly:{f:'fx/child.webp'}};
  const primary=f.game.bA();f.game.bA=url=>url==='fx/child.webp'?child:primary;
  const pending=f.visuals.play(f.event);assert.equal(f.calls.length,0);
  child.complete=true;child.dispatchEvent(new Event('load'));await pending;
  assert.equal(f.calls.length,1);f.visuals.reset();
});

test('client reports a physical hit only after its collision frame paints, once per cast/body',async()=>{
  const f=fixture(),frames=[],reports=[];f.load();
  f.game.requestAnimationFrame=callback=>frames.push(callback);
  let hit;
  f.game.GameWebTransport.castSkillVisual=(...args)=>{hit=args[5];};
  const visuals=f.game.OnlineSkillVisuals((...args)=>reports.push(args));
  visuals.sync({self:1,actors:[{id:1,x:10,y:20}],monsters:[{id:2,x:60,y:20,hp:100}]});
  const event={...f.event,id:0xabcdef01,skill:321};f.game.T[321]={};
  visuals.play(event,null,true);
  assert.equal(reports.length,0,'release is not a hit');
  hit({}, {id:2});hit({}, {id:2});
  assert.equal(reports.length,0,'collision callback must not send before paint');
  assert.equal(frames.length,1);
  frames.shift()();await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(reports.length,1);assert.equal(reports[0][0].id,event.id);assert.equal(reports[0][1],2);
  visuals.reset();
});

test('reset cancels contact reports and observers cannot confirm another player cast',async()=>{
  const f=fixture(),reports=[];f.load();let hit;
  f.game.GameWebTransport.castSkillVisual=(...args)=>{hit=args[5];};
  const visuals=f.game.OnlineSkillVisuals((...args)=>reports.push(args));
  visuals.sync({self:1,actors:[{id:1,x:10,y:20}],monsters:[{id:2,x:60,y:20,hp:100}]});
  visuals.play(f.event,null,true);hit({}, {id:2});visuals.reset();
  await new Promise(resolve=>setTimeout(resolve,5));assert.equal(reports.length,0);
  visuals.sync({self:99,actors:[{id:1,x:10,y:20}],monsters:[{id:2,x:60,y:20,hp:100}]});
  visuals.play(f.event,null,true);hit({}, {id:2});
  await new Promise(resolve=>setTimeout(resolve,5));assert.equal(reports.length,0);
  visuals.reset();
});

test('the PvP victim confirms its own displayed impact without acting as the attacker',async()=>{
  const f=fixture(),reports=[];f.load();let hit;
  f.game.GameWebTransport.castSkillVisual=(...args)=>{hit=args[5];};
  const visuals=f.game.OnlineSkillVisuals((...args)=>reports.push(args));
  visuals.sync({self:2,actors:[{id:1,x:10,y:20},{id:2,x:60,y:20}],monsters:[]});
  visuals.play(f.event,null,true);hit({}, {id:2});
  assert.equal(reports.length,0);
  await new Promise(resolve=>setTimeout(resolve,5));assert.equal(reports.length,1);assert.equal(reports[0][1],2);
  visuals.reset();
});

test('GM overlay includes the private online cast world and clears after map reset',()=>{
  const f=fixture();f.load();
  const {loadCombatEngine}=require('./helpers/combat-engine');
  Object.assign(f.game,{QA:.81,wf:.5});loadCombatEngine(f.game,{bridge:false});
  const localWorld=f.game.l;
  f.game.GameWebTransport.castSkillVisual=()=>{
    f.game.l.combatProjectiles.push({k:'jm',kind:0,age:0,x:60,y:6,z:0,hz:0,
      combat:{zone:140,skill:{id:1070,geo:{k:'spot',r:90/.81}}}});
  };
  f.visuals.play(f.event);
  const ellipses=[];const context={save(){},restore(){},setLineDash(){},beginPath(){},fill(){},stroke(){},ellipse(...args){ellipses.push(args);}};
  f.game.CombatEngine.drawSkillDamageAreas(context);assert.equal(ellipses.length,0,'local list has no online cast');
  f.visuals.drawDamageAreas(context);
  assert.equal(ellipses.length,1);assert.deepEqual(ellipses[0].slice(0,4),[60,20,90,45]);
  assert.equal(f.game.l,localWorld,'overlay must not replace the main world');
  assert.equal(localWorld.combatProjectiles?.length||0,0);
  f.visuals.reset();ellipses.length=0;f.visuals.drawDamageAreas(context);
  assert.equal(ellipses.length,0,'stale map effects do not remain in the overlay');
});
