# Map Tool — đặc tả sau refactor

## Mục tiêu và phạm vi

Quản lý map qua một tool: tạo mới, sửa nền/layer/object/collision/spawn, bấm Save rồi kiểm tra trong game. Người dùng không phải chỉnh TS hoặc registry thủ công. Đợt hiện tại chỉ refactor runtime và đặt spec; chưa xây giao diện hay endpoint ghi file.

| Thành phần đã có | Nguồn thật |
| --- | --- |
| Map | `app/maps/content/<id>/map.json` |
| Kiểu dữ liệu và validation | `app/maps/types.ts`, `validate.ts` |
| Navigation, di chuyển | `app/maps/navigation/`, `runtime.ts` |
| Spawn | `app/maps/spawn/` |
| Layer/object renderer | `app/maps/rendering.ts` |
| Quái/boss/khoảng cấp/trang bị | `app/gameplay/encounters/catalog.json` |
| Progression | `app/maps/progression.json` |
| Phát hiện map/rebuild JSON | `tools/maps/catalog.ts`, `tools/build-app.js` |

Ảnh cũ giữ URL `img/z/`. Asset mới có thể nằm trong `app/maps/content/<id>/` hoặc `app/maps/objects/`; server phục vụ local, không tải những URL này từ upstream.

## Các màn hình tối thiểu

1. Danh sách map: ID, tên, tạo mới, nhân bản, mở, trạng thái chưa lưu.
2. Canvas: zoom/pan, tọa độ world, grid, vùng liên thông và đường đi thử.
3. Layers: ground, shadow, world objects, foreground, atmosphere; preview/opacity.
4. Object: đặt/xóa/di chuyển sprite, anchor, scale, depth offset; preview actor đi trước/sau.
5. Collision: brush mở/chặn, rectangle, undo/redo; xem vùng actor đi được.
6. Spawn: đặt điểm, chọn encounter/rank, initial delay; preview bãi procedural.
7. Gameplay: chọn/sửa encounter và progression ở tab riêng.

Tool dùng chung navigation, validation và rendering TS với game. Không viết lại A*/clearance. Tọa độ pixel, Y tăng xuống dưới.

## Save

```text
Project editor
      ↓
Validate schema + references + assets + navigation + spawn
      ↓
Compile collision brush + collider object
      ↓
Lưu map / asset / encounter / progression liên quan
      ↓
Registry tự sinh → rebuild → reload preview/game
```

Endpoint ghi file chỉ bật development/local. Kiểm tra ID, đường dẫn, phần mở rộng; giới hạn trong thư mục cho phép. Dùng version/hash phát hiện sửa đồng thời. Validate và chuẩn bị toàn bộ file trước khi áp dụng; Save nhiều file cần staging/rollback, không để map tham chiếu dữ liệu chưa tồn tại. Lưu lỗi không làm mất project đang sửa.

Map mới tự vào registry sau Save. Để xuất hiện trong UI luyện công, Save cần tạo/update progression theo lựa chọn người dùng. Không reorder stage/index cũ; thay đổi thứ tự cần migration save riêng.

## Format hiện tại và phần cần xây tiếp

Runtime đọc `navigation.blockedBase64` trực tiếp. Compiler brush/collider chưa có. Khi xây tool, lưu project chỉnh sửa trong `project.json` hoặc format versioned tương đương rồi sinh bitmask runtime; không yêu cầu đồng bộ thủ công hai nguồn collision. `collision.bin` và collider hình học trong trao đổi thiết kế trước chưa phải API hiện có.

`spawns: []` chọn procedural field. Điểm cố định hiện có `id`, `position`, `encounterId`, `rank`, `initialDelaySeconds`, mỗi điểm sinh một actor. Bãi có radius/count/weighted pool cần mở rộng schema/generator có test; không coi đó là format đã hỗ trợ.

Entry đã lưu nhưng luồng legacy vẫn giữ/snap player khi đổi map. Editor có thể preview entry; chuyển tới entry theo cổng/teleport cần chính sách rõ ràng và test save/town/phó bản.

Encounter giữ pool quái, boss, khoảng cấp và `equipmentElementWeights`. Công thức HP/damage, scaling và suy ra ngũ hành vẫn thuộc gameplay hiện tại. Trọng số rơi trang bị không phải phân bố ngũ hành quái. Weighted monster/element selection cần schema và test riêng; không ghi HP đang sống vào map.

Khi sửa encounter dùng chung, UI hiển thị map bị ảnh hưởng và cho chọn sửa chung hoặc nhân bản thành profile riêng.

## Render

- Ground → shadow → actor + world objects sort theo depth → foreground → atmosphere.
- Điểm sort object là `position.y + depthOffsetY`; tie giữ thứ tự ổn định.
- Foreground luôn phủ trước; không thay Y-sort cho mọi cây.
- Bóng mặt đất và sunset là hai lượt vẽ khác nhau.
- Collider độc lập với tán cây, thường chỉ quanh gốc.
- Giữ actor/nameplate/crowd pipeline; culling không được dừng simulation/animation.
- Fade occluder, roof và cầu nhiều tầng để giai đoạn sau.

## Nghiệm thu tool

| Tình huống | Kết quả |
| --- | --- |
| Tạo map rồi Save | Registry nhận map, không sửa TS thủ công |
| Sửa JSON map | Reload dùng dữ liệu mới, không cache cũ |
| Bitmask lỗi hoặc chặn toàn bộ | Báo lỗi rõ, không thay map đang chạy |
| Spawn bị chặn/ngoài world, ID quái sai | Chặn Save, chỉ ra vị trí lỗi |
| Di chuyển cây có collider | Collision và hình cập nhật cùng lần Save |
| Actor đi trước/sau cây | Che khuất đúng |
| Quái chết/hồi sinh | Đúng home, delay, loại quái |
| Map chính/phụ, town, phó bản | Đúng navigation/cache, giữ stage save |
| Map cũ chỉ có ground | Giữ hình ảnh/gameplay |
| Save lỗi giữa chừng | Không để bộ dữ liệu nửa cũ nửa mới |

Chạy `npm run build`, `npm test` và browser smoke test cho mỗi giai đoạn.
