const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const esbuild = require('esbuild');
const native = require('../src/server/multiplayer/definitions/runtime.cjs');
const fixtures = require('./fixtures/multiplayer-support.json');

test('Toa Vong Vo Nga reaches 100 percent at level 20 and stays capped', () => {
  const profile = structuredClone(fixtures.find(row => row.name === 'wudang').profile);
  assert.equal(profile.sk[152], 20, 'keep Vo Dang Quyen Phap active without a shield penalty');
  for (const [level, expected] of [[19, 97], [20, 100], [21, 100], [30, 100]]) {
    profile.sk[157] = level;
    assert.equal(native.buildCharacter(profile, [157], []).stats.manaShield, expected);
  }
});

test('SIM mana shield absorbs at most 100 percent and is limited by available MP', () => {
  const scope = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(esbuild.buildSync({ entryPoints: ['src/client/simulator/defense.ts'],
    bundle: true, format: 'cjs', platform: 'node', write: false }).outputFiles[0].text, scope);
  const { skillDefense } = scope.module.exports;
  for (const percent of [100, 130]) {
    const stats = { mana: 1000, manaShield: percent };
    const full = skillDefense(200, stats, 1000, 0, 0.35);
    assert.equal(full.damage, 0);
    assert.equal(full.mana, 800);
    const partial = skillDefense(200, stats, 50, 0, 0.35);
    assert.equal(partial.damage, 150);
    assert.equal(partial.mana, 0);
  }
});
