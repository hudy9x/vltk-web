const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { Worker } = require('node:worker_threads');
const { once } = require('node:events');
const { compileTypeScriptEntry } = require('../tools/build-app');
function moduleAt(file, name) {
  const scope = { setTimeout, clearTimeout, atob, btoa };
  vm.runInNewContext(compileTypeScriptEntry(file, name).code, scope);
  return scope[name];
}
const { createPathWorkerClient } = moduleAt('simulator/path-worker-client.ts', 'Client');
const { createCrowdSteering } = moduleAt('simulator/crowd.ts', 'Crowd');
function fakeWorker() {
  return { sent: [], terminated: false, onmessage: null, onerror: null, onmessageerror: null,
    postMessage(message) { this.sent.push(message); }, terminate() { this.terminated = true; },
    reply(points = [{ x: 30, y: 60 }]) {
      const batch = this.sent.findLast(message => message.kind === 'routes');
      this.onmessage({ data: batch.jobs.map(job => ({ id: job.id, points })) });
    } };
}

test('route jobs are batched, bounded, coalesced and terrain is sent once per worker', () => {
  const worker = fakeWorker(), client = createPathWorkerClient(() => worker);
  const bodies = Array.from({ length: 10 }, (_, x) => ({ x, y: 0 })), received = [];
  for (const actor of bodies) client.request(actor, { x: 100, y: 0 }, () => received.push(actor));
  client.request(bodies[0], { x: 200, y: 0 }, () => received.push('latest'));
  client.flush(bodies, null);
  assert.equal(worker.sent.length, 2);
  assert.equal(worker.sent[1].jobs.length, 3);
  assert.equal(worker.sent[1].jobs[0].goal.x, 200);
  client.flush(bodies, null); assert.equal(worker.sent.length, 2, 'one batch in flight');
  client.cancel(bodies[1]); worker.reply();
  assert.equal(received.length, 2); assert.equal(received[0], 'latest');
  while (received.length < 9) { client.flush(bodies, null); worker.reply(); }
  assert.equal(worker.sent.filter(message => message.kind === 'terrain').length, 1);
  assert.deepEqual(worker.sent.filter(message => message.kind === 'routes').map(message => message.jobs.length), [3, 3, 3, 1]);
  client.reset(); assert.equal(worker.terminated, true);
});

test('worker failures and stalled responses release the queue for synchronous fallback', () => {
  const worker = fakeWorker(), client = createPathWorkerClient(() => worker), actor = { x: 0, y: 0 };
  client.request(actor, { x: 100, y: 0 }, () => assert.fail('failed worker callback'));
  client.flush([actor], null); worker.onerror({});
  assert.equal(client.available, false); assert.equal(worker.terminated, true);
  assert.equal(client.request(actor, actor, () => {}), false);
  const unavailable = createPathWorkerClient(() => { throw Error('CSP/unsupported'); });
  assert.equal(unavailable.available, false);
});

test('reset discards old messages and starts a fresh worker for the next match', () => {
  const first = fakeWorker(), second = fakeWorker(), workers = [first, second];
  const client = createPathWorkerClient(() => workers.shift()), actor = { x: 0, y: 0 };
  client.request(actor, actor, () => assert.fail('old callback')); client.flush([actor], null);
  const oldMessage = first.onmessage;
  client.reset(); let completed = false;
  client.request(actor, actor, () => { completed = true; }); client.flush([actor], null);
  oldMessage({ data: [{ id: 1, points: [] }] });
  // Old handler must not drain the new batch.
  second.reply(); assert.equal(completed, true); client.reset();
});

function routeFixture() {
  const worker = fakeWorker(), client = createPathWorkerClient(() => worker), crowd = createCrowdSteering(client);
  const actor = { x: 0, y: 0, hp: 100, generation: 1, target: {} };
  const blocker = { x: 96, y: 0, hp: 100 };
  const goal = { x: 260, y: 0 }; let clearCalls = 0;
  const clear = () => { clearCalls++; return true; };
  crowd.begin([actor, blocker], .016);
  assert.equal(crowd.route(actor, goal, clear), goal);
  assert.equal(clearCalls, 0, '961-cell terrain rasterization never runs on main thread');
  crowd.flush(null);
  return { worker, crowd, actor, blocker, goal, clear };
}
test('worker detours are used only when the actor, generation, target and origin remain valid', () => {
  const valid = routeFixture(); valid.worker.reply();
  assert.equal(valid.crowd.route(valid.actor, valid.goal, valid.clear).y, 60); valid.crowd.reset();
  for (const change of [s => { s.actor.hp = 0; }, s => { s.actor.generation++; },
    s => { s.actor.target = {}; }, s => { s.actor.x = 90; },
    s => { s.crowd.cancel(s.actor); }, s => { s.crowd.begin([s.actor, s.blocker], 1); }]) {
    const s = routeFixture(); change(s); s.worker.reply();
    assert.equal(s.crowd.route(s.actor, s.goal, s.clear), s.goal); s.crowd.reset();
  }
});

