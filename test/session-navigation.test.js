const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');

function load(context, file, names) {
  const source = fs.readFileSync(path.join(__dirname, '../src/client', file), 'utf8');
  const declarations = acorn.parse(source, { ecmaVersion: 'latest' }).body
    .filter(node => node.type === 'VariableDeclaration');
  for (const name of names) {
    const node = declarations.flatMap(node => node.declarations).find(node => node.id.name === name);
    assert.ok(node, name);
    vm.runInContext(`var ${source.slice(node.start, node.end)};`, context);
  }
}

function harness({ online = false, saveFails = false, signOutFails = false, pending = 0 } = {}) {
  const events = [], values = new Map([['jxidle_slot', '0'], ['jxidle_in', '0']]);
  const storage = { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
  const elements = Object.fromEntries(['#loY', '#loN', '#loMsg'].map(key => [key, { disabled: false, textContent: '' }]));
  const c = vm.createContext({
    o: { fac: 'shaolin' }, i0: { blocked: false }, HA: false, f1: 'jxidle_slot', V1: 3,
    localStorage: storage, sessionStorage: storage, location: { reload: () => events.push('reload') },
    h0: () => online, $: () => events.push('save'), m: key => elements[key],
    k: text => events.push(text), ms: i => i === 0 ? { fac: 'shaolin' } : null,
    U0: async () => { events.push('upload'); if (saveFails) throw new Error('Offline'); },
    OA: () => false, setTimeout: fn => { fn(); },
    window: { localGameStorage: { flush: async () => { events.push('flush'); }, pending } },
    b: { user: online ? { id: 'account' } : null, sb: { auth: { signOut: async () => {
      events.push('signOut'); return { error: signOutFails ? new Error('Cannot sign out') : null };
    } } } },
  });
  load(c, 'online/auth-chat-and-market-03.js', ['qx', 'jx']);
  load(c, 'core/state-and-save-03.js', ['rP', 'oP']);
  return { c, events, values, elements };
}

test('switch saves locally and uploads before navigation, keeping the account session', async () => {
  for (const online of [false, true]) {
    const { c, events, values } = harness({ online });
    const user = c.b.user;
    await c.rP();
    assert.deepEqual(events, online ? ['save', 'flush', 'upload', 'reload'] : ['save', 'flush', 'reload']);
    assert.equal(c.b.user, user);
    assert.equal(values.get('jxidle_slot'), 'menu');
    assert.equal(values.has('jxidle_in'), false);
    assert.equal(c.oP().menu, true);
  }
});

test('failed cloud save or pending SQLite writes keep the player in game', async () => {
  for (const options of [{ online: true, saveFails: true }, { pending: 1 }]) {
    const { c, events, values } = harness(options);
    await c.rP();
    assert.ok(!events.includes('reload'));
    assert.equal(values.get('jxidle_slot'), '0');
    assert.equal(c.HA, false);
  }
});

test('local exit saves and opens the login screen even with no saved characters', async () => {
  const { c, events, values } = harness();
  await c.jx(false);
  assert.deepEqual(events, ['save', 'flush', 'reload']);
  assert.equal(values.get('jxidle_slot'), 'login');
  assert.equal(values.has('jxidle_in'), false);
  assert.equal(c.HA, true);
  assert.equal(c.oP().menu, true);
  c.ms = () => null;
  assert.equal(c.oP().menu, true);
});

test('online exit uploads before signing out and returns to the account gate', async () => {
  const { c, events, values } = harness({ online: true });
  await c.jx(false);
  assert.deepEqual(events, ['save', 'flush', 'upload', 'signOut', 'reload']);
  assert.equal(c.b.user, null);
  assert.equal(values.get('jxidle_slot'), 'menu');
});

test('failed sign-out keeps the account and allows retry or cancel', async () => {
  const { c, events, elements } = harness({ online: true, signOutFails: true });
  await c.jx(false);
  assert.ok(!events.includes('reload'));
  assert.ok(c.b.user);
  assert.equal(c.b.loggingOut, false);
  assert.equal(c.HA, false);
  assert.equal(elements['#loY'].disabled, false);
  assert.equal(elements['#loN'].disabled, false);
  assert.match(elements['#loMsg'].textContent, /Cannot sign out/);
});

test('failed exit save needs an explicit choice to proceed and supports staying', async () => {
  const { c, events, elements } = harness({ pending: 1 });
  await c.jx(false);
  assert.ok(!events.includes('reload'));
  assert.equal(elements['#loN'].textContent, 'Ở lại');
  assert.equal(elements['#loY'].disabled, false);
  await elements['#loY'].onclick();
  assert.equal(events.at(-1), 'reload');
});

test('local exit flushes the marker before revoking the account session', async () => {
  const { c, events } = harness();
  c.window.localGameAuth = { logout: async () => events.push('logout') };
  await c.jx(false);
  assert.deepEqual(events, ['save', 'flush', 'flush', 'logout', 'reload']);
});

test('failed local logout stays in game and allows retry', async () => {
  const { c, events, elements } = harness();
  c.window.localGameAuth = { logout: async () => { throw new Error('Disconnected'); } };
  await c.jx(false);
  assert.ok(!events.includes('reload'));
  assert.equal(c.HA, false);
  assert.equal(elements['#loY'].disabled, false);
  assert.match(elements['#loMsg'].textContent, /Disconnected/);
});

test('canceling the exit confirmation does not save, sign out or navigate', () => {
  const { c, events, values, elements } = harness();
  c.J = (_html, bind) => bind();
  c.n0 = () => events.push('close');
  load(c, 'online/auth-chat-and-market-03.js', ['Fg']);
  c.Fg();
  elements['#loN'].onclick();
  assert.deepEqual(events, ['close']);
  assert.equal(values.get('jxidle_slot'), '0');
});

test('selection draws the sharp sect portrait without invoking sprite rendering', () => {
  const { c } = harness();
  const draws = [], image = { complete: true, naturalWidth: 1122, naturalHeight: 1402 };
  const ctx = { clearRect() {}, drawImage: (...args) => draws.push(args) };
  c.u0 = { on: true, t0: 0, st: [{ fac: 'shaolin' }], look: [{}], sel: 0 };
  c.document = { querySelectorAll: () => [{ dataset: { i: '0' }, width: 600, height: 760, getContext: () => ctx }] };
  c.W = {};
  c.bA = url => { assert.equal(url, 'img/portraits/shaolin.webp'); return image; };
  c.It = () => assert.fail('Portrait should replace low-resolution sprite');
  c.requestAnimationFrame = () => assert.fail('Loaded portraits do not need continuous animation');
  load(c, 'ui/character-select-01.js', ['sectPortraits', 'characterPortrait', 'e_']);
  c.e_(1000);
  assert.equal(draws.length, 1);
  assert.equal(draws[0][0], image);
  assert.equal(ctx.imageSmoothingQuality, 'high');
});


test('new account menu shows empty character slots before creating a character', () => {
  const { c, values } = harness();
  values.set('jxidle_slot', 'menu');
  c.ms = () => null;
  assert.equal(c.oP().menu, true);
  values.set('jxidle_slot', '0');
  values.delete('jxidle_in');
  assert.equal(c.oP().menu, false);
});
