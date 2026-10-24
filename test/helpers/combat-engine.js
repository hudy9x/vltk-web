const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { compileTypeScriptEntry } = require('../../tools/build-app');
const ROOT = path.resolve(__dirname, '../..');

// The tests execute the same bundled TypeScript entry as the browser.
function loadCombatEngine(sandbox, { bridge = true, productionSpeed = false } = {}) {
  vm.runInContext(compileTypeScriptEntry('combat/index.ts').code, sandbox);
  // Mechanism tests use a fixed one-second baseline, independently of balance
  // tuning. Tests of the shipped balance table opt into productionSpeed.
  if (!productionSpeed) {
    const attack = sandbox.CombatEngine.SPEED_CONFIG.attack;
    attack.referenceFrames = 20;
    attack.phases = [25, 50, 75, 100, 125, 150, 200, 250, 300]
      .map(minPercent => ({ minPercent, fps: minPercent / 5 }));
  }
  if (bridge) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/client/combat/legacy-bridge.js'), 'utf8'), sandbox);
  return sandbox.CombatEngine;
}
module.exports = { loadCombatEngine };
