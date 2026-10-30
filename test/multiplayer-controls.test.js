const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),acorn=require('acorn');
function fixture(){
 const commands=[],messages=[];let seq=0,redraws=0,picker=-1;
 const s={GameWebTransport:{newer:(a,b)=>(a-b|0)>0,LocalMotion:class{clear(){}cancel(){}begin(){}sent(){}receive(){}}},OnlineSkillVisuals:()=>({reset(){},sync(){},cancelPose(){}}),
  window:{},Z0:{key:140},E0:{town:{id:37}},l:{P:{main:{id:1}},enemies:[],fx:[],combatProjectiles:[]},o:{ctrl:'manual',main:1,mainLock:true,slots:[1,2,-1,3],sk:{1:1,2:1,3:1}},
  T:{1:{id:1,n:'One'},2:{id:2,n:'Two'},3:{id:3,n:'Buff',support:true}},Y:{target:null},clearTimeout,setTimeout,performance:{now:()=>100},Math,
  v:{x:100,y:100},r0:{},qA(){redraws++;},k:t=>messages.push(t),D0(){s.l.P.main={id:s.o.mainLock?s.o.main:1};},$(){},tn(){},Z8:i=>{picker=i;},wn:skill=>skill.support?'buff':'atk',UA:skill=>!skill.support};
 vm.createContext(s);vm.runInContext(fs.readFileSync('src/client/multiplayer/state/legacy-pve.js','utf8'),s);
 const source=fs.readFileSync('src/client/ui/legacy-panels-and-audio-03.js','utf8');
 const ast=acorn.parse(source,{ecmaVersion:'latest'});
 for(const name of ['Ac','Wa']){const n=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));vm.runInContext(source.slice(n.start,n.end),s);}
 s.gameMultiplayer={pve:true};const client={authoritative:true,online:true,command:c=>{commands.push(c);return ++seq;},players:()=>[]};s.onlineWorld.bind(client);
 const snapshot=(farming,ack=seq)=>s.onlineWorld.snapshot({map:140,self:7,tick:ack+1,ack,actors:[{id:7,farming}],monsters:[],events:[]});
 return{s,commands,messages,snapshot,client,picker:()=>picker,redraws:()=>redraws};
}
test('online hotbar locks the selected skill, refreshes stats and keeps empty-slot picker usable',()=>{
 const f=fixture();f.s.o.mainLock=false;f.s.Ac(1);assert.equal(f.s.o.main,2);assert.equal(f.s.o.mainLock,true);assert.equal(f.s.l.P.main.id,2);assert.ok(f.redraws()>0);
 f.s.onlineWorld.attack({id:55});assert.equal(f.commands.at(-1).skill,2);
 f.s.Ac(2);assert.equal(f.picker(),2);
 f.s.Ac(3);assert.equal(f.s.o.main,2);assert.equal(f.commands.at(-1).kind,8);assert.equal(f.commands.at(-1).skill,3);
});
test('Auto and Manual use Rust farming commands with the selected skill and ignore stale mode snapshots',()=>{
 const f=fixture();f.s.Ac(1);f.s.Wa('auto');assert.equal(f.s.o.ctrl,'auto');assert.equal(f.commands.at(-1).kind,5);assert.equal(f.commands.at(-1).target,1);assert.equal(f.commands.at(-1).skill,2);
 f.snapshot(false,0);assert.equal(f.s.o.ctrl,'auto','older snapshot cannot turn Auto off');
 f.snapshot(true);assert.equal(f.s.o.ctrl,'auto');
 f.s.Wa('manual');assert.equal(f.s.o.ctrl,'manual');assert.equal(f.commands.at(-1).target,0);
 f.snapshot(true,1);assert.equal(f.s.o.ctrl,'manual');f.snapshot(false);assert.equal(f.s.o.ctrl,'manual');
});
test('skill changes in the skill panel propagate while Auto is running, without spamming every frame',()=>{
 const f=fixture();f.s.Wa('auto');f.snapshot(true);f.s.o.main=2;f.s.D0();f.s.onlineWorld.syncControls();
 assert.equal(f.commands.at(-1).skill,2);assert.equal(f.commands.at(-1).kind,4);assert.equal(f.commands.at(-1).target,undefined);const n=f.commands.length;
 for(let i=0;i<50;i++)f.s.onlineWorld.syncControls();assert.equal(f.commands.length,n);
});
test('a ground click preserves Auto and only explicit toggles turn it off',()=>{
 const f=fixture();f.s.Wa('auto');f.snapshot(true);f.s.onlineWorld.move(200,100);assert.equal(f.s.o.ctrl,'auto');assert.equal(f.commands.at(-1).kind,2);
 f.snapshot(true,1);assert.equal(f.s.o.ctrl,'auto');f.snapshot(true);assert.equal(f.s.o.ctrl,'auto');f.s.Wa('manual');f.snapshot(false);assert.equal(f.s.o.ctrl,'manual');
 f.snapshot(true);assert.equal(f.s.o.ctrl,'auto');
});
test('offline mode retains the existing local Auto control',()=>{
 const f=fixture();f.s.gameMultiplayer.pve=false;f.s.Wa('auto');assert.equal(f.s.o.ctrl,'auto');assert.equal(f.commands.length,0);
});

test('Manual selection reaches Rust without requiring an existing target',()=>{
 const f=fixture();f.s.l.town=true;f.s.Ac(1);
 assert.equal(f.commands.at(-1).kind,4);assert.equal(f.commands.at(-1).skill,2);
 assert.equal(f.commands.at(-1).target,undefined);
});
test('pressing a skill in Manual acquires the nearest live monster and casts the selected skill',()=>{
 const f=fixture();const far={id:60,x:300,y:100,hp:100},near={id:50,x:120,y:100,hp:100};
 f.s.l.enemies=[far,near,{id:40,x:105,y:100,hp:0,dead:true}];f.s.Ac(1);
 assert.equal(f.commands.at(-1).kind,3);assert.equal(f.commands.at(-1).target,50);assert.equal(f.commands.at(-1).skill,2);
 assert.equal(f.s.l.manTgt,near);
});
test('an unavailable weapon skill remains the explicit choice and reports why it cannot cast',()=>{
 const f=fixture();f.s.D0=()=>{f.s.l.P.main={id:1};};f.s.Ac(1);
 assert.equal(f.s.o.main,2);assert.equal(f.s.o.mainLock,true);assert.match(f.messages.at(-1),/trang bị/);
 f.s.Wa('auto');assert.equal(f.s.o.ctrl,'manual');assert.ok(!f.commands.some(c=>c.kind===3));
});
