# Source game

Chỉnh source tại đây; `../app.js` được giữ nguyên làm backup.

```text
data/       cấu hình skill, map, monster, equipment, hiệu ứng
core/       khởi tạo, state, tiện ích, save và game loop
combat/     tính chỉ số, sát thương, AI và xử lý trận đấu
gameplay/   inventory, loot, nâng cấp và các hoạt động game
render/     Canvas, sprite và hiệu ứng hiển thị
ui/         panel, nút bấm, màn hình nhân vật và thế giới
systems/    hệ thống bổ trợ, âm thanh và điều khiển
online/     tài khoản, chat, Chợ và tổ đội
dev/        bảng GM trong môi trường development, định nghĩa rương GM
    |
    v
modules.json (thứ tự ghép) -> npm run build -> game.js + game.js.map
```

Các tên file mô tả nhóm chức năng; hậu tố số là thứ tự các phần liên tiếp.
Một nhóm có thể chứa hàm trợ giúp dùng bởi nhóm khác. Không đổi thứ tự trong
`modules.json` tùy tiện: mã gốc có nhiều biến và khởi tạo dùng chung scope.
Đây là source đã chia nhỏ để chỉnh sửa, chưa phải module độc lập có import/export.

Tìm theo chữ trên UI bằng `rg 'Kỳ Trân|Chợ' app/ --glob '!game.js*'`.
Tên biến/hàm gốc được giữ lại; trường `symbols` trong `modules.json` giúp tìm file
chứa khai báo. Mỗi file phân tích cú pháp riêng được, nhưng chỉ chạy trong bundle.
Hai khối patch dữ liệu lớn vẫn giữ nguyên IIFE của chúng để bảo toàn scope.

Server tự build khi reload. Có thể chạy `npm run build` thủ công; output và source
map không đưa vào Git. DevTools Sources hiển thị file nguồn qua source map.
Builder không cần package ngoài ở runtime.

`npm test` so sánh AST của 123 module gốc sau chuẩn hóa với backup, xác nhận không mất logic/dữ liệu
hoặc đổi thứ tự khởi tạo. Hai điều chỉnh có chủ đích nhận diện đường dẫn script mới.
Khi sửa hành vi game trong tương lai, cần cập nhật kiểm tra tương đương thành kiểm
tra cho hành vi mới; không sửa backup để làm test qua.
Module GM có test hành vi riêng; không nằm trong kiểm tra tương đương backup.

`tools/split-app.js` là công cụ trích xuất một lần, không dùng như lệnh build.
Nó từ chối chạy nếu thư mục `app/` đã tồn tại để tránh ghi đè chỉnh sửa.
