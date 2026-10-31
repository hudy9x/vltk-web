const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { loadCombatEngine } = require('./helpers/combat-engine');

test('inherited thunder Sound ID plays once at release, but not for secondary or interrupted casts', () => {
  for (const mode of ['primary', 'secondary', 'interrupted']) {
    const calls = [];
    const s = { Math, Map, Set, l: { fx: [], zoneShown: 1 }, v: { x: 0, y: 0 },
      Y: {}, QA: .81, Z0: { g: false }, R2: () => true, mt: () => true, A0: { f: {}, s: {}, m: {} }, Hi: {}, Y3: () => 0,
      G3() {}, Q8: url => calls.push(url), ws: () => .4 };
    vm.createContext(s); loadCombatEngine(s);
    s.queueSkillContact(s.v, { x: 50, y: 0, hp: 100 },
      { id: 1081, rate: 1, parts: { light: 10 }, ev2: mode === 'secondary' },
      () => {}, { targets: () => [], windup: .2 });
    if (mode !== 'secondary') assert.deepEqual(calls, [], 'windup must be silent');
    if (mode === 'interrupted') s.applyActorHurt(s.v, 200, 1000);
    for (let i = 0; i < 200; i++) s.advanceSkillContacts(.01);
    assert.deepEqual(calls, mode === 'primary' ? ['snd/skill/ngu-loi-chanh-phap-nam.wav'] : []);
  }
});

test('first audio unlock preloads both inherited thunder gender variants from config', () => {
  const requested = [];
  class AudioContext {
    createGain() { return { connect() {}, gain: {} }; }
    decodeAudioData(bytes) { return Promise.resolve(bytes); }
  }
  const s = { o: {}, window: { AudioContext }, fetch: url => {
    requested.push(url); return Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
  } };
  vm.createContext(s);
  loadCombatEngine(s, { bridge: false });
  vm.runInContext(fs.readFileSync('src/client/data/audio-tables-01.js', 'utf8'), s);
  vm.runInContext(fs.readFileSync('src/client/ui/legacy-panels-and-audio-01.js', 'utf8'), s);
  s.j8();
  for (const sex of ['nam', 'nu']) {
    const asset = `snd/skill/ngu-loi-chanh-phap-${sex}.wav`;
    assert.ok(requested.includes(asset));
    assert.ok(fs.existsSync('public/' + asset));
  }
});
