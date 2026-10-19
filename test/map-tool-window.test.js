const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const capability = JSON.parse(fs.readFileSync(path.join(root, 'tools/map-tool/src-tauri/capabilities/default.json')));
const source = buildSync({ entryPoints: [path.join(root, 'tools/map-tool/node_modules/@tauri-apps/api/window.js')],
  bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
function windowFixture() {
  const calls = [];
  const sandbox = vm.createContext({ module: { exports: {} }, window: { __TAURI_INTERNALS__: {
    async invoke(command) {
      const operation = command.split('|')[1];
      assert.ok(capability.permissions.includes(`core:window:allow-${operation}`), `${command} must be permitted for main`);
      calls.push(operation);
    },
  } } });
  vm.runInContext(source, sandbox);
  const { Window } = sandbox.module.exports;
  let callback;
  const target = { label: 'main', destroy: Window.prototype.destroy,
    listen: async (_event, handler) => { callback = handler; return () => {}; } };
  return { calls, target, Window, request: () => callback({ event: 'tauri://close-requested', id: 1, payload: null }) };
}
test('actual Tauri SDK can destroy the main window after an unblocked native close request', async () => {
  assert.ok(capability.windows.includes('main'));
  const fixture = windowFixture();
  await fixture.Window.prototype.onCloseRequested.call(fixture.target, () => {});
  await fixture.request();
  assert.deepEqual(fixture.calls, ['destroy']);
});
test('a prevented close stays open, and confirmed closing has both SDK permissions', async () => {
  const fixture = windowFixture();
  await fixture.Window.prototype.onCloseRequested.call(fixture.target, event => event.preventDefault());
  await fixture.request();
  assert.deepEqual(fixture.calls, []);
  await fixture.Window.prototype.close.call(fixture.target);
  await fixture.Window.prototype.onCloseRequested.call(fixture.target, () => {});
  await fixture.request();
  assert.deepEqual(fixture.calls, ['close', 'destroy']);
});
