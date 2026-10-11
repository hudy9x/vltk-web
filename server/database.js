const { DatabaseSync } = require('node:sqlite');
const { mkdirSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
// Preserve game keys, but exclude cloud credentials and per-tab heartbeat locks.
const isGameKey = key => typeof key === 'string' && key.length <= 128 &&
  /^(jxidle(?:$|_)|jx_|jxDev$|jxBanMark$|jxBanWiped_|jxCheat$)/.test(key) &&
  !/^jxidle_(auth|sbvia|hb_)/.test(key);
function openDatabase(filename = process.env.DB_PATH || path.join(ROOT, 'database/game.sqlite')) {
  if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(readFileSync(path.join(ROOT, 'database/migrations/001-initial.sql'), 'utf8'));
  db.prepare("INSERT OR IGNORE INTO metadata VALUES ('generation', ?)").run(randomUUID());
  return db;
}
function snapshot(db) {
  return {
    generation: db.prepare("SELECT value FROM metadata WHERE key='generation'").get().value,
    initialized: !!db.prepare("SELECT 1 FROM metadata WHERE key='initialized'").get(),
    entries: Object.fromEntries(db.prepare('SELECT key, value FROM storage ORDER BY key').all().map(r => [r.key, r.value]))
  };
}
function validateOperations(operations) {
  if (!Array.isArray(operations) || operations.length > 256) throw Object.assign(new Error('Invalid operations'), { status: 400 });
  for (const op of operations) {
    if (!op || !isGameKey(op.key) || !(op.value === null || typeof op.value === 'string') || (op.value?.length || 0) > 2_000_000) {
      throw Object.assign(new Error('Invalid storage key/value'), { status: 400 });
    }
  }
}
function applyBatch(db, batch) {
  validateOperations(batch.operations);
  if (typeof batch.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(batch.id)) throw Object.assign(new Error('Invalid batch ID'), { status: 400 });
  if (batch.generation !== snapshot(db).generation) throw Object.assign(new Error('Database was reset; reload the game'), { status: 409 });
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!db.prepare('SELECT 1 FROM applied_batches WHERE id=?').get(batch.id)) {
      const upsert = db.prepare("INSERT INTO storage(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')");
      const remove = db.prepare('DELETE FROM storage WHERE key=?');
      for (const op of batch.operations) op.value === null ? remove.run(op.key) : upsert.run(op.key, op.value);
      db.prepare('INSERT INTO applied_batches(id) VALUES (?)').run(batch.id);
      db.prepare("INSERT OR IGNORE INTO metadata VALUES ('initialized','1')").run();
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
function initialize(db, entries) {
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) throw Object.assign(new Error('Invalid entries'), { status: 400 });
  const operations = Object.entries(entries).map(([key, value]) => ({ key, value }));
  validateOperations(operations);
  if (!snapshot(db).initialized) applyBatch(db, { id: randomUUID(), generation: snapshot(db).generation, operations });
  return snapshot(db);
}
function reset(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('DELETE FROM storage; DELETE FROM applied_batches;');
    db.prepare("UPDATE metadata SET value=? WHERE key='generation'").run(randomUUID());
    db.prepare("INSERT OR REPLACE INTO metadata VALUES ('initialized','1')").run();
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = { ROOT, openDatabase, snapshot, initialize, applyBatch, reset, isGameKey };
