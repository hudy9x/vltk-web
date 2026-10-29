const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const esbuild=require('esbuild');
const bundle=esbuild.build({entryPoints:['src/client/multiplayer/webtransport/index.ts'],bundle:true,format:'cjs',platform:'node',write:false,
 plugins:[{name:'test-transport',setup(build){build.onLoad({filter:/multiplayer\/webtransport\/transport\.ts$/},()=>({contents:'export const connect=(...args)=>globalThis.testConnect(...args);',loader:'ts'}));}}]});
async function fixture(restoredMap=140){
 let time=0,receive,closeCount=0;const statuses=[],sent=[],worlds=[];
 const scope={module:{exports:{}},exports:{},URLSearchParams,location:{search:''},TextEncoder,TextDecoder,AbortSignal,atob,
  performance:{now:()=>time},fetch:async()=>({ok:true,json:async()=>({enabled:true,ticket:Buffer.alloc(69).toString('base64')})}),
  testConnect:async(_config,_hello,callback)=>{receive=callback;return{send(){},reliable:async b=>{sent.push(b);},close(){closeCount++;}}}};
 vm.runInNewContext((await bundle).outputFiles[0].text,scope);
 const client=scope.module.exports.createClient({status:(text,online)=>statuses.push({text,online}),world:w=>worlds.push(w)});
 const update=map=>client.update({map,x:100,y:100,timestamp:time,effectTime:0,dir:0,moving:false},{name:'Fixture',faction:0,sex:0,bodySex:0,ride:0,helm:-1,armor:-1,weapon:0,horse:-1});
 const snapshot=(map,tick)=>receive({type:'snapshot',map,tick,self:1,players:[]});
 update(140);await new Promise(setImmediate);receive({type:'world',map:restoredMap,tick:1,self:1,actors:[]});snapshot(restoredMap,1);
 return{client,update,snapshot,statuses,sent,worlds,receive:packet=>receive(packet),time:t=>{time=t;},closed:()=>closeCount};
}
test('travel resets old room state, accepts the destination and resumes commands',async()=>{
 const f=await fixture();assert.equal(f.client.online,true);f.time(100);f.update(340);
 assert.equal(f.client.online,false);assert.match(f.statuses.at(-1).text,/chuyển bản đồ/);
 assert.equal(new DataView(f.sent.at(-1).buffer).getUint32(7,true),340);
 f.snapshot(140,2);assert.equal(f.client.online,false);
 f.snapshot(340,3);assert.equal(f.client.online,true);
 assert.ok(f.client.command({kind:2,map:340,x:200,y:100})>0);f.client.close();
});
test('reconnect accepts the server saved map without sending an entry teleport',async()=>{
 const f=await fixture(340);assert.equal(f.client.online,true);assert.equal(f.worlds[0].map,340);
 assert.equal(f.sent.filter(b=>b[1]===16&&b[6]===1).length,0);
 f.time(100);f.update(340);assert.equal(f.client.online,true);assert.equal(f.sent.filter(b=>b[1]===16&&b[6]===1).length,0);f.client.close();
});
test('town recovery accepts the server map and ignores snapshots from the previous room',async()=>{
 const f=await fixture();f.client.command({kind:17,map:140});
 f.receive({type:'world',map:37,tick:2,self:1,actors:[]});f.snapshot(37,2);
 assert.equal(f.client.online,true);assert.equal(f.worlds.at(-1).map,37);
 f.time(100);f.update(37);assert.equal(f.sent.filter(b=>b[1]===16&&b[6]===1).length,0);
 f.snapshot(140,3);assert.equal(f.client.online,true);f.client.close();
});
test('missing destination snapshots have a bounded wait even after online was cleared',async()=>{
 const f=await fixture();f.time(100);f.update(340);f.snapshot(140,2);
 f.time(5101);f.update(340);
 assert.equal(f.closed(),1);assert.match(f.statuses.at(-1).text,/chưa chấp nhận bản đồ/);assert.equal(f.client.online,false);
 f.client.close();
});
test('the first room also times out if QUIC connects but the server never sends its snapshots',async()=>{
 const f=await fixture();f.client.retry();f.time(100);f.update(340);await new Promise(setImmediate);
 f.time(5200);f.update(340);assert.match(f.statuses.at(-1).text,/chưa chấp nhận bản đồ/);f.client.close();
});
