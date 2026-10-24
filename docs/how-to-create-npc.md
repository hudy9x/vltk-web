# Cách tạo NPC: sprite, phong cách và kích thước render

Tài liệu dành cho NPC có thể đặt bằng map-tool và tương tác trong game. **Dùng Chủ Dược Điếm làm mẫu về chiều cao nhân vật người**: khung ảnh 22×46 px, scale 1.35, khung render 29,7×62,1 đơn vị bản đồ ở zoom 1. Không áp dụng cùng một scale cho mọi ảnh nếu kích thước ảnh nguồn khác nhau.

## 1. Các file cần biết

| Thành phần | Vị trí | Vai trò |
|---|---|---|
| Danh sách mẫu NPC | `src/client/npcs/catalog.json` | Tên, sprite, khung ảnh, điểm neo, scale mặc định |
| Sprite dùng chung | `src/client/npcs/assets/` | WebP/PNG có alpha, không chép lại vào từng bản đồ |
| Vẽ và chọn NPC | `src/client/npcs/index.ts` | `npcBounds`, `hitNpc`, `drawNpc`, bố trí mặc định Biện Kinh |
| NPC trên bản đồ | `src/client/maps/content/<mapId>/map.json` → `npcs` | Vị trí, phe, hướng và scale riêng nếu cần |
| Chọn NPC trong editor | `tools/map-tool/src/editor/NpcPanel.tsx` | Đọc trực tiếp catalog chung |
| Thuộc tính trong editor | `tools/map-tool/src/editor/Inspector.tsx` | Vị trí, phe, hướng, scale và animation |
| Nối tương tác trong game | `src/client/gameplay/equipment-trader-01.js` → `entities()` / `actions` | Ghép `npcId` với hàm mở dialog |
| Cửa hàng Quan Quân Nhu | `src/client/gameplay/quartermaster/` | Dialog, giá và thanh toán bằng điểm tích lũy |
| Đăng ký module runtime | `src/client/modules.json` | Thêm entry nếu NPC dùng một module runtime mới |

```text
catalog.json + npcs/assets/
          │
          ├── map-tool: chọn mẫu → đặt NPC → Save map.json
          │
          └── game: mapNpcs → entities/actions → drawNpc → dialog
```

Server và native map-tool đều đọc catalog để xác định ảnh NPC được phép tải. Khai báo đường dẫn `app/npcs/assets/<file>.webp` trong catalog, file thật nằm tại `src/client/npcs/assets/<file>.webp`. Không cần thêm ngoại lệ phục vụ file riêng cho mỗi NPC.

## 2. Phong cách hình ảnh

- Nhân vật võ hiệp 2D, góc nhìn isometric tương tự Chủ Dược Điếm; tránh phối góc nhìn chân dung chính diện với nhân vật trong game.
- Toàn thân, tư thế đứng trung lập, thấy rõ hai chân. Bóng và tên NPC được game vẽ riêng.
- Nền alpha trong suốt thật; không có nền đất, nền trắng/đen hay ô caro vẽ sẵn. Không đưa chữ, tên, khung UI hoặc bóng đất vào ảnh.
- Trang phục và màu sắc có thể khác nhau theo vai trò, nhưng đầu, thân và chân cần cùng tỉ lệ với NPC tham chiếu.
- Giữ silhouette rõ ở kích thước nhỏ; tránh chi tiết chỉ nhìn thấy khi phóng lớn. Không thêm hào quang mờ làm rộng vùng ảnh trong suốt.
- Cắt khoảng trống thừa quanh nhân vật trước khi đo khung và điểm neo. So sánh cả chiều cao cơ thể nhìn thấy, không chỉ chiều cao canvas.
- Ưu tiên WebP lossless hoặc PNG có alpha. Với NPC tĩnh, nhắm kích thước file vài KB; đây là mục tiêu tối ưu, không phải giới hạn cứng của engine.

Prompt gợi ý khi cần tạo sprite mới:

> Một NPC võ hiệp 2D theo phong cách sprite Chủ Dược Điếm, góc nhìn isometric, đứng toàn thân, hai chân rõ, tư thế trung lập. Trang phục [mô tả vai trò]. Một nhân vật duy nhất, không chữ, không giao diện, không nền đất, không bóng đất; alpha trong suốt thật. Hình phải rõ khi thu nhỏ về kích thước render cao khoảng 62 đơn vị bản đồ.

