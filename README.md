# Võ Lâm Idle — local Node.js + SQLite

Yêu cầu Node.js 24 trở lên. Server không có dependency npm bên ngoài ở runtime.
`npm ci` cài công cụ dev dùng cho kiểm tra AST.

```sh
npm start
# http://127.0.0.1:3000
```

`npm run dev` bật môi trường development và Node watch. `PORT=3001 npm start` đổi port.
`DB_PATH=/absolute/path/test.sqlite npm start` dùng database riêng.

## Phòng test 10 môn phái

```sh
npm run dev:arena
# http://127.0.0.1:3002
```

Phòng test tự tạo 10 nhân vật độc lập, mỗi phái một nhân vật **cấp 150**,
**500 điểm kỹ năng chưa phân bổ**. Dùng database riêng
`database/combat-arena.sqlite`, không thay đổi save game chính. Không cần đăng nhập.

- Bấm nút tên phái trong bảng **Phòng test** ở góc trên trái để đổi ngay;
  điểm đã phân bổ, trang bị và tiến độ từng nhân vật được giữ khi đổi phái/reload.
- Chiêu 90 luôn được nâng tối đa theo dữ liệu từng chiêu, kể cả nhân vật test
  đã lưu trước đây; không tiêu hao 500 điểm kỹ năng. Chiêu tổng hợp vẫn theo điều kiện kỹ năng nền
  của game. Bấm nút chiêu để chọn và tự trang bị đúng loại vũ khí; dùng GM để
  nhận thêm điểm nếu cần.
- Lọc quái theo tên/ID, **cấp** và **độ hiếm: Thường / Boss / Hoàng Kim**.
  Cấp lọc theo khoảng xuất hiện gốc trong dữ liệu bản đồ; bỏ trống để xem tất cả.
  Chọn loại và số lượng **1–20**, rồi bấm **Tạo lại quái**. Quái được tạo ở cấp
  đã lọc, hoặc cấp thấp nhất trong khoảng xuất hiện nếu không lọc cấp.
  Quái chưa có thông tin cấp trong bản đồ chỉ xuất hiện khi không lọc cấp và
  dùng cấp 150 khi tạo trong phòng test.
  Mỗi con có **100.000 HP**; mỗi đòn chạm nhân vật gây đúng **1 sát thương**.
- Có checkbox **Quái đứng yên**, nút **Xóa quái**, và có thể thu gọn bảng bằng
  cách bấm tiêu đề. Đổi phái tạo lại loại quái đã chọn và xóa hiệu ứng cũ.
- Checkbox **Hiển thị HP cạnh tên quái** hiện sinh lực hiện tại/tối đa và được
  lưu lại. Quái chết tự hồi sinh sau **3 giây** tại vị trí tạo ban đầu, đúng
  loại/cấp/độ hiếm và số lượng đã chọn. Xóa quái, tạo lại hoặc đổi phái hủy lịch cũ.
- Trong chi tiết kỹ năng có **Cộng tối đa** (dùng điểm còn lại, theo giới hạn
  cấp học) và **Xóa hết điểm** (hoàn lại điểm kỹ năng đã cộng). Chiêu 90 luôn
  tối đa trong phòng test nên các nút thay đổi điểm của chiêu 90 được khóa.
- Phòng test dùng combat, va chạm và vật cản hiện tại; không tự sinh đợt quái,
  nhận XP hay loot khi giết quái. Sinh lực tối đa nhân vật tính theo chỉ số gốc
  của game; tạo lại quái giữ nguyên sinh lực/nội lực đang có, không tự hồi đầy.

Chế độ này chỉ được bật bởi `COMBAT_SANDBOX=1` cùng môi trường development;
`npm start` và `npm run dev:combat` giữ luồng chơi thông thường.

## Tạo nhân vật local để test combat

```sh
npm run dev:combat
# http://127.0.0.1:3001
```

Lệnh này bật development (có nút **GM**) và Node watch, dùng database riêng
`database/combat-test.sqlite`. Nhân vật test được lưu qua các lần khởi động;
save chính trong `database/game.sqlite` không bị thay đổi. Không cần tài khoản
hoặc mật khẩu. Dừng server bằng `Ctrl+C`.

