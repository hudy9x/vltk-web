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