Sau khi tạo, kiểm tra alpha và hình thu nhỏ. Không dùng ảnh sinh ra ở kích thước lớn trực tiếp làm chiều rộng/cao render.

## 3. Kích thước: ảnh nguồn khác với kích thước trong game

| NPC | Một khung ảnh nguồn | Scale mặc định | Khung render tại zoom 1 |
|---|---:|---:|---:|
| Chủ Dược Điếm — mẫu chiều cao | 22×46 px | 1.35 | 29,7×62,1 |
| Mã Phu | 29×52 px | 1.35 | 39,15×70,2 |
| Chiêu Mộ Sứ | 52×48 px | 1.35 | 70,2×64,8 |
| Thần Trang Sứ Giả | 64×62 px | 1.35 | 86,4×83,7 |
| Quan Quân Nhu | 40×72 px | **0.8625** | **34,5×62,1** |

Các kích thước trong bảng là khung bao, có thể chứa khoảng trống hoặc vũ khí. Không ép tất cả NPC phải có cùng chiều rộng.

**Công thức chọn scale cho NPC người theo mẫu Dược Điếm:**

```text
chiều cao mục tiêu = 46 × 1.35 = 62.1
scale mặc định    = chiều cao mục tiêu / chiều cao khung nguồn

Quan Quân Nhu:
scale = 62.1 / 72 = 0.8625
width render  = 40 × 0.8625 = 34.5
height render = 72 × 0.8625 = 62.1
```

Trước đây, Quan Quân Nhu dùng scale 1.35 nên cao 97,2; đổi sang 0.8625 giảm chiều cao khoảng 36,1% và đưa về chiều cao mẫu. Giữ ảnh nguồn 40×72 để không phải sinh lại sprite.

### Công thức render và điểm neo chân

`width`/`height` trong catalog là kích thước **một frame**, không phải kích thước cả sprite sheet.

```text
scale thực tế = placement.scale ?? catalog.scale

left   = position.x − anchor.x × scale thực tế
 top   = position.y − anchor.y × scale thực tế
width  = frame.width  × scale thực tế
height = frame.height × scale thực tế
```

`position` là vị trí đặt điểm neo trên bản đồ, không phải góc trên trái ảnh. `anchor` được đo bằng pixel trong frame nguồn. Đặt anchor gần giữa hai chân, sát đáy bàn chân; ví dụ Dược Điếm `(11, 44)` trên frame 22×46, Quan Quân Nhu `(20, 70)` trên frame 40×72.

```text
   ┌──────── frame ────────┐
   │         đầu          │
   │         thân         │
   │        hai chân      │
   │          ● anchor    │
   └──────────────────────┘
              │
              └── position trên bản đồ
```

`npcBounds()` dùng cùng kích thước cho khung chọn và hit-test. `drawNpc()` dùng khung này để vẽ; game và map-tool dùng chung các hàm đó.

Kích thước thấy trên màn hình còn nhân với zoom/camera. Ví dụ chiều cao 62,1 ở zoom 0.5 hiện khoảng 31,05 CSS px. Device pixel ratio ảnh hưởng số pixel canvas vật lý, không phải lý do tăng scale NPC. Khi so sánh hai NPC, dùng cùng zoom và cùng điểm đặt chân.

## 4. Khai báo mẫu NPC

Ví dụ NPC tĩnh Quan Quân Nhu:

```json
{
  "id": "quartermaster",
  "name": "Quan Quân Nhu",
  "category": "NPC quân nhu Tống Kim",
  "subtitle": "Vật phẩm · Quân trạng tích lũy",
  "image": "app/npcs/assets/quartermaster.webp",
  "animation": "",
  "width": 40,
  "height": 72,
  "anchor": { "x": 20, "y": 70 },
  "frames": 1,
  "directions": 1,
  "frameMs": 143,
  "scale": 0.8625
}
```

