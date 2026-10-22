# Tống Kim · Chéo Doanh (9002)

Chọn map từ NPC Chiêu Mộ Sứ, tab Trận đấu → Chiến trường. Song Doanh (9001) vẫn được giữ nguyên. Hai doanh trại nằm chéo tại Tống (850,950), Kim (2734,2634), có ba đường hành quân, rào doanh trại với cổng mở, vật cản và công trình được xếp chiều sâu riêng.

## Tạo lại map

```sh
node tools/maps/generate-diagonal-battlefield.ts
npm run build
```

Script TypeScript gọi Python 3/Pillow có sẵn trên máy để xử lý ảnh ngoại tuyến; game không thêm thư viện runtime. Nếu thiếu Pillow: `python3 -m pip install Pillow` trong môi trường Python của bạn.

- Đầu ra nền: `assets/ground.webp`, chính xác 3584×3584.
- Xem toàn cảnh: `assets/preview.webp`, cùng kích thước, ghép cả công trình để duyệt hình.
- 16 tile nguồn `assets/tile-00.png`…`tile-15.png`, mỗi tile 120×120.
- `tiles.json` ghi 900 vị trí ghép (30×30). Hàng/cột cuối cắt còn 104 px; không kéo giãn map 1024 lên 3584.
- `map.json` lưu grid va chạm 32×16 và công trình với anchor theo pixel ảnh gốc, tách khỏi nền để nhân vật đi trước/sau đúng chiều sâu.
- `layout.json` lưu doanh trại và 100 điểm tuần tra hợp lệ. Generator dùng seed 9002, có thể tái lập.

## Nguồn hình và prompt

Hình được tạo bằng công cụ imagegen tích hợp, dựa trên mô tả thị giác từ bốn ảnh tham khảo của người dùng. Giữ nguồn gốc trong `assets/source/` để dựng lại mà không gọi sinh ảnh:

1. `terrain-atlas.png`: square 4×4 terrain atlas; flat ochre dusty earth, gravel, faded yellow grass, cart tracks; consistent plain edges; detailed hand-painted ancient Chinese wuxia strategy art; no buildings, people, horizon or labels. Script lấy swatch 120 px và hòa mép tuần hoàn.
2. `camp-atlas.png`: transparent 2×2 isometric atlas; blue and red pale-canvas command yurts above, blue and red wooden watchtowers/palisades below; 2:1 orthographic projection, dark wood and gold details, upper-left soft light, isolated props, no labels or people.
3. `terrain-props.png`: transparent 3×3 isometric atlas; gray crag/yellow brush, dead autumn tree, ruined stone wall, crag/tree, ochre shrub, broken cart, wooden palisade, camp brazier, crates/barrels; same painterly wuxia style, complete isolated props with padding.
