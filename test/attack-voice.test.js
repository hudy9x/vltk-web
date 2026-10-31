const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { loadCombatEngine } = require('./helpers/combat-engine');
const { compileTypeScriptEntry } = require('../tools/build-app');

function fixture(sex = 0) {
  const calls = [];
  const s = { Math: Object.assign(Object.create(Math), { random: () => 0 }), Map, Set, window: {}, o: { sex }, l: { fx: [], zoneShown: 1, life: 100 },
    v: { x: 0, y: 0 }, Y: {}, QA: .81, Z0: { g: false }, R2: () => true, mt: () => true,
    A0: { f: {}, s: {}, m: {} }, Hi: {}, Y3: () => 0, G3() {}, x8() {}, ws: () => .4,
    F5: () => [], l8: () => 0, skillCastDistance: () => 40 };
  vm.createContext(s);
  vm.runInContext(fs.readFileSync('src/client/ui/legacy-panels-and-audio-01.js', 'utf8'), s);
  s.c0.ctx = { currentTime: 1 };
  s.Q8 = url => { calls.push(url); return { stop() {} }; };
  loadCombatEngine(s);
  return { s, calls };
}

for (const sex of [0, 1]) for (const sim of [false, true]) {
  test(`${sim ? 'SIM' : 'player'} releases the ${sex ? 'female' : 'male'} voice once per attack`, () => {
    const { s, calls } = fixture(sim ? 1 - sex : sex);
    const actor = sim ? { x: 0, y: 0, hp: 100, profile: { sex } } : s.v;
    const target = { x: 40, y: 0, hp: 100 };
    const skill = { id: 10, rate: 1, parts: { phys: 10 } };
    if (sim) {
      vm.runInContext(compileTypeScriptEntry('simulator/skill-cast.ts', 'SimSkillCasting').code, s);
      s.SimSkillCasting.castSimulatorSkill(actor, target, skill, () => true, () => [target], () => 10, fn => fn());
    } else s.queueSkillContact(actor, target, skill, () => {}, { targets: () => [target] });
    assert.deepEqual(calls, [], 'windup is silent');
    for (let i = 0; i < 200; i++) s.advanceSkillContacts(.01);
    const expected = `snd/sfx-${sex ? 'female' : 'male'}.MP3`;
    assert.deepEqual(calls, [expected]);
    assert.ok(fs.existsSync('public/' + expected));
  });
}

test('secondary effects and interrupted primary attacks do not emit a voice', () => {
  for (const secondary of [false, true]) {
    const { s, calls } = fixture();
    s.queueSkillContact(s.v, { x: 40, y: 0, hp: 100 },
      { id: 10, rate: 1, ev2: secondary, parts: { phys: 10 } }, () => {}, { targets: () => [] });
    if (!secondary) s.applyActorHurt(s.v, 20, 100);
    for (let i = 0; i < 200; i++) s.advanceSkillContacts(.01);
    assert.deepEqual(calls, []);
  }
});

test('NPCs and battlefield bosses/monsters do not use character voices', () => {
  const { s, calls } = fixture();
  for (const actor of [{}, { profile: { sex: 0 }, battlefieldBoss: true },
    { profile: { sex: 1 }, battlefieldMonster: true }]) s.playActorAttackVoice(actor);
  assert.deepEqual(calls, []);
});

test('audio unlock preloads both voices and playback obeys mute and quiet mode', () => {
  const { s } = fixture();
  const requested = [], played = [];
  vm.runInContext(fs.readFileSync('src/client/ui/legacy-panels-and-audio-01.js', 'utf8'), s);
  s.window.AudioContext = class {
    currentTime = 1;
    createGain() { return { connect() {}, gain: {} }; }
    createBufferSource() { return { connect() {}, playbackRate: {}, start() { played.push(true); } }; }
  };
  s.z8 = url => { requested.push(url); s.c0.buf[url] = {}; };
  s.j8();
  for (const sex of ['female', 'male']) assert.ok(requested.includes(`snd/sfx-${sex}.MP3`));
  s.o.snd.on = false; s.playActorAttackVoice(s.v);
  s.o.snd.on = true; s.l.quiet = true; s.playActorAttackVoice(s.v);
  assert.equal(played.length, 0);
  s.l.quiet = false; s.playActorAttackVoice(s.v);
  assert.equal(played.length, 1);
});