test('built worker executes on another thread and detours around bodies on actual map terrain', async t => {
  const Maps = moduleAt('maps/index.ts', 'Maps'), nav = Maps.createNavigationRuntime();
  nav.load(9003, Maps.createLegacyCatalog().navigation[9003]);
  const actor = { x: 1300, y: 1792 }, goal = { x: 1560, y: 1792 };
  const bodies = [actor, ...Array.from({ length: 7 }, (_, i) => ({ x: 1396, y: 1792 + (i - 3) * 23 }))];
  const source = compileTypeScriptEntry('workers/crowd-path.ts', 'PathWorker').code;
  const worker = new Worker(`const {parentPort}=require('node:worker_threads');
    globalThis.postMessage=data=>parentPort.postMessage(data);
    ${source}
    parentPort.on('message',data=>globalThis.onmessage({data}));`, { eval: true });
  t.after(() => worker.terminate());
  worker.postMessage({ kind: 'terrain', grid: nav.state.g });
  const reply = once(worker, 'message');
  worker.postMessage({ kind: 'routes', bodies, jobs: [{ id: 1, actorIndex: 0, start: actor, goal }] });
  const [[result]] = await reply;
  assert.ok(result.points?.length); assert.ok(result.points.some(point => Math.abs(point.y - actor.y) > 60));
  let before = actor;
  for (const point of result.points) {
    assert.ok(nav.canStand(point.x, point.y)); assert.ok(nav.clear(before.x, before.y, point.x, point.y));
    for (const body of bodies.slice(1)) assert.ok(Math.hypot(point.x-body.x,(point.y-body.y)*2) >= 40);
    before = point;
  }
});

test('a worker that stops responding times out instead of leaving movement requests pending forever', () => {
  let timeout, cleared = 0;
  const scope = { setTimeout: callback => { timeout = callback; return 1; }, clearTimeout: () => { cleared++; } };
  vm.runInNewContext(compileTypeScriptEntry('simulator/path-worker-client.ts', 'Client').code, scope);
  const worker = fakeWorker(), client = scope.Client.createPathWorkerClient(() => worker), actor = { x: 0, y: 0 };
  client.request(actor, { x: 300, y: 0 }, () => assert.fail('no response expected')); client.flush([actor], null);
  timeout(); assert.equal(client.available, false); assert.equal(worker.terminated, true); assert.equal(cleared, 1);
});

test('cancelling an actor discards its path and allows a new request after respawn', () => {
  const s = routeFixture(); s.crowd.cancel(s.actor); s.worker.reply();
  s.actor.generation++;
  s.crowd.begin([s.actor, s.blocker], .016);
  s.crowd.route(s.actor, s.goal, s.clear); s.crowd.flush(null); s.worker.reply();
  assert.equal(s.crowd.route(s.actor, s.goal, s.clear).y, 60); s.crowd.reset();
});

test('a changed goal and terrain obstruction invalidate returned detours before movement uses them', () => {
  const s = routeFixture(); s.worker.reply();
  const movedGoal = { x: 260, y: 140 };
  assert.equal(s.crowd.route(s.actor, movedGoal, s.clear), movedGoal);
  s.crowd.reset();
  const blocked = routeFixture(); blocked.worker.reply();
  assert.equal(blocked.crowd.route(blocked.actor, blocked.goal, () => false), blocked.goal);
  blocked.crowd.reset();
});

test('browser factory receives the bundled worker code and releases its Blob URL', () => {
  let source, created, revoked;
  const worker = fakeWorker();
  const scope = { setTimeout, clearTimeout,
    Blob: class { constructor(parts) { source = parts.join(''); } },
    URL: { createObjectURL: () => 'blob:tongkim-test', revokeObjectURL: url => { revoked = url; } },
    Worker: class { constructor(url, options) { created = { url, options }; return worker; } },
  };
  vm.runInNewContext(compileTypeScriptEntry('simulator/path-worker-client.ts', 'Client').code, scope);
  const client = scope.Client.createPathWorkerClient();
  assert.equal(client.available, true); assert.equal(created.url, 'blob:tongkim-test');
  assert.equal(created.options.name, 'tongkim-pathfinding'); assert.equal(revoked, created.url);
  assert.ok(source.length > 1000, 'build embeds the real worker rather than an empty placeholder');
  const threadScope = { postMessage: () => {} }; vm.runInNewContext(source, threadScope);
  assert.equal(typeof threadScope.onmessage, 'function'); client.reset();
});
