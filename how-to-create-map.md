# Hướng Dẫn Tạo Map Mới, Quy Định Đường Đi & Tọa Độ Quái Xuất Hiện

Tài liệu này hướng dẫn chi tiết cách thêm một bản đồ (map/zone) mới vào game **Võ Lâm Idle**, cách quy định vật cản/tuyến đường đi và cơ chế phân bổ tọa độ quái xuất hiện.

---

## 1. Tổng Quan Kiến Trúc Map & Navigation

Hệ thống bản đồ trong game gồm 3 thành phần chính:
1. **Asset Hình Ảnh**: File ảnh nền bản đồ đặt tại `img/z/<id>.jpg` (thường có độ phân giải chuẩn `3584 x 3584` px).
2. **Zone Configuration (`window.JW["zones"]`)**: Khai báo thông số map (tên, cấp độ yêu cầu, danh sách quái, boss trấn thủ, ngũ hành rơi đồ).
3. **Lưới Cản & Tìm Đường (`window.JMO[id]`)**: Dữ liệu nén Base64 đại diện cho ma trận bitmask các ô bị chặn (chướng ngại vật) và ô đi được. Hệ thống sử dụng thuật toán **A\*** ([Bw](file:///Users/hudy/ws/volamidle.pages.dev/app/core/attributes-01.js#L169)) và **Flow-Field / Dijkstra** ([Mw / _w](file:///Users/hudy/ws/volamidle.pages.dev/app/core/attributes-01.js#L281)) để tìm đường tránh vật cản.
4. **Cơ chế Spawn Quái & Home Point**:
   - **Chế độ Dã Ngoại (`l.field`)**: Tạo các cụm bãi quái cách xa nhau trên các ô đi được hợp lệ (`wt`). Mỗi quái có tọa độ nhà (`home`), tự tuần tra quanh bãi và tự tìm đường quay về nếu bị kéo quá xa.
   - **Chế độ Vượt Ải / Luyện Công (`o8`)**: Quái spawn vòng cung quanh nhân vật ở bán kính từ 140px đến 300px.

---

## 2. Các Bước Tạo Một Map Mới

### Bước 1: Thêm ảnh nền bản đồ

1. Chuẩn bị file ảnh nền bản đồ định dạng JPG.
2. Đặt vào thư mục:
   ```text
   img/z/<map_id>.jpg
   ```
   *Ví dụ: `img/z/500.jpg`* (kích thước chuẩn thường là 3584 x 3584 px).

---

### Bước 2: Khai báo Zone trong Dữ Liệu Game

Mở file [app/data/monsters-and-zones-01.js](file:///Users/hudy/ws/volamidle.pages.dev/app/data/monsters-and-zones-01.js) (hoặc file patch [app/data/equipment-and-zone-patches-02.js](file:///Users/hudy/ws/volamidle.pages.dev/app/data/equipment-and-zone-patches-02.js)), thêm map mới vào mảng `window.JW["zones"]`:

```javascript
window.JW["zones"].push({
  id: 500,                         // ID duy nhất của Map
  n: "Võ Đang Phái",                // Tên bản đồ hiển thị trong game
  lo: 100,                         // Cấp độ tối thiểu để vào map / cấp quái
  hi: 110,                         // Cấp độ tối đa
  bg: "img/z/500.jpg",             // Đường dẫn ảnh nền bản đồ
  sw: [20, 20, 20, 20, 20],        // Tỉ lệ rớt trang bị Ngũ Hành [Kim, Mộc, Thủy, Hỏa, Thổ]
  m: [152, 153, 157, 158],         // Danh sách ID quái thường xuất hiện (khai báo trong window.JW["mon"])
  boss: 855                        // ID Boss trấn thủ bản đồ
});
```

---

### Bước 3: Định nghĩa Lưới Cản & Tuyến Đường Đi (`window.JMO`)

Dữ liệu chướng ngại vật được định nghĩa tại các file `app/data/map-navigation-*.js` (ví dụ: [map-navigation-06.js](file:///Users/hudy/ws/volamidle.pages.dev/app/data/map-navigation-06.js)):

```javascript
window.JMO[500] = {
  A: 7,
  w: 3584,          // Chiều rộng pixel bản đồ
  h: 3584,          // Chiều cao pixel bản đồ
  gw: 112,          // Số cột ô lưới: gw = w / cw (3584 / 32 = 112)
  gh: 224,          // Số dòng ô lưới: gh = h / ch (3584 / 16 = 224)
  cw: 32,           // Chiều rộng 1 ô lưới (32px)
  ch: 16,           // Chiều cao 1 ô lưới (16px)
  regions: 49,      // Số phân vùng map
  blocked: 8500,    // Tổng số cell bị chặn
  obs: "//////8AAAA..." // Chuỗi Base64 bitmask (1 bit/ô: 1 = cản, 0 = đi được)
};
```

#### Quy tắc hoạt động của lưới đường đi:
1. Khi chuyển sang map `500`, hàm [ma(500)](file:///Users/hudy/ws/volamidle.pages.dev/app/core/attributes-01.js#L28) sẽ:
   - Đọc chuỗi Base64 `obs` và giải mã thành mảng `ok` (`1` là đi được, `0` là vật cản).
   - Tự động gom các vùng đi được liên thông lớn nhất (`free` island) để tránh nhân vật bị kẹt trong góc chết.
2. **Tìm đường (Pathfinding)**:
   - Khi click di chuyển hoặc quái bám đuổi, hàm [Bw()](file:///Users/hudy/ws/volamidle.pages.dev/app/core/attributes-01.js#L169) chạy A* tìm chuỗi tọa độ waypoint `[{x, y}, ...]` thông qua các ô `ok === 1`.
   - Hàm [wa()](file:///Users/hudy/ws/volamidle.pages.dev/app/core/attributes-01.js#L333) điều khiển nhân vật lướt theo các waypoint để vượt qua vật cản.
3. **Trường hợp chưa có file `obs`**:
   - Nếu bạn chưa có chuỗi bitmask `obs`, chỉ cần khai báo `w` và `h`. Khi `window.JMO[id]` chưa có lưới cản, hệ thống sẽ tự động chạy chế độ map phẳng tự do không có vật cản.

---

### Bước 4: Thiết Lập Tọa Độ Xuất Hiện Của Quái

Hệ thống hỗ trợ 2 cơ chế xuất hiện:

#### 1. Cơ Chế Dã Ngoại (Field Mode - Tự động chọn bãi & tuần tra)
Cơ chế này xử lý tại [app/core/state-and-save-02.js](file:///Users/hudy/ws/volamidle.pages.dev/app/core/state-and-save-02.js):
- **Tìm tọa độ bãi quái hợp lệ (`zD`)**:
  - Quét ngẫu nhiên các ô `(r, c)` trên map.
  - Kiểm tra hàm [wt(r, c)](file:///Users/hudy/ws/volamidle.pages.dev/app/core/attributes-01.js#L375) để đảm bảo điểm đó và xung quanh `C5=9px` hoàn toàn không vướng vật cản.
  - Đảm bảo khoảng cách tối thiểu giữa các bãi quái không chồng lấn (`minDist = XD`).
- **Phân bổ bãi quái (`QD`)**:
  - **Bãi Boss (`f === 0`)**: Spawn Boss tại bãi đầu tiên.
  - **Bãi quái thường**: Tại mỗi tâm bãi `[c, d]`, spawn từ 2 đến 7 con quái nằm phân tán xung quanh tâm bãi với độ lệch:
    ```javascript
    const [x, y] = X0(c + Z(-T3, T3), d + Z(-T3, T3) * 0.6);
    ```
- **Tọa độ nhà & Tuần tra (`home`)**:
  - Mỗi quái được gán `t.home = A` (tọa độ gốc của bãi).
  - Quái tự do tuần tra quanh điểm `home` qua hàm [KD()](file:///Users/hudy/ws/volamidle.pages.dev/app/core/state-and-save-02.js#L743).
  - Nếu kéo quái chạy xa hơn `WD` và người chơi cách xa hơn 200px ([RD()](file:///Users/hudy/ws/volamidle.pages.dev/app/core/state-and-save-02.js#L777)), quái sẽ nhả aggro, tự tìm đường chạy về `t.home` và đầy máu trở lại.
  - Khi quái chết, điểm spawn đếm ngược (`t.t = 20s` quái thường, `180s` boss) và hồi sinh tại đúng bãi đó ([GD()](file:///Users/hudy/ws/volamidle.pages.dev/app/core/state-and-save-02.js#L716)).

#### 2. Chỉ Định Tọa Độ Quái Cố Định (Custom Fixed Spawn Points)
Nếu muốn một map có vị trí các bãi quái chính xác theo ý muốn (ví dụ tọa độ cổng thành, bờ suối, đỉnh núi), bạn có thể gán mảng điểm tĩnh cho map đó trước khi khởi tạo field:

```javascript
// Ví dụ mảng tọa độ cố định cho map 500
const customMap500Spawns = [
  { x: 1250, y: 840, cls: "boss", tid: 855, t: 60 },
  { x: 1000, y: 1200, cls: "elite", tid: 152, t: 0 },
  { x: 1040, y: 1230, cls: "normal", tid: 153, t: 0 },
  { x: 1800, y: 2100, cls: "normal", tid: 157, t: 0 },
  { x: 1850, y: 2120, cls: "normal", tid: 158, t: 0 }
];
```

---

## 3. Cách Kiểm Tra & Debug Map Mới

1. **Khởi động server dev**:
   ```bash
   npm run dev
   ```
2. **Mở Console trình duyệt (F12) để dịch chuyển và kiểm tra**:
   ```javascript
   // Chuyển sang map mới (ví dụ ID 500)
   Cc(500);

   // Xem vị trí hiện tại của nhân vật
   console.log("Player pos:", v.x, v.y);

   // Xem danh sách quái hiện tại trên map cùng tọa độ nhà của chúng
   console.table(l.enemies.map(e => ({
     Tên: e.n,
     Loại: e.cls,
     TọaĐộ: `${Math.round(e.x)}, ${Math.round(e.y)}`,
     Home: e.home ? `${Math.round(e.home.x)}, ${Math.round(e.home.y)}` : "None"
   })));
   ```
3. **Kiểm tra va chạm & vật cản**:
   - Thử click chuột vào các góc trên map để kiểm tra xem nhân vật có né đá/cây/tường mượt mà hay không.
   - Thử kéo quái đi xa khỏi bãi để kiểm tra quái có tự quay về vị trí `home` hay không.
