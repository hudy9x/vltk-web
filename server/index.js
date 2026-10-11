const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { ROOT, openDatabase, snapshot, initialize, applyBatch } = require('./database');
const { seedCatalog } = require('../database/seeds/catalog');
const ORIGIN = 'https://volamidle.pages.dev/';
const ASSET = /^(img|fx|snd|fonts|ui)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif|mp3|ogg|wav|m4a|woff2?|ttf|svg)$/i;
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.wav':'audio/wav', '.m4a':'audio/mp4' };
const STATIC = new Set(['index.html','app.js','data.js','setvi.js','jxlook.js','style.css','jx1ui.css','jx1ui2.css','ui20.css','manifest.json','sw.js','client/bootstrap.js','fonts/ibm-plex-mono.css']);
const downloads = new Map();
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
  res.end(JSON.stringify(body));
}
async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8_000_000) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}
async function cacheAsset(relative, filename) {
  if (!downloads.has(relative)) downloads.set(relative, (async () => {
    const response = await fetch(new URL(relative, ORIGIN), { signal: AbortSignal.timeout(20000) });
    if (!response.ok || /text\/html/.test(response.headers.get('content-type') || '')) throw Object.assign(new Error('Asset unavailable'), { status: 404 });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw Object.assign(new Error('Empty asset'), { status: 404 });
    await fs.promises.mkdir(path.dirname(filename), { recursive: true });
    await fs.promises.writeFile(filename + '.download', bytes);
    await fs.promises.rename(filename + '.download', filename);
  })().finally(() => downloads.delete(relative)));
  return downloads.get(relative);
}
function createServer({ db = openDatabase(), downloadAssets = true } = {}) {
  seedCatalog(db);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      // Prevent cross-site writes to a local unauthenticated test server.
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(res, 403, { error:'Origin rejected' });
      if (req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, { error:'Cross-site request rejected' });
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok:true, database:'sqlite', mode:'local' });
        if (url.pathname === '/api/storage' && req.method === 'GET') return json(res, 200, snapshot(db));
        if (url.pathname === '/api/storage/init' && req.method === 'POST') return json(res, 200, initialize(db, (await body(req)).entries));
        if (url.pathname === '/api/storage' && req.method === 'POST') {
          applyBatch(db, await body(req)); return json(res, 200, { ok:true });
        }
        if (url.pathname === '/api/catalog' && req.method === 'GET') return json(res, 200, db.prepare('SELECT section,count(*) AS entries FROM game_data GROUP BY section').all());
        if (url.pathname === '/api/catalog/entry' && req.method === 'GET') {
          const row = db.prepare('SELECT data FROM game_data WHERE section=? AND entry_key=?').get(url.searchParams.get('section'),url.searchParams.get('key'));
          return json(res, row ? 200 : 404, row ? JSON.parse(row.data) : { error:'Entry not found' });
        }
        return json(res, 404, { error:'API not found' });
      }
      if (!['GET','HEAD'].includes(req.method)) return json(res, 405, { error:'Method not allowed' });
      if (url.pathname === '/ver.json') return json(res, 200, { v:622, bt:false });
      let relative;
      try { relative = decodeURIComponent(url.pathname).replace(/^\//,'') || 'index.html'; }
      catch { return json(res, 400, { error:'Invalid path' }); }
      if (relative.split('/').some(p => p === '..' || p.startsWith('.')) || relative.includes('\\') || !(STATIC.has(relative) || ASSET.test(relative))) return json(res, 404, { error:'Not found' });
      const filename = path.join(ROOT, relative);
      const stat = await fs.promises.stat(filename).catch(() => null);
      if ((!stat || !stat.size) && ASSET.test(relative) && downloadAssets) await cacheAsset(relative, filename);
      const info = await fs.promises.stat(filename).catch(() => null);
      if (!info?.isFile() || !info.size) return json(res, 404, { error:'Not found' });
      res.writeHead(200, { 'Content-Type':TYPES[path.extname(filename)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
      if (req.method === 'HEAD') return res.end();
      await pipeline(fs.createReadStream(filename), res);
    } catch (error) {
      if (!res.headersSent) json(res, error.status || 500, { error: error.status ? error.message : 'Server error' });
      else res.destroy();
      if (!error.status) console.error(error);
    }
  });
  return { server, db };
}
if (require.main === module) {
  const { server, db } = createServer();
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '127.0.0.1', () => console.log(`Võ Lâm Idle: http://127.0.0.1:${port}\nSQLite: ${process.env.DB_PATH || path.join(ROOT,'database/game.sqlite')}`));
  const stop = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
module.exports = { createServer };
