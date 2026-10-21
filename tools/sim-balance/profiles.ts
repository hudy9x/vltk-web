import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { parse } from 'acorn';
import { transformSync } from 'esbuild';
import { collectLegacyDeclarations } from './legacy-runtime.ts';
import type { FactionBuild, LegacyScope } from './types.ts';

const repositoryRoot = process.cwd();
const outputDirectory = path.resolve(process.argv[2] || '/tmp/vltk-sim-balance');
fs.mkdirSync(outputDirectory, { recursive: true });
const declarations = collectLegacyDeclarations(path.join(repositoryRoot, 'src/client'));
const resolvingSymbols = new Set<string>();
let vmContext: vm.Context;
// Native j0/Pt/yt access their original shared globals. UI/persistence stubs keep
// evaluation isolated; native declarations are resolved on first access below.
const nativeGlobals: LegacyScope = {
  console, Math: Object.create(Math), JSON, Date, Object, Array, Set, Map, WeakMap, WeakSet,
  String, Number, Boolean, RegExp, Infinity, NaN, parseInt, parseFloat, isFinite,
  structuredClone, URL, Uint8Array, Int32Array, Float32Array, ArrayBuffer, Error, TypeError, Promise,
  localStorage: { getItem: () => null, setItem() {} }, combatSandbox: null, arenaSimulator: null,
  document: { querySelector: () => null, createElement: () => ({}), head: { appendChild() {} } },
  m: () => null, nm: () => [], mo: () => ({ dmg: 0 }), Hb() {}, Qb() {},
  l: { sim: true, quiet: true, buffAssume: true }, b: {}, m0: 0,
};
nativeGlobals.Math.random = () => 0.5; // Identical equipment rolls on each run.
const nativeScope = new Proxy(nativeGlobals, {
  get(target, symbolName) {
    if (symbolName in target) return Reflect.get(target, symbolName);
    if (typeof symbolName !== 'string' || resolvingSymbols.has(symbolName)) return undefined;
    const declarationSource = declarations.get(symbolName);
    if (!declarationSource) return undefined;
    resolvingSymbols.add(symbolName);
    try { vm.runInContext(declarationSource, vmContext, { filename: `native:${symbolName}` }); }
    catch (error) { throw new Error(`Native profile declaration ${symbolName} failed`, { cause: error }); }
    finally { resolvingSymbols.delete(symbolName); }
    return target[symbolName];
  },
});
vmContext = vm.createContext(nativeScope);
nativeGlobals.window = nativeGlobals.globalThis = nativeScope;
vm.runInContext(fs.readFileSync(path.join(repositoryRoot, 'public/data.js'), 'utf8'), vmContext);
nativeGlobals.S = nativeGlobals.JX;
nativeGlobals.JFX = { m: {}, c: {}, f: {} };
nativeGlobals.JW = { mon: {}, anim: {} };
const catalogFiles = ['equipment-and-zone-patches-01', 'equipment-and-zone-patches-02',
  'projectile-effects-01', 'projectile-effects-02',
  ...Array.from({ length: 59 }, (_, index) => `skill-tables-${String(index + 1).padStart(2, '0')}`),
  'advanced-skills-01', 'skill-150-details-01', 'status-effects-01'];
for (const catalogName of catalogFiles) vm.runInContext(fs.readFileSync(path.join(repositoryRoot, `src/client/data/${catalogName}.js`), 'utf8'), vmContext);
for (const skill of Object.values(nativeGlobals.JX.skills) as LegacyScope[]) if (skill.learn === '90') Object.assign(skill, { tier: 90, req: 80 });
nativeGlobals.T = nativeGlobals.JX.skills;
nativeGlobals.I = Object.fromEntries((nativeGlobals.JX.factions as LegacyScope[]).filter(faction => faction.skills?.length).map(faction => [faction.key, faction]));
// Configuration metadata also includes executable initialization outside `var`.
const configSource = fs.readFileSync(path.join(repositoryRoot, 'src/client/core/helpers-and-config-01.js'), 'utf8');
for (const statement of parse(configSource, { ecmaVersion: 'latest' }).body) {
  if (statement.type !== 'VariableDeclaration') vm.runInContext(configSource.slice(statement.start, statement.end), vmContext);
}
const require = createRequire(import.meta.url); // Existing bundler remains CommonJS.
const { compileTypeScriptEntry } = require('../build-app.js') as typeof import('../build-app.js');
vm.runInContext(compileTypeScriptEntry('simulator/equipment.ts', 'ArmyGear').code, vmContext);
nativeGlobals.createArmyEquipment = nativeGlobals.ArmyGear.createArmyEquipment;
// Evaluate the native builder without mounting simulator UI. Fail explicitly if
// these function boundaries move so a future refactor cannot silently use a stub.
const runtimeSource = fs.readFileSync(path.join(repositoryRoot, 'src/client/simulator/runtime.ts'), 'utf8');
const builderStart = runtimeSource.indexOf('  function battleProfile(');
const builderEnd = runtimeSource.indexOf('  function spawnBattleActor(', builderStart);
if (builderStart < 0 || builderEnd <= builderStart) throw new Error('Native battlefield profile builder was not found.');
vm.runInContext(transformSync(runtimeSource.slice(builderStart, builderEnd), { loader: 'ts', target: 'es2020' }).code, vmContext);
nativeGlobals.sandbox = {
  createProfile(faction: LegacyScope) {
    const profile = nativeScope.I3();
    return Object.assign(profile, { fac: faction.key, sex: nativeScope.Zt[faction.key] || 0, lvl: 150,
      skPts: 500, attrPts: 745, bkOk: {}, skL: {}, mainLock: true });
  },
};
const builds: FactionBuild[] = [];
for (const factionKey of Object.keys(nativeGlobals.I).filter(factionKey => !nativeGlobals.I[factionKey].novice)) {
  const profile = nativeScope.battleProfile({ team: 'song', faction: factionKey, level: 150, strength: 'normal', count: 1, equipped: true });
  nativeGlobals.o = profile;
  builds.push({ faction: factionKey, name: nativeGlobals.I[factionKey].n, profile, stats: nativeScope.j0() });
}
fs.writeFileSync(path.join(outputDirectory, 'profiles.json'), JSON.stringify({ builds, T: nativeGlobals.T, S: nativeGlobals.S, JFX: nativeGlobals.JFX }));
console.log(`Generated ${builds.length} native builds`);
