{
  const {test}: typeof import('node:test') = require('node:test');
  const assert: typeof import('node:assert/strict') = require('node:assert/strict');
  const vm: typeof import('node:vm') = require('node:vm');
  const {compileTypeScriptEntry}=require('../tools/build-app');
  const {createHeadlessGame,collectLegacyDeclarations}=require('../tools/sim-balance/legacy-runtime.ts');
  function deploymentFixture(seconds: number) {
    const scope:any={}; vm.runInNewContext(compileTypeScriptEntry('simulator/battlefield.ts','DeploymentBattle').code,scope);
    const actors:any[]=[], player:any={hp:1000,x:0,y:0}; let alive=true;
    const match=scope.DeploymentBattle.createBattlefield({
      actors:()=>actors,player:()=>player,playerAlive:()=>alive,playerDPS:()=>1,
      create(build:any){const unit={hp:1000,max:1000,stats:{life:1000},x:0,y:0,n:'SIM'};actors.push(unit);return unit;},
      remove(unit:any){actors.splice(actors.indexOf(unit),1);},cancel(){},enter(){alive=true;},leave(){},
      respawnPlayer(){alive=true;},setPlayerDead(){alive=false;},position(unit:any,x:number,y:number){Object.assign(unit,{x,y});},restore(unit:any){unit.hp=unit.max;unit.dead=false;},
    });
    match.configureDeployment({respawnSeconds:seconds,soldierAppearanceSeconds:0}); match.start('song');
    return {match,player,actors,kill(){alive=false;},alive:()=>alive};
  }
  test('30/50/60-second redeployment doubles from the fifth human death without compounding or penalizing SIMs',()=>{
    for(const seconds of [30,50,60]) {
      const fixture=deploymentFixture(seconds),{match,player}=fixture;
      const [enemy]=match.add({team:'jin',faction:'shaolin',level:150,strength:'normal',count:1});
      for(let death=1;death<=6;death++) {
        fixture.kill();match.playerDied();match.playerDied();
        const wait=seconds*(death>=5?2:1);
        assert.equal(match.state.playerDeaths,death);assert.ok(Math.abs(match.state.playerRespawn-wait)<1e-8);
        assert.equal(match.canHit(player,enemy),false);assert.equal(match.canHit(enemy,player),false);
        match.tick(wait-.01);assert.equal(fixture.alive(),false);
        match.tick(.01);assert.equal(fixture.alive(),true);assert.equal(match.state.playerRespawn,0);
      }
      enemy.hp=0;match.died(enemy);match.tick(seconds-.01);assert.ok(enemy.dead);
      match.tick(.01);assert.equal(enemy.dead,false);
      match.start('song');assert.equal(match.state.playerDeaths,0);
      fixture.kill();match.playerDied();assert.equal(match.state.playerRespawn,seconds);
    }
  });
  test('all soldiers appear together after five seconds and pending soldiers can be cancelled',()=>{
    const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator,match=sim.battlefield;
    match.configureDeployment({respawnSeconds:50,soldierAppearanceSeconds:40});match.start('song');
    assert.equal(sim.roadMonsters.actors.length,0);assert.equal(match.state.monsters.count,70);assert.equal(match.state.monsters.alive,0);
    sim.roadMonsters.start();sim.tick(4.99);assert.equal(sim.roadMonsters.actors.length,0);
    match.configureDeployment({respawnSeconds:60,soldierAppearanceSeconds:0});
    sim.tick(.01);assert.equal(sim.roadMonsters.actors.length,70);assert.equal(match.state.deployment.respawnSeconds,50);
    const original=[...sim.roadMonsters.actors];sim.roadMonsters.start();assert.equal(sim.roadMonsters.actors.length,original.length);assert.ok(sim.roadMonsters.actors.every((unit:any,index:number)=>unit===original[index]));
    match.configureDeployment({respawnSeconds:30,soldierAppearanceSeconds:60});match.start('jin');
    sim.tick(2);sim.roadMonsters.restart();sim.tick(2.99);assert.equal(sim.roadMonsters.actors.length,0);
    sim.tick(.01);assert.equal(sim.roadMonsters.actors.length,70);
    match.start('song');sim.tick(2);match.reset();sim.tick(100);assert.equal(sim.roadMonsters.actors.length,0);
  });
  test('native game loop cannot revive a waiting human after the old six-second timer',()=>{
    const game=createHeadlessGame(process.cwd()),sim=game.arenaSimulator;
    const declaration=collectLegacyDeclarations('src/client').get('Td');assert.ok(declaration);
    vm.runInContext(declaration,game);game.$w=()=>{};game.Sb=()=>{};game.l.sweepT=0;game.l.dirty=false;
    sim.battlefield.configureDeployment({respawnSeconds:50,soldierAppearanceSeconds:0});sim.battlefield.start('song');
    game.l.life=0;sim.battlefield.playerDied();
    for(let tick=0;tick<100;tick++) game.Td(.1);
    assert.equal(game.l.life,0);assert.ok(game.l.deadT>39);assert.ok(sim.battlefield.state.playerRespawn>39);
    sim.tick(40);assert.equal(game.l.deadT,0);assert.equal(game.l.life,game.l.P.life);
    game.l.life=0;sim.battlefield.playerDied();sim.battlefield.reset();assert.equal(game.l.deadT,0);
  });
  test('new timing settings restore with the saved character and reject invalid values without altering a match',()=>{
    const first=createHeadlessGame(process.cwd());first.entries.set('jxidle_slot','0');first.arenaSimulator.openSettings();
    const panel=first.simNodes.find((node:any)=>node.id==='battlefield-panel');
    panel.querySelector('#battlefield-redeployment').value='60';panel.querySelector('#battlefield-soldier-appearance').value='45';
    panel.querySelector('#battlefield-redeployment').onchange();
    const second=createHeadlessGame(process.cwd());second.entries.set('jxidle_slot','0');
    second.entries.set('jxidle_battlefield_settings_0',first.entries.get('jxidle_battlefield_settings_0'));
    second.arenaSimulator.openSettings();const match=second.arenaSimulator.battlefield;match.start('song');
    assert.equal(match.state.deployment.respawnSeconds,60);assert.equal(match.state.deployment.soldierAppearanceSeconds,5);
    assert.equal(second.arenaSimulator.roadMonsters.actors.length,0);
    for(const settings of [{respawnSeconds:5,soldierAppearanceSeconds:0},{respawnSeconds:30,soldierAppearanceSeconds:-1},{respawnSeconds:30,soldierAppearanceSeconds:NaN}])assert.throws(()=>match.configureDeployment(settings));
    assert.equal(match.state.deployment.respawnSeconds,60);
  });
}
