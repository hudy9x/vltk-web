const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server/index.ts');
const { openDatabase } = require('../src/server/database.ts');
const { accountCookie, accountSnapshot: snapshot } = require('./helpers/accounts.js');

function fixture() {
  const db = openDatabase(':memory:');
  return { ...createServer({ db, downloadAssets: false, development: false }), db };
}

test('Fastify preserves HEAD, method errors, source privacy and malformed-path JSON errors', async () => {
  const { app, server, db } = fixture();
  try {
    assert.equal(server.listening, false, 'Import/factory must not bind a port');
    const page = await app.inject({ method: 'HEAD', url: '/' });
    assert.equal(page.statusCode, 200);
    assert.equal(page.body, '');
    assert.match(page.headers['content-type'], /text\/html/);
    assert.ok(Number(page.headers['content-length']) > 0);
    assert.equal(page.headers['cache-control'], 'no-store');
    assert.equal(page.headers['x-content-type-options'], 'nosniff');
    for (const file of ['server/index.ts', 'server/database.ts', 'server/assets.ts', 'server/package.json',
      'database/seeds/catalog.ts', 'database/game.sqlite', 'tsconfig.server.json', 'package.json', '.git/config']) {
      const result = await app.inject({ url: '/' + file });
      assert.equal(result.statusCode, 404, file);
      assert.deepEqual(result.json(), { error: 'Not found' });
    }
    const invalid = await app.inject({ url: '/img/%zz.png' });
    assert.equal(invalid.statusCode, 400);
    assert.deepEqual(invalid.json(), { error: 'Invalid path' });
    const method = await app.inject({ method: 'POST', url: '/', payload: '{' });
    assert.equal(method.statusCode, 405);
    assert.deepEqual(method.json(), { error: 'Method not allowed' });
    const missing = await app.inject({ method: 'POST', url: '/api/unknown', payload: '{' });
    assert.equal(missing.statusCode, 404);
    assert.deepEqual(missing.json(), { error: 'API not found' });
    assert.equal((await app.inject({ method: 'HEAD', url: '/api/health' })).statusCode, 404);
  } finally { await app.close(); db.close(); }
});

test('JSON parsing keeps the old content-type behavior and cross-site rejection precedes parsing/writes', async () => {
  const { app, db } = fixture();
  const cookie = await accountCookie(app);
  const inject = options => app.inject({ ...options, headers:{ cookie, ...options.headers } });
  try {
    const initialized = (await inject({ method: 'POST', url: '/api/storage/init',
      headers: { 'content-type': 'text/plain' }, payload: '{"entries":{}}' })).json();
    const batch = { id: 'custom-type', generation: initialized.generation, operations: [{ key: 'jxidle', value: 'saved' }] };
    const response = await inject({ method: 'POST', url: '/api/storage',
      headers: { 'content-type': 'application/x-game-save' }, payload: JSON.stringify(batch) });
    assert.equal(response.statusCode, 200);
    assert.equal(snapshot(db).entries.jxidle, 'saved');
    for (const [headers, message] of [[{ origin: 'https://other.example' }, 'Origin rejected'],
      [{ 'sec-fetch-site': 'cross-site' }, 'Cross-site request rejected']]) {
      const rejected = await inject({ method: 'POST', url: '/api/storage', headers, payload: '{' });
      assert.equal(rejected.statusCode, 403);
      assert.deepEqual(rejected.json(), { error: message });
      assert.equal(snapshot(db).entries.jxidle, 'saved');
    }
    const invalid = await inject({ method: 'POST', url: '/api/storage', payload: '{' });
    assert.equal(invalid.statusCode, 400);
    assert.deepEqual(invalid.json(), { error: 'Invalid JSON' });
  } finally { await app.close(); db.close(); }
});

test('the 8 MB body limit is measured in bytes and oversized bodies cannot write SQLite', async () => {
  const { app, db } = fixture();
  const cookie = await accountCookie(app);
  const inject = options => app.inject({ ...options, headers:{ cookie, ...options.headers } });
  try {
    const prefix = JSON.stringify({ id: 'limit', generation: snapshot(db).generation, operations: [], padding: '' }).slice(0, -2);
    const payload = prefix + 'a'.repeat(8_000_000 - Buffer.byteLength(prefix) - 2) + '"}';
    assert.equal(Buffer.byteLength(payload), 8_000_000);
    assert.equal((await inject({ method: 'POST', url: '/api/storage', payload })).statusCode, 200);
    const before = snapshot(db);
    const oversized = await inject({ method: 'POST', url: '/api/storage', payload: payload + ' ' });
    assert.equal(oversized.statusCode, 413);
    assert.deepEqual(oversized.json(), { error: 'Request too large' });
    assert.deepEqual(snapshot(db), before);
  } finally { await app.close(); db.close(); }
});
