# Võ Lâm Idle — local Node.js + SQLite

Yêu cầu Node.js 24 trở lên. Server không có dependency npm bên ngoài ở runtime.
`npm ci` cài công cụ dev dùng cho kiểm tra AST và format source.

```sh
npm start
# http://127.0.0.1:3000
```

`npm run dev` bật môi trường development và Node watch. `PORT=3001 npm start` đổi port.
`DB_PATH=/absolute/path/test.sqlite npm start` dùng database riêng.

## Kiến trúc

```text
app/*/*.js -> tools/build-app.js -> app/game.js
                                     ^
index.html -> client/bootstrap.js ---+ (sau data.js + setvi.js)
                                     |
                           combat + UI + Canvas -> jxlook.js / assets

app.js = backup nguyên bản, chỉ dùng khi mở /?backup=1
```

Đây là game web idle lấy cảm hứng từ JX1/VLTK. Combat, AI, loot, inventory,
forge và nhiệm vụ chạy ở trình duyệt từ source trong `app/`. Repo ban đầu có các file JS/CSS
rỗng; chúng được khôi phục từ https://volamidle.pages.dev/ (bản v622, ngày 11/10/2026).
Không chạy tools/split_src.js hoặc tools/split_clean.js: chúng dùng số dòng cố định
của một bản source khác và có thể làm hỏng bundle hiện tại.

## Chỉnh sửa game

Source đã format và chia thành 123 file gốc và 1 file GM trong `app/`, theo nhóm
data, core, combat, gameplay, render, UI, systems, online và dev.
Xem [app/README.md](app/README.md) để tìm đúng nhóm.
`app/modules.json` giữ thứ tự ghép và danh sách symbol từng file.

```sh
npm run build   # tạo app/game.js + source map, giữ nguyên app.js
npm test       # kiểm tra logic tương đương bản backup và luồng SQLite/HTTP
npm start      # tự build lúc khởi động và mỗi lần browser tải app/game.js
```

Chỉnh file source rồi reload trình duyệt. DevTools dùng source map để hiển thị
file trong `app/`. Không sửa `app/game.js`: đây là output được tạo lại tự động.
Mở `http://127.0.0.1:3000/?backup=1` để chạy backup với cùng SQLite/save.
Các file chia nhỏ vẫn dùng chung scope và tên biến từ bản gốc; builder ghép chúng
trong cùng IIFE để giữ hành vi. Chưa chuyển sang các ES module độc lập.

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

## Sửa và kiểm tra asset

```sh
npm run assets:repair      # sửa base64 và tải lại file rỗng/hỏng đã có
npm run assets:download    # tải trước asset tham chiếu trực tiếp trong JS/CSS
# Tùy chọn tải toàn bộ 9.613 sprite JXLOOK, dung lượng lớn:
node tools/download-assets.js --all-sprites
```

Công cụ Node quét theo cách các downloader Python trong tools/ đang làm, lưu
trực tiếp vào repo root để server phục vụ đúng đường dẫn. Nó kiểm tra chữ ký
PNG/WebP/JPEG/font/audio, giải mã base64 nếu cần, tải lại file hỏng và ghi atomically.
Các script Python cũ mặc định lưu vào assets/ và chỉ kiểm tra file tồn tại;
không dùng thư mục assets/ làm dấu hiệu game đã tải đủ tài nguyên.

Báo cáo lần quét: `database/asset-report.json`. Báo cáo các request asset thực tế
kể từ lúc server khởi động: `GET /api/assets` (gồm repaired/downloaded/failures).
Asset sinh đường dẫn động, như sprite nhân vật JXLOOK, vẫn được tải theo nhu cầu
và kiểm tra byte trước khi trả về. Server phục vụ cả thư mục music/.

Nút Chợ hiện trong bản local; bấm nút sẽ giải thích backend giao dịch online
chưa được triển khai. Không kết nối tới Supabase production để mở Chợ.

## GameMaster (GM)

Chạy `npm run dev`, vào nhân vật rồi bấm **GM** ở góc trên trái. `npm start`
không hiển thị nút GM (trừ khi bạn chủ động đặt `NODE_ENV=development`).
Môi trường được bootstrap đọc từ `GET /api/config`, không bật bằng query trên URL.

- Vàng: +100 triệu vạn lượng = **1.000.000.000.000 lượng**.
- Kim Nguyên Bảo: +10 vạn = **100.000 KNB**.
- Kinh nghiệm: +**100.000.000 XP**, qua logic lên cấp hiện có, không nhân bonus XP.
  Nếu đã đạt giới hạn cấp, nút báo lỗi và không thêm XP.
- Rương: +**100 rương Hoàng Kim môn phái** xếp chồng trong hành trang. Dùng từng
  rương để nhận 1 món Hoàng Kim đúng phái lúc nhận; trang bị được tự khóa. Khi
  hành trang đầy, không thêm hoặc tiêu hao rương. Rương còn mở được khi chạy lại
  bằng `npm start`.
- Nhẫn: +**2 Càn Khôn Giới Chỉ** bản gốc (Hoàng Kim, cấp đồ 10, hệ Kim, yêu cầu
  cấp nhân vật 60, tất cả kỹ năng +2). Hai chiếc có UID riêng, được khóa sẵn và lưu
  vào Hành trang; cần 2 ô trống. Không tự trang bị.

Các lệnh dùng luồng save hiện tại và được đồng bộ sang SQLite. Source GM nằm ở
`app/dev/game-master-01.js`; `app.js` backup giữ nguyên, không có tính năng GM.

Nút **Bán nhanh** cạnh GM cũng chỉ hiện trong development. Bấm để bật, sau đó bấm
từng món trong Hành trang để bán ngay toàn bộ món/chồng, không hỏi xác nhận.
Giá bán theo game hiện tại; món đang khóa được tự mở khóa rồi bán. Nhấn **Esc** hoặc bấm lại
nút Bán nhanh để kết thúc. Chế độ không tự bật lại sau reload.
