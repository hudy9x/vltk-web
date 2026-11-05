# Cấu hình quái

Mở Map Tool → **Monsters** (`#/monsters`). Chọn dải cấp, chọn quái trong nhóm hoặc boss, rồi sửa HP, sát thương mỗi đòn, phòng thủ, tốc độ, năm loại kháng và EXP mỗi quái. Có thể nhân bản một dải cấp để tạo cấu hình độc lập.

Các giá trị là chỉ số ở **cấp đầu dải**. HP, sát thương, phòng thủ và EXP có mức cộng thêm mỗi cấp. Phần xem trước cho biết kết quả ở cấp đã chọn. EXP bằng `0` nghĩa là không thưởng EXP. Quái chưa được chỉnh tiếp tục dùng công thức cũ; **Khôi phục công thức cũ** bỏ phần ghi đè của quái đó.

Đòn đánh mặc định là đánh thường vật lý. Độc kích, Băng kích, Hỏa kích và Lôi kích là đòn đơn trực tiếp theo hệ; không phải kỹ năng môn phái, không tự tạo DOT, làm chậm hay các tầng sát thương. Có thể chỉnh tầm và chu kỳ đánh. Kháng cho phép từ -50% tới 90%, đúng giới hạn của đường sát thương online.

Trong Map → Gameplay, chọn cấu hình quái/dải cấp dùng cho sinh quái tự động. Với spawn đặt sẵn, chọn cấu hình và cấp cụ thể nằm trong dải tại phần thuộc tính spawn. Mỗi điểm vẫn có vị trí, loại quái/boss và độ trễ xuất hiện riêng. Hai điểm cùng tham chiếu một cấu hình sẽ cùng nhận thay đổi; đổi ID quái tại một điểm tạo bản cấu hình riêng theo cơ chế có sẵn.

## Lưu và áp dụng

- `src/client/gameplay/encounters/catalog.json`: dải cấp, ID quái và `monsterProfiles` theo từng ID. Các chỉ số ghi đè là giá trị chính xác, không tự nhân thêm hệ số tinh anh/boss. Mỗi profile chứa `hp`, `damage`, `defense`, `speed`, `res`, `xp`, `attack`, `growth`.
- `src/client/maps/content/<id>/map.json`: `encounterId` của map; `encounterId` và `level` tùy chọn trên từng spawn. Bỏ `level` thì dùng cấp đầu dải.
- Chỉnh map và Monsters dùng chung bản nháp, Undo/Redo và thao tác lưu workspace hiện tại. Lưu ghi JSON, kiểm tra các map tham chiếu và build game trong giao dịch rollback có sẵn.
- Sau khi lưu, **khởi động lại server online/Rust và tải lại game**. Thế giới Rust đang chạy không thay thế quái đã sinh khi nhận lại catalog.
- EXP đã nhận của nhân vật vẫn lưu trong SQLite; thay cấu hình không sửa thưởng đã nhận.

Thưởng cấu hình là EXP cơ bản được ghi nhận nguyên giá trị, giống đường thưởng online hiện tại; các hệ số legacy như sự kiện `ye` không nhân thêm vào nhánh này. Chưa thay bảng EXP lên cấp hay tự cân bằng lại các map cũ.

`tools/map-tool/src/lib/monster-defaults.json` là bảng gợi ý của editor được chụp từ công thức hiện tại ở cấp 1–200; quái chưa ghi đè vẫn lấy công thức live trên server. Khi thay công thức mặc định, chạy `node tools/maps/monster-defaults.cjs` từ thư mục gốc để cập nhật bảng gợi ý.

## Cài đặt hàng loạt theo level

Trong trang Monsters, bấm nút **Cài đặt hàng loạt** cạnh ô tìm map. Chọn **Toàn bộ map** có ảnh hoặc **Theo dải level**; phạm vi này độc lập với nội dung ô tìm kiếm. Dải được chọn theo **level bắt đầu** của cấu hình, kể cả các dải riêng của spawn trong map. Cấu hình dùng chung chỉ được cập nhật một lần.

Chọn riêng Máu, Sát thương, Phòng thủ hoặc EXP, nhập giá trị gốc và hệ số tăng mỗi bước. Chế độ **Từ giá trị gốc** gán cùng giá trị cho các quái cùng mốc level. Chế độ **Nhân cấu hình hiện tại** nhân từng chỉ số hiện có với hệ số ban đầu và hệ số theo mốc, giữ khác biệt giữa các quái thường.

Các mốc là bội số của bước level, tính từ mốc thấp nhất trong phạm vi. Với bước 10, các dải bắt đầu ở cấp 1, 10, 20 lần lượt là bước 0, 1, 2. Ví dụ HP gốc 1.000, hệ số ×1,5 cho kết quả 1.000 → 1.500 → 2.250. Hai map cùng mốc dùng cùng hệ số, không phụ thuộc thứ tự hay số lượng map.

**Hệ số Boss** nhân thêm vào các chỉ số được chọn sau khi tăng theo level, trong cùng form. Khi nhân cấu hình hiện tại, Boss lấy giá trị của quái thường đầu tiên trong cùng encounter làm mốc; nếu encounter chỉ có Boss thì lấy gợi ý quái thường tại level đó. Các chỉ số không chọn, kháng, tốc độ, đòn đánh và mức cộng mỗi cấp hiện có được giữ nguyên. Hệ số Boss này được ghi vào chỉ số gốc tại cấp đầu dải; không thay mức cộng mỗi cấp.

Bảng xem trước dùng cấu hình thật, hiển thị giá trị cũ → mới từ map thấp đến cao, gồm cả Boss. Toàn bộ lô phải hợp lệ, bao gồm chỉ số sau tăng trưởng ở cấp cuối dải, mới có thể áp dụng. Áp dụng tạo một bước Undo trong bản nháp; **Lưu cấu hình** mới ghi file và build game.

Khi chọn **Theo dải level** với cách tính **Từ giá trị gốc**, thay đổi **Level bắt đầu** tự điền lại cả bốn giá trị gốc theo quái thường đầu tiên trong cấu hình đầu tiên từ level đó trở lên (ưu tiên level thấp rồi ID map). Lấy dữ liệu trong bản nháp hiện tại; nếu chưa có chỉ số riêng thì dùng gợi ý mặc định. Hệ số mỗi bước, hệ số Boss và các checkbox được giữ nguyên. Sau khi tự điền vẫn có thể sửa tay; đổi **Level kết thúc** không ghi đè các giá trị đã sửa. Chế độ **Nhân cấu hình hiện tại** giữ các hệ số ban đầu do người dùng nhập.
