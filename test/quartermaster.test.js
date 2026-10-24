const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {compileTypeScriptEntry}=require('../tools/build-app');
function load(file,name,scope={}){vm.runInNewContext(compileTypeScriptEntry(file,name).code,scope);return scope[name];}
const Model=load('gameplay/quartermaster/model.ts','Model');
const {createQuartermaster,addAccumulatedMerit,accumulatedMerit,WAR_PRICES}=Model;
const {WAR_ITEMS,createWarRewards}=load('simulator/war-rewards.ts','Rewards');
function fixture(){const store={tk_merit:10000};let slots=60,available=true,saves=0;return {store,shop:createQuartermaster({storage:()=>store,freeSlots:()=>slots,available:()=>available,changed(){saves++;}}),full(){slots=0;},leave(){available=false;},get saves(){return saves;}};}
test('all 26 items are sold at positive prices and paid only in accumulated merit',()=>{
 assert.deepEqual(Object.keys(WAR_PRICES),Object.keys(WAR_ITEMS));
 for(const kind of Object.keys(WAR_ITEMS)){const f=fixture();assert.ok(WAR_PRICES[kind]>0);f.shop.buy(kind,10);assert.equal(f.store.tk_merit,10000-WAR_PRICES[kind]*10);assert.equal(f.store['tk_'+kind],10);assert.equal(f.saves,1);}
 assert.equal(WAR_PRICES.drum,500);assert.equal(WAR_PRICES.command,400);assert.equal(WAR_PRICES.life,150);
});
test('failed purchases never deduct points or grant items, including full stacks and invalid inputs',()=>{
 const f=fixture();f.full();const before=JSON.stringify(f.store);
 assert.throws(()=>f.shop.buy('resistance'),/ô trống/);assert.equal(JSON.stringify(f.store),before);
 f.store.tk_resistance=49;f.shop.buy('resistance');assert.equal(f.store.tk_resistance,50);
 const after=JSON.stringify(f.store);assert.throws(()=>f.shop.buy('resistance'),/ô trống/);assert.equal(JSON.stringify(f.store),after);
 for(const quantity of [0,-1,1.5,51,NaN,Infinity])assert.throws(()=>f.shop.buy('life',quantity),/Số lượng/);
 assert.throws(()=>f.shop.buy('__proto__'),/không hợp lệ/);
 f.store.tk_merit=100;assert.throws(()=>f.shop.buy('drum'),/Không đủ/);assert.equal(f.store.tk_merit,100);
 f.leave();assert.throws(()=>f.shop.buy('life'),/đến gần/);assert.equal(f.saves,1);
});
test('kills add spendable merit once for player credit; spending never changes match points and reset preserves currency',()=>{
 const store={},player={x:0,y:0},ally={battlefieldTeam:'song'};
 const rewards=createWarRewards({player:()=>player,team:()=> 'song',running:()=>true,alive:()=>true,changed(){},earned:points=>addAccumulatedMerit(store,points)},()=>1);
 for(let i=0;i<3;i++){const target={battlefieldMonster:true,battlefieldTeam:'jin',x:0,y:0};rewards.record(player,target);rewards.killed(target);rewards.killed(target);}
 assert.equal(accumulatedMerit(store),150);assert.equal(rewards.state.points,150);
 const target={battlefieldMonster:true,battlefieldTeam:'jin'};rewards.record(ally,target);rewards.killed(target);assert.equal(accumulatedMerit(store),150);
 const shop=createQuartermaster({storage:()=>store,freeSlots:()=>60,available:()=>true,changed(){}});shop.buy('resistance');assert.equal(shop.balance,0);assert.equal(rewards.state.points,150);
 addAccumulatedMerit(store,10000);rewards.reset();assert.equal(accumulatedMerit(store),10000);assert.equal(rewards.state.points,0);
});
test('currency and bought stacks persist to SQLite per character after closing and reopening database',()=>{
 const {openDatabase,initialize,applyBatch,snapshot}=require('../src/server/database.ts');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'quartermaster-'));const file=path.join(dir,'game.sqlite');let db=openDatabase(file);
 try{const first={name:'First',fac:'wudang',lvl:1,mats:{misc:{tk_merit:10000}}},second={name:'Second',fac:'shaolin',lvl:1,mats:{misc:{tk_merit:150}}};
 const initial=initialize(db,{jxidle:JSON.stringify(first),jxidle_2:JSON.stringify(second)});
 const shop=createQuartermaster({storage:()=>first.mats.misc,freeSlots:()=>60,available:()=>true,changed(){}});shop.buy('drum',10);
 applyBatch(db,{id:'purchase',generation:initial.generation,operations:[{key:'jxidle',value:JSON.stringify(first)}]});db.close();db=openDatabase(file);
 const state=snapshot(db),a=JSON.parse(state.entries.jxidle),b=JSON.parse(state.entries.jxidle_2);assert.equal(a.mats.misc.tk_merit,5000);assert.equal(a.mats.misc.tk_drum,10);assert.equal(b.mats.misc.tk_merit,150);assert.equal(b.mats.misc.tk_drum,undefined);
 }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('shop dialog shows only current character balance, buys, saves and rejects stale-distance purchases',()=>{
 const buttons=Object.keys(WAR_ITEMS).map(kind=>({dataset:{quartermasterBuy:kind,quantity:'1'}})),select={value:'1'};
 const s={o:{fac:'wudang',name:'First',inv:[],mats:{misc:{tk_merit:10000}}},l:{life:100,town:false},v:{x:100,y:100},Z0:{key:9003},INV_MAX:60,R:false,saved:0,html:'',D:x=>x,V(){},$(){s.saved++;},m:()=>select,J(html,ready){s.html=html;ready();},document:{querySelectorAll:()=>buttons},MapsEngine:{getMap:()=>({id:9003}),mapNpcs:()=>[{npcId:'quartermaster',position:{x:100,y:100},team:'song'}]},arenaSimulator:{battlefield:{active:true,state:{team:'song',mapId:9003}}}};
 const shop=load('gameplay/quartermaster/index.ts','Quartermaster',s);shop.open();assert.match(s.html,/Quân trạng tích lũy: 10.000/);assert.equal((s.html.match(/data-quartermaster-buy=/g)||[]).length,52);
 assert.doesNotMatch(s.html,/<select|quartermaster-quantity|<button class="shoprow/);
 assert.match(s.html,/data-quantity="10"/);
 buttons.find(b=>b.dataset.quartermasterBuy==='drum').onclick();assert.equal(s.o.mats.misc.tk_merit,9500);assert.equal(s.o.mats.misc.tk_drum,1);assert.equal(s.saved,1);
 const bulk=buttons.find(b=>b.dataset.quartermasterBuy==='life');bulk.dataset.quantity='10';bulk.onclick();
 assert.equal(s.o.mats.misc.tk_life,10);assert.equal(s.o.mats.misc.tk_merit,8000);
 s.v.x=1000;buttons[0].onclick();assert.match(s.html,/đến gần/);assert.equal(s.o.mats.misc.tk_merit,8000);
 s.o={fac:'shaolin',inv:[],mats:{misc:{tk_merit:200}}};shop.open();assert.match(s.html,/Quân trạng tích lũy: 200/);assert.doesNotMatch(s.html,/9.500/);
});
test('map-tool shares the catalog and draws the new transparent sprite even with an old invalid direction',()=>{
 const {buildSync}=require('esbuild');const s={module:{exports:{}},structuredClone};vm.runInNewContext(buildSync({entryPoints:['src/client/npcs/index.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,s);
 const npcs=s.module.exports,npc=npcs.getNpc('quartermaster');assert.equal(npc.name,'Quan Quân Nhu');assert.equal(npc.frames,1);assert.equal(npc.directions,1);assert.ok(fs.statSync('src/client/'+npc.image.slice(4)).size<10000);
 let args;npcs.drawNpc({drawImage(...values){args=values;}},{complete:true,naturalWidth:npc.width},{npcId:'quartermaster',position:{x:100,y:200},direction:7},100);assert.equal(args[2],0);
 assert.ok(fs.readFileSync('tools/map-tool/src/editor/NpcPanel.tsx','utf8').includes('npcCatalog'));
});

test('NPC interaction uses authored quartermaster placements and respects team visibility and deletion',()=>{
 const {buildSync}=require('esbuild');const exported={module:{exports:{}},structuredClone};vm.runInNewContext(buildSync({entryPoints:['src/client/npcs/index.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,exported);
 const map={id:9003,npcs:[{id:'supply-song',npcId:'quartermaster',team:'song',position:{x:123,y:456}},{id:'supply-jin',npcId:'quartermaster',team:'jin',position:{x:789,y:321}}]};let opened=0;
 const s={document:{createElement:()=>({}),head:{appendChild(){}}},window:{},o:{fac:'wudang'},l:{town:false},Z0:{key:9003},m:()=>null,performance:{now:()=>0},quartermaster:{open(){opened++;}},MapsEngine:{...exported.module.exports,getMap:()=>map},arenaSimulator:{battlefield:{active:true,state:{mapId:9003,team:'song'}}}};
 vm.runInNewContext(fs.readFileSync('src/client/gameplay/equipment-trader-01.js','utf8'),s);
 let actors=s.equipmentTrader.entities();assert.equal(actors.length,1);assert.equal(actors[0].name,'Quan Quân Nhu');assert.equal(actors[0].x,123);actors[0].onInteract();assert.equal(opened,1);
 s.arenaSimulator.battlefield.state.team='jin';actors=s.equipmentTrader.entities();assert.equal(actors.length,1);assert.equal(actors[0].x,789);
 map.npcs=[];assert.equal(s.equipmentTrader.entities().length,0);
});
test('server serves the catalog-registered NPC asset without adding a separate static exception',async()=>{
 const {openDatabase}=require('../src/server/database.ts'),{createServer}=require('../src/server/index.ts');const db=openDatabase(':memory:');const {app}=createServer({db,downloadAssets:false,development:false});
 try{const response=await app.inject({method:'GET',url:'/app/npcs/assets/quartermaster.webp'});assert.equal(response.statusCode,200);assert.match(response.headers['content-type'],/image\/webp/);assert.ok(response.rawPayload.byteLength>0);}finally{await app.close();db.close();}
});

test('authored battlefield has a reachable quartermaster for each team and both sell using accumulated merit',()=>{
 const scope={atob,btoa};const maps=load('maps/index.ts','Maps',scope),nav=maps.createNavigationRuntime();nav.load(9003,maps.createLegacyCatalog().navigation[9003]);
 const map=maps.getMap(9003),placements=maps.mapNpcs(map).filter(npc=>npc.npcId==='quartermaster');assert.equal(placements.length,2);
 for(const team of ['song','jin']){
  const npc=placements.find(npc=>npc.team===team);assert.ok(npc);assert.ok(nav.canStand(npc.position.x,npc.position.y));
  const buttons=Object.keys(WAR_ITEMS).map(kind=>({dataset:{quartermasterBuy:kind,quantity:'1'}}));
  const s={o:{fac:'wudang',inv:[],mats:{misc:{tk_merit:1000}}},l:{life:100},v:{...npc.position},Z0:{key:9003},R:false,INV_MAX:60,D:x=>x,V(){},$(){},m:()=>({value:'1'}),J(html,ready){ready();},document:{querySelectorAll:()=>buttons},MapsEngine:maps,arenaSimulator:{battlefield:{active:true,state:{mapId:9003,team}}}};
  load('gameplay/quartermaster/index.ts','Quartermaster',s).open();buttons.find(b=>b.dataset.quartermasterBuy==='drum').onclick();assert.equal(s.o.mats.misc.tk_merit,500);assert.equal(s.o.mats.misc.tk_drum,1);
  const enemy=placements.find(n=>n.team!==team);s.v={...enemy.position};buttons.find(b=>b.dataset.quartermasterBuy==='drum').onclick();assert.equal(s.o.mats.misc.tk_merit,500,'opposing quartermaster cannot be used');
 }
});

test('quartermaster uses pharmacy reference height in both authored team placements without moving its feet',()=>{
 const {buildSync}=require('esbuild');const s={module:{exports:{}},structuredClone};vm.runInNewContext(buildSync({entryPoints:['src/client/npcs/index.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,s);
 const npcs=s.module.exports,reference=npcs.npcBounds({npcId:'pharmacy',position:{x:100,y:200}});
 const placements=JSON.parse(fs.readFileSync('src/client/maps/content/9003/map.json','utf8')).npcs.filter(n=>n.npcId==='quartermaster');assert.equal(placements.length,2);
 for(const placement of placements){const box=npcs.npcBounds(placement),definition=npcs.getNpc('quartermaster');assert.ok(Math.abs(box.height-reference.height)<1e-9);assert.ok(box.width<=reference.width*1.2);assert.ok(Math.abs(box.y+definition.anchor.y*definition.scale-placement.position.y)<1e-9);}
});

test('pharmacy exposes explicit purchase buttons from hotbar selection and permits purchases away from camp before battle',()=>{
 const {createWarSupplies}=load('simulator/supplies.ts','Supplies');
 let gold=100;
 const supplies=createWarSupplies({running:()=>false,alive:()=>false,team:()=> 'song',position:()=>({x:0,y:0}),pharmacyPositions:()=>[],recover:()=>false,changed(){},catalog:()=>[{key:'hp',kind:'life',tier:0,n:'Thuốc máu',total:100,price:2}],pay(amount){if(amount>gold)return false;gold-=amount;return true;}});
 const nodes={};for(const key of ['.war-close','#war-shop-stock','#war-shop-quantity','#war-shop-products','#war-shop-message'])nodes[key]={value:'5',innerHTML:'',textContent:''};
 const buy={dataset:{buy:'hp'}};
 const panel={hidden:true,setAttribute(){},querySelector:key=>nodes[key],querySelectorAll:key=>key==='[data-buy]'&&nodes['#war-shop-products'].innerHTML.includes('data-buy="hp"')?[buy]:[]};
 const document={getElementById:()=>({}),createElement:()=>panel,body:{appendChild(){}}};
 const {mountWarPharmacy}=load('simulator/pharmacy.ts','Pharmacy',{document});
 const dialog=mountWarPharmacy(supplies,text=>text);dialog.open('life',true);
 assert.match(nodes['#war-shop-products'].innerHTML,/<button data-buy="hp" >Mua<\/button>/);
 assert.equal(supplies.state.total,0,'opening the chooser does not purchase');
 buy.onclick();assert.equal(supplies.state.life,5);assert.equal(gold,90);assert.equal(panel.hidden,false);
 assert.equal(supplies.use('life'),false,'buying outside battle does not allow using battle potions');
});

test('pharmacy clamps the visible order to remaining physical slots instead of rejecting a five-bottle order with two slots free',()=>{
 const {createWarSupplies}=load('simulator/supplies.ts','Supplies');
 let gold=1000;
 const supplies=createWarSupplies({running:()=>true,alive:()=>true,team:()=> 'song',position:()=>({x:0,y:0}),recover:()=>false,changed(){},catalog:()=>[{key:'hp',kind:'life',tier:0,n:'Thuốc máu',total:100,price:2}],pay(amount){gold-=amount;return true;}});
 supplies.buy('hp',58);
 const nodes={};for(const key of ['.war-close','#war-shop-stock','#war-shop-quantity','#war-shop-products','#war-shop-message'])nodes[key]={value:'5',innerHTML:'',textContent:''};
 const buy={dataset:{buy:'hp'}};
 const panel={hidden:true,setAttribute(){},querySelector:key=>nodes[key],querySelectorAll:key=>key==='[data-buy]'?[buy]:[]};
 const {mountWarPharmacy}=load('simulator/pharmacy.ts','Pharmacy',{document:{getElementById:()=>({}),createElement:()=>panel,body:{appendChild(){}}}});
 mountWarPharmacy(supplies,text=>text).open();
 assert.equal(nodes['#war-shop-quantity'].value,'2');assert.equal(nodes['#war-shop-quantity'].max,'2');
 buy.onclick();assert.equal(supplies.state.total,60);assert.equal(gold,880);
 assert.equal(nodes['#war-shop-quantity'].disabled,true);
});

test('manual battlefield potion messages distinguish cooldown, full HP, empty selected type and empty stock',()=>{
 const {createHeadlessGame}=require('../tools/sim-balance/legacy-runtime.ts');
 const game=createHeadlessGame(process.cwd());let message='';game.k=text=>{message=text;};game.be={0:1,1:1};game.ao=1;
 game.S.potions=[{kind:'life',tier:0,total:100},{kind:'life',tier:1,total:200},{kind:'mana',tier:0,total:50}];
 game.arenaSimulator.battlefield.start('song');const supplies=game.arenaSimulator.supplies;
 game.l.life=1;game.l.potCd={life:1,mana:0};game.Ms('life');assert.match(message,/hồi chiêu/);assert.doesNotMatch(message,/Hết bình|hết thuốc/);
 game.l.potCd.life=0;game.l.life=game.l.P.life;game.Ms('life');assert.match(message,/đã đầy|đang được hồi phục/);
 supplies.reset();supplies.buy('life:0',1);supplies.select('life','life:1');game.l.life=1;game.Ms('life');assert.match(message,/loại thuốc đang chọn/);assert.match(message,/Vẫn còn 1/);
 supplies.reset();game.Ms('life');assert.match(message,/Đã hết thuốc máu/);assert.match(message,/0\/60/);
});
