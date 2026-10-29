const {test}=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite'),vm=require('node:vm'),fs=require('node:fs'),esbuild=require('esbuild');
const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
function wallet(gold){
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
  for(const account of ['victim','stranger'])db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run(account,'jxidle',JSON.stringify({fac:'shaolin',lvl:1,gold:account==='victim'?gold:0,knb:777}));
  const store=createCharacters(db);store.read('victim',0);store.read('stranger',0);return {db,store};
}
const death=(id='100-200-1-3')=>({id,account:'victim',slot:0,xp:0,gold:0,death:{map:2,x:100,y:100,life:1,notice:{}}});
test('death debit is 20 percent rounded down, capped at one million silver, and journal retries are idempotent',()=>{
  for(const [balance,loss] of [[0,0],[1,0],[4,0],[5,1],[101,20],[1000000,200000],[10000000,1000000]]){
    const {db,store}=wallet(balance),grant=death();
    assert.deepEqual(store.apply(grant),{id:grant.id,amount:loss,currency:'gold'});
    assert.equal(store.read('victim',0).profile.gold,balance-loss);
    assert.deepEqual(store.apply(grant),{id:grant.id,amount:loss,currency:'gold'});
    assert.equal(store.read('victim',0).profile.gold,balance-loss);assert.equal(store.read('victim',0).revision,1);db.close();
  }
});
test('a stranger receives a public silver pile exactly once without touching KNB or duplicating money',()=>{
  const {db,store}=wallet(1000),request=death();store.apply(request);
  const credit={id:request.id+'-0',account:'stranger',slot:0,xp:0,gold:200};
  store.apply(credit);store.apply(credit);
  assert.equal(store.read('victim',0).profile.gold,800);assert.equal(store.read('stranger',0).profile.gold,200);
  assert.equal(store.read('stranger',0).profile.knb,777);assert.equal(store.read('victim',0).profile.knb,777);
  assert.deepEqual(store.apply(request),{id:request.id,amount:200,currency:'gold'});
  assert.equal(store.read('victim',0).profile.gold+store.read('stranger',0).profile.gold,1000);
  for(const knb of [-1,1.5,1000001,NaN])assert.throws(()=>store.apply({...credit,id:'100-200-1-3-1',knb}),/reward/);
  db.close();
});
function protocol(){const s={module:{exports:{}},exports:{},TextDecoder,TextEncoder,Uint8Array,DataView};vm.runInNewContext(esbuild.buildSync({entryPoints:['src/client/multiplayer/state/protocol.ts'],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text,s);return s.module.exports;}
function packet(){
  const chunks=[],header=Buffer.alloc(43);header.set([8,17]);header.writeUInt32LE(10,2);header.writeUInt32LE(2,6);header.writeUInt32LE(1,10);header.writeUInt16LE(1,18);header.writeUInt16LE(1,22);chunks.push(header);
  const actor=Buffer.alloc(55);actor.writeUInt32LE(1,0);actor.writeFloatLE(100,20);actor.writeFloatLE(30,24);actor.writeUInt32LE(1,39);chunks.push(actor);
  const loot=Buffer.alloc(17);loot.writeUInt32LE(99,0);loot.writeFloatLE(100,4);loot.writeFloatLE(100,8);loot.writeUInt32LE(125000,12);loot[16]=3;chunks.push(loot,Buffer.alloc(2),Buffer.alloc(11));
  const name=Buffer.from('Sát Thủ <script>'),notice=Buffer.alloc(7);notice[0]=0xd1;notice.writeUInt32LE(42,1);notice[5]=1;notice[6]=name.length;chunks.push(notice,name);return Buffer.concat(chunks);
}
test('binary snapshots distinguish public KNB from gold and carry UTF-8 killer names with strict lengths',()=>{
  const p=protocol(),bytes=packet(),world=p.decodeWorld(bytes);
  assert.equal(world.loot[0].knb,125000);assert.equal(world.loot[0].gold,0);assert.equal(world.loot[0].mine,true);
  const silver=Buffer.from(bytes);silver[43+55+16]=1;const goldWorld=p.decodeWorld(silver);assert.equal(goldWorld.loot[0].gold,125000);assert.equal(goldWorld.loot[0].knb,undefined);assert.equal(goldWorld.loot[0].mine,true);
  assert.equal(world.death.name,'Sát Thủ <script>');assert.equal(world.death.player,true);assert.equal(world.death.killer,42);
  assert.throws(()=>p.decodeWorld(bytes.subarray(0,-1)),/name|size/);
  const invalid=Buffer.from(bytes);invalid[43+55+16]=4;assert.throws(()=>p.decodeWorld(invalid),/loot/);
  const c=p.encodeCommand(8,1,{kind:17,map:2});assert.equal(c[6],17);
});
function ui(){
  const nodes=new Map();
  function element(){return {style:{},children:[],get textContent(){return this.children.map(n=>typeof n==='string'?n:n.textContent||'').join('');},set textContent(value){this.children=[value];},replaceChildren(...items){this.children=[];this.append(...items);},classList:{toggle(){}},setAttribute(){},append(...items){this.children.push(...items);for(const n of items)if(n.id)nodes.set(n.id,n);},appendChild(n){this.append(n);},remove(){if(this.id)nodes.delete(this.id);}};}
  nodes.set('battle',element());nodes.set('bBack',element());
  const game={document:{head:element(),body:element(),createElement:element,getElementById:id=>nodes.get(id)||null},E0:{town:{id:37,n:'Biện Kinh'}},Z0:{key:2},JW:{zones:[{id:2,n:'Bãi luyện công'}]},l:{},v:{},Y:{},GameWebTransport:{newer:(a,b)=>(a-b|0)>0},ma:key=>{game.Z0.key=key;},M1(){},_e(){},bA:()=>null};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/lifecycle.js','utf8'),game);return {game,nodes};
}
test('reconnect places the hero exactly and death UI safely names the killer, waits for town action and clears on recovery',()=>{
  const {game,nodes}=ui(),sent=[],send=kind=>{sent.push(kind);return 7;};
  const state={self:1,map:2,ack:0,actors:[{id:1,life:1,hp:0,x:345,y:456}],death:{name:'Sát Thủ <script>',player:true}};
  game.OnlineLifecycle.sync(state,send);assert.equal(game.v.x,345);assert.equal(game.v.y,456);
  const panel=nodes.get('onlineDeath'),card=panel.children[0];assert.equal(card.children[0].textContent,'Về thành dưỡng sức');
  assert.ok(card.children[1].textContent.includes('Sát Thủ <script>'));assert.equal(card.children[1].innerHTML,undefined);assert.equal(card.children[1].children[1].textContent,'Sát Thủ <script>');assert.equal(card.children[1].children[1].className,'online-death-killer');
  assert.equal(sent.length,0);card.children[2].onclick();assert.deepEqual(sent,[17]);assert.equal(card.children[2].disabled,true);
  state.map=37;state.ack=7;state.actors[0]={id:1,life:2,hp:100,x:50,y:60};delete state.death;
  game.OnlineLifecycle.sync(state,send);assert.equal(game.l.town,true);assert.equal(game.Z0.key,'town');assert.equal(game.v.x,50);assert.equal(game.v.y,60);assert.ok(!nodes.has('onlineDeath'));
  game.OnlineLifecycle.reset();
});

test('restoring a different map also restores its stage and alternate-map selection',()=>{
  const {game}=ui();game.k0=[{id:2,n:'Đầu'},{id:140,n:'Chính'}];game.Un={1:[{id:340,n:'Bãi khác'}]};game.o={stage:1,zalt:{}};game.ol=index=>index*10+1;
  game.OnlineLifecycle.sync({self:1,map:340,ack:0,actors:[{id:1,life:1,hp:100,x:222,y:333}]},()=>0);
  assert.equal(game.o.stage,11);assert.equal(game.o.zalt[1],1);assert.equal(game.Z0.key,340);assert.equal(game.l.banner.text,'Bãi khác');
});

test('client restores cached position before connecting and saves the last predicted position per account and slot',()=>{
  const {game}=ui(),data=new Map(),events={};
  game.window={localGameAuth:{user:{id:'account-a'}},location:{search:''},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},addEventListener:(k,fn)=>events[k]=fn};
  game.URLSearchParams=URLSearchParams;game.m0=0;game.o={fac:'shaolin'};
  const key='__volam_position_v1:account-a:0';
  data.set(key,JSON.stringify({version:1,map:2,self:9,actor:{id:9,life:3,hp:120,mp:60,x:345,y:456}}));
  // Module evaluation happens synchronously before requestAnimationFrame.
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/lifecycle.js','utf8'),game);
  assert.equal(game.v.x,345);assert.equal(game.v.y,456);assert.equal(game.l.life,120);
  assert.deepEqual(JSON.parse(JSON.stringify(game.OnlineLifecycle.hint())),{map:2,x:345,y:456,life:3});
  game.OnlineLifecycle.sync({map:2,self:9,actors:[{id:9,life:3,hp:120,mp:60,x:345,y:456}]},()=>0);
  game.v.x=360;game.v.y=470;game.OnlineLifecycle.remember();
  game.v.x=365;events.pagehide();assert.equal(JSON.parse(data.get(key)).actor.x,365,'pagehide bypasses throttling');
  game.m0=1;assert.equal(game.OnlineLifecycle.hint(),undefined);
  game.m0=0;game.window.localGameAuth.user.id='other';assert.equal(game.OnlineLifecycle.hint(),undefined);
  game.window.localGameAuth.user.id='account-a';data.set(key,'corrupt');assert.equal(game.OnlineLifecycle.restore(),false);
});

test('historical KNB death receipts retain their currency after SQLite migration',()=>{
  const {db}=wallet(1000);
  db.exec('DROP TABLE multiplayer_death_drops; CREATE TABLE multiplayer_death_drops(id TEXT PRIMARY KEY,amount INTEGER NOT NULL)');
  db.prepare('INSERT INTO multiplayer_death_drops VALUES(?,?)').run(death().id,200);
  // Existing reward journal entries are the transaction's idempotency boundary.
  db.prepare('INSERT INTO multiplayer_rewards VALUES(?,?,?,?,?)').run(death().id,'victim',0,0,0);
  const store=createCharacters(db);
  assert.equal(db.prepare('SELECT currency FROM multiplayer_death_drops').get().currency,'knb');
  assert.deepEqual(store.apply(death()),{id:death().id,amount:200,currency:'knb'});
  assert.equal(store.read('victim',0).profile.gold,1000);assert.equal(store.read('victim',0).profile.knb,777);
  db.close();
});

test('gold pile labels use vạn lượng from ten thousand without losing amounts',()=>{
  const source=fs.readFileSync('src/client/render/arena-02.js','utf8'),ast=require('acorn').parse(source,{ecmaVersion:'latest'});
  const node=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='goldLootVisuals'));
  const scope={Image:class{complete=false;}};vm.runInNewContext(source.slice(node.start,node.end),scope);
  let label;const ctx={save(){},restore(){},globalAlpha:1,strokeText(){},fillText:text=>label=text};
  for(const [amount,expected]of[[9999,'9.999 lượng'],[10000,'1 vạn lượng'],[125000,'12,5 vạn lượng'],[1000000,'100 vạn lượng'],[10001,'1,0001 vạn lượng']]){
    scope.goldLootVisuals.draw(ctx,amount,0,0);assert.equal(label,expected);
  }
  scope.goldLootVisuals.draw(ctx,125000,0,0,true,'KNB');assert.equal(label,'125.000 KNB','legacy KNB remains explicitly labelled');
});

test('initial online town snapshot loads its map and ground instead of treating an empty map as town',()=>{
  const {game}=ui(),loaded=[];
  game.Z0.key=null;game.E0.town.bg='app/maps/content/37/assets/ground.jpg';
  game.ma=key=>{loaded.push(key);game.Z0.key=key;};game.bA=src=>({src});
  game.OnlineLifecycle.sync({self:1,map:37,ack:0,actors:[{id:1,life:1,hp:100,mp:20,x:1112,y:2139}]},()=>0);
  assert.deepEqual(loaded,['town']);assert.equal(game.l.bgImg.src,game.E0.town.bg);
  assert.equal(game.v.x,1112);assert.equal(game.v.y,2139);
});
