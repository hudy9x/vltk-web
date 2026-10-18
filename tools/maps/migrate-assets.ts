import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/** One-time, idempotent move. Existing destination bytes must match exactly. */
export function migrateMapAssets(root: string): void {
  const content = path.join(root, 'app/maps/content');
  for (const id of fs.readdirSync(content).filter(name => /^[1-9]\d*$/.test(name))) {
    const filename = path.join(content, id, 'map.json');
    const map = JSON.parse(fs.readFileSync(filename, 'utf8'));
    let missing = false;
    const migrate = (image: string): string => {
      if (!image.startsWith('img/z/')) return image;
      const target = `app/maps/content/${id}/assets/ground${path.extname(image)}`;
      const source = path.join(root, image), destination = path.join(root, target);
      if (fs.existsSync(source)) {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        const hash = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        if (fs.existsSync(destination) && hash(source) !== hash(destination)) throw new Error(`Asset collision: ${target}`);
        fs.renameSync(source, destination);
      } else if (!fs.existsSync(destination)) missing = true;
      return `./assets/ground${path.extname(image)}`;
    };
    for (const layer of map.layers) {
      if (layer.image) layer.image = migrate(layer.image);
      for (const object of layer.objects || []) object.image = migrate(object.image);
    }
    map.status ??= missing ? 'test' : 'available';
    fs.writeFileSync(filename, JSON.stringify(map, null, 2) + '\n');
  }
}
if (process.argv[1]?.endsWith('migrate-assets.ts')) migrateMapAssets(process.cwd());
