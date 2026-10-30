const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),esbuild=require('esbuild');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const fixtures=require('./fixtures/multiplayer-support.json');
test('all native buff/aura combinations match golden catalogs and preserve damage formulas',()=>{
  for(const row of fixtures){
    const actual=catalog.character(row.profile);assert.deepEqual(actual,row.resolved,row.name);
    for(const variant of actual.support.variants){
      const auras=actual.support.skills.filter(s=>s.aura).map(s=>s.id);
      const n=native.buildCharacter(row.profile,variant.active.filter(id=>!auras.includes(id)),variant.active.filter(id=>auras.includes(id)));
      assert.equal(variant.profile.hp,n.stats.life,row.name+' HP');
      assert.equal(variant.profile.protection.manaShield,n.stats.manaShield||0);
      for(const s of n.skills)assert.deepEqual(variant.profile.skills.find(x=>x.id===s.id).parts,Object.values({phys:s.parts.phys||0,poison:s.parts.poison||0,cold:s.parts.cold||0,fire:s.parts.fire||0,light:s.parts.light||0}));
    }
  }
});
test('combat catalog cache refreshes potion stock without leaking buffs between sessions',()=>{
  const row=fixtures.find(r=>r.name==='cuiyan-blade');
  const a=catalog.character({...row.profile,potStock:{life:{1:3}}});
  const b=catalog.character({...row.profile,potStock:{life:{1:1}}});
  assert.equal(a.potions.find(p=>p.id===1).count,3);assert.equal(b.potions.find(p=>p.id===1).count,1);
  assert.ok(b.support.variants.every(v=>v.profile.potions.find(p=>p.id===1).count===1));
});
test('client presents server buff durations, aura switches and sends settings once',()=>{
  const scope={o:{sk:{100:20,159:20},auraOff:{}},T:{100:{},159:{}},wn:t=>t===scope.T[100]?'buff':'aura',l:{clock:10,sks:{buff:{999:100},cd:{}}}};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/support.js','utf8'),scope);
  const sync=records=>scope.OnlineSupport.sync({self:1,actors:[{id:1,supports:records}]});
  sync([{skill:100,remaining:120,cooldown:2,active:true,aura:false},{skill:159,remaining:0,cooldown:0,active:false,aura:true}]);
  assert.equal(scope.l.sks.buff[100],130);assert.equal(scope.l.sks.buff[999],undefined);assert.equal(scope.o.auraOff[159],1);
  const commands=[];const send=(kind,payload)=>(commands.push({kind,...payload}),1);
  scope.OnlineSupport.settings(send);scope.OnlineSupport.settings(send);
  assert.deepEqual(commands,[{kind:9,skill:100,target:1}]);scope.o.autoBuff=false;scope.OnlineSupport.settings(send);
  assert.equal(commands.at(-1).target,0);
  sync([]);assert.deepEqual(Object.keys(scope.l.sks.buff),[]);
  scope.OnlineSupport.reset();assert.equal(scope.l.stKey,null);
});
test('v8 binary support state validates ownership, lengths and finite durations',()=>{
  const scope={module:{exports:{}},exports:{},TextEncoder,TextDecoder,Uint8Array,DataView,Map,Set};
  vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/webtransport/protocol.ts'],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text,scope);
  const p=scope.module.exports,b=Buffer.alloc(56+55+15);b.set([8,17]);b.writeUInt32LE(1,10);b.writeUInt16LE(1,18);
  b.writeUInt32LE(1,43);b.writeFloatLE(100,43+12);b.writeFloatLE(100,43+20);
  b.writeUInt32LE(1,82);b.writeUInt16LE(1,98);b.writeUInt32LE(1,100);b.writeUInt16LE(100,104);b.writeFloatLE(12.5,106);b.writeFloatLE(2,110);b[114]=1;
  const s=p.decodePacket(b).actors[0].supports[0];assert.equal(s.skill,100);assert.equal(s.remaining,12.5);assert.equal(s.active,true);
  const invalid=Buffer.from(b);invalid.writeUInt32LE(999,100);assert.throws(()=>p.decodePacket(invalid),/support/);
  invalid.writeUInt32LE(1,100);invalid.writeFloatLE(NaN,106);assert.throws(()=>p.decodePacket(invalid),/float/);
  assert.throws(()=>p.decodePacket(b.subarray(0,-1)),/support/);
  b[0]=5;assert.throws(()=>p.decodePacket(b),/Unsupported/);
});

