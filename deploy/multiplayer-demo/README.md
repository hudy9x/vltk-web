# VPS — multiplayer Rust demos

Hai service riêng, không thay game Node hoặc database. Client local chọn server
bằng query `server` (base URL HTTPS, có hoặc không có dấu `/` cuối).

## Client local → VPS

Chạy hai lệnh `cargo run` như README demo rồi mở:

- WebSocket: `http://localhost:3101/websocket/?server=https://gamelab.hudy9x.com/multiplayer-demo/`
- WebTransport: `http://localhost:3102/webtransport/?server=https://gamelab.hudy9x.com/multiplayer-demo/`

Refresh trang đang mở để tải client mới. Không có query thì tiếp tục chơi local.
Thanh chuyển chế độ giữ query server. Mỗi chế độ là một phòng tối đa 8 người.

| Kết nối | Endpoint |
|---|---|
| WS config | `https://gamelab.hudy9x.com/multiplayer-demo/websocket/config` |
| WS gameplay | `wss://gamelab.hudy9x.com/multiplayer-demo/websocket/play` |
| WT config | `https://gamelab.hudy9x.com/multiplayer-demo/webtransport/config` |
| WT gameplay | `https://103.121.91.177:4433/play` (QUIC/UDP) |

Domain đang qua Cloudflare; UDP 4433 đi trực tiếp đến VPS, không qua proxy HTTP.
Fingerprint chứng chỉ QUIC nhận qua HTTPS config; không bỏ qua kiểm tra TLS.
Chứng chỉ P-256 tạm có hạn 14 ngày. Service restart sau tối đa 7 ngày để đổi cert;
client bấm Kết nối lại sẽ fetch pin mới. Địa chỉ public cũng nằm trong SAN.

HTTP Rust bind `127.0.0.1:3101/3102`; chỉ QUIC bind `0.0.0.0:4433`.
CORS và handshake chấp nhận `http://localhost:3101/3102`, tương ứng từng chế độ,
`http://127.0.0.1:3101/3102` và origin HTTPS game; không dùng wildcard.
Muốn thử từ origin khác cần cấu hình allowlist phù hợp thay vì mở `*`.

## Cài đặt

1. Upload source demo vào một build tree của user `vltk-build`. Build bằng Rust
   stable (tối thiểu 1.88), **một build job** để giới hạn tải trên VPS 2 vCPU:

```sh
runuser -u vltk-build -- nice -n 10 /var/cache/vltk-build/.cargo/bin/cargo \
  build --release --locked --jobs 1 \
  --manifest-path /var/cache/vltk-build/multiplayer-demo/src/server/multiplayer-demo/Cargo.toml
```

2. Root cài bản build đã kiểm tra bằng release ID mới, ví dụ:

```sh
bash /var/cache/vltk-build/multiplayer-demo/deploy/multiplayer-demo/install.sh \
  /var/cache/vltk-build/multiplayer-demo 20261027-EXAMPLE
```

Script tạo user runtime `vltk-demo`, release root-owned dưới
`/opt/vltk-multiplayer-demo/releases/`, symlink `current`, environment trong
`/etc/vltk-multiplayer-demo/`, và template unit `vltk-demo@.service`.
Mỗi service giới hạn RAM 128 MiB, tự khởi động sau reboot/lỗi. Build không chạy
trong user runtime và Rust toolchain không cần khi service chạy.

Script backup nginx dưới `/var/backups/vltk-multiplayer-demo/RELEASE_ID/`, thêm
include `nginx.locations.conf` vào HTTPS server hiện có, chạy `nginx -t`, kiểm
tra health hai service, rồi reload nginx. Không restart `vltk-web` hay ghi SQLite.
Nếu health fail, script phục hồi config nginx và bản binary trước (nếu có).
Giữ UDP 4433 được phép trong firewall nhà cung cấp; không mở public TCP 3101/3102.

Nginx config quản trị là thay đổi trên VPS: deploy main game hiện tại không tự
thay file này. Khi tái tạo nginx từ template game, giữ include demo hoặc chủ động
gỡ các demo nếu không còn cần.

## Kiểm tra và vận hành

```sh
systemctl status vltk-demo@websocket vltk-demo@webtransport
journalctl -u vltk-demo@websocket -u vltk-demo@webtransport -n 50 --no-pager
curl --fail http://127.0.0.1:3101/health
curl --fail http://127.0.0.1:3102/health
ss -lntup
```

Kiểm tra end-to-end **từ máy client**, khi hai server local vẫn phục vụ giao diện:

```sh
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright \
  node deploy/multiplayer-demo/verify-vps.cjs
```

Test mở hai client local cho mỗi chế độ, kiểm tra CORS allow/deny, endpoint thật
qua Chrome DevTools Protocol, di chuyển đồng bộ qua Internet, ping và snapshot.
Screenshot: `output/multiplayer-demo/vps-websocket.png`, `vps-webtransport.png`.

Tạm dừng demo mà không ảnh hưởng game:

```sh
systemctl disable --now vltk-demo@websocket vltk-demo@webtransport
```
