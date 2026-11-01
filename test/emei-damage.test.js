const { test } = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../src/server/multiplayer/definitions/catalog.cjs');

test('online Kiem Hoa ring preserves primary physical damage and critical chance, increasing only cold by 30%', () => {
  const profile = catalog.character({
    fac: 'emei', lvl: 150, slots: [1061], sk: {1061: 25},
    eq: {weapon: {d: 0, k: 0, lvl: 1, nat: 0, g: 0, base: [], mag: []}},
  }, [], false);
  const skill = profile.skills.find(skill => skill.id === 1061);
  const ring = skill.followups.find(event => event.id === 1091);
  assert.ok(skill.parts[0] > 0 && skill.parts[2] > 0);
  assert.equal(skill.missiles, 5);
  assert.equal(ring.parts[0], skill.parts[0]);
  assert.equal(ring.parts[2], skill.parts[2] * 1.3);
  assert.equal(ring.crit, skill.crit);
  assert.equal(ring.delay, 0.2);
});
