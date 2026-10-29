const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),esbuild=require('esbuild');
const balance=require('../src/shared/combat-balance.json');
test('online PvP and Tong Kim share the same 20 percent balance source',()=>{
  const code=esbuild.buildSync({entryPoints:['src/client/simulator/balance.ts'],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text;
  const s={module:{exports:{}},exports:{}};vm.runInNewContext(code,s);
  assert.equal(s.module.exports.BATTLEFIELD_PVP_DAMAGE,balance.battlefieldPvpDamage);assert.equal(balance.battlefieldPvpDamage,.2);
});
test('mouse targets only other canonical colors; a farmer can retaliate against PK',()=>{
  const s={o:{mode:'farm'},l:{town:false},GameWebTransport:{newer:(a,b)=>(a-b|0)>0}};
  vm.runInNewContext(fs.readFileSync('src/client/multiplayer/state/pvp.js','utf8'),s);
  const state={self:1,ack:0,actors:[{id:1,hp:100,alignment:0,pk:false},{id:2,x:100,y:100,hp:100,alignment:1,pk:true},{id:3,x:110,y:100,hp:100,alignment:0,pk:true}]};
  assert.deepEqual(Array.from(s.OnlinePvp.targets(state),p=>p.id),[2]);assert.equal(s.OnlinePvp.pick(state,100,78).id,2);
  s.l.town=true;assert.equal(s.OnlinePvp.targets(state).length,0);s.l.town=false;state.actors[1].pk=false;
  assert.equal(s.OnlinePvp.targets(state).length,0);state.actors[0].pk=true;assert.equal(s.OnlinePvp.targets(state).length,1);
  const commands=[];s.OnlinePvp.select(true,(kind,payload)=>(commands.push({kind,...payload}),5));assert.equal(s.o.mode,'slaughter');
  s.OnlinePvp.sync({...state,ack:4},()=>0);assert.equal(s.o.mode,'slaughter');
  assert.deepEqual(commands,[{kind:10,target:1}]);s.OnlinePvp.select(false,()=>6);assert.equal(s.o.mode,'farm');
});
test('canonical alignment matches the existing name palette, rather than element or appearance',()=>{
  const c=require('../src/server/multiplayer/definitions/catalog.cjs');
  const resolved=fac=>c.character({fac,lvl:1}).alignment;
  assert.equal(resolved('shaolin'),resolved('wudang'));assert.equal(resolved('shaolin'),resolved('gaibang'));
  assert.equal(resolved('cuiyan'),resolved('kunlun'));assert.equal(resolved('cuiyan'),resolved('tangmen'));
  assert.equal(resolved('wudu'),resolved('tianren'));assert.notEqual(resolved('shaolin'),resolved('cuiyan'));
});
