/** Native map-tool's validation/metadata bridge. Uses the same TS model and game algorithms. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { MapDefinition, EncounterDefinition, ProgressionEntry } from '../../src/client/maps/types.ts';
interface EditorInput { map: MapDefinition; project: unknown; encounters: EncounterDefinition[]; progression: ProgressionEntry[] }
const require = createRequire(import.meta.url);
const { buildSync } = require('esbuild') as typeof import('esbuild');
const root = process.cwd();

export function monsterCatalog(): { id: number; name: string; image?: string }[] {
  const sandbox = vm.createContext({ window: {}, MapsEngine: { createLegacyCatalog: () => ({ zones: [], alternates: {}, navigation: {} }) } });
  for (const name of ['monsters-and-zones-01', 'monsters-and-zones-02', 'monsters-and-zones-03', 'monsters-and-zones-04', 'equipment-and-zone-patches-02']) {
    vm.runInContext(fs.readFileSync(path.join(root, `src/client/data/${name}.js`), 'utf8'), sandbox);
    sandbox.JW = sandbox.window.JW;
  }
  return Object.entries(sandbox.JW.mon as Record<string, { n: string; img?: string }>).map(([id, monster]) => ({ id: Number(id), name: monster.n, image: monster.img }));
}
export function validate(document: EditorInput, availableAssets: string[]): void {
  const compiled = buildSync({ entryPoints: [path.join(root, 'tools/map-tool/src/lib/model.ts')], bundle: true, platform: 'node', format: 'cjs', write: false, alias: { '@game': path.join(root, 'src/client/maps') } });
  const exports: Record<string, unknown> = {};
  const sandbox = vm.createContext({ module: { exports }, exports, atob, btoa, structuredClone, Uint8Array, Map, Set });
  vm.runInContext(compiled.outputFiles[0].text, sandbox);
  const model = sandbox.module.exports as { validateProject(project: unknown, id: number): void; validateDocument(document: EditorInput): MapDefinition; resolveMapAsset(id: number, asset: string): string };
  model.validateProject(document.project, document.map.id);
  const compiledMap = model.validateDocument(document);
  const actual = compiledMap.navigation, expected = document.map.navigation;
  if (actual.kind !== expected.kind || (actual.kind === 'grid' && expected.kind === 'grid' && (actual.columns !== expected.columns || actual.rows !== expected.rows || actual.cellSize.width !== expected.cellSize.width || actual.cellSize.height !== expected.cellSize.height || actual.blockedBase64 !== expected.blockedBase64))) throw new Error('Navigation chưa được compile từ project.');
  const monsters = new Set(monsterCatalog().map(monster => monster.id));
  const profiles = new Set<string>();
  for (const profile of document.encounters) {
    if (profiles.has(profile.id)) throw new Error(`Encounter trùng ID: ${profile.id}`);
    profiles.add(profile.id);
    for (const id of [...profile.monsterIds, profile.bossId]) if (!monsters.has(id)) throw new Error(`Không tìm thấy quái #${id}.`);
  }
  const oldProgression = JSON.parse(fs.readFileSync(path.join(root, 'src/client/maps/progression.json'), 'utf8')) as { mapId: number; alternateMapIds: number[] }[];
  for (let i = 0; i < oldProgression.length; i++) if (document.progression[i]?.mapId !== oldProgression[i].mapId) throw new Error('Không được đảo hoặc xóa thứ tự progression đang có.');
  const mapIds = new Set(fs.readdirSync(path.join(root, 'src/client/maps/content')).filter(id => /^\d+$/.test(id)).map(Number));
  mapIds.add(document.map.id);
  const seen = new Set<number>();
  for (const entry of document.progression) {
    if (!mapIds.has(entry.mapId) || seen.has(entry.mapId)) throw new Error('Progression có ID map không hợp lệ hoặc trùng.');
    seen.add(entry.mapId);
    for (const id of [entry.mapId, ...entry.alternateMapIds]) if (!mapIds.has(id) || !document.encounters.some(profile => profile.mapId === id)) throw new Error(`Map ${id} thiếu dữ liệu hoặc encounter.`);
  }
  const assets = [...document.map.layers.flatMap(layer => 'image' in layer ? [layer.image] : layer.type === 'world' ? layer.objects.map(object => object.image) : [])];
  for (const asset of assets) {
    let relative: string;
    try { relative = model.resolveMapAsset(document.map.id, asset); }
    catch { throw new Error(`Đường dẫn ảnh phải nằm trong thư mục map: ${asset}`); }
    const target = path.join(root, 'public/' + relative), mapRoot = path.join(root, 'public/app/maps/content', String(document.map.id));
    if (fs.existsSync(target)) {
      const resolved = fs.realpathSync(target);
      if (!resolved.startsWith(fs.realpathSync(mapRoot) + path.sep)) throw new Error(`Đường dẫn ảnh nằm ngoài thư mục map: ${asset}`);
    } else if (document.map.status !== 'test' && !availableAssets.includes(relative)) throw new Error(`Không tìm thấy ảnh: ${asset}`);
  }
}
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === 'inspect') process.stdout.write(JSON.stringify(monsterCatalog()));
    else if (process.argv[2] === 'validate') { const input = JSON.parse(fs.readFileSync(0, 'utf8')); validate(input.document, input.availableAssets); process.stdout.write('ok'); }
    else throw new Error('Usage: editor-data.ts inspect|validate');
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