test('shared support updates native stats and FX without learning skills or sending settings',()=>{
  const scope={o:{sk:{},auraOff:{}},T:{16:{},92:{}},l:{clock:0,sks:{buff:{},cd:{}}},wn:()=>"aura"};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/support.js','utf8'),scope);
  scope.OnlineSupport.sync({self:1,actors:[{id:1,supports:[{skill:92,level:20,shared:true,active:true,aura:true}]}]});
  assert.equal(JSON.stringify(scope.OnlineSupport.shared()),'[[92,20]]');
  assert.equal(JSON.stringify(scope.o.sk),'{}');assert.equal(JSON.stringify(scope.o.auraOff),'{}');
  let sent=0;scope.OnlineSupport.settings(()=>{sent++;});assert.equal(sent,0);
  scope.OnlineSupport.sync({self:1,actors:[{id:1,supports:[]}]});assert.equal(scope.OnlineSupport.shared().length,0);
});
test('only five Emei auras and La Han Tran are shared; self-only Shaolin buffs are excluded',()=>{
  const ids=name=>catalog.character(fixtures.find(r=>r.name===name).profile).support.skills.filter(s=>s.shared).map(s=>s.id);
  assert.deepEqual(ids('emei'),[86,89,92,282,332]);assert.deepEqual(ids('shaolin'),[16]);
});
test('shared aura wire extension preserves source level and rejects malformed/duplicate records',()=>{
  const scope={module:{exports:{}},exports:{},TextEncoder,TextDecoder,Uint8Array,DataView,Map,Set};
  vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/webtransport/protocol.ts'],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text,scope);
  const p=scope.module.exports,b=Buffer.alloc(111);b.set([8,17]);b.writeUInt32LE(1,10);b.writeUInt16LE(1,18);
  b.writeUInt32LE(1,43);b.writeFloatLE(100,55);b.writeFloatLE(100,63);b.writeUInt32LE(1,82);
  const extension=Buffer.alloc(11);extension[0]=0xb1;extension.writeUInt16LE(1,1);extension.writeUInt32LE(1,3);extension.writeUInt16LE(92,7);extension.writeUInt16LE(20,9);
  const packet=Buffer.concat([b,extension]);
  const record=p.decodePacket(packet).actors[0].supports[0];assert.equal(record.level,20);assert.equal(record.shared,true);
  assert.throws(()=>p.decodePacket(packet.subarray(0,-1)),/shared support/);
  const invalid=Buffer.from(packet);invalid.writeUInt32LE(999,114);assert.throws(()=>p.decodePacket(invalid),/shared support/);
  invalid.writeUInt32LE(1,114);invalid.writeUInt16LE(0,120);assert.throws(()=>p.decodePacket(invalid),/shared support/);
  const duplicate=Buffer.concat([packet,extension.subarray(3)]);duplicate.writeUInt16LE(2,112);assert.throws(()=>p.decodePacket(duplicate),/shared support/);
});
test('curse state wire extension and native HUD keep duration/level without granting learned skills',()=>{
  const scope={module:{exports:{}},exports:{},TextEncoder,TextDecoder,Uint8Array,DataView,Map,Set};
  vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/webtransport/protocol.ts'],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text,scope);
  const p=scope.module.exports,b=Buffer.alloc(111);b.set([8,17]);b.writeUInt32LE(1,10);b.writeUInt16LE(1,18);
  b.writeUInt32LE(1,43);b.writeFloatLE(100,55);b.writeFloatLE(100,63);b.writeUInt32LE(1,82);
  const extension=Buffer.alloc(15);extension[0]=0xc1;extension.writeUInt16LE(1,1);extension.writeUInt32LE(1,3);extension.writeUInt16LE(67,7);extension.writeUInt16LE(20,9);extension.writeFloatLE(20,11);
  const packet=Buffer.concat([b,extension]),decoded=p.decodePacket(packet);assert.equal(decoded.actors[0].curses[0].skill,67);
  const nativeScope={o:{sk:{},auraOff:{}},v:{},l:{clock:10},T:{}};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/support.js','utf8'),nativeScope);
  nativeScope.OnlineSupport.sync(decoded);assert.equal(nativeScope.v.curse[67],30);assert.equal(nativeScope.v.curseL[67],20);
  assert.equal(Object.keys(nativeScope.o.sk).length,0);
  nativeScope.OnlineSupport.sync({self:1,actors:[{id:1}]});assert.equal(Object.keys(nativeScope.v.curse).length,0);
  const invalid=Buffer.from(packet);invalid.writeFloatLE(61,122);assert.throws(()=>p.decodePacket(invalid),/curse/);
  assert.throws(()=>p.decodePacket(packet.subarray(0,-1)),/curse/);
});
