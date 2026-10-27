# Multiplayer transport demos — Rust

Kết nối client local tới VPS: xem
[`deploy/multiplayer-demo/README.md`](../../../deploy/multiplayer-demo/README.md).
Thêm `?server=https://gamelab.hudy9x.com/multiplayer-demo/` vào URL demo, rồi refresh.

Hai demo độc lập, **chỉ bấm chuột trái để di chuyển**. Không nhận phím mũi tên,
WASD, chuột phải hoặc touch. Mỗi tab là một nhân vật mới. Tối đa 8 người/phòng.
Nhân vật được vẽ bằng Canvas, không cần tải sprite hay kết nối save game.

## Chạy local

Cần Rust **1.88+** và trình duyệt hiện đại. Chạy từ root repository, mỗi lệnh
trong một terminal riêng:

```sh
cargo run --manifest-path src/server/multiplayer-demo/Cargo.toml --bin demo-websocket
```

Mở **http://localhost:3101/websocket/** ở hai hoặc nhiều tab.

```sh
cargo run --manifest-path src/server/multiplayer-demo/Cargo.toml --bin demo-webtransport
```

Mở **http://localhost:3102/webtransport/** ở hai hoặc nhiều tab.
Thanh chuyển chế độ dẫn đến server còn lại; cần chạy cả hai lệnh để đổi qua lại.
Người chơi WebSocket và WebTransport ở **hai phòng riêng**.

Không cần chạy Node/Fastify, đăng nhập, build game hoặc cấp quyền GM.
Ctrl+C dừng server. Restart server tạo phòng mới, các tab bấm **Kết nối lại**.

## Thư mục

```text
src/client/multiplayer-demo/
  websocket/       index.html + transport.mjs (WebSocket thật)
  webtransport/    index.html + transport.mjs (HTTP/3 / QUIC thật)
  view.mjs         Canvas, nhân vật, chuột trái, HUD và nội suy hiển thị
  demo.css         Giao diện dùng chung
src/server/multiplayer-demo/
  websocket/       Rust: HTTP + WebSocket
  webtransport/    Rust: HTTP cấu hình + QUIC endpoint
  world.rs         Luật di chuyển chính thức giống nhau cho cả hai
  web.rs           Phục vụ riêng thư mục client demo
  Cargo.toml       Một package, hai executable; Cargo.lock được lưu trong Git
```

## Protocol và điều kiện so sánh

- World 1200 × 760; tốc độ **220 px/s**; tick và snapshot **20 Hz**.
- Client gửi `{type:"move", seq, x, y}` là **điểm đến**, không phải vị trí hiện tại.
- Server kiểm tra số hữu hạn, giới hạn biên và tự di chuyển theo tick. Các actor
  có thể đi xuyên nhau trong demo; chưa có vật cản, combat hoặc AI.
- `seq` tăng trong từng phiên. Server bỏ lệnh trùng/cũ; snapshot chứa `ack`.
  Client gửi lại điểm đến mới nhất mỗi 100 ms cho đến khi được xác nhận, nên mất
  một datagram không làm mất hẳn lần bấm chuột.
- Snapshot có `tick`; client bỏ snapshot cũ/đảo thứ tự và nội suy để vẽ mượt.
  Đây là nội suy hiển thị, chưa có dự đoán chuyển động tại client.
- WebSocket: welcome, input, snapshot và ping/pong qua cùng kết nối TCP.
- WebTransport: welcome/lỗi khởi tạo qua reliable unidirectional stream;
  input, snapshot và ping/pong qua **datagram QUIC**. Không fallback ngầm sang WS.
- RTT đo ping/pong ở tầng ứng dụng, bao gồm thời gian event loop; FPS là tốc độ
  vẽ tại browser, không phải tốc độ mô phỏng. So sánh release build khi đo tải:

```sh
cargo build --release --manifest-path src/server/multiplayer-demo/Cargo.toml --bins
src/server/multiplayer-demo/target/release/demo-websocket
# terminal khác:
src/server/multiplayer-demo/target/release/demo-webtransport
```

## WebTransport và chứng chỉ local

