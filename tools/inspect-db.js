const { openDatabase } = require('../server/database.ts');
const db = openDatabase();
console.table(db.prepare('SELECT * FROM characters').all());
console.table(db.prepare('SELECT key, length(value) AS bytes, updated_at FROM storage').all());
console.table(db.prepare('SELECT section, count(*) AS entries FROM game_data GROUP BY section').all());
db.close();
