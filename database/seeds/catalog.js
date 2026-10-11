const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { ROOT, openDatabase } = require('../../server/database');
function seedCatalog(db) {
  const files = ['data.js', 'setvi.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const hash = createHash('sha256').update(files.join('\n')).digest('hex');
  if (db.prepare("SELECT value FROM metadata WHERE key='catalog_hash'").get()?.value === hash) return;
  const sandbox = {}; sandbox.window = sandbox;
  vm.createContext(sandbox);
  files.forEach(source => vm.runInContext(source, sandbox, { timeout: 10000 }));
  const sections = { ...sandbox.JX, SET_VI: sandbox.SET_VI };
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('DELETE FROM game_data');
    const insert = db.prepare('INSERT INTO game_data VALUES (?,?,?)');
    for (const [section, data] of Object.entries(sections)) {
      for (const [key, entry] of Object.entries(data && typeof data === 'object' ? data : { value: data })) {
        insert.run(section, key, JSON.stringify(entry));
      }
    }
    db.prepare("INSERT OR REPLACE INTO metadata VALUES ('catalog_hash',?)").run(hash);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
if (require.main === module) {
  const db = openDatabase(); seedCatalog(db);
  console.log(db.prepare('SELECT section, count(*) AS entries FROM game_data GROUP BY section').all()); db.close();
}
module.exports = { seedCatalog };