1. Mở địa chỉ trên, chọn ô trống → **Tạo Nhân Vật**. Có tối đa 3 ô.
2. Nhập tên, chọn giới tính **Nam** và hệ theo bảng dưới.
3. Vào game, bấm **GM** ở góc trên trái → **+100 triệu điểm kinh nghiệm**.
4. Đạt cấp 10, gia nhập môn phái tương ứng. Tiếp tục tăng cấp bằng GM,
   rồi học và chọn chiêu cần test trong thẻ **Võ công**.

| Tên gợi ý | Hệ | Môn phái | Chiêu cấp 90 cần test |
|---|---|---|---|
| Combat-WuDang | Thổ | Võ Đang | Thiên Địa Vô Cực |
| Combat-CaiBang | Hỏa | Cái Bang | Phi Long Tại Thiên / Thiên Hạ Vô Cẩu |
| Combat-ThienNhan | Hỏa | Thiên Nhẫn | Thiên Ngoại Lưu Tinh |

Lệnh chỉ khởi động môi trường test; bạn tạo nhân vật và học chiêu qua giao diện.

Các chiêu 90 trong phòng test có quy tắc riêng: Phong Sương Toái Ảnh tính
va chạm từng tia; Nhân Kiếm Hợp Nhất tính ba kiếm và một đòn phụ; Lôi Động
Cửu Thiên gây một đòn mỗi 300ms trong 3 giây cho quái còn trong vùng.
Phi Long Tại Thiên và Thiên Hạ Vô Cẩu không gây sát thương quanh người tung
chiêu. Phạm vi nổ của Phi Long và ba chiêu 90 Đường Môn giảm còn 1/3.
Nhiếp Hồn Nguyệt Ảnh hiện hiệu ứng tại từng quái bị đạn xuyên hoặc vùng phụ
đánh trúng, tối đa một hiệu ứng mỗi quái trong một lần tung chiêu; hiệu ứng
này chỉ để hiển thị, không gây thêm sát thương.
Âm Phong Thực Cốt và Huyền Âm Trảm giảm phạm vi sát thương va chạm còn 2/3
(150 còn 100 đơn vị), giữ nguyên tầm xuất chiêu.
Vô Tướng Trảm và Đạt Ma Độ Giang giảm vùng sát thương va chạm còn 1/3;
Hoành Tảo Thiên Quân dùng vùng sát thương quanh người tung chiêu. Hai chiêu
Thiên Vương Phá Thiên Trảm và Truy Tinh Trục Nguyệt dùng sprite bay của
chiêu chính để kiểm tra va chạm, thay cho sprite phụ chỉ có hiệu ứng trúng đòn.
Hình hiển thị của Phá Thiên Trảm là `fx/m138_hit.webp`, Truy Tinh Trục Nguyệt
là `fx/m139_hit.webp`; mỗi lần tung chiêu chỉ chạy một sprite sheet màu vàng
tại điểm trúng đầu tiên, giữ nguyên tọa độ cho đến khi hết animation. Đường
bay dùng để kiểm tra va chạm được ẩn, cách tính sát thương giữ nguyên.
Thiên Ngoại Lưu Tinh giữ cố định hiệu ứng; Thiên Địa Vô Cực chạy animation
nhanh gấp đôi, không thay đổi nhịp tính sát thương.

## Kiến trúc

Nút **Xóa log** xóa toàn bộ log của nhân vật hiện tại; **Copy log** sao chép
các sự kiện phù hợp bộ lọc (tối đa 300 dòng), không kèm tên chiêu thức. Bộ lọc
và các nút vẫn thao tác được khi sát thương liên tục cập nhật.

Tab **Log** cạnh Thế giới/Hệ thống ở góc dưới trái ghi sát thương thực tế của
nhân vật đang chơi: gây lên quái, nhận từ quái, độc/hiệu ứng duy trì và phản đòn.
Chọn **Cả hai / Gây sát thương / Nhận sát thương** để lọc; lựa chọn được lưu
theo nhân vật. Log ghi HP thực tế bị mất và đòn trượt/né theo chiều gây hoặc
nhận; không ghi hồi máu hoặc mô phỏng offline. Khi vượt HP còn lại, số ghi là HP thực tế đã mất.
Giữ tối đa 300 sự kiện trong phiên, hiển thị 100 dòng mới nhất phù hợp bộ lọc;
đổi nhân vật hoặc reload bắt đầu log mới. Thu gọn bảng Phòng test nếu nó che log.
Dòng log có dạng `<số thứ tự> - hh:ss`, với `hh` là giờ và `ss` là giây,
cùng ⚔️ thay cho chữ sát thương. Số thứ tự có tối thiểu 3 chữ số
(`001`, `002`, … `999`, `1000`). Số thứ tự giữ nguyên khi lọc, bắt đầu lại từ
1 khi xóa log hoặc đổi nhân vật.

