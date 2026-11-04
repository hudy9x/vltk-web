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

test('visible training SIMs can be invited without being in the human appearance roster',()=>{
 const {visiblePlayers}=load('src/client/multiplayer/party/model.ts');
 const state={self:1,actors:[{id:1,x:100,y:100},{id:2,x:130,y:130,alignment:1},{id:3,x:500,y:500}],training:{units:[{id:2,name:'SIM chủ'},{id:3,name:'SIM ngoài màn hình'},{id:4,name:'SIM cũ'}]}};
 const view={x:0,y:0,width:200,height:200};
 assert.deepEqual(Array.from(visiblePlayers(state,[],view),p=>[p.id,p.name]),[[2,'SIM chủ']]);
 const humanRoster=[{id:2,x:130,y:130,appearance:{name:'SIM chủ'}}];
 assert.equal(visiblePlayers(state,humanRoster,view).length,1,'SIMs must not appear twice');
});

test('party SIMs are excluded from client attack targets even when PK is enabled',()=>{
 const scope={l:{town:false}};vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/pvp.js','utf8'),scope);
 const me={id:1,hp:100,pk:true,alignment:0},sim={id:2,hp:100,trainingOwner:1,alignment:0};
 const state={self:1,actors:[me,sim],party:{leader:1,members:[{id:1},{id:2}]}};
 assert.equal(scope.OnlinePvp.hostile(state,sim),false);assert.equal(scope.OnlinePvp.targets(state).length,0);
 state.party.members=[];assert.equal(scope.OnlinePvp.hostile(state,sim),true);
});

test('party SIM protection preserves ordinary battlefield opponent targeting',()=>{
 const scope={l:{town:false}};vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/pvp.js','utf8'),scope);
 const me={id:1,hp:100,battlefieldReady:true,battlefieldTeam:0},opponent={id:2,hp:100,battlefieldReady:true,battlefieldTeam:1};
 const state={self:1,actors:[me,opponent],party:{leader:1,members:[{id:1},{id:2}]},battlefield:{phase:'running'}};
 assert.equal(scope.OnlinePvp.hostile(state,opponent),true);
});

test('party XP journal IDs deliver each share into canonical SQLite characters exactly once',()=>{
 const {DatabaseSync}=require('node:sqlite'),{createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
  for(const account of ['party-a','party-b'])db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify({fac:'vo0',lvl:1,xp:0}));
  const characters=createCharacters(db);
  // Rust grant_experience emits epoch-monster-life-0-recipient, retaining the numeric wire contract.
  const grants=[{id:'1793725745000000000-123-456-0-0',account:'party-a',slot:0,xp:3,gold:0},{id:'1793725745000000000-123-456-0-1',account:'party-b',slot:0,xp:2,gold:0}];
  for(const grant of grants){characters.apply(grant);characters.apply(grant);}
  const reload=createCharacters(db);
  assert.equal(reload.read('party-a',0).profile.xp,3);assert.equal(reload.read('party-b',0).profile.xp,2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM multiplayer_rewards').get().n,2);
 }finally{db.close();}
});

test('training SIM nameplates follow server party alignment on joining, leader changes and leaving',()=>{
 const module={exports:{}};
 vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/webtransport/interpolation.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,{module,exports:module.exports,TextEncoder,TextDecoder,Uint8Array,DataView});
 const labels=[],s={performance:{now:()=>100},GameWebTransport:module.exports,onlineWorld:{pose:()=>null},kn:()=>0,Jn:1,Ua:1,
  Jt:()=>({anim:'hero'}),r0:{7:{anim:'soldier'}},Va:()=>80,U1:{},L3:(...args)=>labels.push(args),nameplateOffset:()=>65,
  Gh:{chinh:{c:'#ffb347'},trung:{c:'#55cc88'},ta:{c:'#c77bff'},tan:{c:'#aaaaaa'}}};
 vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/pvp.js','utf8'),s);
 vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/battlefield.js','utf8'),s);
 const actor={id:9,x:100,y:100,hp:100,maxHp:100,life:1,alignment:2};
 const next={tick:2,map:2,self:1,training:{units:[{id:9,kind:1,online:true,moving:false,training:true,faction:'wudang',name:'SIM',team:1}]},actors:[actor]};
 const ctx={beginPath(){},ellipse(){},fill(){}};
 const draw=()=>{next.tick++;const body=s.OnlineBattlefield.entities(next)[0].remotePlayer;s.OnlineBattlefield.draw(ctx,body,next);return body;};
 const initial=draw();assert.equal(labels.at(-1)[3],s.Gh.ta.c);
 // The same cached render body must pick up the server's effective alignment every snapshot.
 for(const alignment of [0,1,3,2]){
  actor.alignment=alignment;assert.equal(draw(),initial);
  assert.equal(labels.at(-1)[3],s.Gh[['chinh','trung','ta','tan'][alignment]].c);
 }
 // Ordinary battlefield units retain their camp colors and white soldier labels.
 delete next.training;next.map=9003;next.battlefield={units:[{id:9,kind:1,online:true,moving:false,faction:'wudang',name:'SIM',team:0}]};
 actor.life++;draw();assert.equal(labels.at(-1)[3],'#ffb347');
 next.battlefield.units[0].team=1;draw();assert.equal(labels.at(-1)[3],'#c77bff');
 next.battlefield.units[0].kind=2;next.battlefield.units[0].skin=7;draw();assert.equal(labels.at(-1)[3],'#ffffff');
});
