# Tổ đội online

`index.ts` nối snapshot và command với UI, `model.ts` lọc người chơi theo khung nhìn camera,
`view.ts` dùng mẫu `war-dialog` chung với dược điếm/Mã Phu. Nút dùng sprite tổ đội sẵn có,
đặt ngay dưới `#u20tt` trong `#u20rc`.

Nguồn sự thật nằm ở `src/server/multiplayer/domain/party.rs`. Đội tối đa 8 người,
lời mời tồn tại 60 giây, chỉ đội trưởng mời thêm được. Nhóm được tạo sau khi người nhận
đồng ý. Rời/ngắt kết nối sẽ xóa lời mời và chuyển đội trưởng cho thành viên vào sớm nhất;
nhóm còn một người tự giải tán. Đổi bản đồ vẫn giữ đội, nhưng lời mời mới phải cùng bản đồ
và trong tầm nhìn của client. Server kiểm tra cùng map và khoảng cách tối đa 1.600 pixel.
Tổ đội hiện tồn tại trong phiên server; reconnect được xem là rời đội.

## Binary v8

Command vẫn 25 byte: `12=invite(target actor ID)`, `13=accept(target invitation ID)`,
`14=decline(target invitation ID)`, `15=leave`. Rust kiểm tra sequence, quyền, giới hạn,
hết hạn và trạng thái hiện tại; không nhận màu hay danh sách đội do client quyết định.

WORLD giữ actor 55 byte; byte `alignment` là màu hiệu lực sau tổ đội. Sau phần support:

| Trường | Kiểu |
| --- | --- |
| leader, reply sequence | u32 × 2 |
| reply code, member count, invitation count | u8 × 3 |
| Mỗi đội viên | id/map u32, hp/maxHp f32, alignment u8, name length u8, UTF-8 name |
| Lời mời riêng của người nhận, tối đa 1 | invitation/from u32, remaining f32, name length u8, UTF-8 name |

Roster tổ đội gồm cả đội viên khác bản đồ. Các lời mời chỉ gửi tới người nhận,
không broadcast cho toàn map. Màu gốc của nhân vật được giữ riêng để phục hồi sau khi rời đội.
PvP chọn mục tiêu, va chạm đạn và độc đều kiểm tra màu hiệu lực tại server.

Thanh HP của người **đang bật cừu sát**: cùng màu tên với người xem là hồng `#ff79b0`,
khác màu là đỏ `#ef4242`; người chưa bật giữ xanh. HP bản thân bật cừu sát luôn hồng.

Kiểm thử: `node --test test/multiplayer-party.test.js`, Rust `cargo test` và thử hai tài khoản:

```sh
cargo build --manifest-path src/server/multiplayer/webtransport/Cargo.toml
PARTY_TEST=1 node --test src/server/multiplayer/webtransport/browser.test.cjs
```

Browser test cần Playwright; có thể truyền `PLAYWRIGHT_MODULE` nếu cài ngoài repository.
