const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {compileTypeScriptEntry}=require('../tools/build-app');
const scope={};vm.runInNewContext(compileTypeScriptEntry('simulator/war-rewards.ts','Rewards').code,scope);
const {createWarRewards,warRank}=scope.Rewards;
function fixture(random=()=>0){const player={x:0,y:0,hp:100},enemy={x:30,y:0,hp:100,battlefieldMonster:true,battlefieldTeam:'jin'};let running=true,alive=true,changed=0;const reward=createWarRewards({player:()=>player,team:()=> 'song',running:()=>running,alive:()=>alive,changed(){changed++}},random);return{player,enemy,reward,stop(){running=false},die(){alive=false},get changed(){return changed}};}
test('military merit is credited once to the last hostile attacker including poison, with all five rank thresholds',()=>{
 const {player,enemy,reward}=fixture();reward.record(player,enemy);enemy.hp=0;reward.killed(enemy);reward.killed(enemy);assert.equal(reward.state.points,10);
 for(const [points,name]of [[0,'Binh sĩ'],[100,'Hiệu úy'],[300,'Thống lĩnh'],[700,'Đại thống lĩnh'],[1500,'Tướng quân']])assert.equal(warRank(points).name,name);
 const ally={...enemy,hp:100,battlefieldTeam:'song'};reward.record(player,ally);reward.killed(ally);assert.equal(reward.state.points,10);
 const sim={x:0,y:0,hp:100,battlefieldTeam:'song'};const victim={...enemy,hp:100};reward.record(player,victim);reward.record(sim,victim);reward.killed(victim);assert.equal(reward.state.points,10);assert.equal(reward.rank(sim).points,10);
 for(let i=0;i<9;i++){const target={...enemy,hp:100};reward.record(player,target);reward.killed(target)}assert.equal(reward.state.title,'Hiệu úy');
 reward.reset();assert.equal(reward.state.points,0);assert.equal(reward.drops.length,0);
});
test('drops stay on the ground until approached, inventory is consumed, buffs last 180 seconds and refresh without stacking',()=>{
 for(const [kind,index]of [['resistance',0],['attack',1],['movement',2]]){
  let roll=0;const {player,enemy,reward,stop}=fixture(()=>roll++%2===0?0:(index+.1)/3);
  enemy.x=200;reward.record(player,enemy);reward.killed(enemy);assert.equal(reward.drops.length,1);reward.tick(.01);assert.equal(reward.state.inventory[kind],0);
  player.x=200;reward.tick(.01);assert.equal(reward.drops.length,0);assert.equal(reward.state.inventory[kind],1);reward.use(kind);assert.equal(reward.state.inventory[kind],0);
  const stats=()=>({res:{phys:0,cold:0,fire:0,poison:0,light:0},speed:1,speedFoot:1,aspdP:1,aspdC:1,aspd:1});let p=stats();reward.apply(p);
  if(kind==='resistance')assert.equal(p.res.phys,20);if(kind==='attack')assert.equal(p.aspdP,1.25);if(kind==='movement')assert.equal(p.speed,1.25);
  reward.tick(179.99);assert.ok(reward.state.buffs[kind]>0);reward.tick(.01);p=stats();reward.apply(p);assert.equal(p.speed,1);assert.equal(p.aspdP,1);assert.equal(p.res.phys,0);
  const next={...enemy,hp:100};reward.record(player,next);reward.killed(next);reward.tick(.01);reward.use(kind);stop();reward.tick(.01);assert.equal(reward.state.buffs[kind],0);assert.throws(()=>reward.use(kind));
 }
});
test('stale attribution and failed drop rolls never grant free merit or consumables',()=>{
 const {player,enemy,reward}=fixture(()=>.99);reward.record(player,enemy);reward.tick(16);reward.killed(enemy);assert.equal(reward.state.points,0);
 const target={...enemy,hp:100};reward.record(player,target);reward.killed(target);assert.equal(reward.state.points,10);assert.equal(reward.drops.length,0);assert.throws(()=>reward.use('attack'));
});

test('using another pill refreshes 180 seconds without doubling stats',()=>{
 const fixtureState=fixture();const {reward,player,enemy}=fixtureState;
 // Resistance fixture always rolls the resistance pill.
 reward.record(player,enemy);reward.killed(enemy);reward.tick(.01);reward.use('resistance');reward.tick(60);
 const second={...enemy,hp:100};reward.record(player,second);reward.killed(second);reward.tick(.01);reward.use('resistance');assert.equal(reward.state.buffs.resistance,180);
 const stats={res:{phys:10,cold:10,fire:10,poison:10,light:10},speed:1,speedFoot:1,aspdP:1,aspdC:1};reward.apply(stats);assert.equal(stats.res.phys,30);
 reward.tick(179.9);assert.ok(reward.state.buffs.resistance>0);reward.tick(.1);assert.equal(reward.state.buffs.resistance,0);
});