```text
app/*/*.js -> tools/build-app.js -> app/game.js
                                     ^
index.html -> client/bootstrap.js ---+ (sau data.js + setvi.js)
                                     |
                           combat + UI + Canvas -> jxlook.js / assets
```

Đây là game web idle lấy cảm hứng từ JX1/VLTK. Combat, AI, loot, inventory,
forge và nhiệm vụ chạy ở trình duyệt từ source trong `app/`. Repo ban đầu có các file JS/CSS
rỗng; chúng được khôi phục từ https://volamidle.pages.dev/ (bản v622, ngày 11/10/2026).

## Chỉnh sửa game

Source gồm 123 file gốc, 2 file công cụ dev, 1 module va chạm và 1 module log sát thương trong `app/`, theo nhóm
data, core, combat, gameplay, render, UI, systems, online và dev.
Xem [app/README.md](app/README.md) để tìm đúng nhóm.
`app/modules.json` giữ thứ tự ghép và danh sách symbol từng file.

```sh
npm run build   # tạo app/game.js + source map từ source trong app/
npm test       # kiểm tra module/source map, GM và luồng SQLite/HTTP
npm start      # tự build lúc khởi động và mỗi lần browser tải app/game.js
```

Chỉnh file source rồi reload trình duyệt. DevTools dùng source map để hiển thị
file trong `app/`. Không sửa `app/game.js`: đây là output được tạo lại tự động.
Các file chia nhỏ vẫn dùng chung scope và tên biến từ bản gốc; builder ghép chúng
trong cùng IIFE để giữ hành vi. Chưa chuyển sang các ES module độc lập.

## Va chạm và thời điểm gây sát thương

Click quái ưu tiên chọn mục tiêu trước đồ rơi, đổi sang điều khiển manual và
nhấp nháy vòng vàng dưới chân trong 1 giây. Rê chuột lên vùng chọn quái
hiện con trỏ dao nền trong suốt (`img/ui/attack-dagger.svg`), điểm click ở đầu
dao; vùng chọn bao phủ thân và đầu, riêng với hitbox sát thương.
Nếu ngoài tầm, nhân vật tiến vào tầm để ra đòn đầu tiên. Sau khi xuất chiêu,
nhân vật giữ vị trí và tiếp tục đánh nếu mục tiêu còn trong tầm; không tự đuổi
khi mục tiêu chạy ra xa. Click một mục tiêu hoặc vị trí mới để ra lệnh tiếp.
Thời gian giữa các đòn vẫn được giữ, nhưng bộ đếm tiếp tục giảm khi đứng chờ
trong manual để không phát sinh độ trễ do bộ đếm bị đóng băng.

`app/combat/hit-resolution-01.js` cập nhật đạn và vùng đánh trong vòng mô phỏng.
Đạn phải cắt hitbox mục tiêu; đạn và cận chiến có 0,12 giây ra đòn. Đạn thẳng giữ
hướng ban đầu; đạn truy đuổi bẻ hướng theo dữ liệu chuyển động của từng chiêu.
Vùng skill đứng yên xuất hiện tại tọa độ khởi tạo, không chạy theo người tung
chiêu hoặc mục tiêu. Mục tiêu di chuyển ra khỏi đường đạn/vùng đánh có thể né.
Thiên Ngoại Lưu Tinh, Thiên Địa Vô Cực, Phong Sương Toái Ảnh và Lôi Động Cửu Thiên bỏ qua vật cản
khi xuất chiêu và xử lý hiệu ứng (kể cả hiệu ứng phụ). Vẫn phải đủ tầm đánh
và chạm hitbox/nằm trong vùng ảnh hưởng đang hoạt động mới nhận sát thương.
Vân Long Kích và Nhân Kiếm Hợp Nhất dùng vùng chữ nhật hẹp theo hướng chiêu,
không tạo sát thương tròn quanh mục tiêu. Mọi quái có hitbox giao vùng đều bị
đánh, kể cả nhiều quái chồng cùng tọa độ; đạn không xuyên vẫn dừng tại điểm
va chạm đầu tiên và chỉ đánh các hitbox cùng giao điểm đó.
Thiên Ngoại Lưu Tinh và Nghiệp Hỏa gây sát thương theo nhịp **300 ms** trong
thời gian hiệu ứng còn tồn tại. Vùng giữ tọa độ ban đầu, kiểm tra quái đang ở
trong vùng tại mỗi nhịp; nhiều lớp hình ảnh không nhân đôi sát thương cùng nhịp.
Va chạm quét cả đoạn chuyển động của đạn
để tránh bỏ sót mục tiêu khi đạn chạy nhanh.

