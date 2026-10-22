const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { compileTypeScriptEntry } = require('../tools/build-app');
const sandbox = {};
vm.runInNewContext(compileTypeScriptEntry('simulator/battlefield.ts', 'Battle').code, sandbox);
const { createBattlefield, BATTLE_DURATION, estimateDPS } = sandbox.Battle;
function fixture() {
  const actors = [], player = { x: 0, y: 0, n: 'Player', hp: 1000 }, events = [];
  let alive = true;
  const match = createBattlefield({ actors: () => [...actors], player: () => player, playerAlive: () => alive, playerDPS: () => 1000,
    create(build, element) { const actor = { n: build.faction, profile: { lvl: build.level }, stats: { life: 1000, mana: 100, main: { parts: { phys: 100 }, rate: 2 } }, hp: 1000, max: 1000, x: 0, y: 0 }; actors.push(actor); return actor; },
    remove(actor) { actors.splice(actors.indexOf(actor), 1); }, cancel(actor) { events.push(['cancel', actor]); },
    enter(team) { events.push(['enter', team]); alive = true; }, leave() { events.push(['leave']); },
    respawnPlayer(team) { alive = true; events.push(['respawn', team]); }, setPlayerDead() { alive = false; },
    position(actor, x, y) { Object.assign(actor, { x, y }); }, restore(actor) { actor.hp = actor.max; actor.dead = false; },
  });
  return { match, actors, player, events, killPlayer() { alive = false; } };
}
test('20 minute match uses two camps and only opposing teams are eligible, including the player', () => {
  const { match, actors, player } = fixture(); match.start('song');
  assert.equal(BATTLE_DURATION, 1200);
  assert.equal(actors.length, 2); assert.equal(match.state.remaining, 1200);
  const song = match.add({ team: 'song', faction: 'shaolin', level: 90, strength: 'weak', count: 3 });
  const jin = match.add({ team: 'jin', faction: 'gaibang', level: 150, strength: 'strong', count: 2 });
  assert.equal(song[0].profile.lvl, 90); assert.equal(match.state.armies.song.count, 3);
  assert.equal(match.canHit(song[0], song[1]), false); assert.equal(match.canHit(song[0], jin[0]), true);
  assert.equal(match.canHit(player, song[0]), false); assert.equal(match.canHit(jin[0], player), true);
  assert.equal(match.canHit(song[0], player), false);
});
test('SIM death is counted once and respawns after 30 seconds; boss death never respawns or ends match early', () => {
  const { match, actors } = fixture(); match.start('song');
  const [sim] = match.add({ team: 'jin', faction: 'gaibang', level: 150, strength: 'normal', count: 1 });
  const home = { x: sim.x, y: sim.y }; sim.x = 1800; sim.y = 1792;
  sim.hp = 0; match.tick(.01); assert.equal(sim.x, home.x); assert.equal(sim.y, home.y); match.tick(29.99); assert.equal(sim.hp, 0); assert.equal(match.state.score.song, 1);
  match.tick(.01); assert.equal(sim.hp, sim.max); assert.equal(sim.dead, false);
  const boss = actors.find(a => a.battlefieldTeam === 'jin' && a.battlefieldBoss); boss.hp = 0;
  match.tick(1); match.tick(10); assert.equal(boss.hp, 0); assert.equal(match.running, true); assert.equal(match.state.score.song, 1001);
});
test('player respawns at own camp without stopping the match or replacing SIM identities', () => {
  const { match, actors, events, killPlayer } = fixture(); match.start('jin'); const originals = [...actors];
  killPlayer(); match.playerDied(); match.playerDied(); match.tick(29.99);
  assert.equal(match.state.score.song, 1); assert.ok(match.state.playerRespawn > 0);
  match.tick(.01); assert.deepEqual(actors, originals); assert.ok(events.some(e => e[0] === 'respawn' && e[1] === 'jin'));
});
test('reinforcements preserve configured boss HP and damage dealt and invalid input cannot mutate armies', () => {
  const { match, actors } = fixture(); match.start('song'); const boss = actors.find(a => a.battlefieldTeam === 'jin');
  boss.hp -= 1234; const max = boss.max;
  match.add({ team: 'song', faction: 'shaolin', level: 150, strength: 'strong', count: 100 });
  assert.equal(max, 200000); assert.equal(boss.max, max); assert.equal(boss.max - boss.hp, 1234);
  const count = actors.length;
  for (const build of [{ level: NaN }, { level: 201 }, { count: 0 }, { count: 101 }, { team: 'oops' }, { strength: 'oops' }]) {
    assert.throws(() => match.add({ team: 'song', faction: 'shaolin', level: 150, strength: 'normal', count: 1, ...build }));
    assert.equal(actors.length, count);
  }
});
test('result is decided at 20 minutes; both bosses dead is a draw regardless of kill order', () => {
  for (const both of [false, true]) {
    const { match, actors } = fixture(); match.start('song');
    actors.find(a => a.battlefieldTeam === 'jin').hp = 0;
    if (both) actors.find(a => a.battlefieldTeam === 'song').hp = 0;
    match.tick(1200); assert.equal(match.running, false); assert.equal(match.state.remaining, 0);
    assert.match(match.state.result, both ? /^Hòa/ : /^Tống thắng/);
    assert.equal(match.canHit(actors[0], actors[1]), false);
    const before = match.state.elapsed; match.tick(100); assert.equal(match.state.elapsed, before);
    assert.throws(()=>match.reset(), /Đồng ý/); match.acknowledgeResult(); assert.equal(actors.length, 0); assert.equal(match.active, false);
  }
});

