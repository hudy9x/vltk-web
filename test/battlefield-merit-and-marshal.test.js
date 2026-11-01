const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {compileTypeScriptEntry}=require('../tools/build-app');
const {createHeadlessGame}=require('../tools/sim-balance/legacy-runtime.ts');
const scope={};vm.runInNewContext(compileTypeScriptEntry('simulator/war-rewards.ts','Rewards').code,scope);

test('NPC and SIM merit follow all five victim tiers on both teams, with live SIM rank and one award per life',()=>{
 for(const team of ['song','jin']) {
  const hostile=team==='song'?'jin':'song',player={x:0,y:0,hp:100};
  const reward=scope.Rewards.createWarRewards({player:()=>player,team:()=>team,running:()=>true,alive:()=>true,changed(){}},()=>1);
  for(const [tier,rank] of scope.Rewards.WAR_RANKS.entries()) {
   const npc={x:0,y:0,hp:100,battlefieldMonster:true,battlefieldTeam:hostile,battlefieldRank:rank.name};
   let before=reward.rank(player).points;
   reward.record(player,npc);reward.killed(npc);reward.killed(npc);
   assert.equal(reward.rank(player).points-before,50*(tier+1));
   const sim={x:0,y:0,hp:100,arenaSim:true,battlefieldTeam:hostile,battlefieldRank:'Đại tướng'};
   for(let i=0;i<rank.points/1000;i++) {
    const boss={x:0,y:0,hp:100,arenaSim:true,battlefieldBoss:true,battlefieldTeam:team};
    reward.record(sim,boss);reward.killed(boss);
   }
   assert.equal(reward.rank(sim).name,rank.name);
   before=reward.rank(player).points;
   reward.record(player,sim);reward.killed(sim);reward.killed(sim);
   assert.equal(reward.rank(player).points-before,150*(tier+1));
   reward.revived(sim);reward.killed(sim);assert.equal(reward.rank(player).points-before,150*(tier+1));
   reward.revived(sim);reward.record(player,sim);reward.killed(sim);assert.equal(reward.rank(player).points-before,300*(tier+1));
  }
 }
});

test('marshals spawn once at 50%, retain match-start HP, and announce both teams at 40px until timeout/reset',()=>{
 for(const team of ['song','jin']) for(const map of [9003]) {
  const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,match=sim.battlefield;
  match.start(team,{song:3,jin:2},map);
  const notice=game.simNodes.find(node=>node.id==='battlefield-marshal-notice');
  assert.equal(notice.hidden,true);assert.equal(sim.actors.filter(actor=>actor.battlefieldBoss).length,0);
  match.tick(599.99);assert.equal(sim.actors.filter(actor=>actor.battlefieldBoss).length,0);
  sim.roadMonsters.configure({...sim.roadMonsters.configuration,marshal:{count:1,hp:345678}});
  match.tick(.01);
  const bosses=sim.actors.filter(actor=>actor.battlefieldBoss);
  assert.equal(bosses.length,2);assert.ok(bosses.every(actor=>actor.hp===200000));
  assert.equal(notice.hidden,false);
  assert.equal(notice.textContent,'Nguyên soái hai phe Tống và Kim xuất hiện');
  assert.match(notice.style.cssText,/font:700 40px/);
  assert.match(notice.style.cssText,/left:50%/);assert.match(notice.style.cssText,/WarCalligraphy/);
  sim.tick(5.99);assert.equal(notice.hidden,false);sim.tick(.01);assert.equal(notice.hidden,true);
  match.tick(1);assert.equal(sim.actors.filter(actor=>actor.battlefieldBoss).length,2);
  for(const boss of bosses)boss.hp=0;
  match.tick(31);assert.equal(sim.actors.filter(actor=>actor.battlefieldBoss).length,2);assert.ok(bosses.every(actor=>actor.hp===0));
  match.reset();assert.equal(notice.hidden,true);
  match.start(team);match.tick(600);assert.equal(notice.hidden,false);
  match.tick(600);assert.equal(notice.hidden,true);assert.equal(match.running,false);
  match.acknowledgeResult();assert.equal(notice.hidden,true);
 }
});

