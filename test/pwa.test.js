const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createServer } = require('../src/server/index.ts');
const { openDatabase } = require('../src/server/database.ts');
const workerSource = fs.readFileSync(require.resolve('../public/sw.js'), 'utf8');

function worker({ development = false, unavailable = false, failWrites = false } = {}) {
  const listeners = {}, stores = new Map();
  let now = Date.now(), requests = 0, offline = false, status = 200, noStore = false;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    open: async name => {
      if (unavailable) throw new Error('Storage disabled');
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        match: async request => entries.get(request.url)?.clone(),
        put: async (request, response) => {
          if (failWrites) throw new Error('Quota exceeded');
          entries.set(request.url, response.clone());
        },
        keys: async () => [...entries.keys()].map(url => new Request(url)),
        delete: async request => entries.delete(request.url),
      };
    },
  };
  const self = { __JXIDLE_DEVELOPMENT__: development, location: { origin: 'https://game.test' },
    skipWaiting: async () => {}, clients: { claim: async () => {} },
    addEventListener: (name, listener) => { listeners[name] = listener; } };
  vm.runInNewContext(workerSource, { self, caches, URL, Headers, Response,
    Date: { now: () => now }, fetch: async () => {
      requests++;
      if (offline) throw new Error('Offline');
      return new Response('asset-' + requests, { status,
        headers: { 'Cache-Control': noStore ? 'no-store' : 'public, max-age=86400' } });
    } });
  return {
    stores,
    get requests() { return requests; },
    advance: ms => { now += ms; },
    offline: value => { offline = value; },
    status: value => { status = value; },
    noStore: value => { noStore = value; },
    async dispatch(name, pathname = '/img/sprite.webp', options) {
      const tasks = [];
      let response;
      listeners[name]({ request: new Request(new URL(pathname, self.location.origin), options),
        respondWith: value => { response = value; }, waitUntil: value => tasks.push(value) });
      const result = await response;
      await Promise.all(tasks);
      return result;
    },
  };
}

test('PWA reuses media across worker activation, expires it, preserves query versions and falls back offline', async () => {
  const sw = worker();
  assert.equal(await (await sw.dispatch('fetch')).text(), 'asset-1');
  sw.stores.set('jxidle-old-code', new Map());
  sw.stores.set('another-app', new Map());
  await sw.dispatch('activate');
  assert.equal(sw.stores.has('jxidle-old-code'), false);
  assert.equal(sw.stores.has('another-app'), true);
  assert.equal(await (await sw.dispatch('fetch')).text(), 'asset-1');
  assert.equal(sw.requests, 1, 'warm image makes no network request');
  await sw.dispatch('fetch', '/img/sprite.webp?v=2');
  assert.equal(sw.requests, 2);
  sw.advance(86400001);
  assert.equal(await (await sw.dispatch('fetch')).text(), 'asset-3');
  sw.advance(86400001);
  sw.offline(true);
  assert.equal(await (await sw.dispatch('fetch')).text(), 'asset-3');
  await assert.rejects(sw.dispatch('fetch', '/img/uncached.webp'), /Offline/);
});

test('PWA excludes code, saves, manifests, other origins, range and forced-network requests', async () => {
  const sw = worker();
  for (const url of ['/', '/app/game.js', '/client/bootstrap.js', '/style.css', '/api/storage',
    '/api/auth/session', '/ver.json', '/app/maps/availability.json', '/app/maps/content/2/map.json',
    'https://other.test/img/sprite.webp']) {
    assert.equal(await sw.dispatch('fetch', url), undefined, url);
  }
  for (const options of [{ method: 'POST' }, { method: 'HEAD' }, { headers: { range: 'bytes=0-99' } },
    { cache: 'no-store' }, { cache: 'reload' }]) {
    assert.equal(await sw.dispatch('fetch', '/music/song.mp3', options), undefined);
  }
  assert.equal(sw.requests, 0);
  for (const url of ['/app/maps/content/2/assets/ground.jpg', '/app/maps/objects/tree.webp',
    '/fonts/game.woff2', '/music/song.mp3', '/fx/hit.png']) await sw.dispatch('fetch', url);
  assert.equal(sw.requests, 5);
});

