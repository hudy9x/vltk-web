# Source game

Chỉnh source tại đây; game được build từ các module trong `modules.json`.

```text
data/       cấu hình skill, map, monster, equipment, hiệu ứng
core/       khởi tạo, state, tiện ích, save và game loop
combat/     index.ts -> combat TS (casting, simulation, collision, damage, render)
            skills-01.js -> các hàm skill/progression JS cũ
gameplay/   inventory, loot, nâng cấp và các hoạt động game
render/     Canvas, sprite và hiệu ứng hiển thị
ui/         panel, nút bấm, màn hình nhân vật và thế giới
systems/    hệ thống bổ trợ, âm thanh và điều khiển
online/     tài khoản, chat, Chợ và tổ đội
simulator/  SIM TypeScript: nhân vật, kỹ năng/PK, log công thức và nút cạnh GM
dev/        bảng GM trong môi trường development, định nghĩa rương GM
    |
    v
modules.json (thứ tự ghép) -> npm run build -> game.js + game.js.map
```

Các tên file mô tả nhóm chức năng; hậu tố số là thứ tự các phần liên tiếp.
Một nhóm có thể chứa hàm trợ giúp dùng bởi nhóm khác. Không đổi thứ tự trong
`modules.json` tùy tiện: mã gốc có nhiều biến và khởi tạo dùng chung scope.
Các module JS vẫn dùng chung scope. Combat TS có import/export độc lập, được
bundle tại `combat/index.ts` rồi nối với JS qua `combat/legacy-bridge.js`.

Đọc từ **combat/index.ts**: `castSkill` tạo lượt đánh, `updateCombat(dt)` chạy mô
phỏng, va chạm mới gọi `onHit` để JS cũ tính damage/HP/debuff/log. Các kiểu ở
`combat/types.ts`; phạm vi/địa hình ở `combat/config.ts`; hiệu chỉnh vùng nổ, số
hit và nhịp chiêu ở `combat/casting.ts`. Chi tiết luồng và bảng file trong README
ở thư mục gốc.

Tìm theo chữ trên UI bằng `rg 'Kỳ Trân|Chợ' app/ --glob '!game.js*'`.
Tên biến/hàm gốc được giữ lại; trường `symbols` trong `modules.json` giúp tìm file
chứa khai báo. Mỗi file phân tích cú pháp riêng được, nhưng chỉ chạy trong bundle.
Hai khối patch dữ liệu lớn vẫn giữ nguyên IIFE của chúng để bảo toàn scope.

Server tự build khi reload. Có thể chạy `npm run build` thủ công; output và source
map không đưa vào Git. DevTools Sources hiển thị file nguồn qua source map.
Builder dùng esbuild để bundle TS, sourcemap-codec để ghép source map và giữ
nguyên thứ tự JS cũ. Trình duyệt không tải các package build này.

`npm run typecheck` kiểm tra TS strict, `npm run build` kiểm tra kiểu rồi tạo
`game.js`. Server tự biên dịch khi reload, nhưng không tự chạy kiểm tra kiểu.

`npm test` kiểm tra các module được liệt kê đầy đủ, phân tích cú pháp từng file và
kiểm tra source map của bundle. Module GM có test hành vi riêng.
Các test SQLite/HTTP và bootstrap kiểm tra đồng bộ save và cách tải bundle hiện tại.

Mã SIM được cô lập trong `simulator/`; bắt đầu từ `simulator/index.ts`.
Nút **SIM** cạnh **GM** mở bảng riêng, đóng bảng không dừng mô phỏng.
Xem `simulator/README.md` để biết ranh giới với game JS và vai trò từng module.
