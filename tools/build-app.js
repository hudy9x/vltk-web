const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const esbuild = require('esbuild');
const { decode, encode } = require('@jridgewell/sourcemap-codec');
const { syncMapCatalog } = require('./maps/catalog.ts');
const { potentialBundle } = require('./potential-worker');
const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'src/client');
const compiledEntries = new Map();
let previousResult;

// Imported TS files are dependencies, not separate legacy script entries. Their
// contents participate in the hash so editing an imported file triggers reload.
function readTypeScriptSources() {
  syncMapCatalog(APP);
  return fs.readdirSync(APP, { recursive: true })
    .filter(file => file.endsWith('.ts') || file.endsWith('.json'))
    .sort()
    .map(file => ({ file: file.split(path.sep).join('/'), source: fs.readFileSync(path.join(APP, file), 'utf8') }));
}

function compileTypeScriptEntry(file, globalName = 'CombatEngine', dependencies = readTypeScriptSources()) {
  const potential = file.startsWith('simulator/') ? potentialBundle() : null;
  const hash = createHash('sha256').update(JSON.stringify([file, globalName, dependencies, potential?.version,
    fs.readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8')])).digest('hex');
  if (compiledEntries.has(hash)) return compiledEntries.get(hash);
  // Embed a separately bundled classic worker so every hosting path serves the
  // exact worker matching this game bundle; no extra static route or dependency.
  const workerEntry = 'workers/crowd-path.ts';
  const workerSource = file.startsWith('simulator/') && file !== workerEntry
    ? esbuild.buildSync({ absWorkingDir: ROOT, entryPoints: [path.join(APP, workerEntry)],
      bundle: true, format: 'iife', platform: 'browser', target: 'es2020', write: false,
      sourcemap: 'inline', sourcesContent: true }).outputFiles[0].text : '';
  const outfile = path.join(APP, file.replace(/\.ts$/, '.js'));
  const result = esbuild.buildSync({
    absWorkingDir: ROOT,
    entryPoints: [path.join(APP, file)], outfile,
    bundle: true, format: 'iife', globalName, platform: 'browser', target: 'es2020',
    sourcemap: 'external', sourcesContent: true, write: false, metafile: true,
    charset: 'utf8', minify: false,
    banner: { js: potential?.capture || '' },
    define: { __CROWD_WORKER_SOURCE__: JSON.stringify(workerSource),
      __POTENTIAL_WORKER_SOURCE__: JSON.stringify(potential?.worker || ''),
      __POTENTIAL_VERSION__: JSON.stringify(potential?.version || '') },
  });
  const code = result.outputFiles.find(output => output.path === outfile).text;
  const map = JSON.parse(result.outputFiles.find(output => output.path === outfile + '.map').text);
  map.sources = map.sources.map(source => path.relative(APP, path.resolve(path.dirname(outfile), source)).split(path.sep).join('/'));
  const compiled = { code, map, inputs: Object.keys(result.metafile.inputs) };
  compiledEntries.clear();
  compiledEntries.set(hash, compiled);
  return compiled;
}

function assemble() {
  const manifest = JSON.parse(fs.readFileSync(path.join(APP, 'modules.json'), 'utf8'));
  const dependencies = readTypeScriptSources();
  const modules = manifest.modules.map(({ file, global: globalName }) => {
    if (!/^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:js|ts)$/.test(file) || file === 'game.js' || file.endsWith('.d.ts')) {
      throw new Error('Invalid module path: ' + file);
    }
    if (file.endsWith('.ts') && !/^[A-Za-z_$][\w$]*$/.test(globalName || '')) throw new Error('TS entry requires a global name: ' + file);
    return { file, globalName, source: fs.readFileSync(path.join(APP, file), 'utf8') };
  });
  const hash = createHash('sha256').update(JSON.stringify([modules, dependencies,
    fs.readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8')])).digest('hex');
  if (previousResult?.hash === hash) return previousResult;
  let code = '// Generated from src/client/modules.json. Edit the source modules, then rebuild.\n(function () {\n';
  const mappings = [[], []], sources = [], sourcesContent = [], inputs = new Set();
  function addSource(file, source) {
    let index = sources.indexOf(file);
    if (index === -1) { index = sources.length; sources.push(file); sourcesContent.push(source); }
    return index;
  }
  for (const module of modules) {
    code += `// Source: ${module.file}\n`;
    mappings.push([]);
    if (module.file.endsWith('.ts')) {
      const compiled = compileTypeScriptEntry(module.file, module.globalName, dependencies);
      const indices = compiled.map.sources.map((source, i) => addSource(source, compiled.map.sourcesContent[i]));
      const decoded = decode(compiled.map.mappings);
      compiled.code.replace(/\n$/, '').split('\n').forEach((line, i) => {
        code += line + '\n';
        // Preserve original TS line/column; optional name segments are omitted.
        mappings.push((decoded[i] || []).map(segment => segment.length === 1 ? segment :
          [segment[0], indices[segment[1]], segment[2], segment[3]]));
      });
      for (const input of compiled.inputs) inputs.add(input);
    } else {
      const index = addSource(module.file, module.source);
      module.source.replace(/\n$/, '').split('\n').forEach((line, number) => {
        code += line + '\n'; mappings.push([[0, index, number, 0]]);
      });
      inputs.add('src/client/' + module.file);
    }
  }
  code += '})();\n//# sourceMappingURL=game.js.map\n';
  mappings.push([], []);
  new vm.Script(code, { filename: 'app/game.js' });
  const map = { version: 3, file: 'game.js', sources, sourcesContent, names: [], mappings: encode(mappings) };
  return { code, map, hash, modules, inputs: [...inputs] };
}

function buildApp() {
  const result = assemble();
  if (previousResult?.hash === result.hash && fs.existsSync(path.join(APP, 'game.js')) && fs.existsSync(path.join(APP, 'game.js.map'))) return result;
  // Replace complete files so concurrent readers cannot receive half-written JS.
  for (const [file, content] of [['game.js.map', JSON.stringify(result.map)], ['game.js', result.code]]) {
    const temporary = path.join(APP, `.${file}.${process.pid}.tmp`);
    fs.writeFileSync(temporary, content);
    fs.renameSync(temporary, path.join(APP, file));
  }
  previousResult = result;
  return result;
}
if (require.main === module) {
  const result = buildApp();
  console.log(`Built src/client/game.js from ${result.modules.length} entries (${Buffer.byteLength(result.code)} bytes).`);
}
module.exports = { assemble, buildApp, compileTypeScriptEntry };
