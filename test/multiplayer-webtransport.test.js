const { test } = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { createHmac } = require('node:crypto');
const { openDatabase } = require('../src/server/database.ts');
const { createServer } = require('../src/server/index.ts');
const { issueMultiplayerTicket } = require('../src/server/multiplayer/webtransport/session.ts');
const source = esbuild.buildSync({ entryPoints:['src/client/multiplayer/webtransport/protocol.ts'], bundle:true,
  format:'cjs',platform:'node',write:false }).outputFiles[0].text;
const scope = { exports:{}, module:{exports:{}}, TextEncoder,TextDecoder,Uint8Array,DataView,Map };
vm.runInNewContext(source,scope);
const protocol = scope.module.exports;

test('binary position matches Rust golden bytes and rejects malformed snapshots', () => {
  const packet = protocol.encodePosition({ seq:0x01020304,map:42,timestamp:250,effectTime:2.5,x:123,y:-136,dir:7,moving:true });
  assert.deepEqual([...packet],[8,2,4,3,2,1,42,0,0,0,250,0,0,0,0,0,32,64,0,0,246,66,0,0,8,195,7,1]);
  const snapshot = Buffer.alloc(42); snapshot.set([8,4]);
  snapshot.writeUInt32LE(99,2); snapshot.writeUInt32LE(5,6); snapshot.writeUInt32LE(42,10); snapshot.writeUInt16LE(1,14);
  snapshot.writeUInt32LE(5,16); snapshot.set(packet.subarray(2,6),20); snapshot.set(packet.subarray(10),24);
  const decoded = protocol.decodePacket(snapshot);
  assert.equal(decoded.tick,99); assert.equal(decoded.players[0].x,123); assert.equal(decoded.players[0].y,-136);
  assert.equal(decoded.players[0].timestamp,250); assert.equal(decoded.players[0].effectTime,2.5);
  assert.throws(() => protocol.decodePacket(snapshot.subarray(0,41)), /size/);
  snapshot.writeFloatLE(NaN,32); assert.throws(() => protocol.decodePacket(snapshot), /position/);
  assert.equal(protocol.newer(0,0xffffffff),true); assert.equal(protocol.newer(0xffffffff,0),false);
});

test('Vietnamese identity uses UTF-8 binary and exact length; ticket uses HMAC account identity', () => {
  const look = { name:'Kiếm Khách',faction:3,sex:1,bodySex:1,ride:0,helm:-1,armor:19,weapon:20,horse:-1,rebirth:2,effects:[76,390] };
  const hello = protocol.encodeAppearance(look,new Uint8Array(69));
  const offset = 22;
  assert.equal(hello.length,offset+Buffer.byteLength(look.name)+69);
  assert.equal(Buffer.from(hello.subarray(offset,offset+Buffer.byteLength(look.name))).toString(),look.name);
  const roster = Buffer.alloc(12+20+4+Buffer.byteLength(look.name)); roster.set([8,5]);
  roster.writeUInt32LE(1,2); roster.writeUInt32LE(42,6); roster.writeUInt16LE(1,10); roster.writeUInt32LE(8,12);
  roster.set(hello.subarray(2,offset+Buffer.byteLength(look.name)),16);
  assert.equal(protocol.decodePacket(roster).players.get(8).name,look.name);
  assert.deepEqual([...protocol.decodePacket(roster).players.get(8).effects],[76,390]);
  assert.equal(protocol.decodePacket(roster).players.get(8).rebirth,2);
  assert.throws(()=>protocol.encodeAppearance({...look,effects:[76,76]}),/effects/);
  assert.throws(()=>protocol.decodePacket(roster.subarray(0,roster.length-1)),/name/);
  const secret = '01234567890123456789012345678901';
  const ticket = issueMultiplayerTicket('12345678-1234-1234-1234-123456789abc',secret,1700000000000);
  assert.equal(ticket.length,69); assert.equal(ticket.readUInt32LE(1),1700000030);
  assert.equal(ticket.subarray(5,21).toString('hex'),'12345678123412341234123456789abc');
  assert.deepEqual(ticket.subarray(37), createHmac('sha256',secret).update(ticket.subarray(0,37)).digest());
});

test('multiplayer session requires account cookie even when disabled', async () => {
  const db = openDatabase(':memory:'), { app } = createServer({ db,downloadAssets:false });
  try {
    assert.equal((await app.inject({method:'POST',url:'/api/multiplayer/webtransport/session'})).statusCode,401);
    const auth = await app.inject({method:'POST',url:'/api/auth/register',payload:JSON.stringify({username:'binary_player',password:'secret123'})});
    assert.equal(auth.statusCode,200);
    const cookie = auth.headers['set-cookie'].split(';')[0];
    const response = await app.inject({method:'POST',url:'/api/multiplayer/webtransport/session',headers:{cookie}});
    assert.deepEqual(response.json(),{enabled:false});
  } finally {await app.close(); db.close();}
});

test('online input ignores keyboard and joystick but follows the mouse target', () => {
  const text=fs.readFileSync(path.join(__dirname,'../src/client/ui/legacy-panels-and-audio-03.js'),'utf8');
  const ast=require('acorn').parse(text,{ecmaVersion:'latest'});
  const node=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='Qv'));
  const game={gameMultiplayer:{active:true},Y:{active:true,moved:true,x:100,y:100,ox:0,oy:0,keys:{ArrowUp:true,w:true},target:null},T1:{v:[1,1]},v:{x:0,y:0},Math};
  vm.createContext(game);vm.runInContext(text.slice(node.start,node.end),game);
  assert.deepEqual([...game.Qv()],[0,0]);
  game.Y.target={x:30,y:40};assert.deepEqual([...game.Qv()],[0.6,0.8]);
});

