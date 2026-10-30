# Thư viện NPC

Hướng dẫn tạo NPC, phong cách sprite, kích thước và công thức render: [Cách tạo NPC](../../../docs/how-to-create-npc.md).

`catalog.json` là danh sách mẫu dùng chung giữa game và map-tool. `assets/` chứa sprite đứng dùng chung cho bán đồ, mua máu, Tống Kim, mua ngựa, Quan Quân Nhu và hai quan chiêu binh. Tống Quốc Chiêu Binh quan / Kim Quốc Chiêu Binh quan dùng sprite giáp xanh native, mở hộp gia nhập cố định phe tương ứng và luôn vào PvP chung. Hai NPC được đặt trong Biện Kinh; Chiêu Mộ Sứ vẫn giữ cấu hình trận riêng/chung. Không cần sao chép ảnh vào từng map.

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

Game dùng cùng sprite, hướng và vị trí với editor. Tại Biện Kinh, Dược Điếm mở shop thuốc thường. Tại chiến trường, Dược Điếm mở shop tiếp tế. Có thể mua thuốc bất cứ lúc nào qua dialog, kể cả khi mở từ ô chọn thuốc; không khóa theo khoảng cách, trạng thái trận hoặc hồi sinh. Vẫn kiểm tra ngân lượng và tổng túi tối đa 80 bình, mỗi ô tối đa 40 bình. Trong phòng Tống Kim (`npm run dev:arena`), Chiêu Mộ Sứ mở mục **Tham gia chiến trường** với chiến trường mặc định Hoang Nguyên, chọn phe Tống/Kim rồi bấm **Tham gia chiến trường**. Các tab còn lại giữ cài đặt trận, quân và binh sĩ. Bản game thường cũng tham gia trực tiếp qua Chiêu Mộ Sứ.

Thêm mẫu mới vào catalog cần nối hành vi tương tác tương ứng trong `equipment-trader-01.js`. Danh sách ảnh được native editor và server giới hạn theo catalog.

## Quan Quân Nhu

Trong map-tool chọn **NPC → Quan Quân Nhu** (nhóm **NPC quân nhu Tống Kim**) rồi bấm lên bản đồ để đặt. Mã mẫu là `quartermaster`; có thể chọn phe Tống, Kim hoặc cả hai, thay vị trí và tỉ lệ như các NPC khác. Sprite tĩnh 40×72 px, nền trong suốt, dùng chung từ `assets/quartermaster.webp`. Scale mặc định `0.8625`, render thành 34,5×62,1 đơn vị bản đồ, cao bằng Chủ Dược Điếm (46×1.35 = 62,1). Chỉ có một hướng đứng. Không cần chép ảnh vào map hoặc sửa code khi đặt NPC. Save map rồi tải lại game.

Ví dụ placement (thay tọa độ bằng vị trí đi được trên map của bạn):

```json
{"id":"song-quartermaster","npcId":"quartermaster","team":"song","position":{"x":700,"y":2800},"direction":0}
```

NPC bán toàn bộ 26 vật phẩm Tống Kim; giá nằm tại `../gameplay/quartermaster/model.ts` (`WAR_PRICES`). Bấm **Mua** để mua 1 món hoặc **×10** để mua 10 món. Bấm ảnh/tên/dòng vật phẩm không mua hàng; không có ô chọn số lượng. Chỉ trừ **quân trạng tích lũy**; không nhận ngân lượng/KNB và không trừ điểm danh hiệu của trận. Túi đầy vẫn mua được vào chồng còn chỗ, nhưng không trừ điểm nếu không đủ ô cho phần hàng mua.

Quân trạng tích lũy được lưu trong save của **từng nhân vật**, trường `mats.misc.tk_merit`, qua cơ chế lưu/đồng bộ SQLite hiện có. Chỉ cửa hàng này hiển thị số dư; GM có nút `+10.000 điểm Quân trạng / tích lũy` nhưng không hiện số dư. Hạ địch nhận thêm điểm bằng quân trạng vừa được ghi trong trận, chỉ khi công thuộc về người chơi; reset/rời trận không xóa số dư. Không chuyển đổi ngược điểm trận của các trận trước khi tính năng ra mắt.

Sprite tạo bằng ImageGen tích hợp theo ảnh tham khảo, sau đó thu nhỏ thành WebP lossless. Prompt: “Quan Quân Nhu đứng toàn thân, áo xanh đậm và đai đỏ theo ảnh tham khảo, góc nhìn isometric game võ hiệp 2D; một nhân vật, không chữ, không nền, không bóng đất, alpha trong suốt, rõ ở kích thước nhỏ.”

Tên trên bản đồ chỉ có `name`, đặt cao hơn đỉnh sprite 6 đơn vị: `position.y - anchor.y * (placement.scale ?? definition.scale) - 6`. `subtitle` chỉ là metadata, không vẽ trên bản đồ.
