const {test}=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
const vm=require('node:vm'),fs=require('node:fs');
test('potion debits survive out of order delivery and retries without double consumption',()=>{
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT,PRIMARY KEY(account_id,key))');
  db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('a','jxidle',JSON.stringify({fac:'vo0',lvl:1,potStock:{life:{1:4}}}));
  const store=createCharacters(db),apply=(id,spent)=>store.apply({id,account:'a',slot:0,xp:0,gold:0,potion:{id:1,spent}});
  apply('123-3-2',3);apply('123-1-2',1);apply('123-3-2',3);
  let p=store.read('a',0).profile;assert.equal(p.potStock.life[1],1);assert.equal(p.potUsed,3);
  apply('123-4-2',4);assert.equal(store.read('a',0).profile.potStock.life[1],0);
  assert.throws(()=>apply('123-5-2',5));assert.equal(store.read('a',0).profile.potUsed,4);
  db.close();
});
test('trusted catalog supplies stock, minimum levels and native weapon leech',()=>{
  const p=catalog.character({fac:'vo0',lvl:1,potStock:{life:{1:3},mana:{1:2},both:{1:1}}});
  assert.deepEqual(p.potions.filter(x=>x.count).map(x=>[x.id,x.count]),[[1,3],[101,2],[201,1]]);
  assert.ok(p.potions.find(x=>x.id===201).hp>0&&p.potions.find(x=>x.id===201).mp>0);
  const profile={fac:'tangmen',lvl:150,skillRoute:'knife',slots:[339],sk:{45:20,50:20,249:20,339:20},eq:{weapon:{d:1,k:1,g:0,nat:0,lvl:1,base:[],magic:[]}}};
  const data={window:{}};vm.runInNewContext(fs.readFileSync('public/data.js','utf8'),data);
  profile.eq.weapon.mag=[{a:data.window.JX.attr.indexOf('stealmanaenhance_p'),p:[8,0,0]}];
  const native=require('../src/server/multiplayer/definitions/runtime.cjs').buildCharacter(profile);
  const dto=catalog.character(profile);
  assert.equal(dto.skills.find(s=>s.id===339).manaLeech,8);
  for(const s of native.skills){const actual=dto.skills.find(x=>x.id===s.id);
    assert.equal(actual.manaLeech,((s.basic||s.wpn)?native.stats.manaLeech||0:0)+(s.skMLeech||0));}
});
test('online potion input never mutates local HP/MP or consumes local inventory',()=>{
  const sent=[],scope={o:{lvl:1,potOff:true,potStock:{life:{1:2}},potSlot:['auto','auto']},l:{life:20,mana:30,P:{life:200,mana:100}},
    S:{potions:[{kind:'life',tier:1,total:100}]},be:{1:1},k(){}};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/consumables.js','utf8'),scope);
  assert.ok(scope.OnlineConsumables.use('life',(kind,value)=>(sent.push({kind,...value}),1)));
  assert.deepEqual(sent,[{kind:7,skill:1}]);assert.equal(scope.l.life,20);assert.equal(scope.o.potStock.life[1],2);
  assert.equal(scope.OnlineConsumables.use('life',()=>1),false,'local cooldown prevents spam');
  scope.OnlineConsumables.received({id:1,skill:1,value:1});assert.equal(scope.o.potStock.life[1],1);
});
