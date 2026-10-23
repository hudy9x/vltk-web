# Thư viện NPC

`catalog.json` là danh sách mẫu dùng chung giữa game và map-tool. `assets/` chứa sprite đứng của cả bốn NPC: bán đồ, mua máu, Tống Kim và mua ngựa. Không cần sao chép ảnh vào từng map.

Mỗi mẫu khai báo kích thước khung, điểm neo chân, số khung, số hướng, thời gian mỗi khung và tỉ lệ hiển thị. Tắt animation dùng khung đầu tiên; bật animation chỉ chạy các khung đứng. Ảnh tĩnh riêng có thể khai báo `frames: 1`, `directions: 1`; vị trí hướng phải phù hợp với số hướng của mẫu.

Vị trí đặt nằm trong `maps/content/<id>/map.json`, trường `npcs`:

```json
{
  "npcs": [
    { "id": "song-pharmacy", "npcId": "pharmacy", "position": { "x": 595, "y": 1747 }, "team": "song", "direction": 0, "animated": true, "scale": 1.35 }
  ]
}
```

`id` phân biệt từng lần đặt; `npcId` tham chiếu mẫu. Có thể đặt nhiều bản của cùng một mẫu. `team` có thể bỏ qua để cả hai phe cùng nhìn thấy. Bỏ trường `npcs` dùng bố trí mặc định trong `index.ts` cho Biện Kinh (37); Hoang Nguyên (9003) lưu vị trí NPC trực tiếp trong `map.json`; `npcs: []` giữ map không có NPC. Editor chỉ ghi danh sách riêng khi thêm, di chuyển, sửa hoặc xóa NPC.

Game dùng cùng sprite, hướng và vị trí với editor. Tại Biện Kinh, Dược Điếm mở shop thuốc thường. Tại chiến trường, Dược Điếm mở shop tiếp tế và kiểm tra khoảng cách theo vị trí đã đặt cho phe người chơi. Xóa hết Dược Điếm đồng nghĩa không có điểm mua thuốc trong trận. Trong phòng Tống Kim (`npm run dev:arena`), Chiêu Mộ Sứ mở mục **Tham gia chiến trường** với chiến trường mặc định Hoang Nguyên, chọn phe Tống/Kim rồi bấm **Tham gia chiến trường**. Các tab còn lại giữ cài đặt trận, quân và binh sĩ. Bản game thường cũng tham gia trực tiếp qua Chiêu Mộ Sứ.

Thêm mẫu mới vào catalog cần nối hành vi tương tác tương ứng trong `equipment-trader-01.js`. Danh sách ảnh được native editor và server giới hạn theo catalog.
