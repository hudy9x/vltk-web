const {test}=require('node:test');
const assert=require('node:assert/strict');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');

test('stationary advanced attacks export final impact radius independently of cast range',()=>{
 for(const [fac,id]of [['kunlun',1081],['gaibang',1078],['wudang',1076]]){
  const p={fac,lvl:158,sk:{[id]:25},eq:{}};
  const skill=native.buildCharacter(p).skills.find(s=>s.id===id);
  const resolved=catalog.character(p).skills.find(s=>s.id===id);
  assert.equal(native.contactGeometry(skill).geometry.r,150,String(id));
  assert.equal(resolved.radius,150*.81);
  assert.equal(resolved.range,skill.rad,'cast range must not shrink to the impact radius');
  assert.equal(resolved.projectile,null,'stationary fields do not become travelling missiles');
 }
});

test('trusted catalog carries the client ellipse constants to every supported loadout',()=>{
 const actual=catalog.character({fac:'kunlun',lvl:158,sk:{171:20,173:20,375:20,1081:25},eq:{}});
 for(const profile of [actual,...actual.support.variants.map(v=>v.profile)])for(const skill of profile.skills){
  assert.equal(skill.geometry.scale,.81);
  assert.equal(skill.geometry.castYRatio,.6);
  assert.ok(skill.geometry.impactYScale>0);
 }
});


test('Thiết Liên shares a fixed 45px impact radius with the online catalog while keeping cast reach',()=>{
 const skill=native.withProgression({fac:'tangmen',lvl:200},s=>s.F2(s.j0(),s.T[1070],25));
 const contact=native.contactGeometry(skill);
 assert.ok(Math.abs(contact.geometry.r*contact.scale-45)<1e-8);
 assert.equal(contact.impactOffsetY,-12);
 assert.equal(contact.impactYScale,45/25);
 assert.equal(skill.rad,512);
 const {linearProjectile}=require('../src/server/multiplayer/definitions/projectiles.cjs');
 assert.equal(linearProjectile(skill,contact),null);
 const character=require('../src/server/multiplayer/definitions/battlefield.cjs').definition().templates.find(t=>t.faction==='tangmen');
 const exported=character.profile.skills.find(s=>s.id===1070);
 assert.ok(Math.abs(exported.radius-45)<1e-8);
 assert.equal(exported.geometry.impactOffsetY,-12);
 assert.equal(exported.geometry.impactYScale,45/25);
 assert.equal(exported.range,512);
});
