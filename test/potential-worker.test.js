const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {Worker}=require('node:worker_threads');
const {once}=require('node:events');
const {createHash,webcrypto}=require('node:crypto');
const {compileTypeScriptEntry}=require('../tools/build-app');
const {potentialFixture}=require('./helpers/potential-fixture');
const scope={setTimeout,clearTimeout,crypto:webcrypto,TextEncoder,structuredClone};
vm.runInNewContext(compileTypeScriptEntry('simulator/potential-worker-client.ts','Potential').code,scope);
const {createPotentialClient,canonical}=scope.Potential;
const hash=async text=>createHash('sha256').update(text).digest('hex');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function input(name='SIM') {return {profile:{name,fac:'wudang',lvl:150,main:1,sk:{1:1},attr:{str:0,dex:0,vit:0,eng:0},attrPts:20,eq:{}},world:{},external:{},window:{},globals:{rule:1}};}
function allocation(profile){return {attr:{...profile.attr,str:profile.attr.str+profile.attrPts},attrPts:0};}
function fakeWorker(auto=false) {
  return {sent:[],onmessage:null,onerror:null,onmessageerror:null,terminated:false,
    postMessage(message){this.sent.push(message);if(auto&&message.kind==='optimize')queueMicrotask(()=>this.reply(message));},
    reply(message=this.sent.findLast(m=>m.kind==='optimize')){this.onmessage({data:{id:message.id,result:allocation(message.input.profile)}});},
    terminate(){this.terminated=true;}};
}
function memoryStore(){const rows=new Map();return {rows,reads:0,async get(key){this.reads++;return rows.get(key);},async put(key,result){rows.set(key,structuredClone(result));}};}

test('potential cache coalesces identical jobs, clones results, persists and reloads without a worker',async()=>{
  const worker=fakeWorker(),store=memoryStore(),client=createPotentialClient({factory:()=>worker,store,hash,version:'v1'});
  const first=client.optimize(input('A')),second=client.optimize(input('B'));
  await flush();assert.equal(worker.sent.filter(m=>m.kind==='optimize').length,1);assert.equal(store.reads,1);
  worker.reply();const [a,b]=await Promise.all([first,second]);a.attr.str=999;assert.equal(b.attr.str,20);
  assert.equal((await client.optimize(input())).attr.str,20);assert.equal(store.reads,1);
  const restored=createPotentialClient({factory:()=>assert.fail('cache hit must not create a worker'),store,hash,version:'v1'});
  assert.equal((await restored.optimize(input())).attr.str,20);client.dispose();restored.dispose();
});

test('cache identity includes equipment, skills, tuning, and algorithm version',async()=>{
  const worker=fakeWorker(true),store=memoryStore(),client=createPotentialClient({factory:()=>worker,store,hash,version:'v1'});
  await client.optimize(input());
  const equipment=input();equipment.profile.eq={weapon:{mag:[{a:1,p:[30,0,0]}]}};await client.optimize(equipment);
  const skill=input();skill.profile.main=2;await client.optimize(skill);
  const tuning=input();tuning.globals.rule=2;await client.optimize(tuning);
  assert.equal(worker.sent.filter(m=>m.kind==='optimize').length,4);
  const changed=createPotentialClient({factory:()=>worker,store,hash,version:'v2'});await changed.optimize(input());
  assert.equal(worker.sent.filter(m=>m.kind==='optimize').length,5);client.dispose();changed.dispose();
  assert.notEqual(canonical(new Set([1])),canonical(new Set([2])));
  assert.notEqual(canonical(/a/i),canonical(/a/g));
});

test('corrupt cache and denied storage cannot suppress optimization; worker failure never calculates on main thread',async()=>{
  const worker=fakeWorker(true),store={async get(){return {attr:{str:999},attrPts:0};},async put(){throw Error('quota');}};
  const client=createPotentialClient({factory:()=>worker,store,hash,version:'v1'});
  assert.equal((await client.optimize(input())).attr.str,20);client.dispose();
  const denied={async get(){throw Error('denied');},async put(){throw Error('denied');}};
  const failed=createPotentialClient({factory:()=>{throw Error('CSP');},store:denied,hash,version:'v1'});
  await assert.rejects(failed.optimize(input()),/Worker/);failed.dispose();
});

test('one worker serializes distinct jobs and rejects all pending work on crash',async()=>{
  const worker=fakeWorker(),client=createPotentialClient({factory:()=>worker,store:memoryStore(),hash,version:'v1'});
  const secondInput=input();secondInput.profile.lvl=149;
  const a=client.optimize(input()),b=client.optimize(secondInput),rejected=Promise.allSettled([a,b]);
  await flush();assert.equal(worker.sent.filter(m=>m.kind==='optimize').length,1);
  worker.onerror({});const results=await rejected;assert.ok(results.every(result=>result.status==='rejected'));client.dispose();
});

function nativeWorker(source){return new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;self.postMessage=m=>parentPort.postMessage(m);parentPort.on('message',data=>self.onmessage({data}));\n`+source,{eval:true});}

test('real worker matches native allocation across ten factions and leaves the event loop responsive',async()=>{
  const factions=['shaolin','tianwang','tangmen','wudu','emei','cuiyan','gaibang','tianren','wudang','kunlun'];
  const first=potentialFixture(factions[0]),worker=nativeWorker(first.bundle.worker);
  try {
    for(let index=0;index<factions.length;index++){
      const fixture=potentialFixture(factions[index],12),expected=fixture.native();
      const {globals,...job}=fixture.input;
      worker.postMessage({kind:'init',catalog:globals});
      const response=once(worker,'message');worker.postMessage({id:index,input:job});
      const [message]=await response;assert.equal(message.error,undefined,JSON.stringify(message));assert.deepEqual(message.result,expected,factions[index]);
    }
    const heavy=potentialFixture('wudang',745),{globals,...job}=heavy.input;
    let ticks=0;const heartbeat=setInterval(()=>ticks++,5);
    worker.postMessage({kind:'init',catalog:globals});const response=once(worker,'message');worker.postMessage({id:99,input:job});
    const [message]=await response;clearInterval(heartbeat);
    assert.equal(message.error,undefined,JSON.stringify(message));assert.equal(message.result.attrPts,0);
    assert.ok(ticks>=2,`main event loop continued during optimization (${ticks} ticks)`);
  } finally {await worker.terminate();}
});

test('worker preserves skill optimization, training state and potential-only/skills-only modes',async()=>{
  const worker=nativeWorker(potentialFixture().bundle.worker);
  try {
    for(const [faction,tier,autoPotential] of [['wudang',90,true],['emei',150,false]]) {
      const fixture=potentialFixture(faction,8,tier),job=fixture.input;
      job.autoSkills=true;job.autoPotential=autoPotential;job.profile.skPts=10;
      job.profile.sk={[job.profile.main]:1};job.profile.bkOk=Object.fromEntries(job.globals.I[faction].skills.map(id=>[id,1]));
      job.profile.skL={[job.profile.main]:{lv:1,xp:0}};
      const expected=fixture.native(),{globals,...input}=job;
      worker.postMessage({kind:'init',catalog:globals});const response=once(worker,'message');worker.postMessage({id:tier,input});
      const [message]=await response;assert.equal(message.error,undefined,JSON.stringify(message));assert.deepEqual(message.result,expected);
      if(!autoPotential)assert.equal(message.result.attrPts,8);
    }
  }finally{await worker.terminate();}
});
