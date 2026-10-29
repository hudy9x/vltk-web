const {test}=require('node:test');
const assert=require('node:assert/strict');
const esbuild=require('esbuild'),vm=require('node:vm');
const code=esbuild.buildSync({entryPoints:['src/client/multiplayer/webtransport/interpolation.ts'],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text;
const scope={module:{exports:{}},exports:{},TextEncoder,TextDecoder};vm.runInNewContext(code,scope);
const {RemoteTimeline}=scope.module.exports;
const point=(seq,timestamp,x)=>({id:1,seq,timestamp,effectTime:timestamp/1000,x,y:0,dir:2,moving:true});

test('repeated snapshots do not create stop-go motion, including delayed packet arrivals',()=>{
  const timeline=new RemoteTimeline();
  const events=[];
  for(let seq=1;seq<=20;seq++) {
    const time=(seq-1)*100,delay=[0,35,5,60,15][seq%5];
    events.push({arrival:time+delay,value:point(seq,time,time/10)});
    events.push({arrival:time+delay+40,value:point(seq,time,time/10)});
  }
  events.sort((a,b)=>a.arrival-b.arrival);
  let index=0,previous;
  for(let now=0;now<=1700;now+=10) {
    while(index<events.length&&events[index].arrival<=now) {timeline.push(events[index].value,events[index].arrival);index++;}
    const p=timeline.sample(now);
    if(now>=250&&previous) assert.ok(Math.abs(p.x-previous.x-1)<0.0001,`constant speed at ${now}: ${p.x-previous.x}`);
    if(p)previous=p;
  }
});
test('out-of-order inputs, wraparound, stopping and teleports stay bounded',()=>{
  const timeline=new RemoteTimeline(100);
  timeline.push(point(0xfffffffe,0xfffffff0,0),0);
  timeline.push(point(0xffffffff,34,5),50);
  timeline.push(point(0,84,10),100);
  timeline.push(point(0xffffffff,34,-99),110);
  assert.equal(timeline.sample(175).x,7.5);
  timeline.push({...point(1,134,10),moving:false},150);
  assert.equal(timeline.sample(1000).x,10);assert.equal(timeline.sample(1000).moving,false);
  timeline.push(point(2,184,900),200);
  assert.equal(timeline.sample(200).x,900);
});

test('sender samples the same interpolated position as local rendering without moving simulation state',()=>{
  let sent;
  const game={OnlineParty:{update(){}},onlineWorld:{bind(){},entities:()=>[],state:null},I:{shaolin:{}},GameWebTransport:{createClient:()=>({active:false,players:()=>[],update:p=>{sent=p;}})},
    window:{addEventListener(){}},o:{fac:'shaolin',name:'Test',eq:{}},l:{clock:1},Z0:{key:1},
    v:{x:10,y:20,_px:0,_py:10},N2:0.025,Lr:0.05,__:250,
    document:{getElementById:()=>null},performance:{now:()=>100},v0:()=>0,JP:()=>[],U1:{},Math};
  vm.createContext(game);
  vm.runInContext(require('node:fs').readFileSync('src/client/multiplayer/webtransport/legacy-bridge.js','utf8'),game);
  game.gameMultiplayer.tick();
  assert.equal(sent.x,5);assert.equal(sent.y,15);
  assert.equal(game.v.x,10);assert.equal(game.v.y,20);
});
