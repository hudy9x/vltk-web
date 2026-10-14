const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { compileTypeScriptEntry } = require('../../tools/build-app');
const ROOT = path.resolve(__dirname, '../..');

// The tests execute the same bundled TypeScript entry as the browser.
function loadCombatEngine(sandbox, { bridge = true } = {}) {
  vm.runInContext(compileTypeScriptEntry('combat/index.ts').code, sandbox);
  if (bridge) vm.runInContext(fs.readFileSync(path.join(ROOT, 'app/combat/legacy-bridge.js'), 'utf8'), sandbox);
  return sandbox.CombatEngine;
}
module.exports = { loadCombatEngine };
