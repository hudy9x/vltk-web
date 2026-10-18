# Tạo và cập nhật map

Runtime map nằm trong `app/maps/`, viết TypeScript strict. Xem [README](app/maps/README.md) và [spec map-tool](map-tool/SPEC.md).

## Dữ liệu không gian

Tạo `app/maps/content/<map-id>/map.json` theo `app/maps/types.ts`. Sao chép map hiện có làm điểm bắt đầu; thay ID khớp tên thư mục, tên và kích thước. Asset mới đặt cùng thư mục, tham chiếu `./ground.jpg` hoặc `./objects/tree.png`. Asset dùng chung có thể ở `app/maps/objects/`. Ảnh cũ vẫn tham chiếu `img/z/<id>.jpg`.

| Trường | Nội dung |
| --- | --- |
| `schemaVersion`, `id`, `name` | Phiên bản format, định danh, tên |
| `size`, `entry` | Kích thước pixel và điểm vào lưu trong tài liệu |
| `layers` | Ground, shadow, world objects, foreground, atmosphere |
| `navigation` | Lưới vật cản hoặc map đi tự do |
| `spawns` | Điểm cố định tham chiếu encounter; mảng rỗng giữ bãi ngẫu nhiên |

## Navigation

Map đi tự do dùng `"navigation": { "kind": "open" }`. Map có lưới:

```json
{
  "kind": "grid",
  "cellSize": { "width": 32, "height": 16 },
  "columns": 112,
  "rows": 224,
  "blockedBase64": "<bitmask Base64 hợp lệ>"
}
```

Chuỗi trên là placeholder, không phải dữ liệu chạy được. Một bit/ô, row-major, bit thấp trước: `1` chặn, `0` đi được. Số byte là `ceil(columns * rows / 8)`; kích thước lưới phải khớp `size`. Không khai báo thiếu bitmask để giả lập map mở.

Runtime chọn vùng liên thông lớn nhất; phó bản vẫn có API chọn island khác. Giữ A*, flow field BFS, chống đi chéo xuyên góc và clearance ngang hiện tại.

## Quái, boss và progression

Sửa `app/gameplay/encounters/catalog.json`: `id`, `mapId`, `name`, `levelRange`, `monsterIds`, `bossId`, `equipmentElementWeights`. Quái/boss phải tồn tại trong monster catalog. Trọng số trang bị không phải trọng số ngũ hành quái; level/HP/damage/ngũ hành vẫn theo logic game hiện tại.

Map luyện công cần có mục trong `app/maps/progression.json`. Thêm cuối hoặc gắn vào `alternateMapIds`; không đảo các mục cũ vì save lưu stage/index.

Ví dụ điểm spawn cố định:

```json
{
  "id": "boss-01",
  "position": { "x": 1600, "y": 1200 },
  "encounterId": "map-2",
  "rank": "boss",
  "initialDelaySeconds": 60
}
```

Tọa độ ví dụ phải kiểm tra trên collision thực tế. `spawns` rỗng sinh bãi ngẫu nhiên; có điểm thì dùng danh sách cố định. Mỗi điểm sinh một actor và có home/respawn state riêng.

## Layer

Cần đúng một `ground`. Layer `world` chứa object với `id`, `image`, `position`, `anchor`, `scale`, `depthOffsetY`; object và actor sort chung theo gốc/chân. Shadow dưới actor, foreground luôn trước actor, atmosphere là lớp màu `color`/`opacity`.

Ảnh JPG có cây không tự thành object; cần sprite trong suốt và phục dựng nền khi muốn nâng cấp. Collision hiện lưu bằng bitmask, chưa có compiler collider editor.

## Kiểm tra

```sh
npm run build
npm run dev
npm test
```

Build tự cập nhật registry khi thêm/xóa thư mục map. JSON tham gia dependency hash, sửa dữ liệu rồi reload sẽ rebuild. Chọn map qua UI luyện công/map phụ để kiểm tra. `Cc()` vào phó bản, không phải teleport map thường và không được export ra Console toàn cục.

`map-tool` hiện mới có spec, chưa có UI/API Save. Entry được lưu sẵn; chuyển map legacy vẫn giữ/snap vị trí player hiện tại để bảo toàn hành vi.
