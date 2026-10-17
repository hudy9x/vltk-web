// Run: node tools/benchmark-combat.js. Synthetic CPU workloads, not browser FPS.
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const { compileTypeScriptEntry } = require('./build-app');
const scene = {};
vm.createContext(scene);
vm.runInContext(compileTypeScriptEntry('combat/index.ts').code, scene);
vm.runInContext(compileTypeScriptEntry('combat/spatial/target-grid.ts', 'Grid').code, scene);
const engine = scene.CombatEngine;
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const targets = Array.from({ length: 300 }, (_, i) => ({ x: i % 30 * 35, y: Math.floor(i / 30) * 35 }));
const times = []; let peak = 0;
for (let run = 0; run < 6; run++) {
  let labels = [];
  const start = performance.now();
  for (let frame = 0; frame < 90; frame++) {
    for (const target of targets) {
      engine.enqueueDamageLabel(labels, target, 100, 'phys');
      engine.enqueueDamageLabel(labels, target, 25, 'poison');
    }
    engine.updateDamageLabels(labels, 1 / 60);
    peak = Math.max(peak, labels.length);
    labels = labels.filter(label => label.life > 0);
  }
  times.push(performance.now() - start);
}
console.log(JSON.stringify({ workload: 'labels: 300 targets, 600 hits/frame, 90 frames', medianMs: median(times), peakLabels: peak }));
const bodies = Array.from({ length: 3000 }, (_, i) => ({ x: i % 100 * 80, y: Math.floor(i / 100) * 80, r: 17 }));
const bruteTimes = [], gridTimes = []; let checks = 0, expectedHits = 0, actualHits = 0;
const paths = Array.from({ length: 500 }, (_, i) => ({ x: (i * 37) % 8000, y: (i * 19) % 2400 }));
for (let run = 0; run < 6; run++) {
  let hits = 0, start = performance.now();
  for (const { x, y } of paths) for (const target of bodies) {
    if (engine.contactFraction(x, y, x + 100, y + 20, target, 8, 2) !== null) hits++;
  }
  bruteTimes.push(performance.now() - start); expectedHits = hits;
  start = performance.now(); hits = 0; checks = 0;
  const grid = new scene.Grid.TargetGrid(bodies);
  for (const { x, y } of paths) {
    const candidates = grid.query({ minX: x - 8, minY: y - 4, maxX: x + 108, maxY: y + 24 });
    checks += candidates.length;
    for (const target of candidates) if (engine.contactFraction(x, y, x + 100, y + 20, target, 8, 2) !== null) hits++;
  }
  gridTimes.push(performance.now() - start); actualHits = hits;
}
if (actualHits !== expectedHits) throw new Error('Broad phase lost collision recipients');
console.log(JSON.stringify({ workload: 'collision: 3000 bodies, 500 local paths; includes grid construction',
  bruteMedianMs: median(bruteTimes), gridMedianMs: median(gridTimes), bruteChecks: bodies.length * paths.length, gridChecks: checks, hits: actualHits }));
