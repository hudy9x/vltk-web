// Synthetic main-thread CPU benchmark, not browser FPS.
// Run: node tools/benchmark-tongkim.js [SIM count, default 40]
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const { Worker } = require('node:worker_threads');
const { compileTypeScriptEntry } = require('./build-app');
function load(file, name) { const s = { atob, btoa, setTimeout, clearTimeout }; vm.runInNewContext(compileTypeScriptEntry(file, name).code, s); return s[name]; }
const { createCrowdSteering } = load('simulator/crowd.ts', 'Crowd');
const { createPathWorkerClient } = load('simulator/path-worker-client.ts', 'Client');
const Maps = load('maps/index.ts', 'Maps');
const source = compileTypeScriptEntry('workers/crowd-path.ts', 'RouteWorker').code;
function background() {
  const thread = new Worker(`const {parentPort}=require('node:worker_threads');
    globalThis.postMessage=data=>parentPort.postMessage(data);${source}
    parentPort.on('message',data=>globalThis.onmessage({data}));`, { eval: true });
  let resolve;
  const bridge = { onmessage: null, onerror: null, onmessageerror: null,
    postMessage(message) { if (message.kind === 'routes') bridge.idle = new Promise(done => { resolve = done; }); thread.postMessage(message); },
    terminate() { thread.terminate(); }, idle: Promise.resolve(), callbackMs: 0 };
  thread.on('message', data => { const start = performance.now(); bridge.onmessage?.({ data }); bridge.callbackMs += performance.now() - start; resolve?.(); });
  thread.on('error', error => { bridge.onerror?.(error); resolve?.(); });
  return bridge;
}
const count = Number(process.argv[2] || 40);
if (!Number.isInteger(count) || count < 2 || count > 200 || count % 2) throw Error('Use an even SIM count between 2 and 200');
async function run(useWorker) {
  const nav = Maps.createNavigationRuntime(); nav.load(9003, Maps.createLegacyCatalog().navigation[9003]);
  const bridge = useWorker ? background() : null;
  const client = bridge ? createPathWorkerClient(() => bridge) : undefined;
  const crowd = createCrowdSteering(client), actors = [];
  for (const [team, x, goal] of [['song', 1300, 2350], ['jin', 2284, 1234]]) for (let i = 0; i < count / 2; i++)
    actors.push({ x: x + (team === 'song' ? -1 : 1) * Math.floor(i / 5) * 60, y: 1736 + i % 5 * 28,
      simId: `sim-${actors.length+1}`, battlefieldTeam: team, hp: 100, goal, lane: (i % 5 - 2) * 16 });
  const times = []; let clearCalls = 0;
  const clear = (...args) => { clearCalls++; return nav.clear(...args); };
  try {
    for (let frame = 0; frame < 360; frame++) {
      const start = performance.now(); nav.beginTick(); crowd.begin(actors, 1/60);
      for (const actor of actors) {
        const goal = { x: actor.goal, y: 1792 };
        const before = { x: actor.x, y: actor.y };
        const waypoint = crowd.route(actor, { x: goal.x, y: goal.y + actor.lane }, clear);
        nav.moveWithFlow(actor, waypoint.x, waypoint.y, 4);
        const proposed = { x: actor.x, y: actor.y }; Object.assign(actor, before);
        Object.assign(actor, crowd.steer(actor, proposed, 4, clear));
      }
      crowd.flush(nav.state.g);
      let elapsed = performance.now() - start;
      // Exclude time waiting for the worker, include main-thread result validation.
      const callbacksBefore = bridge?.callbackMs || 0;
      if (bridge) await bridge.idle;
      elapsed += (bridge?.callbackMs || 0) - callbacksBefore;
      for (const actor of actors) if (!nav.canStand(actor.x, actor.y)) throw Error('Actor left walkable terrain');
      for (let i = 0; i < actors.length; i++) for (let j = i + 1; j < actors.length; j++)
        if (Math.hypot(actors[i].x - actors[j].x, (actors[i].y - actors[j].y) * 2) < 32.9) throw Error('Actors overlapped');
      if (frame >= 60) times.push(elapsed);
    }
  } finally { crowd.reset(); }
  times.sort((a,b)=>a-b);
  return { mode: useWorker ? 'worker' : 'synchronous', sims: count, measuredTicks: times.length,
    mainThreadMs: { p50: +times[Math.floor(times.length*.5)].toFixed(3), p95: +times[Math.floor(times.length*.95)].toFixed(3), max: +times.at(-1).toFixed(3) },
    mainThreadClearCalls: clearCalls };
}
(async () => { console.log(JSON.stringify(await run(false))); console.log(JSON.stringify(await run(true))); })().catch(error => { console.error(error); process.exitCode = 1; });
