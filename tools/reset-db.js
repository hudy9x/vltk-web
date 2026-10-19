const { openDatabase, reset } = require('../src/server/database.ts');
const db = openDatabase(); reset(db); db.close();
console.log('Đã reset save/kho/settings. Dữ liệu cấu hình game được giữ. Tải lại trang game.');
