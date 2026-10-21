const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {compileTypeScriptEntry}=require('../tools/build-app');
const scope={};vm.runInNewContext(compileTypeScriptEntry('simulator/road-monsters.ts','Road').code,scope);
test('twelve roadside encounters respawn at their original road positions after 20 seconds and stop on match end',()=>{
  const actors=[],events=[];
  const road=scope.Road.createRoadMonsters({create(index,x,y){const actor={index,x,y,hp:100};actors.push(actor);return actor;},remove(actor){actors.splice(actors.indexOf(actor),1)},cancel(actor){events.push(['cancel',actor])},tick(actor,dt){events.push(['tick',actor,dt])}});
  road.start();assert.equal(road.actors.length,12);assert.equal(actors.length,12);
  const first=road.actors[0],home={x:first.x,y:first.y};first.hp=0;road.tick(.1,true);
  road.tick(19.99,true);assert.equal(road.actors[0],first);
  road.tick(.01,true);assert.notEqual(road.actors[0],first);assert.equal(road.actors[0].x,home.x);assert.equal(road.actors[0].y,home.y);
  const count=events.filter(event=>event[0]==='tick').length;road.tick(30,false);assert.equal(events.filter(event=>event[0]==='tick').length,count);
  road.clear();assert.equal(actors.length,0);assert.equal(road.actors.length,0);
});

test('road monsters spread symmetrically across both banks without placing encounters in water',()=>{
  const spawns=scope.Road.ROAD_MONSTER_SPAWNS;
  assert.equal(spawns.length,12);
  assert.equal(spawns.filter(point=>point.x<1792).length,6);
  assert.equal(spawns.filter(point=>point.x>1792).length,6);
  assert.ok(Math.max(...spawns.map(point=>point.y))-Math.min(...spawns.map(point=>point.y))>1500);
  assert.ok(new Set(spawns.map(point=>point.x)).size>6);
  const maps={atob,btoa};vm.runInNewContext(compileTypeScriptEntry('maps/index.ts','Maps').code,maps);
  const nav=maps.Maps.createNavigationRuntime();nav.load(9001,maps.Maps.createLegacyCatalog().navigation[9001]);
  for(const point of spawns)assert.equal(nav.canStand(point.x,point.y),true);
});
