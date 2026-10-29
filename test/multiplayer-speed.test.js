const {test}=require('node:test'),assert=require('node:assert/strict');
const native=require('../src/server/multiplayer/definitions/runtime.cjs'),catalog=require('../src/server/multiplayer/definitions/catalog.cjs');
const rules=require('./fixtures/native-speed.json');
test('online speed curves match native reference phases without a second balance table',()=>{
 assert.deepEqual(native.buildCharacter({fac:'vo0',lvl:1}).timing.config,rules);
 assert.equal(rules.run.distanceScale,1.15);assert.equal(rules.attack.referenceFrames,20);assert.equal(rules.attack.phases.find(p=>p.minPercent===100).fps,25);
});
test('every faction uses native attack cycles and explicit skill cooldowns, including all buff variants',()=>{
 for(const fac of ['shaolin','tianwang','tangmen','wudu','emei','cuiyan','gaibang','tianren','wudang','kunlun']){
  const profile=native.withProgression({fac,lvl:150},s=>{s.o.sk=Object.fromEntries(s.I[fac].skills.filter(id=>s.T[id]?.tier!==120).map(id=>[id,1]));return s.o;});
  const dto=catalog.character(profile);
  const variants=[{active:[],profile:dto},...dto.support.variants];
  for(const variant of variants){
   const auras=dto.support.skills.filter(s=>s.aura).map(s=>s.id);
   const built=native.buildCharacter(profile,variant.active.filter(id=>!auras.includes(id)),variant.active.filter(id=>auras.includes(id)));
   for(const [index,skill]of built.skills.entries()){
    const actual=variant.profile.skills.find(s=>s.id===skill.id);assert.ok(actual);
    assert.equal(actual.cooldown,Math.max(skill.cd||0,built.attackTimings[index].cycleSeconds));
    assert.equal(actual.attackPercent,100*(skill.rawRate??skill.rate??1));
   }
  }
 }
});
