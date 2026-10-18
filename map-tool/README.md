# Võ Lâm Map Editor

Desktop editor dùng **Tauri 2 + React + TypeScript + shadcn/ui**. Làm việc trực tiếp với repository game, không cần server ghi file hay sửa registry thủ công.

## Chạy

Cần Node.js >= 24, pnpm và môi trường Rust/Tauri đã cài. Cài dependencies ở root repository trước (`npm install`), sau đó:

```sh
cd map-tool
pnpm install
pnpm tauri dev
```

Tool tự tìm repository từ thư mục hiện tại và nhớ workspace đã mở. Có thể đổi bằng nút **Workspace**. Để chạy game, mở terminal ở root và chạy `npm run dev`; nút **Mở game** mở `http://127.0.0.1:3000`.

```sh
pnpm build                         # TypeScript + frontend
pnpm tauri build                   # Native release + bundle theo hệ điều hành
cargo test --manifest-path src-tauri/Cargo.toml
```

`pnpm dev` chỉ mở frontend; thao tác đọc/lưu workspace cần chạy trong Tauri. Bản đóng gói vẫn cần Node.js và dependencies của repository để validate/build game; đây là công cụ dành cho người phát triển.

## Dùng editor

- Danh sách map theo khoảng cấp luyện công; map phụ nằm ngay dưới map chính, các map ngoài tiến trình ở cuối. Chọn map, tạo mới hoặc nhân bản. Toàn bộ ảnh map nằm trong `app/maps/content/<id>/assets/`, được tham chiếu bằng đường dẫn `./assets/...`. Tool từ chối ảnh map ngoài thư mục này; preview quái chỉ đọc ảnh có trong catalog quái.
- **Layers** thêm shadow, world, foreground hoặc atmosphere. Chọn layer để thay ảnh/opacity. Thêm PNG/WebP trong suốt vào world, kéo object trên canvas hoặc chỉnh anchor/scale/depth bên phải.
- **Collision** tô/chặn/xóa theo ô 32×16 (map cũ giữ kích thước ô hiện có). Collider ellipse quanh gốc object được compile cùng vùng tô tay; kéo/xóa object không phá vùng đã tô.
- **Điểm vào** được dùng khi chọn map luyện công chính/phụ hoặc về thành (Biện Kinh); nếu bị chặn, game chọn vị trí đi được gần nhất. Làm mới cùng bãi giữ tọa độ hiện tại; phó bản/tháp/thuyền giữ vị trí riêng.
- **Hiện điểm spawn** bật/tắt trên canvas: xanh là thường, vàng là tinh anh, cam là boss. Map không có điểm cố định hiển thị mẫu bãi ngẫu nhiên và nút **Tạo mẫu khác**; hover hoặc zoom để xem tên quái. Mẫu dùng chung generator/navigation và kiểm tra nền đen, dùng mật độ tham khảo 6–8; vị trí/số lượng thực tế còn phụ thuộc random và level nhân vật trong game. Mẫu chỉ được ghi vào map khi bạn thêm hoặc chọn một điểm để chỉnh sửa; toàn bộ vị trí, loại quái/boss và delay đang hiển thị được giữ lại. Chỉ xem mẫu rồi Save không thay đổi chế độ spawn.
- **Chọn vùng spawn (Q)**: kéo khung theo bất kỳ hướng nào để chọn tất cả spawn thường/tinh anh/boss có tâm trong vùng (kể cả đường biên). Các điểm được chọn sáng trắng. Nhấn Delete/Backspace hoặc **Xóa … điểm đã chọn** trong Thuộc tính; Undo/Redo phục hồi cả nhóm. Kéo vùng trống để bỏ chọn. Áp dụng cả bãi ngẫu nhiên: toàn bộ mẫu được giữ thành điểm cố định trước khi xóa, các điểm ngoài khung vẫn còn.
- **Spawn** thêm điểm mới và giữ toàn bộ điểm cũ. Dùng **Chọn (V)** bấm một điểm, rồi **Xóa điểm spawn** hoặc **Delete**; có Undo/Redo. Chọn lại quái/boss có ảnh và lọc cấp ngay trong thuộc tính điểm; chỉ điểm đó thay đổi. Tab Gameplay vẫn chỉnh boss của encounter dùng chung.
- Map cũ tiếp tục dùng bãi procedural nếu chưa đặt điểm. Map đã chỉnh spawn lưu `spawnMode: "fixed"`; xóa hết điểm sẽ giữ map trống, kể cả sau Save và mở lại.
- **Gameplay** sửa quái/boss/level/trọng số trang bị. Bộ chọn quái/boss có ảnh local, tìm theo tên/ID và lọc theo khoảng cấp bãi; quái xuất hiện ở nhiều bãi có thể thuộc nhiều nhóm cấp. Asset thiếu hiển thị ảnh thay thế, không tự tải từ mạng. UI liệt kê map bị ảnh hưởng; nhân bản profile riêng để tránh sửa chung. HP và damage vẫn do gameplay tính.
- **Tiến trình** thêm map mới vào cuối danh sách chính hoặc làm map phụ. Thứ tự map chính cũ được giữ để tương thích save.
- **Lưu map** validate → compile navigation → ghi JSON/asset theo transaction → tự sinh catalog và build game. Reload game để áp dụng. Nếu file bị sửa từ ngoài, tool chặn Save; bản nháp vẫn còn để bạn đối chiếu trước khi tải lại.
- **Thay ảnh nền**: ảnh hiện tại được giữ nguyên byte dưới tên `assets/default.<ext>` ở lần thay đầu tiên. Ảnh mới dùng `assets/ground.<ext>` và các lần sau ghi đè cùng tên. Map mới giữ ảnh tải lên đầu tiên làm default. Khi đổi định dạng, transaction dọn file ground ở định dạng trước; nếu Save/build lỗi thì khôi phục cả ảnh cũ. Ảnh layer khác có slot riêng theo ID; ảnh object không ghi đè lẫn nhau. Undo/Redo khôi phục đúng nội dung ảnh ngay cả khi tên file không đổi. Các file lịch sử khác đã có sẵn không được tự động xóa.


