const {test}=require('node:test');
const assert=require('node:assert/strict');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');

const pairs=[[1058,322,1],[1059,323,4],[1060,325,3]];
test('Hao Hung caps combined critical chance without changing the other Tianwang attacks',()=>{
  const rows=native.withProgression({fac:'tianwang',lvl:200},s=>{
    const stats={...s.j0(),wmin:500,wmax:500,physPct:0,skillBonus:{},seriesSkill:0,skillEnh:0,dmgMul:1,add:{},enh:{}};
    return [0,20,43,44,75].map(crit=>pairs.map(([id])=>s.F2({...stats,crit},s.T[id],25)));
  });
  for(const [index,crit] of [0,20,43,44,75].entries()){
    const [sword,hammer,spear]=rows[index];
    assert.equal(sword.crit,Math.min(75,crit+32));
    assert.equal(sword.rad,480);assert.equal(sword.parts.phys,2625);
    assert.equal(hammer.crit,crit+53);assert.equal(spear.crit,crit+32);
    // DPS shown by the optimizer must use the same capped chance as combat.
    assert.ok(Math.abs(sword.dps-rows[0][0].dps*(1+sword.crit/100)/1.32)<1e-6);
  }
});

test('online Hao Hung profile caps the real passive plus skill critical chance at 75 percent',()=>{
  const profile={fac:'tianwang',lvl:200,main:1058,slots:[1058],sk:{24:20,36:30,1058:25},
    eq:{weapon:{d:0,k:1,lvl:10,base:[],mag:[]}}};
  const built=native.buildCharacter(profile),skill=built.skills.find(skill=>skill.id===1058);
  assert.ok(built.stats.crit+32>75,'passive plus skill exceeded the new cap');
  assert.equal(skill.crit,75);
  const online=catalog.character(profile,[],false).skills.find(skill=>skill.id===1058);
  assert.equal(online.crit,75);assert.equal(online.range,480);
  assert.equal(online.parts[0],skill.parts.phys);
});

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
  const unchanged={1058:{damage:2625,crit:32,cost:41},1059:{damage:2890,crit:53,cost:47},1060:{damage:2915,crit:32,cost:115}};
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
    const dto=catalog.character(raw,[],false),skill=dto.skills.find(skill=>skill.id===id),old=catalog.character({...raw,eq:{weapon:{...raw.eq.weapon,k:id===1059?3:id===1060?4:1}}},[],false).skills.find(skill=>skill.id===reference);
    assert.ok(skill&&old);assert.equal(skill.attackPercent,old.attackPercent);assert.equal(skill.cooldown,old.cooldown);
    assert.equal(skill.projectile.speed,native.contactGeometry(native.buildCharacter({...raw,eq:{weapon:{...raw.eq.weapon,k:id===1059?3:id===1060?4:1}}}).skills.find(skill=>skill.id===reference)).speed);
    if(id===1058){assert.equal(skill.accuracy,undefined);assert.equal(skill.projectile.area,0);assert.equal(skill.projectile.pierce,false);assert.equal(skill.range,480);assert.ok(Math.abs(skill.projectile.range-480*.81)<1e-6);}
  }
});


test('Tianwang reference level 20 and equipment growth stay bounded in shared formulas',()=>{
  const profiles=native.withProgression({fac:'tianwang',lvl:200},s=>[1058,1059,1060].map(id=>{
    const skill=s.T[id];
    const keys=['physicsenhance_p','deadlystrike_p',...(id===1059?['ignoredefense_p']:[]),...(id===1060?['attackrating_p']:[])];
    return {id,weapon:s.j1(skill),levels:[20,25,29,35,36,45].map(level=>({level,
      range:s.b0(skill,'skill_attackradius',level)[0],
      values:keys.map(key=>s.b0(skill,key,level)[0])}))};
  }));
  const expected={
    1058:[[405,30],[425,32],[441,33],[466,35]],
    1059:[[455,50,90],[478,53,95],[496,55,98],[523,58,99]],
    1060:[[460,30,800],[483,32,840],[501,33,872],[529,35,920]],
  };
  for(const profile of profiles){
    assert.equal(profile.weapon,{1058:1,1059:4,1060:3}[profile.id]);
    assert.deepEqual(profile.levels[0].values,expected[profile.id][0]);
    for(const [index,row] of profile.levels.entries()){
      assert.equal(row.range,profile.id===1058?480:180);
      assert.deepEqual(row.values,expected[profile.id][Math.min(index,3)]);
    }
  }
});
