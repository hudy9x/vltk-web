const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {compileTypeScriptEntry} = require('../tools/build-app');
function moduleAPI(path) {
  const scope={};vm.createContext(scope);
  vm.runInContext(compileTypeScriptEntry(path,'API').code,scope);
  return scope.API;
}

test('war mount choices cover level 90–150, randomize valid mounts and reject unavailable selections',()=>{
  const {warMountOptions,chooseWarMount}=moduleAPI('simulator/war-mounts.ts');
  const scope={};scope.window=scope;vm.runInNewContext(fs.readFileSync('public/data.js','utf8'),scope);
  const horses=scope.JX.items[10].list,options=warMountOptions(horses);
  assert.ok(options.length>5);
  for(const level of [90,100,120,130,150]) {
    const seen=new Set();
    for(const random of [0,.2,.4,.6,.8,.999]) {
      const selected=chooseWarMount(horses,level,'random',()=>random);
      assert.ok(selected.req.every(([type,value])=>type===36&&value<=level));seen.add(selected.key);
    }
    if(level>=100)assert.ok(seen.size>1);
  }
  const high=options.find(horse=>horse.req.some(([type,value])=>type===36&&value===150));
  assert.throws(()=>chooseWarMount(horses,90,high.key),/không phù hợp/);
  assert.equal(chooseWarMount(horses,150,high.key).key,high.key);
  assert.equal(chooseWarMount(horses,150,'none'),null);
  assert.equal(chooseWarMount(horses,1,'random'),null);
});

test('SIM support reserves real skill points for level-60 skills, movement buffs and reflection',()=>{
  const {prioritizeLevel60Support}=moduleAPI('simulator/support-skills.ts');
  const profile={lvl:90,skPts:89,sk:{}};
  const skills=[{id:1,n:'attack',req:10,max:20,kind:'atk'},
    {id:2,n:'Trấn phái',req:60,max:20,kind:'passive'},
    {id:3,n:'La Hán Trận',req:30,max:20,kind:'aura'},
    {id:4,n:'Khinh công',req:20,max:20,kind:'buff'},
    {id:5,n:'unavailable',req:120,max:20,kind:'buff'}];
  const selected=prioritizeLevel60Support(profile,skills,skill=>skill.kind);
  assert.equal(profile.sk[2],20);assert.equal(profile.sk[3],20);assert.equal(profile.sk[4],20);
  assert.equal(profile.sk[1],undefined);assert.equal(profile.sk[5],undefined);
  assert.equal(profile.skPts,29);assert.equal(selected.length,3);
  const poor={lvl:90,skPts:21,sk:{}};prioritizeLevel60Support(poor,skills,skill=>skill.kind);
  assert.equal(poor.sk[2],20);assert.equal(poor.skPts,0);
  assert.equal(Object.values(poor.sk).reduce((a,b)=>a+b,0),21,'never create free ordinary skill points');
});

test('random SIM clothes use native rows valid for the current weapon and mounted poses',()=>{
  const {randomSimulatorClothes}=moduleAPI('simulator/appearance.ts');
  const scope={};scope.window=scope;vm.runInNewContext(fs.readFileSync('public/jxlook.js','utf8'),scope);
  const catalog=scope.JXLOOK;
  for(const sex of ['m','f']) for(const ride of [0,1]) {
    const poses=catalog.assoc[sex]['空手'][ride],seen=new Set();
    for(const random of [0,.2,.4,.6,.8,.999]) {
      const outfit=randomSimulatorClothes(catalog.tabs[sex],poses,sex,()=>random);
      assert.ok(Number.isInteger(outfit.armor));assert.ok(Number.isInteger(outfit.helm));
      for(const pose of Object.values(poses)) {
        assert.ok(catalog.tabs[sex]['躯体'][outfit.armor][pose]);
        assert.ok(catalog.tabs[sex]['头部'][outfit.helm][pose]);
        for(const [part,row] of [['躯体',outfit.armor],['头部',outfit.helm]]) assert.ok(fs.existsSync(`public/img/jx/${sex}/${catalog.tabs[sex][part][row][pose]}.webp`));
      }
      seen.add(`${outfit.armor}:${outfit.helm}`);
    }
    assert.ok(seen.size>1,'different SIMs can wear different outfits');
  }
});
