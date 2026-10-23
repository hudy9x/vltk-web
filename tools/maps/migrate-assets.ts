import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/** Idempotently move map artwork to public, preserving browser URLs and JSON references. */
export function migrateMapAssets(root: string): void {
  const sourceRoot = path.join(root, 'src/client/maps');
  const publicRoot = path.join(root, 'public/app/maps');
  const files = fs.readdirSync(sourceRoot, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(?:png|jpe?g|webp)$/i.test(entry.name))
    .map(entry => {
      const source = path.join(entry.parentPath, entry.name);
      return { source, destination: path.join(publicRoot, path.relative(sourceRoot, source)) };
    });
  const hash = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  // Check every collision before moving any bytes.
  for (const { source, destination } of files) {
    if (fs.existsSync(destination) && hash(source) !== hash(destination)) throw new Error(`Asset collision: ${destination}`);
  }
  for (const { source, destination } of files) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) fs.unlinkSync(source);
    else fs.renameSync(source, destination);
  }
}
if (process.argv[1]?.endsWith('migrate-assets.ts')) migrateMapAssets(process.cwd());
