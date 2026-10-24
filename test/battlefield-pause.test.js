const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {compileTypeScriptEntry}=require('../tools/build-app');
const {loadCombatEngine}=require('./helpers/combat-engine');
const {loadMapsEngine}=require('./helpers/maps-engine');
test('finished battle freezes direct/path/flow movement and casts, then releases every unit without moving them',()=>{
 const scope={};vm.createContext(scope);loadCombatEngine(scope,{bridge:false});
 vm.runInContext(compileTypeScriptEntry('simulator/battlefield-pause.ts','Pause').code,scope);
 const navigation=loadMapsEngine(scope).createNavigationRuntime(actor=>scope.CombatEngine.actorActionLocked(actor));
 navigation.load(9003,null,{width:1000,height:1000});
 const units=Array.from({length:3},(_,i)=>({x:100+i*20,y:100,hp:100,moving:true,castT:.4,target:{x:900,y:900}}));
 const pause=scope.Pause.createBattlefieldPause();pause.freeze(units);
 for(const actor of units){
  const before=[actor.x,actor.y];assert.equal(actor.moving,false);assert.equal(actor.target,null);
  assert.equal(scope.CombatEngine.actorActionLocked(actor),true);assert.equal(scope.CombatEngine.beginActorCast(actor),false);
  assert.equal(navigation.tryMove(actor,300,300),false);navigation.moveAlongPath(actor,400,400,30);navigation.moveWithFlow(actor,400,400,30);
  assert.deepEqual([actor.x,actor.y],before);
 }
 pause.reset();for(const actor of units){assert.equal(scope.CombatEngine.actorActionLocked(actor),false);assert.equal(navigation.tryMove(actor,300,300),true);}
});
