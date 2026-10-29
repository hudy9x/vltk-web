const {test}=require('node:test');const assert=require('node:assert/strict');
const esbuild=require('esbuild'),vm=require('node:vm');
const scope={module:{exports:{}},exports:{},TextEncoder,TextDecoder};vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/state/local-motion.ts'],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text,scope);
const {LocalMotion}=scope.module.exports;
const move=(p,x,y,d)=>{const distance=Math.hypot(x-p.x,y-p.y);if(distance>0){const f=Math.min(1,d/distance);p.x+=(x-p.x)*f;p.y+=(y-p.y)*f;}};
const packet=(tick,ack,commandTick,x,goal,motion=1,speed=150)=>({type:'world',map:1,tick,self:1,ack,movement:{commandTick,speed,x:goal,y:100,motion},actors:[{id:1,x,y:100,hp:100,stun:0}],monsters:[],loot:[],events:[]});
for(const [up,down]of [[0,0],[50,100],[150,200],[300,350]])test(`a short mouse move never pulls back on arrival (${up+down}ms RTT)`,()=>{
  const m=new LocalMotion(),p={x:100,y:100};m.receive(packet(0,0,0,100,100,0));m.begin(190,100,0);m.sent(1);
  const queue=[];let server=100,commandTick=0,accepted=false,previous=100,largestBackward=0;
  for(let time=10;time<=2500;time+=10){
    if(time%50===0){if(!accepted&&time>=up){accepted=true;commandTick=time/50;}
      else if(accepted)server=Math.min(190,server+7.5);
      if(time%100===0)queue.push({at:time+down+[0,10,40,20][time/100%4],p:packet(time/50,accepted?1:0,commandTick,server,190,accepted?(server===190?2:1):0)});
    }
    while(queue.length&&queue[0].at<=time)m.receive(queue.shift().p);
    m.step(p,.01,time,move,150);largestBackward=Math.max(largestBackward,previous-p.x);previous=p.x;
  }
  assert.ok(largestBackward<.1,`backward correction ${largestBackward}`);assert.ok(Math.abs(p.x-190)<.1);
});
test('switching a destination ignores a stale acknowledgement and uses authoritative speed',()=>{
 const m=new LocalMotion(),p={x:100,y:100};m.receive(packet(0,0,0,100,100,0,240));m.begin(300,100,0);m.sent(1);m.step(p,.1,100,move,999);assert.equal(p.x,124);
 m.begin(100,300,100);m.sent(2);m.receive(packet(2,1,1,112,300,1,240));m.step(p,.1,200,move,999);assert.ok(p.y>120);assert.ok(p.x<124);
});
test('a rejected destination, stun, death and a map reset do not leave prediction running',()=>{
 const m=new LocalMotion(),p={x:100,y:100};m.receive(packet(1,0,0,100,100,0));m.begin(190,100,50);m.sent(1);m.step(p,.1,150,move,150);
 m.receive(packet(3,1,2,100,100,0));for(let i=0;i<30;i++)m.step(p,.03,180+i*30,move,150);assert.ok(Math.abs(p.x-100)<.1);assert.equal(m.goal,undefined);
 m.clear();m.step(p,1,2000,move,150);assert.ok(Math.abs(p.x-100)<.1);
});

test('stun freezes a pending click and death cancels its prediction',()=>{
 const m=new LocalMotion(),p={x:100,y:100},stunned=packet(1,0,0,100,100,0,0);
 stunned.actors[0].stun=1;m.receive(stunned);m.begin(190,100,50);m.sent(1);m.step(p,.1,150,move,999);
 assert.equal(p.x,100);
 const dead=packet(2,1,1,100,190,0,0);dead.actors[0].hp=0;m.receive(dead);m.step(p,.1,250,move,999);
 assert.equal(p.x,100);assert.equal(m.goal,undefined);
});

test('a later skill-selection ACK preserves the acknowledged mouse destination and replay clock',()=>{
 const m=new LocalMotion(),p={x:100,y:100};m.receive(packet(0,0,0,100,100,0));m.begin(190,100,0);m.sent(1);
 for(let i=1;i<=60;i++){
  if(i===20)m.receive(packet(2,2,0,115,190,1));
  const before=p.x;m.step(p,.01,i*10,move,150);assert.ok(p.x>=before-.01);
 }
 assert.ok(m.goal);assert.ok(p.x>180);
});