test('Song Doanh camps are connected through the bridge and river collision matches the authored map', () => {
  const scope = { atob, btoa };
  vm.runInNewContext(compileTypeScriptEntry('maps/index.ts', 'Maps').code, scope);
  const engine = scope.Maps, map = engine.getMap(9001);
  assert.equal(map.spawnMode, 'fixed'); assert.equal(map.spawns.length, 0);
  const navigation = engine.createNavigationRuntime();
  const definition = engine.createLegacyCatalog().navigation[9001];
  navigation.load(9001, definition);
  assert.equal(navigation.walkable(450,1792), true); assert.equal(navigation.walkable(3134,1792), true);
  assert.equal(navigation.walkable(1792,700), false); assert.equal(navigation.walkable(1792,1792), true);
  const path = navigation.path(450,1792,3134,1792);
  assert.ok(path && path.length > 0, 'camps connect through the central bridge');
});

test('async reinforcements report progress and leaving cancels creation without leaving actors behind', async () => {
  const { match, actors } = fixture(); match.start('song');
  const progress = [];
  const army = await match.addAsync({team:'song',faction:'shaolin',level:150,strength:'normal',count:3}, (done,total)=>progress.push([done,total]), async()=>{});
  assert.equal(army.length,3);assert.equal(progress.at(-1)[0],3);
  let yields=0;
  await assert.rejects(match.addAsync({team:'jin',faction:'gaibang',level:150,strength:'normal',count:3}, ()=>{}, async()=>{if(++yields===2)match.reset();}),/hủy/);
  assert.equal(actors.length,0);assert.equal(match.active,false);
});

test('total army creation splits 40 into 20 per side with independent compositions and rejects odd or invalid totals atomically', async () => {
  const {match,actors}=fixture();match.start('song');
  const army=await match.addBothAsync({faction:'shaolin',level:150,strength:'normal',count:40,compositions:{song:{shaolin:100},jin:{emei:100}}},()=>{},async()=>{});
  assert.equal(army.length,40);
  assert.equal(army.filter(actor=>actor.battlefieldTeam==='song').length,20);
  assert.equal(army.filter(actor=>actor.battlefieldTeam==='jin').length,20);
  assert.ok(army.filter(actor=>actor.battlefieldTeam==='song').every(actor=>actor.n.includes('shaolin')));
  assert.ok(army.filter(actor=>actor.battlefieldTeam==='jin').every(actor=>actor.n.includes('emei')));
  const before=actors.length;
  for (const count of [1,3,41,201,NaN]) assert.throws(()=>match.addBothAsync({faction:'shaolin',level:150,strength:'normal',count}),/chẵn/);
  assert.throws(()=>match.addBothAsync({faction:'shaolin',level:150,strength:'normal',count:40,compositions:{song:{shaolin:100},jin:{emei:99}}}),/100%/);
  assert.equal(actors.length,before);
});

test('team soldiers reject friendly fire and fight only opposing soldiers, SIMs and players', () => {
  const actors=[],player={x:0,y:0,hp:100},monsters=[{x:1100,y:1792,hp:100, battlefieldMonster:true,battlefieldTeam:'jin'},{x:1200,y:1792,hp:100,battlefieldMonster:true,battlefieldTeam:'song'}];
  const match=createBattlefield({actors:()=>actors,monsters:()=>monsters,player:()=>player,playerAlive:()=>true,playerDPS:()=>0,
    create(build){const actor={x:0,y:0,n:build.faction,hp:100,max:100,stats:{life:100,main:{parts:{phys:1}}}};actors.push(actor);return actor;},
    cancel(){},remove(actor){actors.splice(actors.indexOf(actor),1)},enter(){},leave(){},respawnPlayer(){},setPlayerDead(){},position(actor,x,y){Object.assign(actor,{x,y})},restore(){}});
  match.start('song');const song=actors[0],jin=actors[1];
  for(const actor of [song,player]) {assert.equal(match.canHit(actor,monsters[0]),true);assert.equal(match.canHit(monsters[0],actor),true);}
  assert.equal(match.canHit(jin,monsters[0]),false);assert.equal(match.canHit(monsters[0],jin),false);
  assert.equal(match.canHit(player,monsters[1]),false);assert.equal(match.canHit(monsters[0],monsters[1]),true);
  song.x=1100;song.y=1792;assert.ok(match.targets(song).includes(monsters[0]));
  monsters[0].hp=0;assert.equal(match.canHit(player,monsters[0]),false);assert.equal(match.state.monsters.alive,1);
  match.tick(1200);assert.equal(match.canHit(player,monsters[1]),false);
});

test('each camp assigns balanced upper/middle/lower routes and preserves a soldier lane on respawn',async()=>{
  const {match}=fixture();match.start('song');
  const army=await match.addBothAsync({faction:'shaolin',level:150,strength:'normal',count:40},()=>{},async()=>{});
  for(const side of ['song','jin']) {
    const soldiers=army.filter(actor=>actor.battlefieldTeam===side);
    assert.deepEqual([0,1,2].map(lane=>soldiers.filter(actor=>actor.battlefieldLane===lane).length),[7,7,6]);
  }
  const actor=army[0],lane=actor.battlefieldLane;actor.hp=0;match.tick(.1);match.tick(30);
  assert.equal(actor.battlefieldLane,lane);
});
