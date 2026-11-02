const {test}=require('node:test');
const assert=require('node:assert/strict');
const native=require('../src/server/multiplayer/definitions/runtime.cjs');
const catalog=require('../src/server/multiplayer/definitions/catalog.cjs');

test('Beggar multi-hit changes preserve native per-projectile damage, critical chance, speed, range and mana',()=>{
  const actual=native.withProgression({fac:'gaibang',lvl:200},s=>[1073,1074].map(id=>{
    const stats={...s.j0(),wmin:500,wmax:500,physPct:0,add:{},enh:{},skillBonus:{},seriesSkill:0,skillEnh:0,dmgMul:1,crit:0};
    return {id,levels:[1,25,28].map(level=>{
      const a=s.F2(stats,s.T[id],level);
      return {parts:a.parts,crit:a.crit,cost:a.cost,rate:a.rawRate,range:a.rad,nMis:a.nMis};
    })};
  }));
  // Captured with the same character before changing projectile counts.
  const before={
    1073:[{parts:{fire:24},cost:12,range:448},{parts:{fire:3528},cost:111,range:512},{parts:{fire:4176},cost:111,range:512}],
    1074:[{parts:{phys:550,fire:60},cost:20,range:448},{parts:{phys:2005,fire:523.5},cost:65,range:512},{parts:{phys:2260,fire:612},cost:65,range:512}],
  };
  for(const result of actual)for(const [i,a] of result.levels.entries()){
    assert.deepEqual(a.parts,before[result.id][i].parts);
    assert.equal(a.crit,0);assert.equal(a.cost,before[result.id][i].cost);assert.equal(a.range,before[result.id][i].range);
    assert.equal(a.rate,result.id===1073?.9:1);assert.equal(a.nMis,result.id===1073?2:3);
  }
});

test('online Beggar profiles export exactly two heads or three staffs without scaling their damage parts',()=>{
  for(const id of [1073,1074]){
    const raw={fac:'gaibang',lvl:200,slots:[id],sk:{[id]:25},
      eq:{weapon:{d:0,k:2,lvl:1,nat:0,g:0,base:[],mag:[]}}};
    const original=native.buildCharacter(raw).skills.find(s=>s.id===id);
    const online=catalog.character(raw,[],false).skills.find(s=>s.id===id);
    assert.ok(original&&online);assert.equal(online.missiles,id===1073?2:3);
    assert.deepEqual(online.parts,['phys','poison','cold','fire','light'].map(k=>original.parts[k]||0));
    assert.equal(online.crit,original.crit);assert.equal(online.cost,original.cost);assert.equal(online.range,original.rad);
    assert.equal(online.projectile.pierce,id===1073);assert.equal(online.projectile.homing,id===1074);
    assert.equal(online.projectile.speed,id===1073?720:432);
    assert.equal(online.projectile.area,id===1074?96*.81:0);
  }
});
