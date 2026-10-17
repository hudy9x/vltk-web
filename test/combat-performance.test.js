const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {loadCombatEngine}=require('./helpers/combat-engine');
const {compileTypeScriptEntry}=require('../tools/build-app');
function scene(){
 const s={Math,Map,Set,o:{lowFx:false},l:{txt:[],fx:[],P:{},life:100,zoneShown:1},v:{x:0,y:0},
  QA:.81,Z0:{g:false},mt:()=>true,E:(n,a,b)=>Math.max(a,Math.min(b,n)),Hi:{phys:'#fff'},Y3:()=>0,
  G3(){},TP:()=>true,RP:()=>true,yn:()=>1,x8(){},gf(){}};
 vm.createContext(s);loadCombatEngine(s);
 vm.runInContext(compileTypeScriptEntry('combat/spatial/target-grid.ts','Grid').code,s);
 return s;
}
test('dense damage is globally bounded, preserves a protected player row and leaves HP untouched',()=>{
 const s=scene(),e=s.CombatEngine,player={x:0,y:0,hp:100};
 e.enqueueDamageLabel(s.l.txt,player,5,'phys',{priority:3});
 const targets=Array.from({length:1000},(_,i)=>({x:i%10,y:0,hp:100}));
 for(let tick=0;tick<4;tick++){
  for(const target of targets)e.enqueueDamageLabel(s.l.txt,target,1.25);
  e.updateDamageLabels(s.l.txt,.05);
  assert.ok(s.l.txt.length<=96);
 }
 assert.ok(s.l.txt.some(label=>label.target===player));assert.equal(player.hp,100);
 assert.ok(targets.every(target=>target.hp===100));
 const rows=new Map();for(const row of s.l.txt)rows.set(row.target,(rows.get(row.target)||0)+1);
 assert.ok([...rows.values()].every(n=>n<=2));
});
test('dense compatible hits merge for 400ms without merging different recipients or hit types',()=>{
 const s=scene(),e=s.CombatEngine;
 const targets=Array.from({length:30},()=>({x:0,y:0}));
 for(const target of targets)e.enqueueDamageLabel(s.l.txt,target,1.25);
 e.updateDamageLabels(s.l.txt,.2);
 const old=s.l.txt.find(label=>label.target===targets[0]);
 e.enqueueDamageLabel(s.l.txt,targets[0],2.5);
 assert.equal(old.amount,3.75);assert.equal(old.hits,2);
 e.enqueueDamageLabel(s.l.txt,targets[0],10,'poison');
 assert.equal(old.amount,3.75);
 e.updateDamageLabels(s.l.txt,.21);e.enqueueDamageLabel(s.l.txt,targets[0],7);
 assert.notEqual(s.l.txt.at(-1),old);assert.equal(s.l.txt.at(-1).amount,7);
});
test('viewport culling and low-effects budget suppress visuals only; reset queues do not retain prior targets',()=>{
 const s=scene(),e=s.CombatEngine,options={lowFx:true,viewport:{x:0,y:0,width:500,height:500}};
 assert.equal(e.enqueueDamageLabel(s.l.txt,{x:1000,y:0},100,'phys',options),undefined);
 for(let i=0;i<1000;i++)e.enqueueDamageLabel(s.l.txt,{x:i%500,y:0},100,'phys',options);
 assert.ok(s.l.txt.length<=48);
 s.l.txt=[];e.enqueueDamageLabel(s.l.txt,{x:2,y:3},9);assert.equal(s.l.txt.length,1);
});
test('text measurement is cached across hits and frames for each context and font size',()=>{
 const s=scene(),e=s.CombatEngine;let calls=0;
 const context={save(){},restore(){},font:'',measureText(){calls++;return {actualBoundingBoxAscent:10,actualBoundingBoxDescent:2};}};
 for(let i=0;i<100;i++)e.enqueueDamageLabel(s.l.txt,{x:i,y:0},100,'phys',{context,critical:i%2===0});
 for(let i=0;i<20;i++)e.updateDamageLabels(s.l.txt,.01,context);
 assert.equal(calls,2);
});
test('grid broad phase never misses exact circle/rectangle contacts, including large bodies and negative coordinates',()=>{
 const s=scene(),e=s.CombatEngine;
 let seed=12;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 const targets=Array.from({length:2000},()=>({x:rand()*4000-2000,y:rand()*2000-1000,r:8+rand()*70,hp:100}));
 targets.push({x:-128,y:-114,r:300,hp:100});
 const grid=new s.Grid.TargetGrid(targets);
 for(let i=0;i<100;i++){
  const x0=rand()*4000-2000,y0=rand()*2000-1000,x1=x0+rand()*500-250,y1=y0+rand()*250-125;
  for(const scale of [2,1/.6]){
   const radius=20+rand()*100;
   const candidates=new Set(grid.query({minX:Math.min(x0,x1)-radius,maxX:Math.max(x0,x1)+radius,
    minY:Math.min(y0,y1)-radius/scale,maxY:Math.max(y0,y1)+radius/scale}));
   for(const target of targets)if(e.contactFraction(x0,y0,x1,y1,target,radius,scale)!==null)assert.ok(candidates.has(target));
  }
  const width=20;
  const candidates=new Set(grid.query({minX:Math.min(x0,x1)-width,maxX:Math.max(x0,x1)+width,
   minY:Math.min(y0,y1)-width/2,maxY:Math.max(y0,y1)+width/2}));
  for(const target of targets)if(e.rectangleContactFraction(x0,y0,x1,y1,target,width,0)!==null)assert.ok(candidates.has(target));
 }
});
test('collision grid preserves damage recipients and source order; moving targets are reindexed next tick',()=>{
 const s=scene(),e=s.CombatEngine,targets=Array.from({length:1500},(_,i)=>({x:(i%50)*80,y:Math.floor(i/50)*80,hp:100,r:12}));
 targets.push({x:0,y:0,hp:100,r:12});let calls=0;const hits=[];
 const provider=()=>{calls++;return targets;};
 const skill={parts:{phys:10},geo:{k:'spot',r:70,pierce:true},rad:70,targets:2000};
 const cast=e.queueSkillContact(s.v,targets[0],skill,target=>hits.push(target),{targets:provider,visual(){},windup:0});
 const expected=targets.filter(t=>e.contactFraction(0,-14,0,-14,t,70*s.QA,2)!==null);
 e.advanceSkillContacts(.01);
 assert.deepEqual(hits,expected);assert.equal(calls,1);assert.equal(cast.hits.size,expected.length);
 hits.length=0;targets[900].x=0;targets[900].y=0;
 e.queueSkillContact(s.v,targets[0],skill,t=>hits.push(t),{targets:provider,visual(){},windup:0});
 e.advanceSkillContacts(.01);assert.ok(hits.includes(targets[900]));assert.ok(calls<=2);
 assert.ok(cast.hits.has(targets[900]),'a still-active field must also see a body that moves into range');
});
test('grid deduplicates bodies spanning cells and retains order for tied overlapping targets',()=>{
 const s=scene(),a={x:0,y:0,r:200},b={x:0,y:0,r:200};
 const grid=new s.Grid.TargetGrid([a,b]);assert.deepEqual(Array.from(grid.query({minX:-200,maxX:200,minY:-200,maxY:200})),[a,b]);
});

test('separate player casts share one target snapshot per tick, without sharing their hit quotas',()=>{
 const s=scene(),e=s.CombatEngine,targets=Array.from({length:300},(_,i)=>({x:i*100,y:0,hp:100,r:12}));
 let calls=0,hits=0;s._1=()=>{calls++;return targets;};
 for(let i=0;i<5;i++)e.queueSkillContact(s.v,targets[0],{parts:{phys:1},geo:{k:'spot',r:20,pierce:true}},()=>hits++,{visual(){},windup:0});
 e.advanceSkillContacts(.01);assert.equal(calls,1);assert.equal(hits,5);
});
test('ambient labels cannot evict a queue filled by higher-priority recipients',()=>{
 const s=scene(),e=s.CombatEngine;
 for(let i=0;i<96;i++)e.enqueueDamageLabel(s.l.txt,{x:i,y:0},10,'phys',{priority:3});
 const before=s.l.txt.slice();
 assert.equal(e.enqueueDamageLabel(s.l.txt,{x:0,y:0},99,'phys',{priority:0}),undefined);
 assert.deepEqual(s.l.txt,before);
});
