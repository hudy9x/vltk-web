// Verifies LOCAL clients against the public VPS, including real QUIC datagrams.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const base = 'https://gamelab.hudy9x.com/multiplayer-demo/';
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    for (const [kind, port] of [['websocket', 3101], ['webtransport', 3102]]) {
      const configUrl = `${base}${kind}/config`;
      const configResponse = await fetch(configUrl, { headers: { Origin: `http://localhost:${port}` } });
      assert.equal(configResponse.status, 200);
      assert.equal(configResponse.headers.get('access-control-allow-origin'), `http://localhost:${port}`);
      const config = await configResponse.json();
      assert.equal(config.transport, kind);
      const blocked = await fetch(configUrl, { headers: { Origin: 'https://example.invalid' } });
      assert.equal(blocked.headers.get('access-control-allow-origin'), null, 'unlisted origins must not get CORS access');
      const pages = [await browser.newPage(), await browser.newPage()];
      const urls = [];
      const errors = [];
      for (const page of pages) {
        page.on('pageerror', e => errors.push(e.message));
        page.on('websocket', socket => urls.push(socket.url()));
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Network.enable');
        cdp.on('Network.webTransportCreated', event => urls.push(event.url));
        await page.goto(`http://localhost:${port}/${kind}/?server=${encodeURIComponent(base)}`);
        try { await page.waitForSelector('#world[data-connected="true"]', { timeout: 20000 }); }
        catch (error) { throw new Error(`${kind}: ${await page.locator('#detail').textContent()}\n${error}`); }
      }
      const one = pages[0], two = pages[1];
      const id = Number(await one.locator('[data-me="true"]').getAttribute('data-player'));
      await two.waitForSelector(`[data-player="${id}"]`);
      const canvas = one.locator('#world');
      const box = await canvas.boundingBox();
      await canvas.click({ position: { x: box.width * .7, y: box.height * .65 } });
      for (const page of pages) {
        await page.waitForFunction(id => {
          const actor = document.querySelector(`[data-player="${id}"]`);
          return actor && Math.abs(Number(actor.dataset.x) - 840) < 1 && Math.abs(Number(actor.dataset.y) - 494) < 1;
        }, id, { timeout: 15000 });
      }
      await one.bringToFront();
      await one.waitForFunction(() => /^\d+ ms$/.test(document.querySelector('#ping').textContent));
      await one.waitForTimeout(1200);
      assert.match(await one.locator('#detail').textContent(), /VPS/);
      assert.equal(errors.length, 0, errors.join('\n'));
      assert.equal(urls.filter(url => url === config.playUrl).length, 2, JSON.stringify(urls));
      const output = path.resolve(__dirname, '../../output/multiplayer-demo');
      await fs.mkdir(output, { recursive: true });
      await one.screenshot({ path: path.join(output, `vps-${kind}.png`), fullPage: true });
      console.log(JSON.stringify({ transport: kind, endpoint: config.playUrl,
        ping: await one.locator('#ping').textContent(), snapshots: await one.locator('#rate').textContent(),
        players: await one.locator('[data-player]').count(), movementSynced: true }));
      await Promise.all(pages.map(page => page.close()));
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
