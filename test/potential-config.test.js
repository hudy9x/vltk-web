const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { compileTypeScriptEntry } = require('../tools/build-app');
const json = require('../src/client/config/potential-allocation.json');
const scope = {};
vm.runInNewContext(compileTypeScriptEntry('config/potential-allocation.ts', 'PotentialAllocation').code, scope);

test('the runtime bundles exactly the approved JSON and validates every default/override', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(scope.PotentialAllocation.config)), json);
  assert.equal(scope.PotentialAllocation.validateConfig(json), json);
});

test('malformed ratios fail explicitly instead of silently changing allocations', () => {
  for (const mutate of [
    config => { config.defaults.external.str = -1; },
    config => { config.defaults.internal.eng = 100; },
    config => { delete config.defaults.external.dex; },
    config => { config.overrides.wudang.qi.eng = NaN; },
    config => { config.defaults.external.extra = 0; },
    config => { config.preserveAllocatedPoints = false; },
    config => { config.equipmentFirst = 'yes'; },
    config => { config.version = 2; },
  ]) {
    const invalid = structuredClone(json); mutate(invalid);
    assert.throws(() => scope.PotentialAllocation.validateConfig(invalid));
  }
});
