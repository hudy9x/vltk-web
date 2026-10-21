# Kiểm tra cân bằng SIM cấp 150

Chạy từ thư mục gốc repository với Node >=24 (chạy TypeScript trực tiếp) và dependencies đã cài. Các file này được kiểm tra kiểu bởi `npm run typecheck`:

```sh
node tools/sim-balance/profiles.ts /tmp/vltk-sim-balance
node tools/sim-balance/duels.ts 5 450 40 /tmp/vltk-sim-balance
node tools/sim-balance/duels.ts 5 450 160 /tmp/vltk-sim-balance
node tools/sim-balance/duels.ts 5 450 320 /tmp/vltk-sim-balance
node tools/sim-balance/report.ts /tmp/vltk-sim-balance
node tools/sim-balance/armies.ts /tmp/vltk-sim-balance
```

10 môn phái, mỗi phái cấp 150, 745 tiềm năng và 149 điểm kỹ năng thường; kỹ năng 90/150 luyện sẵn theo luật Arena. Đồ xanh cấp 10, 10 món, 5 dòng/món, tương sinh; roll cố định 0,5. Tự cộng điểm bằng Gợi ý trong code thật. Kiểm tra ngân sách bằng assertion khi tạo báo cáo.

45 cặp × 5 seed × 2 thứ tự xuất hiện × 3 khoảng cách = 1.350 lượt. Mỗi lượt tối đa 60 giây, bước 1/60 giây. Chạy hs, j0, Pt, yt, đạn G3/Be, secondary skills, contact engine và navigation thật trong VM. Không ghi save người chơi. Các hàm canvas/UI được thay thế; fixture khởi tạo lấy từ test/combat-sandbox.test.js.

Báo cáo gồm thời gian hạ đối thủ, HP/MP còn lại, build chi tiết và ma trận số thắng. Timeout được ghi riêng, không coi là hòa hoặc chiến thắng. Hệ số sát thương PvP dùng từ runtime hiện tại, ghi trong config.

Giới hạn: một bộ đồ và một chiêu chính 90 cho mỗi phái; không đại diện mọi nhánh vũ khí. Kỹ năng hỗ trợ được giả định khi dựng thuộc tính như SIM hiện tại, chưa có AI chủ động dùng buff/curse/aura hoặc di chuyển theo vai trò. Không nhắm người chơi/binh sĩ/boss, không hồi sinh, không vật phẩm. Thời gian được tính từ lúc xuất hiện, gồm tiếp cận. Kết quả là phép thử cân bằng cục bộ, không xác minh công thức VNG và không chứng minh mỗi phái phải thắng 50%.

`armies.ts` là smoke test 20/40/100 SIM với build native, chạy 30 giây, kiểm tra HP/MP hữu hạn và MP không âm. Không có hồi sinh, boss/binh sĩ/người chơi; không thay thế kiểm thử đầy đủ một trận 20 phút.

`simulation.ts` khởi tạo runtime dùng chung cho đấu đôi và đội quân; `legacy-runtime.ts` cô lập việc nạp các khai báo JS native. `types.ts` định nghĩa dữ liệu build/kết quả. Tên ngắn như `l`, `o`, `T` chỉ được giữ ở ranh giới VM để tương thích code game gốc, không dùng làm tên biến điều phối mới.

Kiểm tra build trang bị/chiêu mới: `node tools/sim-balance/profiles.ts /tmp/tk-gold-150 gold 150` hoặc thay `gold` bằng `thientu`. Mặc định vẫn là `blue 90`. Mỗi cấu hình nên dùng thư mục kết quả riêng.
