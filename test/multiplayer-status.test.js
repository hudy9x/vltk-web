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
