const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
const esbuild=require('esbuild'),vm=require('node:vm');
function protocol(){const scope={module:{exports:{}},exports:{},TextEncoder,TextDecoder,Uint8Array,DataView,Map};vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/webtransport/protocol.ts'],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text,scope);return scope.module.exports;}
test('native stats reuse game formulas and isolate characters between requests',()=>{
  const a=catalog.character({fac:'vo0',lvl:1}),b=catalog.character({fac:'vo2',lvl:10}),again=catalog.character({fac:'vo0',lvl:1});
  assert.deepEqual(a,again);assert.notEqual(b.hp,a.hp);assert.ok(catalog.character({fac:"vo0",lvl:10}).hp>a.hp);assert.ok(a.skills.some(s=>s.id===0));assert.ok(a.skills.every(s=>s.parts.length===5));
  assert.equal(a.hp,native.buildCharacter({fac:'vo0',lvl:1}).stats.life);
  assert.equal(a.skills[0].cost,0);assert.ok(a.speed>0);
});
test('shared maps use available content and real monster definitions',()=>{
  const world=catalog.world();assert.equal(world.town,37);assert.ok(world.maps.length>10);assert.ok(world.maps.length<=48);
  assert.equal(new Set(world.maps.map(m=>m.id)).size,world.maps.length);
  assert.ok(world.maps.find(m=>m.id===37).town);assert.ok(!world.maps.some(m=>m.id===9003));
  assert.ok(world.maps.some(m=>m.monsters.some(d=>d.id===34)));
});
test('online canonical profile survives legacy writes; rewards are transactional and idempotent',()=>{
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('account', 'jxidle',JSON.stringify({fac:'vo0',lvl:1,xp:0,gold:0,attrPts:0,skPts:1}));
  const store=createCharacters(db);
  assert.equal(store.read('account',0).profile.lvl,1);
  db.prepare('UPDATE account_storage SET value=?').run(JSON.stringify({fac:'vo0',lvl:200,gold:1e9}));
  assert.equal(store.read('account',0).profile.lvl,1);
  const g={id:'123-1',account:'account',slot:0,xp:105,gold:3};store.apply(g);store.apply(g);
  const saved=store.read('account',0);assert.equal(saved.revision,1);assert.equal(saved.profile.gold,3);assert.equal(saved.profile.lvl,2);assert.equal(saved.profile.xp,5);assert.equal(saved.profile.attrPts,5);assert.equal(saved.profile.skPts,2);
  assert.throws(()=>store.apply({...g,id:'123-2',account:'missing'}));assert.equal(db.prepare('SELECT count(*) AS n FROM multiplayer_rewards').get().n,1);
  assert.throws(()=>store.apply({...g,id:'123-3',gold:-10}));assert.throws(()=>store.read('account',-1));assert.throws(()=>store.read('account',1.1));db.close();
});
test('world binary exact layout, floats and count limits',()=>{
  const p=protocol();const b=Buffer.alloc(45+55+48+17+24);b.set([7,17]);b.writeUInt32LE(9,2);b.writeUInt32LE(140,6);b.writeUInt32LE(7,10);b.writeUInt32LE(2,14);
  for(const offset of [18,20,22,24])b.writeUInt16LE(1,offset);
  b.writeFloatLE(150,30);b.writeFloatLE(100,34);b.writeFloatLE(200,38);b[42]=1;
  let at=43;b.writeUInt32LE(7,at);for(const [i,value]of [100,200,100,20,100,20,0,0].entries())b.writeFloatLE(value,at+4+i*4);b.writeUInt32LE(1,at+39);at+=55;
  b.writeUInt32LE(1001,at);b.writeUInt32LE(34,at+4);for(const [i,value]of [150,200,8,20,2,1,3].entries())b.writeFloatLE(value,at+8+i*4);b.writeUInt16LE(1,at+36);b.writeUInt32LE(3,at+40);b.writeFloatLE(.4,at+44);at+=48;
  b.writeUInt32LE(1002,at);b.writeFloatLE(150,at+4);b.writeFloatLE(200,at+8);b.writeUInt32LE(2,at+12);b[at+16]=1;at+=17;
  b.writeUInt32LE(1003,at);b.writeUInt32LE(7,at+4);b.writeUInt32LE(1001,at+8);b.writeUInt16LE(361,at+12);b[at+14]=2;b.writeFloatLE(12,at+15);b[at+23]=16;
  const world=p.decodePacket(b);assert.equal(world.type,'world');assert.equal(world.monsters[0].cold,2);assert.equal(world.monsters[0].life,3);assert.equal(world.events[0].hit.hurt,true);assert.equal(world.events[0].hit.element,'phys');assert.equal(world.loot[0].mine,true);assert.equal(world.events[0].value,12);
  assert.throws(()=>p.decodePacket(b.subarray(0,-1)),/size/);b.writeUInt16LE(500,20);assert.throws(()=>p.decodePacket(b),/size/);b.writeUInt16LE(1,20);b.writeFloatLE(NaN,47);assert.throws(()=>p.decodePacket(b),/float/);
});
test('progress endpoint returns 204 for unchanged revisions and isolates the account',async()=>{
  const {openDatabase}=require('../src/server/database.ts'),{createServer}=require('../src/server/index.ts');
  const db=openDatabase(':memory:'),{app}=createServer({db,downloadAssets:false});
  try{
    const registered=await app.inject({method:'POST',url:'/api/auth/register',payload:{username:'pve_revision',password:'secret123'}});
    const account=registered.json().user.id,cookie=registered.headers['set-cookie'].split(';')[0];
    db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify({fac:'vo0',lvl:1,gold:0,xp:0,inv:[{id:1,n:'Fixture item'}]}));
    assert.equal((await app.inject({url:'/api/multiplayer/character?slot=0'})).statusCode,401);
    const initial=await app.inject({url:'/api/multiplayer/character?slot=0',headers:{cookie}});assert.equal(initial.statusCode,200);assert.equal(initial.json().profile.inv.length,1);
    assert.equal((await app.inject({url:'/api/multiplayer/character?slot=0&revision=0',headers:{cookie}})).statusCode,204);
    createCharacters(db).apply({id:'456-1-0-0',account,slot:0,xp:5,gold:1});
    const delta=await app.inject({url:'/api/multiplayer/character?slot=0&revision=0',headers:{cookie}});assert.equal(delta.json().revision,1);assert.equal(delta.json().profile.gold,1);assert.equal(delta.json().profile.inv,undefined);
  }finally{await app.close();db.close();}
});
test('unsupported modes preserve their native enemies and ignore late online snapshots',()=>{
  const fs=require('node:fs');
  const original={id:9003,n:'Native encounter'};
  const game={OnlineSkillVisuals:()=>({reset(){}}),GameWebTransport:{LocalMotion:class{clear(){}}},window:{},l:{dg:true,tower:false,battlefield:false,enemies:[original],ground:[1],fx:[2],combatProjectiles:[3]},Z0:{key:140},E0:{town:{id:37}},clearTimeout};
  vm.createContext(game);vm.runInContext(fs.readFileSync('src/client/multiplayer/state/legacy-pve.js','utf8'),game);
  game.onlineWorld.bind({authoritative:true});assert.equal(game.onlineWorld.active,false);
  game.onlineWorld.snapshot({map:140,monsters:[]});game.onlineWorld.reset();assert.equal(game.l.enemies[0],original);assert.deepEqual(game.l.ground,[1]);
  game.l.dg=false;assert.equal(game.onlineWorld.active,true);game.l.tower=true;assert.equal(game.onlineWorld.active,false);
});

