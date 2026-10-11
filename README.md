# Võ Lâm Idle — local Node.js + SQLite

Yêu cầu Node.js 24 trở lên. Server không có dependency npm bên ngoài.

```sh
npm start
# http://127.0.0.1:3000
```

`npm run dev` chạy cùng server với Node watch. `PORT=3001 npm start` đổi port.
`DB_PATH=/absolute/path/test.sqlite npm start` dùng database riêng.

## Kiến trúc

```text
index.html -> client/bootstrap.js -> data.js + setvi.js -> app.js
                                                        |
                                              combat + UI + Canvas
                                                        |
                                                 jxlook.js / assets
```

Đây là game web idle lấy cảm hứng từ JX1/VLTK. Combat, AI, loot, inventory,
forge và nhiệm vụ chạy ở trình duyệt trong app.js. Repo ban đầu có các file JS/CSS
rỗng; chúng được khôi phục từ https://volamidle.pages.dev/ (bản v622, ngày 11/10/2026).
Không chạy tools/split_src.js hoặc tools/split_clean.js: chúng dùng số dòng cố định
của một bản source khác và có thể làm hỏng bundle hiện tại.

```text
Game -> localStorage + outbox -> POST /api/storage -> Node HTTP -> SQLite
Reload <- hydrate localStorage <- GET /api/storage <------------+
```

SQLite ở `database/game.sqlite`, chế độ WAL. File `-wal` và `-shm` là file phụ
của SQLite; khi sao lưu lúc server đang chạy, dùng công cụ SQLite backup hoặc dừng
server trước khi copy. Save giữ nguyên chuỗi JSON và checksum của game.

- `storage`: save 3 slot (`jxidle`, `jxidle_2`, `jxidle_3`), backup, kho chung và settings.
- `characters`: SQL view để xem tên/cấp/môn phái từ save, không sửa save gốc.
- `game_data`: 19 nhóm dữ liệu cấu hình từ data.js và bản dịch setvi.js; một số entry
  là nhóm lồng nhau. Đây là bản sao để truy vấn/test; runtime vẫn dùng data.js gốc.
- `metadata`: phiên database, trạng thái nhập save và hash catalog.
- `applied_batches`: chống áp dụng lại request khi reload/retry.

Bootstrap đọc SQLite trước khi chạy game. Lần đầu database chưa khởi tạo, nó nhập
các key game sẵn có trong localStorage của chính origin hiện tại. Save ở website
khác không tự chuyển sang local; có thể dùng tính năng xuất/nhập .jxsave của game.
Writes đồng bộ bất đồng bộ theo thứ tự; outbox trong trình duyệt giữ các request
chưa hoàn tất để thử lại sau reload hoặc mất kết nối. Save chưa gửi xong khi đóng
trình duyệt sẽ được gửi tiếp khi mở lại cùng origin. Giữ nguyên host/port khi test.

Đây là **một profile test local dùng chung database**, không có tài khoản riêng.
Supabase production bị tắt qua CHAT_CFG; chat online, tổ đội online, tài khoản,
giftcode và các hoạt động cần backend online chưa được triển khai trên SQLite.
Server bind `127.0.0.1`, dùng cho local test.

## Tài nguyên

```text
GET asset -> file đã có? -> trả file
                 |
                chưa -> tải từ website gốc -> lưu img/fx/snd/fonts/ui -> trả file
```

Các sprite/audio chưa có cần Internet khi truy cập lần đầu. File đã tải dùng lại
trên máy. Đây chưa phải bộ tài nguyên offline đầy đủ. JS/CSS/API không được service
worker cache trong bản local để tránh đọc code hoặc save cũ.

## Database và kiểm tra

```sh
npm run db:seed     # nhập/cập nhật catalog; không xóa save
npm run db:inspect  # xem nhân vật, các key save và số entry theo nhóm
npm run db:reset    # XÓA save/kho/settings của profile test, giữ catalog; reload game
npm test
```

Reset đổi generation để browser/outbox cũ không khôi phục dữ liệu đã xóa. Sau reset,
tải lại mọi tab game. Database tự khởi tạo/migrate/seed khi chạy server.

```sql
SELECT * FROM characters;
SELECT key, length(value), updated_at FROM storage;
SELECT section, count(*) FROM game_data GROUP BY section;
SELECT data FROM game_data WHERE section = 'factions' AND entry_key = '0';
```

API: `GET /api/health`, `GET /api/storage`, `POST /api/storage/init`,
`POST /api/storage`, `GET /api/catalog`, `GET /api/catalog/entry?section=maps&key=0`.
Server chỉ phục vụ các file frontend/tài nguyên được phép; không phục vụ database,
source server hoặc thư mục .git. Test dùng database tạm, không đụng save test đang chơi.
