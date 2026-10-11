CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS storage (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE IF NOT EXISTS applied_batches (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE IF NOT EXISTS game_data (
  section TEXT NOT NULL,
  entry_key TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  PRIMARY KEY (section, entry_key)
);
CREATE VIEW IF NOT EXISTS characters AS
SELECT key,
  json_extract(CASE WHEN json_type(value, '$.d') = 'text' THEN json_extract(value, '$.d') ELSE value END, '$.name') AS name,
  json_extract(CASE WHEN json_type(value, '$.d') = 'text' THEN json_extract(value, '$.d') ELSE value END, '$.lvl') AS level,
  json_extract(CASE WHEN json_type(value, '$.d') = 'text' THEN json_extract(value, '$.d') ELSE value END, '$.fac') AS faction,
  updated_at
FROM storage WHERE key IN ('jxidle', 'jxidle_2', 'jxidle_3') AND json_valid(value);
PRAGMA user_version = 1;
