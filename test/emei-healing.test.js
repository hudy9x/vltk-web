const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {loadCombatEngine}=require('./helpers/combat-engine');
const {compileTypeScriptEntry}=require('../tools/build-app');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
const rows=require('./fixtures/emei-healing.json');
function fixture(alignment='chinh',team){
 const source={x:300,y:300,hp:100,max:10000,generation:1},target={x:500,y:300,hp:10000};
 const s={Math,Set,Map,performance:{now:()=>0},l:{life:100,deadT:0,P:{life:10000},zoneShown:1,fx:[],quiet:true},v:source,
  activeCombatCast:null,K3:18,QA:.81,Hi:{cold:'#fff'},Z0:{g:false},G3(){},x8(){},Y3:(x,y)=>Math.atan2(y,x),R2:()=>true,mt:()=>true,_1:()=>[],o:{fac:'emei'},Kh:()=>alignment};
 const recipients=[];
 function add(x,y,color=alignment,side=team,hp=100){const entity={x,y,hp,max:10000};recipients.push({entity,alignment:color,team:side,alive:()=>entity.hp>0,heal:n=>{entity.hp=Math.min(entity.max,entity.hp+n);}});return entity;}
 recipients.push({entity:source,alignment,team,alive:()=>source.hp>0,heal:n=>{source.hp=Math.min(source.max,source.hp+n);}});
 s.arenaSimulator={healingRecipients:()=>recipients};vm.createContext(s);loadCombatEngine(s,{bridge:false});
 vm.runInContext(compileTypeScriptEntry('combat/emei-healing.ts','EmeiHealing').code,s);
 function cast(level=20){return s.CombatEngine.queueSkillContact(source,target,{id:1114,L:level,parts:{cold:450},rad:470,melee:false},()=>{}, {windup:0,targets:()=>[],visual(){}});}
 function advance(seconds,dt=.05){for(let t=0;t<seconds-1e-8;t+=dt)s.CombatEngine.advanceSkillContacts(Math.min(dt,seconds-t));}
 return {s,source,target,add,cast,advance};
}
test('1115 uses the approved native formula and leaves 1114 damage, mana and contact geometry unchanged',()=>{
 for(const row of rows){
  const actual=catalog.character(row.profile,[],false).skills.find(s=>s.id===1114);assert.deepEqual(actual,row.skill);
  const original=native.buildCharacter(row.profile).skills.find(s=>s.id===1114);
  assert.deepEqual(actual.parts,['phys','poison','cold','fire','light'].map(k=>original.parts[k]||0));assert.equal(actual.cost,original.cost);
  const {s}=fixture();assert.equal(s.EmeiHealing.emeiHealingAmount(row.level),actual.healing||0);
 }
});
test('1115 heals once at frame 20, uses the fixed visual anchor and enforces the exact 200 radius',()=>{
 for(const dt of [.01,.1,.7]){
  const f=fixture(),inside=f.add(699,300),edge=f.add(700,300),outside=f.add(700.01,300),vertical=f.add(500,400),beyond=f.add(500,400.01),late=f.add(750,300);
  f.cast();f.advance(1);assert.equal(inside.hp,100);f.target.x=900;
  f.advance(.2,dt);for(const ally of [inside,edge,vertical])assert.equal(ally.hp,1675);for(const other of [outside,beyond,late])assert.equal(other.hp,100);
  late.x=500;f.advance(2,dt);assert.equal(inside.hp,1675);assert.equal(late.hp,100,'no persistent healing field');
 }
});
test('all three name colors heal their own group; battlefield camps override color and include soldiers',()=>{
 for(const color of ['chinh','trung','ta']){const f=fixture(color),ally=f.add(500,300),enemy=f.add(500,300,color==='ta'?'chinh':'ta'),dead=f.add(500,300,color,undefined,0);f.cast();f.advance(1.2);assert.equal(ally.hp,1675);assert.equal(enemy.hp,100);assert.equal(dead.hp,0);}
 const f=fixture('chinh','song'),soldier=f.add(500,300,'tan','song'),sim=f.add(500,300,'ta','song'),enemy=f.add(500,300,'chinh','jin');f.cast();f.advance(1.2);assert.equal(soldier.hp,1675);assert.equal(sim.hp,1675);assert.equal(enemy.hp,100);
});
test('level gate, independent casts, entrants, deaths, map changes and cancelled SIMs are respected',()=>{
 const f=fixture(),ally=f.add(900,300);f.cast(9);f.advance(2);assert.equal(ally.hp,100);
 f.cast(10);ally.x=500;f.advance(1.2);assert.equal(ally.hp,991);
 f.cast();f.cast();f.advance(1.2);assert.equal(ally.hp,4141);
 f.cast();f.source.generation++;f.advance(1.2);assert.equal(ally.hp,4141);
 f.cast();f.s.l.zoneShown=2;f.advance(1.2);assert.equal(ally.hp,4141);
 f.cast();f.source.hp=0;f.advance(1.2);assert.equal(ally.hp,4141);
});

test('multiple healers each contribute one independent heal and respect maximum HP',()=>{
 const f=fixture(),second=f.add(500,300),ally=f.add(500,300);ally.max=3000;
 f.cast();f.s.CombatEngine.queueSkillContact(second,f.target,{id:1114,L:20,parts:{cold:450}},()=>{}, {windup:0,targets:()=>[],visual(){}});
 f.advance(1.2);assert.equal(ally.hp,3000);assert.equal(second.hp,3250);
 f.advance(3);assert.equal(second.hp,3250);
});

test('online cosmetic replays never schedule or apply local healing',()=>{
 const f=fixture(),ally=f.add(500,300);f.s.skillVisualContext={actor:f.source};f.cast();f.advance(2);assert.equal(ally.hp,100);assert.equal(f.s.l.emeiHeals?.length||0,0);
 f.s.skillVisualContext=null;f.cast();f.s.skillVisualContext={actor:f.source};f.advance(2);assert.equal(ally.hp,100);
});
