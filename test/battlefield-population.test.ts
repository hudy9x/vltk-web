{
  const { test }: typeof import('node:test') = require('node:test');
  const assert: typeof import('node:assert/strict') = require('node:assert/strict');
  const vm: typeof import('node:vm') = require('node:vm');
  const { compileTypeScriptEntry } = require('../tools/build-app');
  const { createHeadlessGame } = require('../tools/sim-balance/legacy-runtime.ts');
  function loadPopulationModule(entry: string): any {
    const scope: any = { atob, btoa };
    vm.runInNewContext(compileTypeScriptEntry(entry, 'Population').code, scope);
    return scope.Population;
  }
  test('population starts once, replaces only dead slots on 10/20/30-second schedules, and never grows', () => {
    const { DEFAULT_SOLDIERS, validateSoldierConfiguration } = loadPopulationModule('simulator/soldier-config.ts');
    const { createRoadMonsters } = loadPopulationModule('simulator/road-monsters.ts');
    const config = validateSoldierConfiguration(DEFAULT_SOLDIERS);
    for (const rank of Object.keys(config)) config[rank].count = 0;
    config.soldier = {count:2,hp:50000,respawnSeconds:10};
    config.captain = {count:2,hp:60000,respawnSeconds:20};
    config.commander = {count:2,hp:80000,respawnSeconds:30};
    const bodies = new Set<any>(); let created = 0;
    const road = createRoadMonsters({
      create(_index: number, x: number, y: number, spawn: any) {
        const unit = {...spawn,x,y,hp:spawn.hp,max:spawn.hp}; bodies.add(unit); created++; return unit;
      }, remove(unit: any) {bodies.delete(unit);}, cancel() {}, tick() {},
    });
    road.configure(config); road.start(); road.start();
    assert.equal(created,6); assert.equal(road.actors.length,6);
    road.tick(120,true); assert.equal(created,6);
    const originals = [...road.actors];
    for (const unit of originals) unit.hp=0;
    road.tick(0,true); road.tick(9.99,true); assert.equal(created,6);
    road.tick(.01,true); assert.equal(created,8);
    road.tick(10,true); assert.equal(created,10);
    road.tick(10,true); assert.equal(created,12);
    for (let cycle=0;cycle<5;cycle++) {
      for(const unit of road.actors) unit.hp=0;
      road.tick(0,true); road.tick(30,true);
      assert.equal(road.actors.length,6); assert.equal(bodies.size,6);
    }
    for (const [index,unit] of road.actors.entries()) {
      assert.equal(unit.team,originals[index].team);
      assert.equal(unit.x,originals[index].x); assert.equal(unit.y,originals[index].y);
    }
    for (const delay of [0,5,11,NaN]) {
      const invalid=validateSoldierConfiguration(config); invalid.soldier.respawnSeconds=delay;
      assert.throws(()=>road.configure(invalid),/Hồi sinh/);
    }
    road.clear(); road.start(); assert.equal(bodies.size,6);
  });
  test('total counts and explicit teams agree with camp territory and walkable positions on Hoang Nguyên', () => {
    const {DEFAULT_SOLDIERS,soldierSpawnPlan,soldierTeamAt} = loadPopulationModule('simulator/soldier-config.ts');
    const maps=loadPopulationModule('maps/index.ts');
    for(const mapId of [9003]) {
      const plan=soldierSpawnPlan(DEFAULT_SOLDIERS,mapId);
      assert.equal(plan.length,70);
      for(const team of ['song','jin']) assert.equal(plan.filter((unit:any)=>unit.team===team).length,35);
      const nav=maps.createNavigationRuntime(); nav.load(mapId,maps.createLegacyCatalog().navigation[mapId]);
      for(const unit of plan) {assert.equal(soldierTeamAt(unit.x,unit.y,mapId),unit.team);assert.ok(nav.canStand(unit.x,unit.y));}
      const odd=soldierSpawnPlan({...DEFAULT_SOLDIERS,soldier:{count:3,hp:50000}},mapId).filter((unit:any)=>unit.rank==='soldier');
      assert.equal(odd.length,3);
      assert.equal(odd.filter((unit:any)=>unit.team==='song').length,2);
    }
    const game=createHeadlessGame(process.cwd());
    game.arenaSimulator.battlefield.start('song',{song:3,jin:2},9003);game.arenaSimulator.tick(5);
    for(const unit of game.arenaSimulator.roadMonsters.actors)
      assert.equal(unit.battlefieldTeam,soldierTeamAt(unit.x,unit.y,9003));
  });
  test('SIMs preempt old targets only by attackable priority: player, SIM, then monster; distant SIMs do not block farming', () => {
    const game=createHeadlessGame(process.cwd()), sim=game.arenaSimulator, match=sim.battlefield;
    match.start('song');sim.tick(5);
    const [attacker]=match.add({team:'jin',faction:'wudang',level:150,strength:'normal',count:1});
    const [opponent]=match.add({team:'song',faction:'shaolin',level:150,strength:'normal',count:1});
    const monster=sim.roadMonsters.actors.find((unit:any)=>unit.battlefieldTeam==='song');
    for(const unit of sim.roadMonsters.actors) if(unit!==monster) unit.dead=true;
    Object.assign(attacker,{x:1200,y:1792,cooldown:999,hp:100000,max:100000});
    Object.assign(monster,{x:1210,y:1792,battlefieldHome:{x:1210,y:1792}});
    Object.assign(opponent,{x:3000,y:1792});
    Object.assign(game.v,{x:3000,y:2500});
    attacker.stats.main.rad=100; attacker.stats.basic.rad=100;
    attacker.target=opponent;
    sim.tick(.01); assert.equal(attacker.target,monster);
    assert.ok(match.targets(attacker).includes(opponent),'area damage candidates retain distant enemies');
    Object.assign(opponent,{x:1220,y:1792});
    sim.tick(.01); assert.equal(attacker.target,opponent);
    Object.assign(game.v,{x:1230,y:1792});
    sim.tick(.01); assert.equal(attacker.target,game.v);
    assert.ok(match.targets(attacker).includes(monster),'target priority must not exclude monsters from area hits');
    game.l.life=0; match.playerDied();
    sim.tick(.01); assert.equal(attacker.target,opponent);
  });
}