Hiệu ứng hình ảnh dùng cùng vị trí mô phỏng; giới hạn số FX, tùy chọn giảm hiệu
ứng và mô phỏng offline không quyết định damage. Chiêu phụ gây damage và debuff
cũng chờ va chạm. Độc đã trúng tiếp tục tick; aura và bẫy kiểm tra vùng tác động.
Hitbox dùng hình học của cơ thể và vùng skill, không kiểm tra từng pixel sprite.

Test combat dùng dữ liệu Thiếu Lâm, Võ Đang, Cái Bang và Thiên Nhẫn để kiểm tra
Vô Tướng Trảm, Thiên Địa Vô Cực, Phi Long Tại Thiên, Thiên Hạ Vô Cẩu và vùng nổ
Thiên Ngoại Lưu Tinh: thời điểm damage, né đạn, truy đuổi, tâm cố định, phạm vi,
thời hạn hiệu lực, xuyên mục tiêu, địa hình và tính độc lập với việc vẽ hình.

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

Công cụ Node quét source game, data, CSS và manifest, lưu trực tiếp vào repo root
để server phục vụ đúng đường dẫn. Nó kiểm tra chữ ký
PNG/WebP/JPEG/font/audio, giải mã base64 nếu cần, tải lại file hỏng và ghi atomically.

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
- Cấp 150: tăng trực tiếp lên cấp 150, nhận điểm tiềm năng/kỹ năng tương ứng
  số cấp tăng và đặt XP về 0. Không hạ cấp nhân vật đã đạt cấp 150 trở lên.
- Học chiêu 90: tự tìm tất cả chiêu cấp 90 theo môn phái hiện tại, mở quyền bí kíp
  và học cấp 1 (giữ cấp chiêu đã luyện). Không tốn bí kíp hay điểm kỹ năng;
  vẫn cần đủ cấp học và đã gia nhập môn phái.
- Nâng tối đa chiêu 90: nâng các chiêu cấp 90 đã học của phái hiện tại lên
  giới hạn trong dữ liệu từng chiêu, đồng bộ tiến độ luyện và đặt XP chiêu về 0.
- Tiềm năng: thêm **3.000 điểm chưa phân bổ** vào thẻ Nhân vật mỗi lần bấm.
- Checkbox **Hiển thị phạm vi chiêu thức**: vẽ một vòng quanh nhân vật theo
  tầm đánh của chiêu chính hiện tại; đổi chiêu thì vòng cập nhật theo. Vòng tròn
  trong tọa độ game hiện thành ellipse theo góc nhìn bản đồ, dùng cùng cách tính
  khoảng cách với tầm xuất chiêu. Bán kính Bắc–Nam bằng 60% Đông–Tây (trước đây
  là 50%); Đông–Tây giữ nguyên. Chiêu đánh quanh người dùng bán kính vùng ảnh hưởng.
  Mặc định tắt mỗi lần reload; đóng bảng GM vẫn giữ vòng khi checkbox đang bật.
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
`app/dev/game-master-01.js`.

Nút **Bán nhanh** cạnh GM cũng chỉ hiện trong development. Bấm để bật, sau đó bấm
từng món trong Hành trang để bán ngay toàn bộ món/chồng, không hỏi xác nhận.
Giá bán theo game hiện tại; món đang khóa được tự mở khóa rồi bán. Nhấn **Esc** hoặc bấm lại
nút Bán nhanh để kết thúc. Chế độ không tự bật lại sau reload.
