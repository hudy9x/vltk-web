const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function audio() {
  const sources = [];
  const s = { window: {}, Math: Object.assign(Object.create(Math), { random: () => 0 }),
    l: {}, o: { sex: 0 }, v: { x: 100, y: 100 }, B0: { x: 0, y: 0 }, M0: { w: 800, h: 600 } };
  vm.createContext(s);
  vm.runInContext(fs.readFileSync('src/client/ui/legacy-panels-and-audio-01.js', 'utf8'), s);
  s.c0.ctx = { currentTime: 0,
    createGain() { return { gain: {}, connect() {} }; },
    createBufferSource() {
      const source = { playbackRate: {}, connect(gain) { this.volume = gain.gain; },
        start() { sources.push(this); }, stop() { this.stopped = true; this.onended?.(); } };
      return source;
    } };
  s.c0.gain = {};
  for (const sex of ['female', 'male']) s.c0.buf[`snd/sfx-${sex}.MP3`] = { sex };
  const actor = (x = 120, sex = 1) => ({ x, y: 100, hp: 100, profile: { sex } });
  return { s, sources, actor };
}

test('20 simultaneous crowd shouts are capped and the player preempts a crowd voice', () => {
  const { s, sources, actor } = audio();
  for (let i = 0; i < 20; i++) { s.c0.ctx.currentTime += .08; s.playActorAttackVoice(actor()); }
  assert.equal(s.attackVoiceState.active.size, 5);
  assert.equal(sources.length, 5);
  s.playActorAttackVoice(s.v);
  assert.equal(s.attackVoiceState.active.size, 5);
  assert.equal(sources.length, 6);
  assert.equal(sources.filter(a => a.stopped).length, 1);
  assert.equal(sources.at(-1).buffer.sex, 'male');
  sources.filter(a => !a.stopped).forEach(a => a.stop());
  assert.equal(s.attackVoiceState.active.size, 0);
  assert.equal(s.c0.voices, 0);
});

test('player cooldown is 0.8 seconds and bypasses the crowd same-file throttle', () => {
  const { s, sources, actor } = audio();
  s.playActorAttackVoice(actor(120, 0));
  s.playActorAttackVoice(s.v);
  assert.equal(sources.length, 2, 'player can speak immediately after a male SIM');
  s.c0.ctx.currentTime = .79; s.playActorAttackVoice(s.v);
  assert.equal(sources.length, 2);
  sources.forEach(a => a.stop());
  s.c0.ctx.currentTime = .8; s.playActorAttackVoice(s.v);
  assert.equal(sources.length, 3);
});

test('crowd random misses consume cooldown, and selected targets bypass random chance', () => {
  const { s, sources, actor } = audio(), other = actor();
  s.Math.random = () => .9;
  s.playActorAttackVoice(other);
  s.Math.random = () => 0;
  s.c0.ctx.currentTime = 1.99; s.playActorAttackVoice(other);
  assert.equal(sources.length, 0);
  s.c0.ctx.currentTime = 2; s.playActorAttackVoice(other);
  assert.equal(sources.length, 1);
  sources[0].stop();
  s.l.manTgt = actor(140); s.Math.random = () => .9;
  s.playActorAttackVoice(s.l.manTgt);
  assert.equal(sources.length, 1, 'same-file throttle still applies');
  s.c0.ctx.currentTime = 3.5; s.playActorAttackVoice(s.l.manTgt);
  assert.equal(sources.length, 2);
});

test('only three nearest visible SIMs qualify; distant and offscreen actors are silent', () => {
  const { s, sources, actor } = audio();
  const peers = [actor(110), actor(120), actor(130), actor(140)];
  s.arenaSimulator = { actors: peers };
  s.playActorAttackVoice(peers[3]);
  s.playActorAttackVoice(actor(600));
  s.playActorAttackVoice(actor(-1));
  assert.equal(sources.length, 0);
  s.playActorAttackVoice(peers[0]);
  assert.equal(sources.length, 1);
  assert.ok(sources[0].volume.value < .2);
});

test('online proxy context keeps the real listener and identifies self by server ID', () => {
  const { s, sources, actor } = audio();
  const listener = s.v, remote = actor(300); remote.id = 20;
  s.skillVisualContext = { audioListener: listener, audioSelf: 10, audioWorld: {}, audioActors: [remote] };
  s.v = remote; s.o = remote.profile;
  s.playActorAttackVoice(remote);
  assert.ok(sources[0].volume.value < .2, 'temporary v is not treated as the player');
  const ownProxy = actor(100, 0); ownProxy.id = 10;
  s.skillVisualContext.audioActors.push(ownProxy);
  s.playActorAttackVoice(ownProxy);
  assert.equal(sources[1].volume.value, .5);
});

test('real online visual replay preserves the listener across nested contexts and silences monsters', () => {
  const { s, sources } = audio();
  const hero = s.v, world = s.l;
  Object.assign(world, { fx: [], P: { basic: {} } });
  Object.assign(s, { skillVisualContext: null, Y: {}, T: {}, Jt: () => null, kn: () => 0, setTimeout, clearTimeout });
  s.GameWebTransport = { castSkillVisual(caster) {
    assert.equal(s.skillVisualContext.audioListener, hero);
    assert.equal(s.skillVisualContext.audioWorld, world);
    s.skillVisualContext.run(() => s.playActorAttackVoice(caster));
    return {};
  } };
  vm.runInContext(fs.readFileSync('src/client/multiplayer/state/skill-visuals.js', 'utf8'), s);
  const visuals = s.OnlineSkillVisuals();
  visuals.sync({ self: 10, actors: [{ id: 10, x: 100, y: 100 }, { id: 20, x: 200, y: 100 }],
    monsters: [{ id: 30, x: 150, y: 100 }] });
  const event = id => ({ source: id, target: 30, skill: 0,
    cast: { x: id === 10 ? 100 : 200, y: 100, targetX: 150, targetY: 100 } });
  visuals.play(event(20), { sex: 1 }, true);
  assert.ok(sources[0].volume.value < .2);
  s.c0.ctx.currentTime = .1;
  visuals.play(event(10), { sex: 0 }, true);
  assert.equal(sources[1].volume.value, .5);
  s.c0.ctx.currentTime = 3;
  sources.forEach(source => source.stop());
  visuals.play(event(30), { sex: 0 }, true);
  assert.equal(sources.length, 2);
  assert.equal(s.v, hero); assert.equal(s.l, world); assert.equal(s.skillVisualContext, null);
});
