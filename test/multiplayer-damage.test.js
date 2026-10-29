const {test}=require('node:test'),assert=require('node:assert/strict');
const cases=require('./fixtures/multiplayer-damage.json'),reference=require('./fixtures/native-damage.cjs');
test('shared Rust damage vectors remain equal to native ja and hs modifiers',()=>{
 for(const c of cases)assert.deepEqual(reference(c),c.expected,c.name);
});
test('150 skill synergy patches survive standard-table initialization',()=>{
 const native=require('../src/server/multiplayer/definitions/runtime.cjs');
 const profile={fac:'cuiyan',lvl:151,sk:{99:19,108:20,336:20,1063:25},eq:{weapon:{d:0,k:1,lvl:10,g:0,n:'Fixture',base:[],mag:[]}}};
 const {stats,skills}=native.buildCharacter(profile);
 assert.ok(stats.skillBonus[1063]>0,'90/basic skills enhance the 150 attack');
 const skill=skills.find(s=>s.id===1063);assert.ok(skill);
 assert.equal(skill.tot,Object.values(skill.parts).reduce((a,b)=>a+b,0));
});