WebTransport mặc định dùng **UDP 4433**; trang HTML/config dùng **TCP 3102**.
Server sinh chứng chỉ P-256 tự ký, hạn 14 ngày, và trả SHA-256 fingerprint qua
`/config`. Client dùng `serverCertificateHashes` để pin đúng chứng chỉ đó.
Không cần tắt kiểm tra TLS hay cài chứng chỉ vào hệ điều hành. Chứng chỉ/private
key chỉ tồn tại trong RAM và đổi khi restart; bấm Kết nối lại sẽ tải pin mới.

Trang HTTP localhost được browser xem là secure context. Mở bằng IP LAN qua
HTTP thường **không** đủ điều kiện. Với môi trường public phải phục vụ frontend
qua HTTPS, triển khai endpoint WebTransport, xác thực người dùng và cấu hình
origin/cert hợp lệ. Proxy HTTP/WebSocket của game hiện tại không tự chuyển tiếp
WebTransport; QUIC cần đường UDP đến endpoint tương ứng.

Demo mặc định **chỉ bind 127.0.0.1**, không tự mở port/firewall trên VPS. Các biến:

| Biến | Mặc định | Vai trò |
|---|---|---|
| `WS_PORT` | `3101` | HTTP + WS |
| `WT_HTTP_PORT` | `3102` | HTML/config WebTransport |
| `WT_PORT` | `4433` | QUIC/UDP WebTransport |
| `DEMO_BIND` | `127.0.0.1` | Địa chỉ bind cả HTTP và transport |
| `DEMO_ORIGIN` | không đặt | Một origin bổ sung chính xác, ví dụ `https://demo.example.com` |

Origin localhost/127.0.0.1 với đúng cổng HTTP được cho phép. Phòng không có tài
khoản: đây là demo local, chưa phải endpoint public production. Giới hạn input
512 byte, 60 message/s/phiên; timeout im lặng 15 giây, browser báo mất snapshot
sau 5 giây. Snapshot tròn một chữ số thập phân và giới hạn 8 người để giữ dưới
1100 byte; server kiểm tra khả năng datagram trước khi vào vòng chơi.

Nếu WebTransport lỗi: kiểm tra browser hỗ trợ `WebTransport`, dùng localhost,
kiểm tra server còn chạy và UDP 4433 không bị chặn. Không có kết nối QUIC thì
demo báo lỗi rõ, không đổi giao thức.

## Kiểm tra

```sh
cargo fmt --manifest-path src/server/multiplayer-demo/Cargo.toml --check
cargo test --manifest-path src/server/multiplayer-demo/Cargo.toml
cargo clippy --manifest-path src/server/multiplayer-demo/Cargo.toml --all-targets -- -D warnings
```

Browser test dùng **Playwright + Chromium**, chạy cả hai Rust binary trên port
tạm và kết nối QUIC thật với chứng chỉ được pin; không dùng cờ bỏ kiểm tra TLS.
Nếu máy có Playwright sẵn, đặt `PLAYWRIGHT_MODULE` thành đường dẫn module đó.
Nếu không, có thể cài công cụ ở thư mục tạm ngoài repository:

```sh
npm install --prefix /tmp/vltk-demo-browser playwright
/tmp/vltk-demo-browser/node_modules/.bin/playwright install chromium
cargo build --manifest-path src/server/multiplayer-demo/Cargo.toml --bins
PLAYWRIGHT_MODULE=/tmp/vltk-demo-browser/node_modules/playwright \
  node --test src/server/multiplayer-demo/browser.test.cjs
```

`CHROME_PATH` tùy chọn để dùng executable Chromium/Chrome đã cài. Test xác nhận
hai client thấy nhau, phím/touch/chuột phải không di chuyển, chuột trái đồng bộ,
không teleport, điểm đến mới thay điểm cũ, rời phòng, reconnect và click sau khi
đổi viewport. Screenshot ghi trong `output/multiplayer-demo/` (không commit).

Thư viện: [Axum](https://docs.rs/axum/), [Tokio](https://tokio.rs/),
[wtransport](https://docs.rs/wtransport/0.7.2/). Browser không cần npm dependency.
Không thay đổi module game, API/save, database hoặc cấu hình deploy hiện tại.
