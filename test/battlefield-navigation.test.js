const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { compileTypeScriptEntry } = require('../tools/build-app');
const scope={atob,btoa};vm.runInNewContext(compileTypeScriptEntry('maps/index.ts','Maps').code,scope);
function navigation() { const n=scope.Maps.createNavigationRuntime();n.load(9001,scope.Maps.createLegacyCatalog().navigation[9001]);return n; }
test('flow movement keeps a clear horizontal marching lane instead of drifting to the river bank',()=>{
  const n=navigation(), actor={x:800,y:1792};
  for(let i=0;i<300;i++){n.beginTick();n.moveWithFlow(actor,1504,1792,2);}
  assert.ok(actor.x>1300);assert.ok(Math.abs(actor.y-1792)<1,`unexpected lane drift to ${actor.y}`);
});

const tactics={};vm.runInNewContext(compileTypeScriptEntry('simulator/approach.ts','Tactics').code,tactics);
test('opposing moving SIMs leave both river-bank corners and converge inside the bridge corridor',()=>{
  for(const startY of [1540,1576,2008,2040]) {
    const n=navigation(), approach=tactics.Tactics.createBattlefieldApproach();
    const a={x:1560,y:startY},b={x:2024,y:startY};let met=false;
    for(let frame=0;frame<1000;frame++) {
      n.beginTick();
      const ga=approach(a,b),gb=approach(b,a);
      if(!ga&&!gb&&Math.hypot(a.x-b.x,(a.y-b.y)*2)<150&&n.sight(a.x,a.y,b.x,b.y)){met=true;break;}
      n.moveWithFlow(a,(ga||b).x,(ga||b).y,2);
      n.moveWithFlow(b,(gb||a).x,(gb||a).y,2);
      assert.ok(n.canStand(a.x,a.y)&&n.canStand(b.x,b.y),'actors never cross blocked river cells');
    }
    assert.ok(met,`opponents stuck from bank y=${startY}: ${JSON.stringify({a,b})}`);
    assert.ok(Math.abs(a.y-1792)<=96&&Math.abs(b.y-1792)<=96,'engagement starts in the safe bridge corridor');
  }
});
test('crossing phases do not turn back toward the entry as a moving target changes cells',()=>{
  const approach=tactics.Tactics.createBattlefieldApproach(),actor={x:1504,y:1792};
  const first=approach(actor,{x:3004,y:1688});assert.equal(first.x,2080);
  actor.x=1580;
  for(const y of [1688,1800,1896])assert.equal(approach(actor,{x:2600,y}).x,2080);
  assert.equal(approach(actor,{x:1400,y:1792}),null,'abandon crossing when enemy moves onto the same bank');
});

test('all three assigned routes cross their own bridge from both camps without entering water', () => {
  const scope={atob,btoa};
  vm.runInNewContext(compileTypeScriptEntry('maps/index.ts','Maps').code,scope);
  const nav=scope.Maps.createNavigationRuntime();nav.load(9001,scope.Maps.createLegacyCatalog().navigation[9001]);
  const routes=[1152,1792,2432];
  for (const lane of [0,1,2]) for (const side of ['song','jin']) {
    const route=tactics.Tactics.createBattlefieldApproach();
    const actor={x:side==='song'?580:3004,y:1792,battlefieldLane:lane,generation:0};
    const target={x:side==='song'?3134:450,y:1792};
    let crossed=false;
    for(let frame=0;frame<1800;frame++) {
      nav.beginTick();const goal=route(actor,target)||target;
      nav.moveWithFlow(actor,goal.x,goal.y,4);
      assert.ok(nav.canStand(actor.x,actor.y));
      if(actor.x>1664&&actor.x<1920) {crossed=true;assert.ok(Math.abs(actor.y-routes[lane])<=100,'uses assigned bridge');}
      if(crossed&&(side==='song'?actor.x>2080:actor.x<1504))break;
    }
    assert.ok(crossed,`${side} traverses route ${lane}`);
  }
  for(const y of routes) assert.equal(nav.clear(1504,y,2080,y),true);
  for(const y of [700,1472,2112,2880]) assert.equal(nav.walkable(1792,y),false,'water between bridges stays blocked');
});
