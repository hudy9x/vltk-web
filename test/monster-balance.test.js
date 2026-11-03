const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {buildSync}=require('esbuild');
const vm=require('node:vm');
const {validateMonsterBalance,resolveMonsterBalance}=require('../src/client/maps/monster-balance.ts');
const {monsterDefinition}=require('../src/server/multiplayer/definitions/monster-balance.cjs');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const {createCharacters}=require('../src/server/multiplayer/persistence/characters.ts');
const base=()=>({hp:1000,damage:100,defense:50,speed:54,res:[10,20,30,40,50],xp:220000,
  attack:{element:'cold',range:200,cooldown:2},growth:{hp:100,damage:5,defense:2,xp:1000}});
function parser(){const module={exports:{}};vm.runInNewContext(buildSync({entryPoints:['src/client/maps/validate.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,{module,exports:module.exports,structuredClone});return module.exports;}
test('configured monsters scale from the first level; zero XP stays zero and inputs remain immutable',()=>{
  const p=base(),r=resolveMonsterBalance(p,150,159);assert.equal(r.hp,1900);assert.equal(r.damage,145);assert.equal(r.xp,229000);assert.deepEqual(r.res,p.res);assert.equal(p.xp,220000);
  p.xp=0;p.growth.xp=0;assert.equal(resolveMonsterBalance(p,150,159).xp,0);
  for(const mutate of [p=>p.xp=-1,p=>p.xp=.5,p=>p.hp=NaN,p=>p.res=[1],p=>p.attack.cooldown=0,p=>p.attack.element='unknown',p=>p.growth.xp=.5]){const p=base();mutate(p);assert.throws(()=>validateMonsterBalance(p));}
  const overflow=base();overflow.xp=1e8;assert.throws(()=>resolveMonsterBalance(overflow,150,159));
});
test('encounter JSON validates custom profiles, references and growth while accepting every existing profile',()=>{
  const {parseEncounterDefinition}=parser();const profiles=require('../src/client/gameplay/encounters/catalog.json');profiles.forEach(parseEncounterDefinition);
  const profile=structuredClone(profiles[0]);profile.monsterProfiles={[profile.monsterIds[0]]:base()};parseEncounterDefinition(profile);
  profile.monsterProfiles[profile.monsterIds[0]].growth.xp=1e8;assert.throws(()=>parseEncounterDefinition(profile));
});
test('the real native catalog builds configured monster HP, resistance, attack and EXP; SQLite persists that reward once',()=>{
  const source=native.catalog(),id=34,profile={levelRange:[150,159],monsterProfiles:{[id]:base()}};
  const m=monsterDefinition(native,source,profile,id,'normal',155);assert.equal(m.hp,1500);assert.equal(m.damage,125);assert.equal(m.xp,225000);assert.deepEqual(m.res,[10,20,30,40,50]);assert.deepEqual(m.attack,base().attack);
  const legacy=monsterDefinition(native,source,{},id,'normal',150);assert.equal(legacy.hp,native.monsterStats(150).hp);assert.equal(legacy.xp,750);assert.equal(legacy.attack,undefined);
  const db=new DatabaseSync(':memory:');try{db.exec('CREATE TABLE account_storage(account_id TEXT,key TEXT,value TEXT)');db.prepare('INSERT INTO account_storage VALUES(?,?,?)').run('one','jxidle',JSON.stringify({fac:'vo0',lvl:150,xp:0,gold:0,attrPts:0,skPts:0}));const store=createCharacters(db),grant={id:'900-1-1-0',account:'one',slot:0,xp:m.xp,gold:0};store.apply(grant);store.apply(grant);assert.equal(store.read('one',0).profile.xp,225000);assert.equal(store.read('one',0).revision,1);}finally{db.close();}
});

test('configured local/SIM direct hits match authoritative armor, resistance and mana shielding',()=>{
  const {configuredMonsterHit}=require('../src/client/maps/monster-balance.ts');
  assert.deepEqual(configuredMonsterHit(100,'cold',{def:100,res:{cold:50},mana:30},200,30),{amount:50,mana:30,reflected:0});
  assert.equal(configuredMonsterHit(100,'phys',{def:100,res:{phys:0}},200,0).amount,50);
  assert.deepEqual(configuredMonsterHit(100,'fire',{res:{fire:0},mana:50,manaShield:50,retMelee:10,retMeleeP:20},200,50),{amount:50,mana:0,reflected:20});
  assert.equal(configuredMonsterHit(100,'cold',{res:{cold:50}},10,0).amount,10);
});
test('configured monster XP bypasses legacy multipliers while legacy sources keep their formula',()=>{
  const fs=require('fs'),source=fs.readFileSync('src/client/core/state-and-save-02.js','utf8');
  const scope={o:{lvl:150,xp:0},G2:()=>200,ye:100,mo:()=>({xp:.5}),Lt:()=>0,l:{P:{expPct:20}},S:{exp:Array(200).fill(1e12)}};
  vm.createContext(scope);vm.runInContext(source.slice(source.indexOf('var d8 ='),source.indexOf('\nvar lD =')),scope);
  assert.equal(scope.d8(220000,true),220000);assert.equal(scope.o.xp,220000);
  assert.equal(scope.d8(100),17000);assert.equal(scope.o.xp,237000);
});

test('overlapping configured spawns keep independent identities and selected levels',()=>{
  const module={exports:{}};vm.runInNewContext(buildSync({entryPoints:['src/client/maps/spawn/generation.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,{module,exports:module.exports});
  const profile={id:'range',bossId:34,monsterIds:[34],levelRange:[150,159],monsterProfiles:{34:base()}};
  const map={id:1,size:{width:500,height:500},spawnMode:'fixed',spawns:[{id:'a',position:{x:100,y:100},rank:'normal',encounterId:'range',initialDelaySeconds:0,level:155},{id:'b',position:{x:100,y:100},rank:'normal',encounterId:'range',initialDelaySeconds:0,level:159}]};
  const points=module.exports.generateFieldPoints({canStand:()=>true},{},{},[1,1],()=>false,()=>.5,map,()=>profile);
  assert.deepEqual(Array.from(points,p=>[p.spawnId,p.level]),[['a',155],['b',159]]);
});
