const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn');
const {compileTypeScriptEntry}=require('../tools/build-app');
function declaration(scope,file,name){
 const source=fs.readFileSync(file,'utf8');
 const node=acorn.parse(source,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));
 vm.runInContext(source.slice(node.start,node.end),scope);
}
function world(){
 const displayed=[];
 const scope={Math,l:{clock:0},showDamageNumber:(_a,value)=>displayed.push(value),actorActionLocked:()=>true};
 vm.createContext(scope);declaration(scope,'src/client/core/state-and-save-01.js','$d');
 return {scope,displayed};
}

test('poison keeps draining HP and elapsed duration while the training monster is stunned',()=>{
 const {scope,displayed}=world(),target={hp:1000,max:1000,poison:2,poisonDmg:100,stun:3};
 scope.$d(target,.5);
 assert.equal(target.hp,950);assert.equal(target.poison,1.5);assert.equal(target.stun,2.5);
 assert.deepEqual(displayed,[50]);
});

test('one poison hit consumes exactly its total budget at high and low frame rates',()=>{
 for(const dt of [1/60,.05,.1,1,4]){
  const {scope,displayed}=world(),total=69655.38461538461,duration=60/18;
  const target={hp:100000,max:100000,poison:duration,poisonDmg:total/duration,stun:0};
  for(let t=0;t<5;t+=dt)scope.$d(target,dt);
  assert.ok(Math.abs(100000-target.hp-total)<1e-6,String(dt));
  assert.ok(Math.abs(displayed.reduce((a,b)=>a+b,0)-total)<1e-6);
  assert.equal(target.poison,0);
 }
});

test('poison killing a monster clamps HP and stops that monster from acting again',()=>{
 const {scope}=world(),target={hp:5,max:100,poison:1,poisonDmg:100,stun:0};
 scope.actorActionLocked=()=>{throw new Error('dead monster must not reach its action loop');};
 scope.$d(target,.1);assert.equal(target.hp,0);
});

test('poison summary separates direct damage, total poison, duration and DPS',()=>{
 const scope={};vm.runInNewContext(compileTypeScriptEntry('combat/poison-summary.ts','Summary').code,scope);
 const describe=scope.Summary.describePoisonDamage;
 assert.match(describe({parts:{phys:120,poison:1000},poisonT:4},String),/Trực tiếp: 120.*Tổng độc: 1000.*4 giây.*250 điểm\/giây/);
 assert.equal(describe({parts:{phys:500}}),'');
 assert.match(describe({parts:{poison:900}},String),/3 giây.*300 điểm\/giây/);
});

test('character hand range warns that the poison component is a total over time',()=>{
 const scope={F:String};vm.createContext(scope);declaration(scope,'src/client/combat/skills-01.js','Ki');
 assert.match(scope.Ki({tot:1000,parts:{poison:1000},poisonT:4}),/850 – 1150.*tổng độc trong 4 giây/);
 assert.equal(scope.Ki({tot:1000,parts:{phys:1000}}),'850 – 1150');
});

test('real Wudu hit to training ticks preserves the budget after resistance and accumulates repeated hits',()=>{
 for(const resistance of [0,75]){
  const {scope}=world();
  Object.assign(scope,{T:{1066:{tier:150}},l:{clock:0,P:{anti:{},me2:{}}},v:{x:0,y:0},
   Math:Object.assign(Object.create(Math),{random:()=>.5}),Z:(low,high)=>(low+high)/2,
   Q0:['phys','poison','cold','fire','light'],Rn:()=>null,y1:()=>false,E:(n,low,high)=>Math.max(low,Math.min(high,n)),cw:95,
   ea:()=>1,ve:3,Tt(){},applyActorHurt:()=>false,Od:0,Ct:.2,y5:2});
  declaration(scope,'src/client/core/state-and-save-01.js','ja');
  declaration(scope,'src/client/core/state-and-save-01.js','hs');
  const total=69655.38461538461,duration=60/18,skill={id:1066,parts:{poison:total},poisonT:duration,ev2:true,series:1,series5:0};
  const target={hp:200000,max:200000,poison:0,poisonDmg:0,stun:0,res:{poison:resistance},series:-1};
  scope.hs(skill,target);assert.equal(target.hp,200000,'poison is deferred');
  for(let i=0;i<10;i++)scope.$d(target,.05);
  scope.hs(skill,target);
  for(let i=0;i<100;i++)scope.$d(target,.05);
  const expected=2*total*(1-resistance/100);
  assert.ok(Math.abs(200000-target.hp-expected)<1e-6,`resistance ${resistance}: both hits must drain fully`);
 }
});

test('SIM also drains poison while stunned using the same elapsed-time budget',()=>{
 const {createHeadlessGame}=require('../tools/sim-balance/legacy-runtime.ts');
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;
 sim.battlefield.start('song');
 const [target]=sim.battlefield.add({team:'jin',faction:'wudu',level:150,strength:'normal',count:1});
 Object.assign(target,{hp:1000,max:1000,poison:2,poisonDmg:100,stun:3});
 target.stats.regen=0;
 sim.tick(.05);
 assert.ok(Math.abs(target.hp-995)<1e-6);
 assert.ok(Math.abs(target.poison-1.95)<1e-6);
 assert.ok(target.stun>0);
});
