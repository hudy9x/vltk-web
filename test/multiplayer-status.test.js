const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function view(){
 const labels=[];
 const s={window:{},OnlineSkillVisuals:()=>({sync(){},play(){},advance(){},reset(){}}),
  GameWebTransport:{newer:(a,b)=>a>b,LocalMotion:class{receive(){}step(){}clear(){}}},
  l:{enemies:[],clock:0,P:{},fx:[],txt:[],town:false},v:{},o:{ctrl:'manual'},Z0:{key:140},E0:{town:{id:1}},
  r0:{34:{n:'Fixture',sz:1,run:6}},us:{normal:{r:17}},j2:()=>0,
  advanceConsumableCooldowns(){},mapNavigation:{beginTick(){}},Ra:()=>1,performance,
  clearTimeout,showDamageNumber:(...args)=>labels.push(args),ps:(actor,act)=>{actor.act=act;actor.actT=0;}};
 vm.createContext(s);vm.runInContext(fs.readFileSync('src/client/multiplayer/state/legacy-pve.js','utf8'),s);
 s.onlineWorld.bind({authoritative:true});
 const monster={id:2,definition:34,life:0,x:100,y:100,hp:100,maxHp:100,level:1,cold:0,stun:0,poison:0,coldPower:0,dir:0,moving:false};
 const packet=(m=monster,events=[])=>s.onlineWorld.snapshot({self:1,map:140,ack:1,actors:[{id:1,hp:100,mp:20,maxHp:100,maxMp:20,farming:false}],monsters:[{...m}],loot:[],events});
 return {s,labels,monster,packet};
}
test('new monsters and respawns appear at authoritative position without corpse-to-spawn interpolation',()=>{
 const f=view();f.packet();let actor=f.s.l.enemies[0];assert.equal(actor.x,100);
 f.packet({...f.monster,x:500,hp:0});f.s.onlineWorld.simulate(.016);
 actor.act='hurt';actor.hitT=1;actor.stun=1;
 f.packet({...f.monster,life:1,x:200});
 assert.equal(actor.x,200);assert.equal(actor._netX,200);assert.equal(actor.act,'st');assert.equal(actor.hitT,0);
 // No dead frame arrives: incarnation still prevents sliding after packet loss.
 f.packet({...f.monster,life:2,x:700});assert.equal(actor.x,700);
});
test('ordinary movement stays interpolated and status state comes from Rust',()=>{
 const f=view();f.packet();f.packet({...f.monster,x:110,cold:2,coldPower:.6,stun:1,poison:3,moving:true});
 const actor=f.s.l.enemies[0];assert.equal(actor.x,100);assert.equal(actor.slowT,2);assert.equal(actor.slowPower,.6);assert.equal(actor.stun,1);assert.equal(actor.poison,3);
 f.s.onlineWorld.simulate(.016);assert.ok(actor.x>100&&actor.x<110);
 f.packet({...f.monster,x:110});assert.equal(actor.slowT,0);assert.equal(actor.stun,0);assert.equal(actor.poison,0);
});
test('damage labels preserve server element and critical; poison ticks never flinch',()=>{
 const f=view();f.packet();
 const hit=(id,flags)=>({id,source:1,target:2,skill:0,kind:2,value:10,hit:{element:['phys','poison','cold','fire','light'][flags&7],critical:!!(flags&8),hurt:!!(flags&16),dot:!!(flags&32)}});
 f.packet(f.monster,[hit(1,2)]);assert.equal(f.labels[0][2],'cold');
 f.packet(f.monster,[hit(2,8|16)]);assert.equal(f.labels[1][2],'phys');assert.equal(f.labels[1][3],true);assert.equal(f.s.l.enemies[0].act,'hurt');
 f.s.l.enemies[0].act='st';f.s.l.enemies[0].hitT=0;
 f.packet(f.monster,[hit(3,1|32)]);assert.equal(f.labels[2][2],'poison');assert.equal(f.s.l.enemies[0].act,'st');assert.equal(f.s.l.enemies[0].hitT,0);
 f.packet(f.monster,[hit(3,1|32)]);assert.equal(f.labels.length,3,'duplicate WORLD events do not replay damage');
});
test('catalog uses native cold/poison defaults and includes equipment stun modifiers',()=>{
 const native=require('../src/server/multiplayer/definitions/runtime.cjs'),catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
 for(const fac of ['cuiyan','wudu','shaolin']){
  const sk=Object.fromEntries(Object.entries(native.catalog().skills).filter(([,s])=>s.f===fac).map(([id])=>[id,20]));
  const profile={fac,lvl:160,sk,eq:{weapon:{d:0,k:1,lvl:10,g:0,n:'Fixture',base:[],mods:[],magic:[]}}};
  const {stats,skills}=native.buildCharacter(profile),dto=catalog.character(profile);
  assert.ok(skills.length>3);
  for(const skill of skills){
   const actual=dto.skills.find(s=>s.id===skill.id);
   assert.equal(actual.cold,skill.parts.cold>0?(skill.coldT||1.5)+(stats.coldEnh||0)/18:0);
   assert.equal(actual.poison,skill.parts.poison>0?skill.poisonT||3:0);
   assert.equal(actual.stun,Math.max(0,Math.min(100,(skill.stun||0)+(stats.stunAdd||0))));
  }
 }
});

