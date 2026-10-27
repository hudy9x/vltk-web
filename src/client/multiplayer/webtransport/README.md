# WebTransport multiplayer trong game

Client dùng trực tiếp bản đồ, nhân vật và input của game. Hai demo độc lập vẫn nằm ở
`src/client/multiplayer-demo/` và `src/server/multiplayer-demo/`, commit tham khảo `6d6a72f`.

- `protocol.ts`: encode/decode binary, kiểm tra kích thước, phiên bản và sequence.
- `transport.ts`: WebTransport, QUIC datagram và stream tin cậy, giới hạn hàng đợi.
- `index.ts`: phiên kết nối, retry có backoff, roster, nội suy 100 ms.
- `legacy-bridge.js`: lấy vị trí/ngoại hình của game, ghép người thật vào hàng vẽ theo Y.

## Phạm vi bước đầu

Những tài khoản khác nhau trên cùng bản đồ thấy nhân vật và chuyển động của nhau.
Chỉ chuột trái ra lệnh di chuyển khi online; WASD, phím mũi tên, touch và gamepad
không điều khiển di chuyển. `?multiplayer=off` tắt kết nối cho lần mở trang đó.
Nút trạng thái trên sân cho biết số người và cho phép kết nối lại.

Game hiện xử lý đường đi, va chạm và chiến đấu tại client. Rust quản lý phiên xác thực,
phân phòng theo map, nhận vị trí và phát snapshot. Đây là lớp presence/movement đầu tiên:
**chưa phải mô phỏng di chuyển chống gian lận hoặc chiến đấu có thẩm quyền trên server**.
Map ID và ngoại hình do client báo; vé xác thực chỉ chứng minh account.
Người thật không được thêm vào `l.enemies`/`l.allies`, không nhận damage, AI hoặc loot.
HP trong nameplate người thật là placeholder, chưa đồng bộ chỉ số chiến đấu.
Một account chỉ có một kết nối đồng thời. Mỗi map tối đa 32 người, toàn server 128 phiên.

## Giao thức binary v1

Mọi số nhiều byte dùng **little endian**. Tọa độ là float32, đơn vị pixel của game.
Tên dùng UTF-8 với độ dài byte đi trước. Không JSON trong gói QUIC.
HTTP bootstrap cấp vé/config vẫn dùng JSON, chỉ chạy khi kết nối/reconnect.

| Gói | Kênh | Nội dung | Kích thước |
| --- | --- | --- | --- |
| HELLO (1) | client uni stream | header + appearance + tên + vé HMAC | 16 + tên + 69 byte |
| POSITION (2) | client datagram, 10 Hz | version u8, opcode u8, seq u32, map u32, x/y f32, dir u8, moving u8 | 20 byte |
| APPEARANCE (3) | client uni stream, khi thay đổi, tối đa 1 Hz | như HELLO nhưng không có vé | 16 + tên byte |
| SNAPSHOT (4) | server datagram, 20 Hz | header 16 byte + các position | 16 + 18 × số người byte |
| ROSTER (5) | server uni stream, khi thay đổi | revision/map/count + ID và appearance từng người | tối đa 3660 byte |

SNAPSHOT header: version u8, opcode u8, tick u32, selfID u32, map u32, count u16.
Mỗi record: ID u32, ackSeq u32, x/y f32, dir u8, moving u8.
32 người = **592 byte**, chưa tính overhead UDP/IP/QUIC.
POSITION 10 Hz = 200 byte payload/s/người; snapshot đủ 32 người = 11.84 KB/s/phiên.
Đây là kích thước tính từ protocol, không phải benchmark độ trễ.

Appearance body sau version/opcode: faction u8, sex u8, bodySex u8, ride u8,
helm/armor/weapon/horse i16, nameLength u16, name UTF-8.
Faction là index trong `Object.keys(I)` (cùng catalog client), bodySex 0=m/1=f,
equipment -1 là không có. ROSTER header: version/opcode, revision u32, map u32,
count u16; mỗi record: ID u32 + appearance body.

Vé: version u8 + expiresUnixSeconds u32 + accountUUID 16 byte + nonce 16 byte
+ HMAC-SHA256 32 byte. Hạn 30 giây, dùng một lần; secret chỉ nằm ở Node và Rust.
Sequence/tick so sánh có xử lý wraparound; gói cũ bị bỏ qua. Bản đồ khác không nhận
snapshot của nhau. Server từ chối NaN/Infinity, packet sai kích thước và quá 60 input/s.
Không dồn gói vị trí cũ khi có backpressure. Snapshot cũ không được ngoại suy vô hạn;
mất kết nối sẽ dọn người cũ và tự thử lại có giới hạn.

## Chạy local

Từ repo root, dùng cùng secret cho hai tiến trình (ví dụ dưới chỉ dùng cho local):

```sh
MULTIPLAYER_SECRET=local-development-only-0123456789 \
  cargo run --manifest-path src/server/multiplayer/webtransport/Cargo.toml
```

```sh
MULTIPLAYER_SECRET=local-development-only-0123456789 \
MULTIPLAYER_WT_CONTROL_URL=http://127.0.0.1:3104 npm run dev
```

Mở game tại `http://localhost:3000`, đăng nhập bằng hai account trong hai browser context
riêng, chọn nhân vật và vào cùng bản đồ. Browser cần hỗ trợ WebTransport và secure context.
Nếu dùng port khác, đặt `WT_ORIGINS` danh sách origin phân cách bằng dấu phẩy trên Rust.
`WT_BIND` mặc định `127.0.0.1:4434`, `WT_HTTP_BIND` là `127.0.0.1:3104`;
`WT_PUBLIC_URL` mặc định `https://127.0.0.1:4434/play`, `WT_CERT_HOST` là SAN của cert.

Rust tạo chứng chỉ P-256 14 ngày, client pin SHA-256 nhận qua API cùng origin đã đăng nhập.
Restart Rust sẽ đổi fingerprint; client lấy lại config khi reconnect. Dịch vụ production
cần restart trước khi chứng chỉ hết hạn, mở UDP trực tiếp và dùng HTTPS cho game.
Xem `deploy/multiplayer/README.md` cho cấu hình VPS.

```sh
node --test test/multiplayer-webtransport.test.js test/manual-target.test.js test/accounts.test.js
cargo test --manifest-path src/server/multiplayer/webtransport/Cargo.toml
cargo clippy --manifest-path src/server/multiplayer/webtransport/Cargo.toml --all-targets -- -D warnings
```

Kiểm tra game thật với hai account, QUIC được pin cert, chuột/phím, đổi ngoại hình,
đổi map và reconnect (cần Playwright/Chromium):

```sh
cargo build --manifest-path src/server/multiplayer/webtransport/Cargo.toml
node --test src/server/multiplayer/webtransport/browser.test.cjs
```

Có thể đặt `PLAYWRIGHT_MODULE` trỏ tới package Playwright đã cài. Bài test tự mở
Node/Rust ở các port trống và dùng SQLite tạm, không ghi dữ liệu vào game đang chạy.
Ảnh kiểm chứng nằm ở `output/multiplayer/game-webtransport.png`.
