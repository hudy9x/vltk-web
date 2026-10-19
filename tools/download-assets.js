// Project asset downloader with binary validation, repair and bounded concurrency.
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { ROOT, PUBLIC_ROOT } = require('../src/server/paths.ts');
const { createAssetCache, isAssetPath } = require('../src/server/assets.ts');
const { assemble } = require('./build-app');
async function walk(directory) {
  const entries = await fs.readdir(directory,{ withFileTypes:true }).catch(() => []);
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(directory,entry.name)) : [path.join(directory,entry.name)]));
  return nested.flat();
}
async function collectAssets({ allSprites = false, existingOnly = false } = {}) {
  const assets = new Set();
  for (const folder of ['img','fx','ui','fonts','snd','music']) {
    for (const file of await walk(path.join(PUBLIC_ROOT,folder))) {
      const relative = path.relative(PUBLIC_ROOT,file).split(path.sep).join('/');
      if (isAssetPath(relative)) assets.add(relative);
    }
  }
  if (existingOnly) return [...assets].sort();
  const sources = [assemble().code];
  for (const file of ['data.js','sw.js','manifest.json']) sources.push(await fs.readFile(path.join(PUBLIC_ROOT,file),'utf8'));
  for (const text of sources) {
    for (const match of text.matchAll(/["']([A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif|mp3|ogg|wav|m4a|woff2?|ttf|svg))["']/gi)) {
      let relative = match[1];
      if (!relative.includes('/')) relative = 'img/a/'+relative;
      if (isAssetPath(relative)) assets.add(relative);
    }
  }
  for (const file of ['style.css','jx1ui.css','jx1ui2.css','ui20.css','fonts/ibm-plex-mono.css']) {
    const text = await fs.readFile(path.join(PUBLIC_ROOT,file),'utf8');
    for (const match of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
      const url = new URL(match[1],new URL(file,'https://volamidle.pages.dev/'));
      const relative = url.pathname.slice(1);
      if (url.origin === 'https://volamidle.pages.dev' && isAssetPath(relative)) assets.add(relative);
    }
  }
  if (allSprites) {
    const sandbox = {}; sandbox.window=sandbox; vm.createContext(sandbox);
    vm.runInContext(await fs.readFile(path.join(PUBLIC_ROOT,'jxlook.js'),'utf8'),sandbox,{ timeout:10000 });
    for (const key of Object.keys(sandbox.JXLOOK.sheets)) {
      const relative = `img/jx/${key}.webp`;
      if (isAssetPath(relative)) assets.add(relative);
    }
  }
  return [...assets].sort();
}
async function main() {
  const options = new Set(process.argv.slice(2));
  const assets = await collectAssets({ existingOnly:options.has('--existing'),allSprites:options.has('--all-sprites') });
  const cache = createAssetCache({ root:PUBLIC_ROOT });
  let next=0, completed=0;
  console.log(`Checking ${assets.length} assets in public/; 8 concurrent workers.`);
  async function worker() {
    while (next < assets.length) {
      const relative=assets[next++];
      try { await cache.ensure(relative); } catch {}
      completed++;
      if (completed%100===0 || completed===assets.length) {
        const r=cache.report(); console.log(`${completed}/${assets.length}: repaired=${r.repaired} downloaded=${r.downloaded} failed=${r.failures.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length:8 },worker));
  const report = { checked:assets.length, ...cache.report(), completed_at:new Date().toISOString() };
  const filename = path.join(ROOT,'database/asset-report.json');
  await fs.writeFile(filename,JSON.stringify(report,null,2)+'\n');
  console.log(`Report: ${filename}`);
  if (report.failures.length) { console.log(report.failures.slice(0,15)); process.exitCode=1; }
}
if (require.main === module) main().catch(error => { console.error(error);process.exitCode=1; });
module.exports = { collectAssets };
