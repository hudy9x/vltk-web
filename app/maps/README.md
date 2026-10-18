# Maps

Đọc từ `index.ts`. Thuật toán map viết TypeScript strict; game JS giữ binding và callback nối với combat/UI hiện tại.

| Nơi | Trách nhiệm |
| --- | --- |
| `content/<id>/map.json` | Tên, kích thước, entry, layers, navigation và điểm spawn cố định |
| `progression.json` | Thứ tự map chính/phụ, tương thích stage/index trong save cũ |
| `../gameplay/encounters/catalog.json` | Pool quái, boss, khoảng cấp, trọng số rơi trang bị ngũ hành |
| `catalog.ts`, `validate.ts` | Kiểm tra JSON, tạo view tương thích `JW.zones`, `JW.zalt`, `JMO` |
| `navigation/` | Bitmask, vùng liên thông, A*, flow field BFS |
| `runtime.ts` | Navigation đang hoạt động, giới hạn world, cache và di chuyển |
| `spawn/` | Bãi quái, respawn, tuần tra và leash |
| `ground.ts` | Nhận diện vùng ảnh đen và tìm chỗ đứng hợp lệ |
| `rendering.ts` | Object theo độ sâu, shadow, foreground và lớp màu atmosphere |
| `legacy-adapter.ts` | Nối navigation/render với key, ảnh và đồ rơi JS qua callback có kiểu |

## Dữ liệu và build

`map.json` là nguồn chính; không chỉnh `catalog-data.ts` bằng tay. `tools/maps/catalog.ts` tự phát hiện thư mục map và sinh danh sách import trước typecheck/build. Builder đưa JSON vào dependency hash: sửa JSON, thêm/xóa thư mục map rồi reload sẽ rebuild. Map editor desktop trong `map-tool/` lưu JSON, asset và tự build lại game qua Tauri.

`schemaVersion: 1` định nghĩa trong `types.ts`. Mỗi map có đúng một ground; các layer khác tùy chọn. `./ground.jpg` resolve thành `app/maps/content/<id>/ground.jpg`; đường dẫn `img/z/...` vẫn hợp lệ.

47 navigation map đã chuyển vào JSON. Ảnh cũ tiếp tục ở `img/z/` để giữ URL/cơ chế sửa asset; chưa tách cây hay phục dựng nền. Asset map mới có thể đặt ngay trong thư mục map. Vùng liên thông được tính từ bitmask, không lưu thêm metadata dễ lệch.

Map đi tự do dùng `{ "kind": "open" }`. Lưới phải khai báo đủ `cellSize`, `columns`, `rows`, `blockedBase64`, đúng kích thước và số byte. Thiếu/hỏng dữ liệu hoặc map chặn toàn bộ bị từ chối trước khi thay navigation. Giữ clearance ngang 9px và thuật toán đường đi cũ trên dữ liệu hợp lệ.

## Spawn và combat

`spawns: []` giữ bãi ngẫu nhiên trên map cũ (không có `spawnMode`). `spawnMode: "fixed"` dùng đúng danh sách điểm, kể cả khi rỗng sau khi xóa hết; `spawnMode: "procedural"` yêu cầu danh sách rỗng. Điểm cố định dùng `id`, `position`, `encounterId`, `rank`, `initialDelaySeconds`. Encounter phải tồn tại; điểm phải trong map và đi được. Mỗi điểm sinh một actor, chọn từ pool hoặc lấy `bossId`.

Khởi tạo field tải map và resolve player trước khi sinh bãi, sau đó mới chốt field key. Runtime dùng actor hiện có, không sao chép player, enemy list hoặc HP. Timer/ref quái sống nằm trong field state; record `x/y/cls/tid/t/e` là compatibility shape, không lưu vào JSON.

HP, damage, cấp quái và ngũ hành vẫn do combat/progression hiện tại quyết định. `equipmentElementWeights` tương ứng `sw` cũ, không phải phân bố ngũ hành quái. Boss hồi sinh 180 giây; thường 20 giây với multiplier cũ; boss nhiệm vụ giữ shortcut 20 giây. Về thành dùng `entry` của map thành, sau đó snap tới vị trí đi được gần nhất nếu cần. Chọn map luyện công chính/phụ, đổi map tự động hoặc quay lại từ thành dùng `entry` của map đích. Cập nhật lại cùng bãi giữ vị trí hiện tại; phó bản, tháp và thuyền giữ chính sách vị trí riêng.

## Render

Thứ tự: ground → shadow → actor và world object sort chung theo Y → foreground → atmosphere. Các layer cùng loại dùng thứ tự trong mảng. Object dùng `position.y + depthOffsetY`, ảnh vẽ tại `position - anchor * scale`; culling xét cả sprite.

Actor/nameplate/crowd renderer giữ code animation và combat hiện tại. Object chèn vào queue đó; không gom nameplate thành overlay mới. Cây cần đổi trước/sau thuộc world layer; foreground luôn phủ phía trước. Collision độc lập với hình ảnh, hiện lưu bằng bitmask; editor cho đặt collider quanh gốc object và compile cùng collision tô tay thành bitmask.

## Kiểm tra

`npm run build` và `npm test`. `test/maps.test.js` kiểm tra catalog/progression, dữ liệu lỗi, navigation, đổi map phụ, fixed spawn, respawn, leash, layers, JSON reload và asset local. Test action-state/nameplates dùng runtime mới. Xem [spec editor](../../SPEC.md).
