const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { compileTypeScriptEntry } = require('../tools/build-app');
const { createHeadlessGame } = require('../tools/sim-balance/legacy-runtime.ts');

const directory = 'src/client/maps/content/9003';
const layout = JSON.parse(fs.readFileSync(`${directory}/layout.json`, 'utf8'));
const scope = { atob, btoa };
vm.runInNewContext(compileTypeScriptEntry('maps/index.ts', 'Maps').code, scope);
const maps = scope.Maps;
function navigation() {
  const nav = maps.createNavigationRuntime();
  nav.load(9003, maps.createLegacyCatalog().navigation[9003]);
  return nav;
}

test('Hoang Nguyen is selectable, owns its assets and separates ground, shadows and sortable props', () => {
  const map = maps.getMap(9003);
  assert.equal(map.status, 'available');
  assert.equal(map.size.width, 3584);
  assert.equal(map.size.height, 3584);
  assert.deepEqual(layout.camps, { song: { x: 680, y: 2784 }, jin: { x: 2904, y: 800 } });
  const { song, jin } = layout.camps;
  assert.ok(song.x < 896 && song.y > 2688, 'Song camp is in the bottom-left quarter');
  assert.ok(jin.x > 2688 && jin.y < 896, 'Jin camp is in the top-right quarter');
  assert.equal(map.entry.x, song.x);
  assert.equal(map.entry.y, song.y);
  assert.deepEqual(Array.from(map.layers, layer => layer.type), ['ground', 'shadow', 'world']);
  const objects = map.layers.find(layer => layer.type === 'world').objects;
  assert.ok(objects.length >= 100);
  for (const image of [...map.layers.filter(layer => layer.image).map(layer => layer.image), ...objects.map(object => object.image)]) {
    assert.match(image, /^\.\/assets\//);
    assert.ok(fs.existsSync(`${directory}/${image}`));
  }
  const battle = {};
  vm.runInNewContext(compileTypeScriptEntry('simulator/battlefield.ts', 'Battle').code, battle);
  assert.deepEqual(Array.from(battle.Battle.BATTLEFIELD_MAPS, map => map.id), [9001, 9002, 9003]);
});

test('all three painted roads retain a clear corridor in the actual navigation grid', () => {
  const nav = navigation();
  assert.equal(layout.paths.length, 3);
  for (const [lane, route] of layout.paths.entries()) {
    assert.deepEqual(route[0], [layout.camps.song.x, layout.camps.song.y]);
    assert.deepEqual(route.at(-1), [layout.camps.jin.x, layout.camps.jin.y]);
    for (let index = 0; index < route.length; index++) {
      const [x, y] = route[index];
      for (const [dx, dy] of [[0, 0], [32, 0], [-32, 0], [0, 16], [0, -16]])
        assert.ok(nav.canStand(x+dx, y+dy), `route ${lane} blocked at ${x+dx},${y+dy}`);
      if (index) assert.ok(nav.clear(...route[index-1], x, y), `route ${lane} crosses collision`);
    }
  }
});

test('every camp, 100 army formation slots per side, and service NPC positions are walkable', () => {
  const nav = navigation();
  for (const [team, camp] of Object.entries(layout.camps)) {
    assert.ok(nav.canStand(camp.x, camp.y));
    assert.equal(layout.armySpawns[team].length, 100);
    for (const [index, point] of layout.armySpawns[team].entries())
      assert.ok(nav.canStand(point.x, point.y), `${team} formation slot ${index} blocked`);
    for (const [dx, dy] of [[105, 50], [145, -45], [-110, -75]])
      assert.ok(nav.canStand(camp.x+dx, camp.y+dy), `${team} service location blocked`);
  }
  const { song, jin } = layout.camps;
  // The diagonal spans more cells; use the full grid budget for connectivity.
  assert.ok(nav.path(song.x, song.y, jin.x, jin.y, nav.state.g.ok.length).length);
  for (const [from, to] of [[song, jin], [jin, song]]) {
    const actor = { ...from };
    for (let frame = 0; frame < 1600 && Math.hypot(actor.x-to.x, actor.y-to.y) > 8; frame++) {
      nav.beginTick();
      nav.moveWithFlow(actor, to.x, to.y, 6);
      assert.ok(nav.canStand(actor.x, actor.y));
    }
    assert.ok(Math.hypot(actor.x-to.x, actor.y-to.y) <= 8, 'both camps are reachable with live movement');
  }
  const npcs = maps.mapNpcs(maps.getMap(9003));
  assert.equal(npcs.length, 6);
  for (const team of ['song', 'jin']) {
    const services = npcs.filter(npc => npc.team === team);
    assert.deepEqual(Array.from(services, npc => npc.npcId).sort(), ['horse', 'pharmacy', 'tongkim']);
    for (const npc of services) assert.ok(nav.canStand(npc.position.x, npc.position.y));
  }
});

test('wide compounds have exactly the requested three gates and continuous wooden walls elsewhere', () => {
  const nav = navigation();
  const expected = { song: ['NE', 'SE', 'NW'], jin: ['SW', 'SE', 'NW'] };
  const objects = maps.getMap(9003).layers.find(layer => layer.type === 'world').objects;
  for (const [team, compound] of Object.entries(layout.compounds)) {
    assert.deepEqual(Object.keys(compound.gates).sort(), expected[team].sort());
    assert.ok(compound.radius.x >= 720 && compound.radius.y >= 480);
    assert.ok(objects.filter(object => object.id.startsWith(`${team}-wall-`)).length >= 25);
    for (const gate of Object.values(compound.gates)) {
      assert.ok(gate.width >= 250);
      for (const point of [gate.position, gate.inside, gate.outside]) assert.ok(nav.canStand(point.x, point.y));
      assert.ok(nav.clear(gate.inside.x, gate.inside.y, gate.outside.x, gate.outside.y), `${team} gate passage is open`);
      const marshal = layout.marshals[team];
      assert.ok(nav.path(marshal.x, marshal.y, gate.outside.x, gate.outside.y, nav.state.g.ok.length)?.length,
        `${team} marshal plaza connects to each gate`);
    }
    for (const line of layout.fenceSegments.filter(line => line.team === team)) {
      for (let step = 0; step <= 20; step++) {
        const x = line.start[0] + (line.end[0]-line.start[0])*step/20;
        const y = line.start[1] + (line.end[1]-line.start[1])*step/20;
        assert.equal(nav.walkable(x, y), false, `${team} fence cannot be crossed outside a gate`);
      }
    }
  }
});

test('ceremonial platforms stay below actors, the surrounding combat ring is open, and tents stay in muster areas', () => {
  const nav = navigation(), objects = maps.getMap(9003).layers.find(layer => layer.type === 'world').objects;
  for (const [team, compound] of Object.entries(layout.compounds)) {
    const marshal = layout.marshals[team];
    const platform = objects.find(object => object.id === `${team}-platform`);
    assert.ok(platform);
    assert.equal(platform.position.x, marshal.x);
    assert.equal(platform.position.y, marshal.y);
    assert.ok(platform.depthOffsetY < -100, 'walkable platform is painted beneath standing actors');
    assert.ok(nav.canStand(marshal.x, marshal.y));
    let previous;
    for (let step = 0; step <= 120; step++) {
      const angle = step*Math.PI*2/120, point = { x: marshal.x+250*Math.cos(angle), y: marshal.y+150*Math.sin(angle) };
      assert.ok(nav.canStand(point.x, point.y), `${team} combat ring has no obstacles`);
      if (previous) assert.ok(nav.clear(previous.x, previous.y, point.x, point.y));
      previous = point;
    }
    const tents = objects.filter(object => object.id.startsWith(`${team}-muster-tent-`));
    assert.equal(tents.length, 2);
    const area = compound.musterArea;
    for (const tent of tents) {
      assert.ok(tent.position.x >= area.left && tent.position.x <= area.right && tent.position.y >= area.top && tent.position.y <= area.bottom);
      assert.ok(Math.hypot((tent.position.x-marshal.x)/250, (tent.position.y-marshal.y)/150) > 1.5);
    }
  }
});

test('maximum patrol configuration uses safe, reachable mirrored points belonging to its team', () => {
  const scope = {};
  vm.runInNewContext(compileTypeScriptEntry('simulator/soldier-config.ts', 'Soldiers').code, scope);
  const { soldierSpawnPlan, soldierTeamAt, DEFAULT_SOLDIERS } = scope.Soldiers;
  const configuration = structuredClone(DEFAULT_SOLDIERS);
  for (const rank of Object.keys(configuration)) configuration[rank].count = 0;
  configuration.soldier.count = 100;
  configuration.captain.count = 100;
  const plan = soldierSpawnPlan(configuration, 9003), nav = navigation();
  assert.equal(plan.length, 200);
  const homes = new Set();
  for (const point of plan) {
    assert.ok(nav.canStand(point.x, point.y));
    assert.equal(soldierTeamAt(point.x, point.y, 9003), point.team);
    homes.add(`${point.x},${point.y}`);
  }
  assert.equal(homes.size, 200, 'all patrol homes are distinct at maximum capacity');
  for (let index = 0; index < plan.length; index += 2) {
    assert.equal(plan[index].x + plan[index+1].x, 3584);
    assert.equal(plan[index].y + plan[index+1].y, 3584);
  }
});

test('live battlefield integration enters and respawns on 9003, then restores both existing layouts', () => {
  const game = createHeadlessGame(process.cwd()), sim = game.arenaSimulator;
  for (const team of ['song', 'jin']) {
    sim.battlefield.start(team, { song: 3, jin: 2 }, 9003);
    assert.equal(sim.battlefield.state.mapId, 9003);
    assert.equal(game.v.x, layout.camps[team].x);
    assert.equal(game.v.y, layout.camps[team].y);
    assert.equal(sim.roadMonsters.actors.length, 70);
    const nav = navigation();
    for (const actor of sim.roadMonsters.actors) assert.ok(nav.canStand(actor.x, actor.y));
    for (const side of ['song', 'jin']) {
      const marshal = sim.actors.find(actor => actor.battlefieldTeam === side && actor.battlefieldBoss);
      assert.equal(marshal.x, layout.marshals[side].x);
      assert.equal(marshal.y, layout.marshals[side].y);
      assert.notEqual(marshal.x, layout.camps[side].x, 'marshal is separate from the muster/respawn point');
      const [fighter] = sim.battlefield.add({ team: side, faction: 'shaolin', level: 90, strength: 'normal', count: 1 });
      assert.equal(fighter.x, layout.armySpawns[side][0].x);
      assert.equal(fighter.y, layout.armySpawns[side][0].y);
      assert.ok(sim.battlefield.canHit(fighter, sim.actors.find(actor => actor.battlefieldTeam !== side && actor.battlefieldBoss)));
    }
    game.l.life = 0;
    sim.battlefield.playerDied();
    sim.tick(30.01);
    assert.ok(game.l.life > 0);
    assert.equal(game.v.x, layout.camps[team].x);
    assert.equal(game.v.y, layout.camps[team].y);
    for (const side of ['song', 'jin']) {
      const marshal = sim.actors.find(actor => actor.battlefieldTeam === side && actor.battlefieldBoss);
      assert.equal(marshal.x, layout.marshals[side].x);
      assert.equal(marshal.y, layout.marshals[side].y);
    }
  }
  sim.battlefield.start('song', { song: 3, jin: 2 }, 9002);
  assert.equal(game.v.x, 850);
  assert.equal(game.v.y, 950);
  sim.battlefield.start('song');
  assert.equal(game.v.x, 450);
  assert.equal(game.v.y, 1792);
});

test('open terrain on 9003 does not inherit the three-bridge waypoint detour of 9001', () => {
  // Bundle the two exports together to share the live BATTLE_MAP binding.
  const esbuild = require('esbuild');
  const code = esbuild.buildSync({ stdin: { contents: `export { createBattlefield } from './src/client/simulator/battlefield'; export { createBattlefieldApproach } from './src/client/simulator/approach';`, resolveDir: process.cwd() }, bundle: true, format: 'iife', globalName: 'World', write: false }).outputFiles[0].text;
  const scope = {};
  vm.runInNewContext(code, scope);
  const actors = [];
  const match = scope.World.createBattlefield({ actors: () => actors, player: () => ({}), playerAlive: () => true,
    playerDPS: () => 0, enter() {}, leave() {}, remove() {}, cancel() {}, position() {}, restore() {},
    respawnPlayer() {}, setPlayerDead() {}, create() { const actor = { hp: 1, stats: {}, res: {} }; actors.push(actor); return actor; } });
  const approach = scope.World.createBattlefieldApproach();
  match.start('song', { song: 3, jin: 2 }, 9003);
  assert.equal(approach({ x: 1400, y: 1000 }, { x: 2200, y: 1000 }), null);
  match.start('song');
  assert.ok(approach({ x: 1400, y: 1000 }, { x: 2200, y: 1000 }));
});
