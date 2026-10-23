const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHeadlessGame}=require('../tools/sim-balance/legacy-runtime.ts');

test('entering either team on every battlefield counts down 5 to 1 and spawns all NPCs at exactly five seconds',()=>{
 for(const team of ['song','jin']) for(const mapId of [9003]) {
  const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,match=sim.battlefield;
  match.start(team,{song:3,jin:2},mapId);
  const notice=game.simNodes.find(node=>node.id==='battlefield-soldier-countdown');
  assert.equal(match.state.deployment.soldierAppearanceSeconds,5);
  assert.equal(sim.roadMonsters.actors.length,0);assert.equal(match.state.monsters.count,70);
  assert.equal(notice.hidden,false);assert.equal(notice.textContent,'Binh sĩ xuất hiện sau 5 giây');
  for(let second=1;second<5;second++) {
   sim.tick(1);assert.equal(sim.roadMonsters.actors.length,0);
   assert.equal(notice.textContent,`Binh sĩ xuất hiện sau ${5-second} giây`);
  }
  sim.tick(.99);assert.equal(sim.roadMonsters.actors.length,0);assert.equal(notice.hidden,false);
  sim.tick(.01);assert.equal(sim.roadMonsters.actors.length,70);assert.equal(notice.hidden,true);
  assert.equal(sim.actors.some(actor=>actor.battlefieldBoss),false);
  const units=[...sim.roadMonsters.actors];sim.tick(.01);
  assert.equal(sim.roadMonsters.actors.length,70);assert.ok(sim.roadMonsters.actors.every((actor,index)=>actor===units[index]));
  match.reset();assert.equal(notice.hidden,true);
 }
});

test('countdown cancels on leaving, resets on re-entry, and keeps its deadline through a GM NPC refresh',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,match=sim.battlefield;
 const notice=game.simNodes.find(node=>node.id==='battlefield-soldier-countdown');
 match.start('song');sim.tick(2);assert.match(notice.textContent,/3 giây/);
 sim.roadMonsters.restart();sim.tick(2.99);assert.equal(sim.roadMonsters.actors.length,0);
 sim.tick(.01);assert.equal(sim.roadMonsters.actors.length,70);assert.equal(notice.hidden,true);
 match.reset();match.start('jin');sim.tick(2);match.reset();
 assert.equal(notice.hidden,true);sim.tick(10);assert.equal(sim.roadMonsters.actors.length,0);
 match.start('song');assert.match(notice.textContent,/5 giây/);sim.tick(5);assert.equal(sim.roadMonsters.actors.length,70);
 match.reset();
 const config=sim.roadMonsters.configuration;
 for(const rank of Object.keys(config)) if(rank!=='marshal')config[rank].count=0;
 sim.roadMonsters.configure(config);match.start('song');assert.equal(notice.hidden,true);
 match.tick(1200);assert.equal(notice.hidden,true);
});

test('legacy saved appearance times and direct configuration migrate to five seconds, preserving respawn settings',()=>{
 for(const oldDelay of [0,40,1200]) {
  const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;
  game.entries.set('jxidle_slot','0');
  game.entries.set('jxidle_battlefield_settings_0',JSON.stringify({version:1,fields:{'soldier-appearance':String(oldDelay),redeployment:'60'},ratios:{song:{},jin:{}}}));
  sim.openSettings();
  const panel=game.simNodes.find(node=>node.id==='battlefield-panel');
  assert.equal(panel.querySelector('#battlefield-soldier-appearance').value,'5');
  assert.match(panel.innerHTML,/id="battlefield-soldier-appearance"[^>]*readonly/);
  sim.battlefield.start('song');
  assert.equal(sim.battlefield.state.deployment.soldierAppearanceSeconds,5);
  assert.equal(sim.battlefield.state.deployment.respawnSeconds,60);
  sim.tick(5);assert.equal(sim.roadMonsters.actors.length,70);
  sim.battlefield.reset();
  sim.battlefield.configureDeployment({respawnSeconds:50,soldierAppearanceSeconds:oldDelay});sim.battlefield.start('jin');
  assert.equal(sim.battlefield.state.deployment.soldierAppearanceSeconds,5);
  assert.equal(sim.battlefield.state.deployment.respawnSeconds,50);
 }
});
