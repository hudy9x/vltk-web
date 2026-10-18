const vm = require('node:vm');
const { compileTypeScriptEntry } = require('../../tools/build-app');

function loadMapsEngine(sandbox) {
  sandbox.atob = atob;
  vm.runInContext(compileTypeScriptEntry('maps/index.ts', 'MapsEngine').code, sandbox);
  return sandbox.MapsEngine;
}
module.exports = { loadMapsEngine };
