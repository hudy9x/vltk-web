const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/client/loading.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture({ css = [], domImages = [], collect = [], decode } = {}) {
  const label = {}, count = {}, progress = { removeAttribute() { delete this.value; } }, button = {};
  const screen = { hidden:false, querySelector:selector => ({ '[data-loading-label]':label, '[data-loading-count]':count, progress, button })[selector] };
  const calls = [], invalidated = [], events = {}, timers = [];
  let inFlight = 0, peak = 0, reloaded = 0;
  const scope = { window:{}, URL, Set, Promise,
    location:{ href:'https://game.test/', origin:'https://game.test', reload() { reloaded++; } },
    document:{ getElementById:() => screen, addEventListener:(name, callback) => { events[name] = callback; },
      querySelectorAll:() => domImages.map(src => ({ getAttribute:() => src })), styleSheets:css },
    setTimeout:callback => { timers.push(callback); return timers.length; }, clearTimeout() {} };
  vm.runInNewContext(source, scope);
  const host = { collect:() => collect, invalidate:url => invalidated.push(url), imageFor:url => {
    calls.push(url); inFlight++; peak = Math.max(peak, inFlight);
    return { naturalWidth:1, decode:() => Promise.resolve().then(() => decode?.(url)).finally(() => { inFlight--; }) };
  } };
  return { loading:scope.window.localGameLoading, host, screen, label, count, progress, button, calls, invalidated,
    events, timers, get peak() { return peak; }, get reloaded() { return reloaded; } };
}

test('preload deduplicates current-session, DOM and CSS images, ignores foreign URLs and bounds concurrency', async () => {
  const gates = [];
  const f = fixture({
    css:[{ href:'https://game.test/style.css', cssRules:[{ style:{ cssText:'background:url(ui/slot.png)' } }] }],
    domImages:['img/hero.png', 'https://foreign.test/img/private.png', 'data:image/png,abc'],
    collect:['img/hero.png', 'app/maps/content/2/assets/ground.jpg', '/api/storage', ...Array.from({ length:5 }, (_, i) => `fx/${i}.png`)],
    decode:() => new Promise(resolve => gates.push(resolve)),
  });
  const loaded = f.loading.preload(f.host);
  await tick();
  assert.equal(f.calls.length, 4); assert.equal(f.peak, 4);
  assert.match(f.count.textContent, /^0\/8/);
  while (gates.length || f.calls.length < 8) { gates.splice(0).forEach(resolve => resolve()); await tick(); }
  await loaded;
  assert.equal(new Set(f.calls).size, 8);
  assert.ok(f.calls.includes('ui/slot.png'));
  assert.equal(f.calls.filter(url => url === 'img/hero.png').length, 1);
  assert.equal(f.progress.value, 1);
  assert.equal(f.loading.active, true, 'bootstrap releases the game only after preload completes');
  f.loading.finish(); assert.equal(f.loading.active, false); assert.equal(f.screen.hidden, true);
});

test('failed assets never count as loaded and retry requests only failed URLs', async () => {
  let offline = true, resolved = false;
  const f = fixture({ collect:['img/good.png', 'img/fail.png'], decode:url => {
    if (offline && url.endsWith('fail.png')) throw new Error('offline');
  } });
  const loaded = f.loading.preload(f.host).then(() => { resolved = true; });
  await tick();
  assert.equal(resolved, false); assert.equal(f.progress.value, .5);
  assert.equal(f.button.hidden, false); assert.equal(f.loading.active, true);
  assert.deepEqual(f.invalidated, ['img/fail.png']);
  offline = false; f.button.onclick(); await loaded;
  assert.deepEqual(f.calls, ['img/good.png', 'img/fail.png', 'img/fail.png']);
  assert.equal(f.progress.value, 1);
});

test('stalled image decoding times out into an actionable retry screen', async () => {
  const f = fixture({ collect:['img/stalled.png'], decode:() => new Promise(() => {}) });
  void f.loading.preload(f.host); await tick(); f.timers[0](); await tick();
  assert.equal(f.button.hidden, false); assert.equal(f.progress.value, 0);
  assert.match(f.label.textContent, /Chưa tải được 1/);
});

test('startup stages, login handoff, errors and keyboard gating never unlock simulation prematurely', () => {
  const f = fixture(); let stopped = false;
  f.loading.stage('Đang tải dữ liệu nhân vật…');
  f.events.keydown({ stopImmediatePropagation() { stopped = true; } }); assert.equal(stopped, true);
  f.loading.hide(); stopped = false;
  f.events.keydown({ stopImmediatePropagation() { stopped = true; } }); assert.equal(stopped, false);
  assert.equal(f.loading.active, true);
  f.loading.failed(new Error('/api/config: offline'));
  assert.match(f.label.textContent, /\/api\/config/); f.button.onclick(); assert.equal(f.reloaded, 1);
  assert.equal(f.loading.active, true);
});
