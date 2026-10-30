const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),esbuild=require('esbuild');
function load(file){const scope={module:{exports:{}},exports:{},TextEncoder,TextDecoder,Uint8Array,DataView,Map,Set};vm.runInNewContext(esbuild.buildSync({entryPoints:[file],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text,scope);return scope.module.exports;}
test('party candidates use current rendered camera bounds and exclude self or stale map actors',()=>{
  const {visiblePlayers}=load('src/client/multiplayer/party/model.ts');
  const state={self:1,map:2,actors:[{id:1},{id:2,alignment:0},{id:3,alignment:1},{id:4,alignment:2}]};
  const peer=(id,x,y,name)=>({id,x,y,appearance:{name}});
  const players=[peer(1,120,230,'Self'),peer(2,130,220,'Visible'),peer(3,99,240,'Offscreen'),peer(4,150,301,'Below'),peer(5,140,250,'Old map')];
  const view={x:100,y:200,width:100,height:100};
  assert.deepEqual(Array.from(visiblePlayers(state,players,view),p=>p.name),['Visible']);
  view.x=0;assert.deepEqual(Array.from(visiblePlayers(state,players,view),p=>p.name),['Offscreen']);
  assert.equal(visiblePlayers(null,players,view).length,0);
});
test('HP colors distinguish same-color PK, enemy PK, self PK and neutral',()=>{
  const scope={o:{},l:{town:false}};vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/pvp.js','utf8'),scope);
  const me={id:1,hp:100,alignment:0,pk:true},state={self:1,actors:[me]};
  assert.equal(scope.OnlinePvp.healthColor(state),'#ff79b0');
  assert.equal(scope.OnlinePvp.healthColor(state,{alignment:0,pk:true}),'#ff79b0');
  assert.equal(scope.OnlinePvp.healthColor(state,{alignment:1,pk:true}),'#ef4242');
  assert.equal(scope.OnlinePvp.healthColor(state,{alignment:1,pk:false}),'#4fd04f');
  me.pk=false;assert.equal(scope.OnlinePvp.healthColor(state),'#4fd04f');
  const teammate={id:2,hp:100,alignment:0,pk:true};
  assert.equal(scope.OnlinePvp.hostile(state,teammate),false);
});
function packet(members=[],invite=null){
  const base=Buffer.alloc(56);base.set([8,17]);base.writeUInt32LE(1,10);
  base.writeUInt32LE(members[0]?.id||0,45);base.writeUInt32LE(12,49);base[53]=members.length?2:0;base[54]=members.length;base[55]=+!!invite;
  const records=members.map(m=>{const name=Buffer.from(m.name),b=Buffer.alloc(18);b.writeUInt32LE(m.id);b.writeUInt32LE(m.map||2,4);b.writeFloatLE(50,8);b.writeFloatLE(100,12);b[16]=m.alignment||0;b[17]=name.length;return Buffer.concat([b,name]);});
  if(invite){const name=Buffer.from(invite.name),b=Buffer.alloc(13);b.writeUInt32LE(1000);b.writeUInt32LE(invite.from,4);b.writeFloatLE(60,8);b[12]=name.length;records.push(Buffer.concat([b,name]));}
  return Buffer.concat([base,...records]);
}
test('binary v8 carries private party roster, leader, invitation and command reply',()=>{
  const protocol=load('src/client/multiplayer/webtransport/protocol.ts');
  const b=packet([{id:1,name:'Đội trưởng'},{id:2,name:'Thúy Yên',map:56}]);
  const state=protocol.decodePacket(b);assert.equal(state.party.leader,1);assert.equal(state.party.members[1].name,'Thúy Yên');assert.equal(state.party.members[1].map,56);assert.equal(state.party.reply.seq,12);
  const invite=protocol.decodePacket(packet([], {from:2,name:'Người mời'})).party.invitations[0];assert.equal(invite.from,2);assert.equal(invite.remaining,60);
  const invalid=Buffer.from(b);invalid[54]=9;assert.throws(()=>protocol.decodePacket(invalid),/party/);
  assert.throws(()=>protocol.decodePacket(b.subarray(0,-1)),/party/);
  assert.throws(()=>protocol.decodePacket(packet([{id:1,name:'A'},{id:1,name:'B'}])),/party/);
  assert.throws(()=>protocol.decodePacket(packet([{id:2,name:'A'},{id:3,name:'B'}])),/party/);
  const old=packet();old[0]=7;assert.throws(()=>protocol.decodePacket(old),/Unsupported/);
  const command=load('src/client/multiplayer/state/protocol.ts');
  for(const kind of [12,13,14,15])assert.equal(command.encodeCommand(8,20,{kind,map:2,target:42})[6],kind);
  assert.equal(command.encodeCommand(8,20,{kind:16,map:2,target:42,skill:321,x:65535,y:65535})[6],16);
  assert.equal(command.encodeCommand(8,20,{kind:17,map:2})[6],17);
  assert.equal(command.encodeCommand(8,20,{kind:18,map:2,target:3,skill:10})[6],18);
  assert.throws(()=>command.encodeCommand(8,20,{kind:21,map:2}),/command/);
});
