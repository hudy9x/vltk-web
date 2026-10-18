import fs from 'node:fs';
import path from 'node:path';

/** Regenerate imports from folders so saving a new map requires no manual TS edits. */
export function syncMapCatalog(appDirectory: string): void {
  const directory = path.join(appDirectory, 'maps/content');
  const ids = fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^[1-9]\d*$/.test(entry.name) && fs.existsSync(path.join(directory, entry.name, 'map.json')))
    .map(entry => Number(entry.name)).sort((a, b) => a - b);
  const unavailable: { id: number; name: string }[] = [];
  const available: number[] = [];
  const statuses: Record<string, 'available' | 'test'> = {};
  for (const id of ids) {
    const document: unknown = JSON.parse(fs.readFileSync(path.join(directory, String(id), 'map.json'), 'utf8'));
    if (!document || typeof document !== 'object' || !('id' in document) || document.id !== id) throw new Error(`Map folder ${id}: document ID must match folder name`);
    const map = document as { id: number; name: string; status?: string };
    if (map.status !== undefined && !['available', 'test'].includes(map.status)) throw new Error(`Map ${id}: invalid status`);
    if (id === 37 && map.status === 'test') throw new Error('Biện Kinh phải Available.');
    statuses[id] = map.status === 'test' ? 'test' : 'available';
    if (map.status === 'test') unavailable.push({ id, name: map.name });
    else available.push(id);
  }
  const source = '// Generated from maps/content/*/map.json by tools/maps/catalog.ts.\n' +
    available.map(id => `import map${id} from './content/${id}/map.json';`).join('\n') +
    `\n\nexport const mapDocuments: readonly unknown[] = [${available.map(id => `map${id}`).join(', ')}];\n` +
    `export const unavailableMaps: readonly { id: number; name: string }[] = ${JSON.stringify(unavailable)};\n`;
  const filename = path.join(appDirectory, 'maps/catalog-data.ts');
  if (!fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== source) fs.writeFileSync(filename, source);
  const manifestFile = path.join(appDirectory, 'maps/availability.json');
  const manifest = JSON.stringify({ schemaVersion: 1, maps: statuses }, null, 2) + '\n';
  if (!fs.existsSync(manifestFile) || fs.readFileSync(manifestFile, 'utf8') !== manifest) fs.writeFileSync(manifestFile, manifest);
}
