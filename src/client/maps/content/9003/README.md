# Tống Kim · Hoang Nguyên (9003)

Chọn **Chiêu Mộ Sứ → Tham gia chiến trường → Hoang Nguyên · ba đường đất → chọn phe → Tham gia chiến trường**.
Đây là chiến trường Tống Kim duy nhất và mặc định trong game.

## Bố trí

- Kích thước 3584×3584, cùng hệ tọa độ pixel với game; không xoay hoặc ép phối cảnh nền.
- Hai doanh trại nằm chéo từ dưới trái lên trên phải: Tống `(680,2784)`, Kim `(2904,800)`.
- Mỗi thành doanh là hình thoi rộng 1440×960 px (diện tích mặt đất 691.200 px²), bao bằng hàng rào gỗ có collision liên tục. Tống có cổng **NE, SE, NW**; Kim có cổng **SW, SE, NW**. Các khoảng trống của artwork và navigation cùng lấy từ ba đoạn cổng này.
- Lễ đài Tống ở `(1000,2610)`, Kim ở `(2584,974)`; Nguyên soái đứng cố định tại đây, tách khỏi điểm hồi sinh. Bục thấp có mặt trống và cờ phe, không chặn navigation; thứ tự vẽ đặt bục dưới nhân vật.
- Quanh mỗi lễ đài có vành sân chiến đấu bán kính ngang 250 px, dọc 150 px, được kiểm tra cả vòng. Không có lều hoặc collider trong vành sân này.
- Hai lều mỗi phe chỉ nằm trong khu tập kết. `armySpawns` chứa 100 vị trí đội hình riêng mỗi phe; người chơi và NPC dịch vụ xuất hiện trong khu này.
- Ba đường đất cong nối hai doanh trại. Tim đường và khoảng trống hai bên được kiểm tra với navigation trước khi xuất map.
- Nền đất mới không có vệt bánh xe định hướng; ghép swatch ở độ phân giải gốc, hòa mép chồng lấn.
- Đường giữ chi tiết đất, dùng mask mòn và sỏi ven đường thay vì một dải màu đồng nhất.
- Lều, tháp, cây, đá, xe và hàng rào là world objects riêng; shadow layer tách riêng. Renderer hiện có xếp chúng chung với actor theo Y.
- Anchor và footprint được khai báo theo từng loại prop. Footprint dùng kích thước mặt đất cố định, không suy ra từ chiều cao lá/cờ.
- 100 điểm tuần tra phe Tống, đối xứng qua tâm map cho phe Kim; xác định phe theo doanh trại gần nhất, đủ 200 vị trí riêng khi cấu hình tối đa.
- Mỗi doanh trại có Chiêu Mộ Sứ, Chủ Dược Điếm và Mã Phu trong `map.json`.

## Tái tạo

```sh
python3 tools/maps/generate-wilderness-battlefield.py
npm run build
node --test test/wilderness-battlefield.test.js
```

Cần Python 3 và Pillow khi authoring; không thêm dependency runtime. Seed `9003`. Generator chỉ ghi vào thư mục `9003`; nếu tuyến đường, cổng, đội hình hoặc sân quanh lễ đài bị chặn, hay doanh trại mất kết nối, thì dừng với lỗi trước khi xuất map.

Các đầu ra: `map.json`, `layout.json`, `assets/ground.webp`, `assets/shadows.webp`, `assets/preview.webp` và `assets/preview-small.webp`.

## Nguồn artwork

- `assets/source/neutral-earth.png`: ảnh mới tạo bằng công cụ ImageGen tích hợp, không dùng CLI/API fallback. Prompt đầy đủ ở `art-prompt.txt`.
- `assets/source/ceremonial-platforms.png`: atlas lễ đài xanh/đỏ được tạo bằng ImageGen tích hợp dựa trên ảnh bục do người dùng cung cấp; mặt bục trống, cờ ở góc sau. Prompt đầy đủ ở `platform-art-prompt.txt`. Generator tách thành `song-platform.png` và `jin-platform.png`.
- Các prop còn lại trong `assets/source/`: artwork riêng của Hoang Nguyên, giữ phong cách chung. Generator chỉ đọc nguồn trong thư mục map này.

Map này không thay renderer dùng chung, direction mapping, bóng SIM, công thức combat hoặc luật hồi sinh của các map hiện tại. Cần kiểm tra thêm bằng mắt với nhân vật thật khi đánh giá góc nhìn từng animation; preview toàn cảnh chỉ thể hiện terrain và môi trường.