test('CAST binary preserves level, missiles, frozen anchors and event timing',()=>{
  const p=protocol(),b=Buffer.alloc(45+47);b.set([7,17]);b.writeUInt16LE(1,24);
  b.writeUInt32LE(100,26);b.writeFloatLE(150,30);b[42]=2;
  const at=43;b.writeUInt32LE(9,at);b.writeUInt32LE(7,at+4);b.writeUInt32LE(1001,at+8);
  b.writeUInt16LE(1078,at+12);b[at+14]=1;b.writeUInt32LE(102,at+19);
  b.writeUInt16LE(25,at+23);b[at+25]=7;b[at+26]=2;
  for(const [i,n]of [500,100,200,300,400].entries())b.writeFloatLE(n,at+27+i*4);
  const world=p.decodePacket(b),cast=world.events[0];
  assert.equal(world.movement.commandTick,100);assert.equal(world.movement.motion,2);
  assert.equal(cast.tick,102);assert.deepEqual(JSON.parse(JSON.stringify(cast.cast)),{level:25,missiles:7,flags:2,range:500,x:100,y:200,targetX:300,targetY:400});
  for(const length of [43+23,43+46])assert.throws(()=>p.decodePacket(b.subarray(0,length)));
  b[at+25]=17;assert.throws(()=>p.decodePacket(b),/cast visual/);
  b[at+25]=7;b.writeFloatLE(Infinity,at+27);assert.throws(()=>p.decodePacket(b),/float/);
});

test('piercing DTO preserves native line flags and level gates without treating area skills as rays',()=>{
  const {linearProjectile}=require('../src/server/multiplayer/definitions/projectiles.cjs');
  const line={id:1069,L:10,rad:400,geo:{k:'line',len:500,pierce:false}};
  assert.equal(linearProjectile(line),null);
  assert.ok(linearProjectile({...line,L:11}).range>400);
  for(const id of [361,368,1075]){const p=linearProjectile({id,L:25,rad:200});assert.equal(p.width,24*.81);assert.equal(p.range,162);assert.ok(p.speed>0);}
  assert.equal(linearProjectile({id:1078,L:25,rad:512,geo:{k:'spot',r:512,pierce:true}}),null);
  assert.equal(linearProjectile({id:153,L:1,rad:400,geo:{k:'line',pierce:false,len:400}}),null);
  for(const id of [1073,1080])assert.ok(linearProjectile({id,L:1,rad:400}), 'native advanced piercing '+id);
  const profile=catalog.character({fac:'shaolin',lvl:90,sk:{318:1}});
  const skill=profile.skills.find(s=>s.id===318);assert.ok(skill.projectile);assert.equal(skill.projectile.width,16);
  assert.equal(profile.skills.find(s=>s.id===0).projectile,null);
});
