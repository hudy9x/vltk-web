const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const acorn=require('acorn');
function declaration(file,name){
  const source=fs.readFileSync(file,'utf8');
  const node=acorn.parse(source,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));
  return source.slice(node.start,node.end);
}
test('gold loot selects all five tiers at amount boundaries',()=>{
  const scope={};vm.runInNewContext(declaration('src/client/render/arena-02.js','goldLootVisuals'),scope);
  for(const [amount,tier] of [[1,0],[9,0],[10,1],[99,1],[100,2],[1000,2],[9999,2],[10000,3],[99999,3],[100000,4],[500000,4]])assert.equal(scope.goldLootVisuals.tier(amount),tier);
  for(let i=1;i<=5;i++)assert.ok(fs.statSync(`public/img/loot/yuanbao-${i}.png`).size>0);
});
test('higher monster levels no longer halve offline gold at level 119',()=>{
  const scope={Math:Object.assign(Object.create(Math),{random:()=>0}),vp:{normal:1},O6:0.1,E6:actor=>actor.L*10};
  vm.runInNewContext(declaration('src/client/gameplay/equipment-01.js','Z7'),scope);
  assert.equal(scope.Z7({L:118,cls:'normal'}),1180);
  assert.equal(scope.Z7({L:119,cls:'normal'}),1190);
  assert.equal(scope.Z7({L:120,cls:'normal'}),1200);
});
