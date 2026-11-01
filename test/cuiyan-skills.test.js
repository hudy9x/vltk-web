const { test } = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../src/server/multiplayer/definitions/catalog.cjs');
const native = require('../src/server/multiplayer/definitions/runtime.cjs');

test('online Ice Peacock exports three full-damage blades and preserves native damage and removes full-strength splash', () => {
  const raw = {fac:'cuiyan',lvl:150,slots:[1063],sk:{1063:25},eq:{weapon:{d:0,k:1,lvl:1,nat:0,g:0,base:[],mag:[]}}};
  const resolved = native.buildCharacter(raw);
  const primary = resolved.skills.find(skill => skill.id === 1063);
  const online = catalog.character(raw, [], false).skills.find(skill => skill.id === 1063);
  assert.ok(primary && online);
  assert.equal(online.missiles, 3);
  assert.deepEqual(online.parts, ['phys','poison','cold','fire','light'].map(key => primary.parts[key] || 0));
  assert.ok(online.parts[0] > 0 && online.parts[2] > 0);
  assert.equal(online.projectile.area, 0);
});

test('approved level-28 Ice Peacock balance retains support and reaches the estimated 4104 non-critical hit',()=>{
  const result=native.withProgression({fac:'cuiyan',lvl:200},s=>{
    const stats={...s.j0(),wmin:500,wmax:500,physPct:0,add:{},enh:{},skillBonus:{1063:284},seriesSkill:0,skillEnh:0,dmgMul:1};
    const row=s.T[1063],ability=s.F2(stats,row,28);
    return {physical:s.b0(row,'physicsenhance_p',28)[0],cold:s.b0(row,'colddamage_v',28),parts:ability.parts,
      level25:s.b0(row,'physicsenhance_p',25)[0],range:ability.rad,cost:ability.cost};
  });
  assert.equal(result.physical,250);assert.deepEqual(result.cold,[400,0,600]);
  assert.equal(result.level25,232);assert.equal(result.range,512);assert.equal(result.cost,83);
  assert.equal(result.parts.phys,6720);assert.equal(result.parts.cold,1920);
  assert.ok(Math.abs((result.parts.phys+result.parts.cold)*.475-4104)<1e-6);
});
