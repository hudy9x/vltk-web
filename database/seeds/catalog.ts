import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { isMainModule } from '../../server/paths.ts';
import { ROOT, openDatabase } from '../../server/database.ts';
export function seedCatalog(db: DatabaseSync): void {
  const files = ['data.js', 'setvi.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const hash = createHash('sha256').update(files.join('\n')).digest('hex');
  if (db.prepare("SELECT value FROM metadata WHERE key='catalog_hash'").get()?.value === hash) return;
  const sandbox: { window?: unknown; JX?: Record<string, unknown>; SET_VI?: unknown } = {}; sandbox.window = sandbox;
  vm.createContext(sandbox);
  files.forEach(source => vm.runInContext(source, sandbox, { timeout: 10000 }));
  const sections = { ...sandbox.JX, SET_VI: sandbox.SET_VI };
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('DELETE FROM game_data');
    const insert = db.prepare('INSERT INTO game_data VALUES (?,?,?)');
    for (const [section, data] of Object.entries(sections)) {
      for (const [key, entry] of Object.entries(data && typeof data === 'object' ? data : { value: data })) {
        insert.run(section, key, JSON.stringify(entry)!);
      }
    }
    db.prepare("INSERT OR REPLACE INTO metadata VALUES ('catalog_hash',?)").run(hash);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
if (isMainModule(import.meta.url)) {
  const db = openDatabase(); seedCatalog(db);
  console.log(db.prepare('SELECT section, count(*) AS entries FROM game_data GROUP BY section').all()); db.close();
}
