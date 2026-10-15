const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const vm = require('node:vm');
const { tmpdir } = require('node:os');
const { decode } = require('@jridgewell/sourcemap-codec');
const { assemble, compileTypeScriptEntry } = require('../tools/build-app');
const ROOT = path.resolve(__dirname, '..');
const manifest = require('../app/modules.json');

test('every legacy script and runtime TS module is included; source map contains original sources', () => {
  const { modules, map, code, inputs } = assemble();
  const sourceFiles = fs.readdirSync(path.join(ROOT, 'app'), { recursive: true })
    .filter(file => file.endsWith('.js') && file !== 'game.js')
    .map(file => file.split(path.sep).join('/'));
  assert.equal(new Set(modules.map(module => module.file)).size, modules.length);
  assert.deepEqual(modules.filter(m => m.file.endsWith('.js')).map(m => m.file).sort(), sourceFiles.sort());
  assert.equal(modules.length, manifest.modules.length);
  assert.equal(new Set(map.sources).size, map.sources.length);
  map.sources.forEach((file, i) => assert.equal(map.sourcesContent[i], fs.readFileSync(path.join(ROOT, 'app', file), 'utf8')));
  assert.equal(map.mappings.split(';').length, code.trimEnd().split('\n').length);
  for (const module of modules.filter(m => m.file.endsWith('.js'))) {
    assert.doesNotThrow(() => acorn.parse(module.source, { ecmaVersion: 'latest' }), module.file);
  }
  const runtimeFiles = fs.readdirSync(path.join(ROOT, 'app/combat'))
    .filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts') && file !== 'types.ts')
    .map(file => 'app/combat/' + file);
  for (const file of runtimeFiles) assert.ok(inputs.includes(file), 'Unreachable TS module: ' + file);
});

test('a generated combat statement maps to the matching original TS statement and line', () => {
  const { map, code } = assemble();
  const generated = code.split('\n');
  const mappings = decode(map.mappings);
  const sourceIndex = map.sources.indexOf('combat/simulation.ts');
  assert.ok(sourceIndex >= 0);
  const original = map.sourcesContent[sourceIndex].split('\n');
  const needle = 'effect.age += dt * K3;';
  const line = generated.findIndex(text => text.trim() === needle);
  assert.ok(line >= 0);
  const segment = mappings[line].find(segment => segment[1] === sourceIndex);
  assert.ok(segment, 'Generated statement must have a TS source mapping');
  assert.equal(original[segment[2]].trim(), needle);
  assert.equal(original[segment[2]].slice(segment[3], segment[3] + 6), 'effect');
});

test('editing an imported TS source changes the compiled entry, without editing index.ts', () => {
  // A temporary fixture avoids modifying the game source while a server is running.
  const directory = fs.mkdtempSync(path.join(tmpdir(), 'vltk-ts-reload-'));
  const entry = path.join(directory, 'index.ts'), dependency = path.join(directory, 'range.ts');
  try {
    fs.writeFileSync(entry, "export { range } from './range';\n");
    const compile = () => compileTypeScriptEntry(path.relative(path.join(ROOT, 'app'), entry), 'Probe',
      [entry, dependency].map(file => ({ file, source: fs.readFileSync(file, 'utf8') })));
    const run = code => { const sandbox = {}; vm.runInNewContext(code, sandbox); return sandbox.Probe.range; };
    fs.writeFileSync(dependency, 'export const range: number = 120;\n');
    const original = compile();
    assert.equal(run(original.code), 120);
    fs.writeFileSync(dependency, 'export const range: number = 240;\n');
    const rebuilt = compile();
    assert.equal(run(rebuilt.code), 240, 'Reload must include the edited import');
    assert.notEqual(rebuilt.code, original.code);
    assert.equal(fs.readFileSync(entry, 'utf8'), "export { range } from './range';\n");
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('simulator is a self-contained TypeScript entry with all runtime modules bundled and mapped',()=>{
  const files=fs.readdirSync(path.join(ROOT,'app/simulator'));
  assert.ok(files.includes('index.ts'));assert.ok(files.includes('runtime.ts'));assert.ok(files.includes('panel.ts'));assert.ok(files.includes('diagnostics.ts'));
  assert.ok(!files.some(file=>file.endsWith('.js')));
  assert.ok(!fs.existsSync(path.join(ROOT,'app/dev/arena-sim-01.js')));
  const {inputs,map}=assemble();
  for(const file of files.filter(file=>file.endsWith('.ts')&&file!=='types.ts')){
    assert.ok(inputs.includes('app/simulator/'+file),'Unbundled simulator module: '+file);
    assert.ok(map.sources.includes('simulator/'+file),'Missing simulator source map: '+file);
  }
});
