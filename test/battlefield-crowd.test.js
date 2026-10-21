const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { compileTypeScriptEntry } = require('../tools/build-app');
function moduleAt(path, name) { const scope = { atob, btoa }; vm.runInNewContext(compileTypeScriptEntry(path, name).code, scope); return scope[name]; }
const { createCrowdSteering } = moduleAt('simulator/crowd.ts', 'Crowd');
const { createBattlefieldApproach } = moduleAt('simulator/approach.ts', 'Approach');
const { distributeArmy, ARMY_FACTIONS } = moduleAt('simulator/composition.ts', 'Army');

test('percentages allocate exactly the requested count, omit zero weights and reject invalid totals before creation', () => {
  for (const count of [1, 7, 20, 33, 100]) {
    const result = distributeArmy(count, Object.fromEntries(ARMY_FACTIONS.map(key => [key, 10])));
    assert.equal(Object.values(result).reduce((sum, value) => sum + value, 0), count);
    assert.ok(Math.max(...Object.values(result)) - Math.min(...Object.values(result)) <= 1);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(distributeArmy(7, { shaolin: 25, emei: 75 }))), { shaolin: 2, tianwang: 0, tangmen: 0, wudu: 0, emei: 5, cuiyan: 0, gaibang: 0, tianren: 0, wudang: 0, kunlun: 0 });
  for (const ratios of [{ shaolin: 99 }, { shaolin: NaN }, { shaolin: -1, emei: 101 }, { typo: 100 }]) assert.throws(() => distributeArmy(10, ratios));
});

test('local steering passes a stopped ally, respects obstacles and never steps into its personal space', () => {
  const crowd = createCrowdSteering(), actor = { x: 0, y: 0, simId: 'sim-1', hp: 100, battlefieldTeam: 'song' };
  const stopped = { x: 48, y: 0, simId: 'sim-2', hp: 100, battlefieldTeam: 'song' };
  let movedAside = false;
  for (let frame = 0; frame < 160; frame++) {
    crowd.begin([actor, stopped]);
    const dx = 200 - actor.x, dy = -actor.y, length = Math.hypot(dx, dy);
    const proposed = { x: actor.x + dx / length * 3, y: actor.y + dy / length * 3 };
    const next = crowd.steer(actor, proposed, 3, (x, y, tx, ty) => ty >= -50 && ty <= 50);
    Object.assign(actor, next);
    movedAside ||= Math.abs(actor.y) > 10;
    assert.ok(Math.hypot(actor.x - stopped.x, (actor.y - stopped.y) * 2) >= 33, 'no body overlap');
  }
  assert.ok(movedAside); assert.ok(actor.x > 120, 'passes the obstruction instead of remaining in a queue');
});

test('two moving armies use several bridge lanes while staying on walkable terrain and maintaining spacing', () => {
  const maps = moduleAt('maps/index.ts', 'Maps'), nav = maps.createNavigationRuntime();
  nav.load(9001, maps.createLegacyCatalog().navigation[9001]);
  const approach = createBattlefieldApproach(), crowd = createCrowdSteering();
  const actors = [];
  for (const [side, x, goal] of [['song', 1300, 2350], ['jin', 2284, 1234]]) for (let i = 0; i < 15; i++) actors.push({ x: x + (side === 'song' ? -1 : 1) * Math.floor(i / 5) * 60, y: 1736 + (i % 5) * 28, simId: `sim-${actors.length + 1}`, battlefieldTeam: side, hp: 100, goal, lane: ((i % 5) - 2) * 16 });
  let bridgeCount = 0;
  for (let frame = 0; frame < 600; frame++) {
    nav.beginTick(); crowd.begin(actors);
    for (const actor of actors) {
      const goal = approach(actor, { x: actor.goal, y: 1792 }) || { x: actor.goal, y: 1792 };
      const before = { x: actor.x, y: actor.y };
      const waypoint = crowd.route(actor, {x:goal.x,y:goal.y+actor.lane},nav.clear);
      nav.moveWithFlow(actor, waypoint.x, waypoint.y, 4);
      const proposed = { x: actor.x, y: actor.y }; Object.assign(actor, before);
      Object.assign(actor, crowd.steer(actor, proposed, 4, nav.clear));
      assert.ok(nav.canStand(actor.x, actor.y));
      if (actor.x > 1632 && actor.x < 1952) bridgeCount++;
    }
  }
  assert.ok(bridgeCount > 100, 'both sides reach and traverse bridge lanes');
  for (let i = 0; i < actors.length; i++) for (let j = i + 1; j < actors.length; j++) assert.ok(Math.hypot(actors[i].x - actors[j].x, (actors[i].y - actors[j].y) * 2) >= 32.9);
  assert.ok(actors.some(actor => actor.battlefieldTeam === 'song' && actor.x > 1952));
  assert.ok(actors.some(actor => actor.battlefieldTeam === 'jin' && actor.x < 1632));
});

test('a SIM plans around a wall of people including the real player rather than oscillating at its center', () => {
  const crowd = createCrowdSteering(), actor = {x:0,y:0,hp:100,simId:'walker',battlefieldTeam:'song'};
  const blockers = Array.from({length:9},(_,i)=>({x:96,y:(i-4)*23,hp:100,simId:i===4?'player':`blocker-${i}`}));
  const goal = {x:260,y:0}; let widest=0;
  for (let frame=0;frame<500;frame++) {
    crowd.begin([actor,...blockers],.02);
    const waypoint=crowd.route(actor,goal,()=>true);
    const dx=waypoint.x-actor.x,dy=waypoint.y-actor.y,len=Math.hypot(dx,dy)||1;
    const fraction=Math.min(1,3/len);
    const proposed={x:actor.x+dx*fraction,y:actor.y+dy*fraction};
    Object.assign(actor,crowd.steer(actor,proposed,3,()=>true));
    widest=Math.max(widest,Math.abs(actor.y));
    for (const body of blockers) assert.ok(Math.hypot(actor.x-body.x,(actor.y-body.y)*2)>=32.9);
    if(Math.hypot(actor.x-goal.x,actor.y-goal.y)<5)break;
  }
  assert.ok(actor.x>230,'walks past the entire group');
  assert.ok(widest>100,'takes a route around the wall rather than pushing between bodies');
});
