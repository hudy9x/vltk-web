const {test}=require('node:test');
const assert=require('node:assert/strict');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');

const pairs=[[1058,322,1],[1059,323,3],[1060,325,4]];
test('three Tianwang 150 skills inherit only attack cadence and missile speed from their matching 8x weapons',()=>{
  const results=native.withProgression({fac:'tianwang',lvl:200},s=>pairs.map(([id,reference])=>{
    const stats={...s.j0(),wmin:500,wmax:500,physPct:0,skillBonus:{},seriesSkill:0,skillEnh:0,dmgMul:1,add:{},enh:{}};
    return {id,levels:[1,20,25,28].map(level=>{
      const skill=s.F2(stats,s.T[id],level),old=s.F2(stats,s.T[reference],level);
      return {rate:skill.rawRate,referenceRate:old.rawRate,cycle:s.actorAttackTiming(s.v,skill).cycleSeconds,
        referenceCycle:s.actorAttackTiming(s.v,old).cycleSeconds,speed:s.b0(s.T[id],'missle_speed_v',level)[0],
        referenceSpeed:s.b0(s.T[reference],'missle_speed_v',level)[0],parts:skill.parts,crit:skill.crit,cost:skill.cost,range:skill.rad,geo:skill.geo};
    })};
  }));
  const unchanged={1058:{damage:4325,crit:39,cost:41},1059:{damage:4735,crit:68,cost:47},1060:{damage:4560,crit:39,cost:115}};
  for(const result of results){
    for(const level of result.levels){
      assert.equal(level.rate,level.referenceRate);assert.equal(level.cycle,level.referenceCycle);assert.equal(level.speed,level.referenceSpeed);
      if(result.id===1058)assert.equal(level.range,480);
      assert.equal(level.geo,null,'inherit timing without copying legacy burst geometry');
    }
    const level25=result.levels[2],expected=unchanged[result.id];
    assert.equal(level25.parts.phys,expected.damage);assert.equal(level25.crit,expected.crit);assert.equal(level25.cost,expected.cost);
  }
});

test('authoritative online profiles share the 8x speed and cap Hao Hung flight to range 480',()=>{
  for(const [id,reference,weapon] of pairs){
    const raw={fac:'tianwang',lvl:200,slots:[id,reference],sk:{[id]:25,[reference]:20},
      eq:{weapon:{d:0,k:weapon,lvl:1,nat:0,g:0,base:[],mag:[]}}};
    const dto=catalog.character(raw,[],false),skill=dto.skills.find(skill=>skill.id===id),old=dto.skills.find(skill=>skill.id===reference);
    assert.ok(skill&&old);assert.equal(skill.attackPercent,old.attackPercent);assert.equal(skill.cooldown,old.cooldown);
    assert.equal(skill.projectile.speed,native.contactGeometry(native.buildCharacter(raw).skills.find(skill=>skill.id===reference)).speed);
    if(id===1058){assert.equal(skill.accuracy,undefined);assert.equal(skill.projectile.area,0);assert.equal(skill.projectile.pierce,false);assert.equal(skill.range,480);assert.ok(Math.abs(skill.projectile.range-480*.81)<1e-6);}
  }
});