test('PWA never stores failures/no-store and continues loading when storage is disabled or full', async () => {
  const sw = worker();
  sw.status(404);
  await sw.dispatch('fetch');
  sw.status(200);
  assert.equal(await (await sw.dispatch('fetch')).text(), 'asset-2');
  assert.equal(sw.requests, 2);
  sw.noStore(true);
  await sw.dispatch('fetch', '/img/private.png');
  await sw.dispatch('fetch', '/img/private.png');
  assert.equal(sw.requests, 4);
  for (const options of [{ unavailable: true }, { failWrites: true }]) {
    const limited = worker(options);
    assert.equal(await (await limited.dispatch('fetch')).text(), 'asset-1');
    assert.equal(await (await limited.dispatch('fetch')).text(), 'asset-2');
  }
});

test('PWA bounds its media cache and development activation removes only game caches', async () => {
  const sw = worker();
  // Seed old entries without downloading 512 bodies.
  sw.stores.set('jxidle-media-v1', new Map(Array.from({ length: 512 }, (_, i) =>
    [`https://game.test/img/${i}.png`, new Response('old')])));
  await Promise.all(['/img/new-a.webp', '/img/new-b.webp'].map(url => sw.dispatch('fetch', url)));
  const entries = sw.stores.get('jxidle-media-v1');
  assert.equal(entries.size, 512);
  assert.equal(entries.has('https://game.test/img/0.png'), false);
  assert.equal(entries.has('https://game.test/img/new-b.webp'), true);
  const dev = worker({ development: true });
  dev.stores.set('jxidle-media-v1', new Map());
  dev.stores.set('another-app', new Map());
  await dev.dispatch('activate');
  assert.equal(dev.stores.has('jxidle-media-v1'), false);
  assert.equal(dev.stores.has('another-app'), true);
  assert.equal(await dev.dispatch('fetch'), undefined);
});

test('production caches media over HTTP while development, code, APIs and errors remain no-store', async () => {
  for (const development of [false, true]) {
    const db = openDatabase(':memory:');
    const { app } = createServer({ db, development, downloadAssets: false });
    try {
      for (const url of ['/img/pl/shaolin.png', '/fonts/ibm-plex-mono-400-latin.woff2',
        '/app/maps/content/2/assets/ground.jpg']) {
        for (const method of ['GET', 'HEAD']) {
          const result = await app.inject({ url, method });
          assert.equal(result.statusCode, 200, url);
          assert.equal(result.headers['cache-control'], development ? 'no-store' : 'public, max-age=86400', url);
        }
      }
      for (const url of ['/', '/sw.js', '/client/bootstrap.js', '/data.js', '/style.css', '/api/config',
        '/api/storage', '/ver.json', '/app/maps/availability.json', '/img/missing-for-test.png']) {
        const result = await app.inject({ url });
        assert.equal(result.headers['cache-control'], 'no-store', url);
      }
      const sw = await app.inject({ url: '/sw.js' });
      assert.equal(sw.body.startsWith('self.__JXIDLE_DEVELOPMENT__ = true;'), development);
      const head = await app.inject({ url: '/sw.js', method: 'HEAD' });
      assert.equal(head.body, '');
      assert.equal(Number(head.headers['content-length']), Buffer.byteLength(sw.body));
    } finally { await app.close(); db.close(); }
  }
});

test('bootstrap starts worker installation before loading account and game scripts', async () => {
  const calls = [];
  class Storage {}
  const sandbox = { Storage, localStorage: {}, AbortSignal, location: { protocol: 'https:' },
    navigator: { serviceWorker: { register: (url, options) => {
      calls.push([url, options.updateViaCache]);
      return Promise.reject(new Error('Worker blocked'));
    } } },
    document: { createElement: () => ({ style: {} }), body: { appendChild: () => {} } },
    fetch: async url => {
      calls.push(url);
      if (url === '/api/config') return new Response('{}');
      return new Promise(() => {});
    } };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/client/bootstrap.js'), 'utf8'), sandbox);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['/api/config', ['/sw.js', 'none'], '/api/auth/session']);
});
