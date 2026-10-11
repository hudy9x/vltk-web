const { openDatabase, reset } = require('../server/database');
const db = openDatabase(); reset(db); db.close();
console.log('Đã reset save/kho/settings. Dữ liệu cấu hình game được giữ. Tải lại trang game.');
