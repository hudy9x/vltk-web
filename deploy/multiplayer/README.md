# Rust WebTransport cho game

Thư mục này dành cho bản tích hợp game. Demo tham khảo tiếp tục dùng
`deploy/multiplayer-demo/`, HTTP 3101/3102 và UDP 4433.
Bản tích hợp dùng HTTP **3104**, UDP **4434**, dịch vụ riêng để dễ kiểm tra/rollback.

1. Build binary trên máy tương thích VPS:
   `cargo build --release --locked --jobs 1 --manifest-path src/server/multiplayer/webtransport/Cargo.toml`.
2. Cài binary vào `/opt/vltk-web/bin/vltk-multiplayer-webtransport`.
3. Tạo `/etc/vltk-multiplayer.env` chỉ root đọc với các biến dưới.
4. Cài unit kèm theo, `systemctl daemon-reload` và enable/start dịch vụ.
5. Đặt cùng `MULTIPLAYER_SECRET` và `MULTIPLAYER_WT_CONTROL_URL=http://127.0.0.1:3104`
   cho Node game, sau đó restart dịch vụ Node với bản code tích hợp.
6. Mở UDP 4434 đến VPS. Public URL dùng host/IP đi trực tiếp VPS, tránh proxy HTTP
   không hỗ trợ chuyển tiếp UDP. Game vẫn dùng HTTPS origin hiện có.
7. Kiểm tra bằng hai account khác nhau trên cùng map; nút Online hiện số người.

```ini
# /etc/vltk-multiplayer.env; thay secret bằng giá trị ngẫu nhiên dài >=32 ký tự
MULTIPLAYER_SECRET=REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
WT_BIND=0.0.0.0:4434
WT_HTTP_BIND=127.0.0.1:3104
WT_PUBLIC_URL=https://103.121.91.177:4434/play
WT_CERT_HOST=103.121.91.177
WT_ORIGINS=https://gamelab.hudy9x.com
PVE_OUTBOX_FILE=/var/lib/vltk-multiplayer/rewards.jsonl
```

API control HTTP chỉ bind loopback; Node cấp vé sau khi xác thực cookie, lấy fingerprint
trực tiếp từ Rust. Không cần nginx route mới. Không đưa secret vào client hay repository.
Giới hạn hiện tại và wire format được ghi ở `src/client/multiplayer/webtransport/README.md`.

Rollback: bỏ `MULTIPLAYER_WT_CONTROL_URL` khỏi môi trường Node và restart Node.
API trả `enabled:false`, game ngừng tự kết nối; có thể stop Rust riêng.
Production dùng workflow branch online và controller trong `deploy/README.md`.

## PvE và tổ đội — protocol v8

Node, Rust và client phải nâng cùng phiên bản. Unit dùng `StateDirectory` để journal
thưởng tồn tại qua restart và ghi được dưới `DynamicUser`. Backup SQLite của Node
và journal của Rust theo cặp; không xóa journal khi còn grant chưa ACK. Control
`/catalog`, `/admit`, `/refresh`, `/rewards` và `/rewards/ack` yêu cầu secret; giữ
HTTP 3104 ở loopback. Không chạy hai Rust instance cùng ghi một journal.

Profile online nhập từ save một lần, tách khỏi ghi localStorage. Bản này mới có
combat chung cơ bản và tiền rơi; trang bị/chiêu đặc thù chưa đầy đủ. Triển khai Node và Rust cùng release; xem `deploy/README.md`.
