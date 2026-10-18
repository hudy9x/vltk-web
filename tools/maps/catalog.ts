import fs from 'node:fs';
import path from 'node:path';

/** Regenerate imports from folders so saving a new map requires no manual TS edits. */
export function syncMapCatalog(appDirectory: string): void {
  const directory = path.join(appDirectory, 'maps/content');
  const ids = fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^[1-9]\d*$/.test(entry.name) && fs.existsSync(path.join(directory, entry.name, 'map.json')))
    .map(entry => Number(entry.name)).sort((a, b) => a - b);
  for (const id of ids) {
    const document: unknown = JSON.parse(fs.readFileSync(path.join(directory, String(id), 'map.json'), 'utf8'));
    if (!document || typeof document !== 'object' || !('id' in document) || document.id !== id) throw new Error(`Map folder ${id}: document ID must match folder name`);
  }
  const source = '// Generated from maps/content/*/map.json by tools/maps/catalog.ts.\n' +
    ids.map(id => `import map${id} from './content/${id}/map.json';`).join('\n') +
    `\n\nexport const mapDocuments: readonly unknown[] = [${ids.map(id => `map${id}`).join(', ')}];\n`;
  const filename = path.join(appDirectory, 'maps/catalog-data.ts');
  if (!fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== source) fs.writeFileSync(filename, source);
}