- `id`: mã mẫu ổn định, không trùng mẫu khác; `npcId` trong map tham chiếu mã này.
- `name`, `category`, `subtitle`: tên hiển thị, nhóm tìm kiếm trong map-tool và mô tả metadata. Trên bản đồ chỉ vẽ `name`, không vẽ `subtitle`. Tọa độ baseline của tên là `position.y - anchor.y * (placement.scale ?? definition.scale) - 6`; tên tự theo kích thước render, không dùng độ cao cố định.
- `frames`: số frame đứng theo hàng ngang. `directions`: số hàng hướng theo chiều dọc.
- Sprite sheet cần đủ kích thước `width × frames` theo ngang và `height × directions` theo dọc.
- Với ảnh tĩnh một hướng, dùng `frames: 1`, `directions: 1`, `direction: 0`; không khai báo tám hướng nếu chỉ có một ảnh.
- Với sprite tám hướng hiện có, thứ tự hướng trong editor là Đông nam, Nam, Tây nam, Tây, Tây bắc, Bắc, Đông bắc, Đông. Căn các frame cùng một anchor để chân không nhảy khi animation chạy.
- `frameMs`: thời gian một frame. `animated: false` ở placement chỉ vẽ frame đầu; bật animation chỉ chạy frame đứng trong hàng hướng đã chọn.
- `animation`: mã animation cũ nếu mẫu cần tham chiếu; NPC đã đặt qua catalog được vẽ từ `image` và metadata frame.

## 5. Nối hành vi rồi đặt bằng map-tool

1. Lưu sprite trong `src/client/npcs/assets/` và thêm mẫu vào catalog.
2. Thêm hành vi vào bảng `actions` trong `equipment-trader-01.js`, dùng đúng mã `npcId`. Với dialog phức tạp, tạo module riêng rồi đăng ký trong `modules.json`.
3. Trong map-tool mở tab **NPC**, tìm theo tên hoặc nhóm, chọn mẫu rồi bấm lên bản đồ để đặt.
4. Chỉnh vị trí, phe và hướng. Để dùng kích thước chuẩn, giữ scale bằng mặc định của mẫu. Chỉ đặt scale riêng nếu có chủ ý khác biệt tại vị trí đó.
5. Save map và tải lại bản game để kiểm tra tương tác.

Ví dụ placement hiện có ở phe Tống:

```json
{
  "id": "song-quartermaster",
  "npcId": "quartermaster",
  "team": "song",
  "position": { "x": 750, "y": 2740 },
  "direction": 0
}
```

Bỏ `team` nếu cả hai phe được thấy NPC; `song`/`jin` giới hạn theo phe trong chiến trường. Mỗi lần đặt phải có `id` riêng. Placement không ghi `scale` sẽ kế thừa catalog, nên sửa scale mặc định tự áp dụng cho những vị trí này. Nếu editor đã lưu một `scale` riêng, cần sửa/xóa giá trị đó để nhận mặc định mới.

Hai Quan Quân Nhu hiện có ở Hoang Nguyên dùng mặc định: Tống `(750, 2740)`, Kim `(2834, 844)`. Không cần thay vị trí để thu nhỏ NPC.

## 6. Kiểm tra trước khi hoàn tất

- So sánh cạnh Chủ Dược Điếm ở cùng zoom, cùng đường chân; xác nhận chiều cao thực tế và tỉ lệ cơ thể.
- Kiểm tra ảnh trong suốt, tên và bóng do game vẽ không bị lặp trong sprite.
- Kiểm tra đứng đúng chân, hướng không cắt sai frame, animation không rung; thử cả chọn và click tương tác.
- Đặt ở ô đi được; không chắn cổng, đường hoặc chồng lên NPC khác. Kiểm tra đúng phe và khoảng cách giao dịch.
- Mở lại map-tool sau khi Save: vị trí, phe, scale và ảnh vẫn đúng. Với NPC có tiền tệ/vật phẩm, kiểm tra lưu theo từng nhân vật và mua thất bại không trừ tiền.

Các lệnh kiểm tra hiện có:

```sh
npm run build
npm --prefix tools/map-tool run build
node --test test/quartermaster.test.js
node --test --test-name-pattern="static and animated NPC rendering" test/npcs.test.js
```

Khi sửa chức năng, chạy kiểm thử tương ứng của NPC và luồng lưu dữ liệu; không chỉ nhìn ảnh preview. Khi sửa mã hàm, tuân thủ impact analysis của GitNexus trước khi sửa. Trước commit, chạy `node .gitnexus/run.cjs detect-changes --scope all --repo .` sau khi cập nhật index.
