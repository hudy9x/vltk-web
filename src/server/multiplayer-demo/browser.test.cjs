// Real Chromium end-to-end checks, including actual pinned-certificate QUIC.
// Run after `cargo build --bins`; install Playwright or set PLAYWRIGHT_MODULE.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const dgram = require('node:dgram');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function freeTcpPort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function freeUdpPort() {
  const socket = dgram.createSocket('udp4');
  socket.bind(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  socket.close();
  return port;
}

async function waitForServer(url, child, logs) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${logs()}`);
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start: ${logs()}`);
}

async function localPlayer(page) {
  return page.locator('[data-player][data-me="true"]').evaluate(row => ({
    id: Number(row.dataset.player), x: Number(row.dataset.x), y: Number(row.dataset.y), ack: Number(row.dataset.ack),
  }));
}

async function waitCount(page, count) {
  await page.waitForFunction(count => document.querySelectorAll('[data-player]').length === count, count);
}

for (const kind of ['websocket', 'webtransport']) {
  test(`${kind}: two real clients, mouse-only input, authoritative movement, leave and reconnect`, { timeout: 60000 }, async t => {
    const http = await freeTcpPort();
    const other = await freeTcpPort();
    const udp = await freeUdpPort();
    const binary = path.join(__dirname, 'target/debug', `demo-${kind}${process.platform === 'win32' ? '.exe' : ''}`);
    let logs = '';
    const child = spawn(binary, [], { env: { ...process.env, DEMO_BIND: '127.0.0.1', DEMO_ORIGIN: '',
      WS_PORT: String(kind === 'websocket' ? http : other),
      WT_HTTP_PORT: String(kind === 'webtransport' ? http : other), WT_PORT: String(udp) }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', data => { logs += data; });
    child.stderr.on('data', data => { logs += data; });
    child.on('error', error => { logs += error.message; });
    t.after(async () => {
      if (child.exitCode === null) {
        const exited = once(child, 'exit');
        child.kill('SIGINT');
        const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
        await exited; clearTimeout(timer);
      }
      if (t.mock) t.diagnostic(logs.trim());
    });
    // Exercise localhost as well as the numeric IPv4 address (QUIC IPv6 regression).
    const origin = `http://${kind === 'webtransport' ? 'localhost' : '127.0.0.1'}:${http}`;
    await waitForServer(`${origin}/health`, child, () => logs);
    assert.equal((await (await fetch(`${origin}/config`)).json()).transport, kind);
    // The development HTTP server must not expose source/server files or saves.
    assert.equal((await fetch(`${origin}/Cargo.toml`)).status, 404);
    assert.equal((await fetch(`${origin}/database/game.sqlite`)).status, 404);
    const browser = await chromium.launch({ headless: true,
      ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--enable-quic'] });
    t.after(() => browser.close());
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, hasTouch: true });
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const one = await context.newPage();
    const two = await context.newPage();
    await Promise.all([one.goto(`${origin}/${kind}/`), two.goto(`${origin}/${kind}/`)]);
    for (const page of [one, two]) {
      try { await page.waitForSelector('#world[data-connected="true"]', { timeout: 15000 }); }
      catch (error) { throw new Error(`${kind}: ${await page.locator('#detail').textContent()}\n${logs}\n${error}`); }
      await waitCount(page, 2);
    }
    const before = await localPlayer(one);
    const otherPlayer = await localPlayer(two);
    assert.notEqual(before.id, otherPlayer.id);
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']) {
      await one.keyboard.down(key); await one.waitForTimeout(40); await one.keyboard.up(key);
    }
    const canvas = one.locator('#world');
    const box = await canvas.boundingBox();
    await canvas.click({ button: 'right', position: { x: box.width * .8, y: box.height * .7 } });
    await one.touchscreen.tap(box.x + box.width * .8, box.y + box.height * .7);
    await one.waitForTimeout(200);
    assert.deepEqual(await localPlayer(one), before, 'keyboard, touch and right click must not move the actor');
    await canvas.click({ position: { x: box.width * .72, y: box.height * .68 } });
    await one.waitForFunction(() => Number(document.querySelector('[data-me="true"]')?.dataset.ack) === 1);
    const shortlyAfter = await localPlayer(one);
    assert.ok(shortlyAfter.x < 850, 'a click cannot instantly teleport to x=864');
    await one.waitForFunction(() => {
      const row = document.querySelector('[data-me="true"]');
      return row && Math.abs(Number(row.dataset.x) - 864) < 1 && Math.abs(Number(row.dataset.y) - 516.8) < 1;
    });
    await two.waitForFunction(id => {
      const row = document.querySelector(`[data-player="${id}"]`);
      return row && Math.abs(Number(row.dataset.x) - 864) < 1 && Math.abs(Number(row.dataset.y) - 516.8) < 1;
    }, before.id);
    // A second destination replaces the first, including on the datagram path.
    await canvas.click({ position: { x: box.width * .2, y: box.height * .2 } });
    await canvas.click({ position: { x: box.width * .6, y: box.height * .6 } });
    await one.waitForFunction(() => {
      const row = document.querySelector('[data-me="true"]');
      return row && Number(row.dataset.ack) === 3 && Math.abs(Number(row.dataset.x) - 720) < 1 && Math.abs(Number(row.dataset.y) - 456) < 1;
    });
    await one.bringToFront();
    await one.waitForFunction(() => /^\d+ ms$/.test(document.querySelector('#ping').textContent));
    await fs.mkdir(path.resolve(__dirname, '../../..', 'output/multiplayer-demo'), { recursive: true });
    await one.screenshot({ path: path.resolve(__dirname, '../../..', `output/multiplayer-demo/${kind}.png`), fullPage: true });
    await two.close();
    await waitCount(one, 1);
    await one.locator('#reconnect').click();
    await one.waitForFunction(old => {
      const row = document.querySelector('[data-me="true"]');
      return row && Number(row.dataset.player) !== old;
    }, before.id);
    await waitCount(one, 1);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.match(await one.locator('#ping').textContent(), /\d+ ms|— ms/);
    // Narrow viewport retains a usable, correctly scaled click-to-move canvas.
    await one.setViewportSize({ width: 390, height: 844 });
    assert.ok(await one.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const small = await canvas.boundingBox();
    await canvas.click({ position: { x: small.width * .55, y: small.height * .55 } });
    await one.waitForFunction(() => Number(document.querySelector('[data-me="true"]')?.dataset.ack) === 1);
  });
}