test('enabled multiplayer issues a signed ticket for the cookie account, ignoring spoofed payload IDs', async () => {
  const { createServer: httpServer } = require('node:http');
  const { once } = require('node:events');
  const config = { protocol:8,playUrl:'https://127.0.0.1:4434/play',certificateHash:Array(32).fill(7) };
  const control = httpServer((_request,response)=>{response.setHeader('Content-Type','application/json');response.end(JSON.stringify(config));});
  control.listen(0,'127.0.0.1');await once(control,'listening');
  const previousSecret=process.env.MULTIPLAYER_SECRET,previousControl=process.env.MULTIPLAYER_WT_CONTROL_URL;
  process.env.MULTIPLAYER_SECRET='test-ticket-secret-01234567890123456789';
  process.env.MULTIPLAYER_WT_CONTROL_URL=`http://127.0.0.1:${control.address().port}`;
  const db=openDatabase(':memory:'),{app}=createServer({db,downloadAssets:false});
  try {
    const registered=await app.inject({method:'POST',url:'/api/auth/register',payload:JSON.stringify({username:'ticket_owner',password:'secret123'})});
    const cookie=registered.headers['set-cookie'].split(';')[0];
    db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(registered.json().user.id,'jxidle',JSON.stringify({fac:'vo0',lvl:1}));
    const response=await app.inject({method:'POST',url:'/api/multiplayer/webtransport/session',headers:{cookie},payload:JSON.stringify({accountId:'spoofed'})});
    assert.equal(response.statusCode,200);
    const body=response.json(),ticket=Buffer.from(body.ticket,'base64');
    assert.equal(body.enabled,true);assert.equal(body.playUrl,config.playUrl);
    assert.equal(ticket.subarray(5,21).toString('hex'),registered.json().user.id.replaceAll('-',''));
    assert.deepEqual(ticket.subarray(37),createHmac('sha256',process.env.MULTIPLAYER_SECRET).update(ticket.subarray(0,37)).digest());
    assert.ok(ticket.readUInt32LE(1)>Date.now()/1000);
  } finally {
    await app.close();db.close();await new Promise(resolve=>control.close(resolve));
    if(previousSecret===undefined)delete process.env.MULTIPLAYER_SECRET;else process.env.MULTIPLAYER_SECRET=previousSecret;
    if(previousControl===undefined)delete process.env.MULTIPLAYER_WT_CONTROL_URL;else process.env.MULTIPLAYER_WT_CONTROL_URL=previousControl;
  }
});

test('remote character with pending body appearance falls back to the base sprite', () => {
  let rendered;
  const scope={OnlinePvp:{healthColor:()=>"#4fd04f"},onlineWorld:{bind(){},entities:()=>[],state:null},I:{shaolin:{}},GameWebTransport:{createClient:()=>({})},window:{addEventListener(){}},
    lB:()=>{throw new Error('Incomplete equipment must not render a weapon-only body');},
    uB:(_ctx,actor)=>{rendered=actor;}};
  vm.createContext(scope);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/client/multiplayer/webtransport/legacy-bridge.js'),'utf8'),scope);
  scope.gameMultiplayer.draw({}, {remotePlayer:{x:100,y:200,dir:0,moving:false,animationTime:1,
    appearance:{name:'Kiếm Khách',faction:0,sex:0,bodySex:0,ride:0,armor:-1,helm:-1,weapon:0,horse:-1}}});
  assert.equal(rendered.J,null);
  assert.equal(rendered.f,'shaolin');
});

test('remote name uses the faction palette and support effects draw under and over the body', () => {
  const draws=[];
  const scope={OnlinePvp:{healthColor:()=>"#4fd04f"},onlineWorld:{bind(){},entities:()=>[],state:null},I:{shaolin:{},emei:{}},GameWebTransport:{createClient:()=>({})},window:{addEventListener(){}},
    T:{},Tb:f=>f==='shaolin'?'#ff9900':'#80ddff', Jn:1,U1:{10:{pos:'foot'},11:{pos:'body'},12:{pos:'head'}},vf:{},
    F3:(_ctx,sprite,x,y,_height,time)=>draws.push([sprite.pos,x,y,time]),
    uB:(_ctx,actor,_dt,presentation)=>{
      assert.equal(actor.f,'shaolin');assert.equal(presentation.nameColor,'#ff9900');
      presentation.under(actor);draws.push(['body']);presentation.over(actor);
    }};
  vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/client/multiplayer/webtransport/legacy-bridge.js'),'utf8'),scope);
  scope.gameMultiplayer.draw({}, {remotePlayer:{x:100,y:200,dir:0,moving:false,animationTime:1,effectTime:12.5,
    appearance:{name:'Thiếu Lâm',faction:0,sex:0,bodySex:0,ride:0,armor:-1,effects:[10,11,12]}}});
  assert.deepEqual(draws,[['foot',100,200,12.5],['body'],['body',100,200,12.5],['head',100,200,12.5]]);
});
