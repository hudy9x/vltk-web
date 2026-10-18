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

- Chọn map, tạo mới hoặc nhân bản. Asset mới import vào `app/maps/content/<id>/assets/`; ảnh cũ tiếp tục dùng `img/z/`.
- **Layers** thêm shadow, world, foreground hoặc atmosphere. Chọn layer để thay ảnh/opacity. Thêm PNG/WebP trong suốt vào world, kéo object trên canvas hoặc chỉnh anchor/scale/depth bên phải.
- **Collision** tô/chặn/xóa theo ô 32×16 (map cũ giữ kích thước ô hiện có). Collider ellipse quanh gốc object được compile cùng vùng tô tay; kéo/xóa object không phá vùng đã tô.
- **Điểm vào** được dùng khi chọn map luyện công chính/phụ hoặc về thành (Biện Kinh); nếu bị chặn, game chọn vị trí đi được gần nhất. Làm mới cùng bãi giữ tọa độ hiện tại; phó bản/tháp/thuyền giữ vị trí riêng.
- **Spawn** đặt điểm cố định, chọn encounter/rank/delay. Không có điểm cố định thì game dùng bãi procedural hiện tại.
- **Gameplay** sửa quái/boss/level/trọng số trang bị. UI liệt kê map bị ảnh hưởng; nhân bản profile riêng để tránh sửa chung. HP và damage vẫn do gameplay tính.
- **Tiến trình** thêm map mới vào cuối danh sách chính hoặc làm map phụ. Thứ tự map chính cũ được giữ để tương thích save.
- **Lưu map** validate → compile navigation → ghi JSON/asset theo transaction → tự sinh catalog và build game. Reload game để áp dụng. Nếu file bị sửa từ ngoài, tool chặn Save; bản nháp vẫn còn để bạn đối chiếu trước khi tải lại.

| Phím | Thao tác |
| --- | --- |
| V / H | Chọn, kéo canvas |
| B / E / R | Cọ chặn, xóa, hình chữ nhật |
| I / S | Đặt entry, spawn |
| P / T | Thử đường đi, nhân vật thử |
| ⌘/Ctrl+S | Lưu |
| ⌘/Ctrl+Z, ⇧⌘/Ctrl+Z | Undo, redo |
| Delete | Xóa object/spawn/layer đã chọn |
| Cuộn / ⌘ hoặc Ctrl+cuộn | Pan / zoom |

Preview dùng chung renderer và navigation/A* với game. Nhân vật thử là hình đại diện để kiểm tra đường đi/che khuất; chưa chạy combat hay hoạt ảnh quái. Bãi procedural, chu kỳ chết/hồi sinh kiểm tra trong game. Ảnh nền cũ chưa tách cây: muốn che khuất đúng phải thay nền sạch và thêm object/layer riêng; tool không tự tách ảnh.

## Tổ chức code

```text
src/
  components/ui/       shadcn/ui
  editor/              Canvas, sidebar, inspector, gameplay panel, trường nhập dùng chung
  lib/model.ts         Document, brush/collider compiler, validation
  lib/native.ts        IPC + image cache
  lib/types.ts         Kiểu dữ liệu riêng của editor
  App.tsx              Workspace, lịch sử, save/import và shell
src-tauri/src/
  workspace.rs         Native commands, revision, validation/build bridge
  transactions.rs      Allowlist, staging, journal, rollback/recovery
../tools/maps/
  editor-data.ts       Node bridge dùng model/validation và catalog quái thật
../app/maps/            Runtime/renderer/navigation dùng chung
```

`project.json` giữ `schemaVersion`, `mapId`, `paintedNavigation`, `colliders` theo khóa `<layer-id>/<object-id>`. Game chỉ đọc `map.json` với navigation đã compile. Save lỗi rollback dữ liệu nguồn; journal trong `.map-tool/transactions/` phục hồi khi mở workspace sau lần lưu bị ngắt. Build artifacts không nằm trong transaction; build lại từ nguồn được phục hồi.

Kiểm tra từ root: `npm run build`, `npm test`. Đặc tả gốc: [SPEC.md](../SPEC.md).