test('Đại tướng NPC can be configured and respawns with its rank and +250 merit reward',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;
 const config=sim.roadMonsters.configuration;
 for(const rank of Object.keys(config))config[rank].count=0;
 config.grandGeneral={count:2,hp:120000,respawnSeconds:10};
 sim.roadMonsters.configure(config);sim.battlefield.start('song');sim.tick(5);
 assert.equal(sim.roadMonsters.actors.length,2);
 const victim=sim.roadMonsters.actors.find(actor=>actor.battlefieldTeam==='jin');
 assert.equal(victim.battlefieldRank,'Đại tướng');
 sim.warRewards.record(game.v,victim);victim.hp=0;
 sim.roadMonsters.tick(0,true);assert.equal(sim.warRewards.state.points,250);
 sim.roadMonsters.tick(10,true);
 const revived=sim.roadMonsters.actors.find(actor=>actor.battlefieldTeam==='jin');
 assert.notEqual(revived,victim);assert.equal(revived.battlefieldRank,'Đại tướng');assert.equal(revived.hp,120000);
});
test('human and SIM victims share player-kill statistics and show the victim rank and name only for own kills',()=>{
 const player={x:0,y:0,hp:100,n:'Hero'},notifications=[];
 const reward=scope.Rewards.createWarRewards({player:()=>player,team:()=> 'song',running:()=>true,alive:()=>true,changed(){},playerKilled:(title,name)=>notifications.push({title,name})},()=>1);
 const enemySim={arenaSim:true,battlefieldTeam:'jin',hp:100,n:'Đối thủ SIM'};
 for(let i=0;i<60;i++){
   const npc={battlefieldMonster:true,battlefieldTeam:'song',hp:0,x:0,y:0};reward.record(enemySim,npc);reward.killed(npc);
 }
 const promoted=reward.rank(enemySim).name;assert.equal(promoted,'Hiệu úy');
 reward.record(player,enemySim);enemySim.hp=0;reward.killed(enemySim);reward.killed(enemySim);
 assert.equal(reward.rank(player).playerKills,1);assert.equal(reward.rank(player).soldierKills,0);
 assert.deepEqual(notifications,[{title:promoted,name:'Đối thủ SIM'}]);
 const npc={battlefieldMonster:true,battlefieldTeam:'jin',hp:0,x:0,y:0};reward.record(player,npc);reward.killed(npc);
 assert.equal(reward.rank(player).playerKills,1);assert.equal(reward.rank(player).soldierKills,1);assert.equal(notifications.length,1);
 reward.revived(enemySim);enemySim.hp=100;reward.record(enemySim,player);player.hp=0;reward.killed(player);
 assert.equal(reward.rank(enemySim).playerKills,1);assert.equal(notifications.length,1);
 reward.reset();assert.equal(reward.rank(player).playerKills,0);
});
test('private kill toast and leaderboard display the player/SIM victim count',()=>{
 const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,messages=[];game.k=message=>messages.push(message);
 sim.battlefield.start('song');const [enemy]=sim.battlefield.add({team:'jin',faction:'wudang',level:150,strength:'normal',count:1});
 sim.warRewards.record(game.v,enemy);enemy.hp=0;sim.warRewards.killed(enemy);
 assert.ok(messages.includes(`Bạn đã giết binh sĩ <${enemy.n}>`));
 sim.leaderboard.open();const panel=game.simNodes.find(node=>node.id==='war-leaderboard');
 assert.match(panel.innerHTML,/Người chơi\/SIM hạ/);
 assert.match(panel.querySelector('tbody').innerHTML,/<td>0<\/td><td>1<\/td><td>150<\/td>/);
});
