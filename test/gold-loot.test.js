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
const GoldLoot=require('../src/client/gameplay/gold-loot.ts');
const {compileTypeScriptEntry}=require('../tools/build-app');
function offline(random=()=>0){
  const scope={Math:Object.assign(Object.create(Math),{random}),vp:{normal:1,elite:2,boss:5},O6:0.1,us:{normal:{xp:1},elite:{xp:3},boss:{xp:20}}};
  vm.runInNewContext(compileTypeScriptEntry('gameplay/gold-loot.ts','GoldLoot').code,scope);
  vm.runInNewContext(declaration('src/client/gameplay/equipment-01.js','Z7'),scope);
  vm.runInNewContext(declaration('src/client/gameplay/equipment-02.js','E6'),scope);
  return scope;
}
test('gold ranges grow from 5–40 at level 1 to a 20,000 ceiling at level 200',()=>{
  for(const [level,min,max] of [[1,5,40],[2,9,41],[9,36,49],[10,40,50],[20,160,200],[50,1000,1250],[100,4000,5000],[119,5665,7081],[150,9000,11250],[200,16000,20000]])
    assert.deepEqual(GoldLoot.goldDropRange(level),{min,max});
  let previous={min:0,max:0};
  for(let level=1;level<=200;level++){
    const range=GoldLoot.goldDropRange(level);
    assert.ok(range.min>=previous.min&&range.max>=previous.max);
    assert.ok(range.min>=1&&range.min<=range.max&&range.max<=20000);
    assert.equal(GoldLoot.rollGoldDrop(level,()=>0),range.min);
    assert.equal(GoldLoot.rollGoldDrop(level,()=>1-Number.EPSILON),range.max);
    previous=range;
  }
});
test('gold rolls vary within the inclusive level range',()=>{
  const samples=Array.from({length:100},(_,i)=>GoldLoot.rollGoldDrop(200,()=>i/100));
  assert.ok(new Set(samples).size>90);
  assert.ok(samples.every(n=>Number.isInteger(n)&&n>=16000&&n<=20000));
  assert.equal(GoldLoot.meanGoldDrop(200),18000);
  const early=Array.from({length:36},(_,i)=>GoldLoot.rollGoldDrop(1,()=>i/36));
  assert.deepEqual(early,Array.from({length:36},(_,i)=>i+5));
});
test('offline browser bundle uses the same random range and retains class chances and bonuses',()=>{
  const min=offline();
  assert.equal(min.Z7({L:1,cls:'normal'}),5);
  assert.equal(min.Z7({L:200,cls:'normal'}),16000);
  assert.equal(min.Z7({L:200,cls:'elite'}),2*3*16000);
  assert.equal(min.Z7({L:200,cls:'boss'}),5*20*16000);
  assert.equal(offline(()=>0.99).Z7({L:200,cls:'normal'}),0);
  let roll=0;
  const max=offline(()=>roll++%2===0?0:1-Number.EPSILON);
  assert.equal(max.Z7({L:200,cls:'normal'}),20000);
  assert.equal(min.E6({L:200,cls:'normal'}),18000);
  assert.ok(min.E6({L:119,cls:'normal'})>min.E6({L:118,cls:'normal'}));
});
test('online catalog publishes the shared range for every configured monster',()=>{
  const catalog=require('../src/server/multiplayer/definitions/catalog.cjs').world();
  let count=0;
  for(const map of catalog.maps)for(const monster of map.monsters){
    const range=GoldLoot.goldDropRange(monster.level);
    assert.equal(monster.gold,range.max);assert.equal(monster.goldMin,range.min);count++;
  }
  assert.ok(count>0);
});