| Phím | Thao tác |
| --- | --- |
| V / H | Chọn, kéo canvas |
| B / E / R | Cọ chặn, xóa, hình chữ nhật |
| I / S | Đặt entry, spawn |
| Q | Chọn vùng spawn: kéo khung rồi Delete hoặc nút Xóa trong Thuộc tính |
| P / T | Thử đường đi, nhân vật thử |
| ⌘/Ctrl+S | Lưu |
| ⌘/Ctrl+Z, ⇧⌘/Ctrl+Z | Undo, redo |
| Delete | Xóa object/spawn/layer đã chọn |
| Cuộn / ⌘ hoặc Ctrl+cuộn | Pan / zoom |

Preview dùng chung renderer và navigation/A* với game. Nhân vật thử là hình đại diện để kiểm tra đường đi/che khuất; chưa chạy combat hay hoạt ảnh quái. Canvas hiển thị mẫu vị trí procedural; chu kỳ chết/hồi sinh kiểm tra trong game. Ảnh nền cũ chưa tách cây: muốn che khuất đúng phải thay nền sạch và thêm object/layer riêng; tool không tự tách ảnh.

Map tạo mới hoặc nhân bản mặc định được thêm cuối danh sách map chính, giữ nguyên stage index của các map cũ. Trước lần Save đầu tiên, tab **Tiến trình** cho phép chuyển thành map phụ hoặc **Ẩn khỏi danh sách luyện công**. Map mới mặc định **Test**. Bật **Available** rồi Save để xuất hiện trong game. Save cập nhật `progression.json`, tạo lại catalog imports và build game; reload game local để thấy nội dung map mới.

## Available / Test

- Switch nằm ngay đầu panel Thuộc tính, áp dụng sau khi Save. Biện Kinh luôn Available để làm điểm về thành.
- **Available**: game có thể tải map; map được gán vào progression sẽ hiện trong menu luyện công.
- **Test**: chỉ editor đọc nội dung; game build không import JSON/layers/navigation của map, không tải ảnh, ẩn khỏi cả hai menu. Progression và chỉ số map phụ được giữ nguyên để tương thích save nhân vật.
- Game kiểm tra `app/maps/availability.json` mỗi 5 giây. Nếu map đang ở bị tắt/xóa khỏi manifest, game dừng mô phỏng và hiện “Map không tồn tại. sử dụng Thổ địa phù ngay”. Chỉ khi bấm **OK**, game dùng luồng Thổ địa phù về Biện Kinh, bỏ qua hồi chiêu, dừng tự đổi map/quest và thoát phó bản/tháp nếu cần.
- Mạng lỗi hoặc manifest không hợp lệ không làm nhân vật bị đẩy về thành. Bật lại một map đã Test từ lúc game khởi động cần reload game để tải nội dung mới.
- 5 map cũ chưa có ảnh trên ổ đĩa (#8, #50, #141, #206, #212) được giữ ở Test; thêm ảnh trước khi chuyển Available.

## Tổ chức code

```text
src/
  components/ui/       shadcn/ui
  editor/              Canvas, sidebar, inspector, gameplay panel, trường nhập dùng chung
  lib/model.ts         Document, brush/collider compiler, validation
  lib/image-editing.ts  Ảnh gốc, slot ảnh thay thế và phiên bản Undo/Redo
  lib/native.ts        IPC + image cache
  lib/types.ts         Kiểu dữ liệu riêng của editor
  App.tsx              Workspace, lịch sử, save/import và shell
src-tauri/src/
  workspace.rs         Native commands, revision, validation/build bridge
  image_assets.rs      Quy tắc giữ ảnh gốc, ghi đè và dọn ảnh thay thế
  transactions.rs      Allowlist, staging, journal, rollback/recovery (ghi/xóa)
../tools/maps/
  editor-data.ts       Node bridge dùng model/validation và catalog quái thật
../app/maps/            Runtime/renderer/navigation dùng chung
```

`project.json` giữ `schemaVersion`, `mapId`, `paintedNavigation`, `colliders` theo khóa `<layer-id>/<object-id>`, `originalImages` theo layer và `imageRevision` để nhận diện phiên bản ảnh khi lưu. Game chỉ đọc `map.json` với navigation đã compile. Save lỗi rollback dữ liệu nguồn; journal trong `.map-tool/transactions/` phục hồi khi mở workspace sau lần lưu bị ngắt. Build artifacts không nằm trong transaction; build lại từ nguồn được phục hồi.

Kiểm tra từ root: `npm run build`, `npm test`. Đặc tả gốc: [SPEC.md](../SPEC.md).