test('online Luc Long keeps two damage numbers when both server hits arrive in one WORLD packet',()=>{
 const f=view();require('./helpers/combat-engine').loadCombatEngine(f.s);
 const hits=[4000,4100].map((value,i)=>({id:i+1,source:1,target:2,skill:1073,kind:2,value,
  hit:{element:'fire',critical:false,hurt:false,dot:false}}));
 f.packet({...f.monster,hp:91900,maxHp:100000},hits);
 const labels=f.s.l.txt.filter(label=>label.target===f.s.l.enemies[0]);
 assert.equal(f.s.l.enemies[0].hp,91900,'HP comes from the authoritative two-hit result');
 assert.equal(labels.length,2,'do not sum both dragon heads into one floating number');
 assert.deepEqual(labels.map(label=>label.amount),[4000,4100]);
 assert.ok(labels.every(label=>label.hits===1));assert.notEqual(labels[0].y,labels[1].y);
 f.packet({...f.monster,hp:91900,maxHp:100000},hits);
 assert.equal(f.s.l.txt.filter(label=>label.target===f.s.l.enemies[0]).length,2,'repeated WORLD packets must not replay hits');
});

test('crowded and low-FX online Beggar hits retain one visible number per validated projectile',()=>{
 for(const id of [1073,1074])for(const lowFx of [false,true]){
  const f=view();require('./helpers/combat-engine').loadCombatEngine(f.s);f.s.o.lowFx=lowFx;
  for(let i=0;i<24;i++)f.s.showDamageNumber({x:i,y:i},1,'fire');
  const count=id===1073?2:3,hits=Array.from({length:count},(_,i)=>({id:i+1,source:1,target:2,skill:id,kind:2,value:4000+i*100,
   hit:{element:'fire',critical:false,hurt:false,dot:false}}));
  f.packet({...f.monster,hp:100000,maxHp:100000},[hits[0]]);
  f.s.CombatEngine.updateDamageLabels(f.s.l.txt,.22);
  f.packet({...f.monster,hp:100000,maxHp:100000},hits.slice(1));
  const labels=f.s.l.txt.filter(label=>label.target===f.s.l.enemies[0]);
  assert.equal(labels.length,count,`${id}/${lowFx}`);
  assert.ok(labels.every(label=>label.hits===1));assert.equal(new Set(labels.map(label=>label.y)).size,count);
 }
});

test('online player targets stack both dragon hits separately rather than painting them at identical coordinates',()=>{
 const f=view();require('./helpers/combat-engine').loadCombatEngine(f.s);f.s.pvpDamageDisplay.set(true);
 const frame=(x,events)=>f.s.onlineWorld.snapshot({self:1,map:140,ack:1,actors:[{id:1,hp:100,mp:20,maxHp:100,maxMp:20,farming:false},
  {id:2,x,y:100,hp:9000,maxHp:10000,battlefieldKind:0}],monsters:[],loot:[],events});
 const hit=id=>({id,source:1,target:2,skill:1073,kind:2,value:4000,hit:{element:'fire',critical:false,hurt:false,dot:false}});
 frame(100,[hit(1),hit(2)]);
 assert.equal(f.s.l.txt.length,2);assert.notEqual(f.s.l.txt[0].y,f.s.l.txt[1].y,'rows must share the same recipient identity');
 assert.equal(f.s.l.txt[0].target,f.s.l.txt[1].target);
 frame(120,[]);f.s.CombatEngine.updateDamageLabels(f.s.l.txt,.016);
 assert.ok(f.s.l.txt.every(label=>label.x===120),'both rows follow the live online target');
});

test('ordinary online damage and poison retain their existing merge policy',()=>{
 for(const [skill,dot,element] of [[321,false,'phys'],[1073,true,'poison']]){
  const f=view();require('./helpers/combat-engine').loadCombatEngine(f.s);
  const hits=[100,200].map((value,i)=>({id:i+1,source:1,target:2,skill,kind:2,value,
   hit:{element,critical:false,hurt:false,dot}}));
  f.packet(f.monster,hits);
  assert.equal(f.s.l.txt.length,1);assert.equal(f.s.l.txt[0].amount,300);assert.equal(f.s.l.txt[0].hits,2);
 }
});

test('online monster hits animate each attack once without turning poison ticks into attacks',()=>{
 const f=view();f.s.v.x=200;f.s.v.y=100;
 f.s.kn=(dx,dy)=>{assert.equal(dx,100);assert.equal(dy,0);return 6;};
 const hit=(id,dot=false)=>({id,source:2,target:1,skill:0,kind:2,value:6,hit:{element:'phys',critical:false,hurt:false,dot}});
 f.packet(f.monster,[hit(1)]);
 const actor=f.s.l.enemies[0];assert.equal(actor.act,'at');assert.equal(actor.dir,6);assert.equal(f.labels[0][1],6);
 actor.actT=.2;f.packet(f.monster,[hit(1)]);assert.equal(actor.actT,.2,'replayed event must not restart attack');assert.equal(actor.dir,6);
 f.packet(f.monster,[hit(2)]);assert.equal(actor.actT,0,'each new attack restarts animation');
 actor.act='st';actor.actT=.3;f.packet(f.monster,[hit(3,true)]);assert.equal(actor.act,'st');assert.equal(actor.actT,.3);
 f.packet({...f.monster,hp:0},[hit(4)]);assert.notEqual(actor.act,'at','dead monsters must not start attacks');
});
