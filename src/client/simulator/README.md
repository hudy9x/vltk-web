# Arena Simulator

Toàn bộ logic SIM nằm trong thư mục này và được kiểm tra TypeScript strict.

| File | Vai trò |
| --- | --- |
| `index.ts` | Entry build; giữ API `arenaSimulator` cho game hiện có |
| `runtime.ts` | Nhân vật SIM, chọn chiêu 9x, di chuyển, đánh quái/PK và các hook tích hợp |
| `skill-cast.ts` | Va chạm đòn chính, hiệu ứng phụ dùng chung `eD`, hoa sen và giới hạn mục tiêu riêng của mỗi SIM |
| `panel.ts` | Nút SIM cạnh GM, bảng độc lập, HTML/CSS, đóng/mở và Escape |
| `build.ts` | Cộng/hoàn điểm tiềm năng và cấp kỹ năng, kiểm tra ngân sách |
| `templates.ts` | Template có phiên bản, lưu qua khóa đồng bộ SQLite |
| `template-table.ts` | Bảng template, tạo SIM và xóa template theo từng dòng |
| `roster.ts` | Danh sách SIM đang sống với nút chọn/xóa riêng |
| `log-view.ts` | Công thức trong kênh Log, lọc theo SIM và giữ sự kiện đang mở |
| `diagnostics.ts` | Ghi tối đa 200 sự kiện công thức theo thứ tự |
| `types.ts` | Kiểu SIM, kỹ năng, trạng thái và log |

`modules.json` bundle `index.ts` bằng esbuild với global name `arenaSimulator`.
Entry trả trực tiếp API qua `module.exports`; esbuild xử lý cầu nối khi build,
trình duyệt không cần CommonJS hay Node.js. API trả `null` ngoài Arena Test.

Các khai báo đầu `runtime.ts` là ranh giới với state/hàm JS dùng chung scope của
game. `LegacyRecord` chỉ dành cho các trường legacy chưa có schema TypeScript;
state riêng của SIM và cấu trúc log có kiểu tường minh. Không sao chép state sang
`window` và không lưu các SIM đang sống vào save nhân vật. Template cấu hình được lưu
ở khóa `jxidle_sim_templates`, tự đồng bộ vào bảng `storage` trong SQLite qua
`src/client/bootstrap.js`.

Đóng bảng chỉ ẩn giao diện. Bỏ tick PK hủy đòn SIM đang bay; nút Xóa SIM hủy nhân
vật được chọn và các đòn của riêng nó; các SIM khác tiếp tục chạy. Bảng Phòng test cũ tiếp tục quản lý nhân vật chính/quái.

Kiểm tra bằng `npm run build` và `npm test`; các test ở
`test/combat-sandbox.test.js` chạy bản TS đã bundle, bao gồm kỹ năng 9x, va chạm,
khiên mana, hủy đòn, đổi chiêu và đóng/mở bảng.
`test/combat-contact.test.js` kiểm tra adapter SIM với bảng chiêu, sprite và engine
va chạm thật: hoa sen Băng Tung, dung nham Thiên Ngoại Lưu Tinh, sát thương phụ
theo chỉ số SIM và hủy hiệu ứng khi dừng. Đòn chính và đòn phụ cùng giữ actor,
danh sách mục tiêu và generation của lần xuất chiêu; callback không giữ state
người chơi đã hoán đổi tạm thời.

## Nhiều SIM, điểm và template

- Mỗi lần bấm **Tạo thêm SIM** sinh một actor có ID riêng. Danh sách **SIM trên
  sân** chọn đối tượng để sửa điểm, đổi chiêu, bật/tắt đánh quái hoặc PK.
- SIM giữ mục tiêu, di chuyển/kiểm tra đường nhìn và hồi chiêu theo nhịp tương tự
  quái. Đánh quái loại các SIM khỏi danh sách mục tiêu.
- SIM tiêu hao MP theo chiêu, hồi HP/MP theo chỉ số và dùng đòn thường khi thiếu MP.
  HP, độc, choáng và chiêu tiêu hao sinh lực vẫn được xử lý; chết thì SIM bị xóa khỏi sân.
- SIM dùng chung khóa hành động của `CombatEngine`: dừng di chuyển khi ra chiêu.
  Sát thương lớn không gây khựng hoặc hủy chiêu đang chuẩn bị. Độc, băng sát và
  choáng vẫn được xử lý theo hiệu ứng riêng.
- Mở bảng điểm, nhập tiềm năng/cấp kỹ năng hoặc dùng **+1**, rồi bấm **Áp dụng
  điểm đã nhập**. Điểm được kiểm tra trước khi cập nhật chỉ số; lỗi sẽ hoàn tác.
- Đặt tên và bấm **Lưu template**. Chọn template và **Tạo SIM từ template** để
  tạo thêm bản mới có đúng cấu hình đã lưu, không tự phân phối lại điểm. Lưu cùng
  tên cập nhật template đó; các actor đang sống không chia sẻ tham chiếu dữ liệu.
- Tải lại trang xóa actor đang sống, nhưng giữ template đã đồng bộ SQLite.
- Danh sách SIM hiển thị tên, HP, chế độ và nút Xóa riêng. Xóa một SIM không
  ảnh hưởng các SIM khác. Bảng template có nút Tạo SIM/Xóa ở từng dòng; xóa
  template đồng bộ SQLite và không xóa các actor đã tạo từ template đó.
- Bảng SIM không chứa log. Chọn kênh **Log** cạnh **Hệ thống**, rồi chọn
  **Log công thức** hoặc **Log của SIM**. Bộ lọc SIM dùng `simId` ghi ngay khi
  bắt sự kiện, nên vẫn lọc được sau khi actor bị xóa. Copy log xuất JSON đầy đủ
  các bước, giữ tối đa 200 sự kiện; Xóa log chỉ xóa nhóm đang chọn. Các bộ lọc
  sát thương thường vẫn dùng log riêng. Có thể tắt ghi công thức trong kênh Log.

## Hiệu suất Tống Kim

- `../workers/crowd-path.ts` chạy tìm đường vòng tránh đám đông trong một Web Worker dùng
  chung. `path-worker-client.ts` gửi tối đa ba yêu cầu mỗi batch, chỉ giữ một batch
  đang chạy; địa hình gửi một lần cho mỗi worker, tọa độ người gửi theo batch.
  Build nhúng worker đã bundle vào `game.js`, nên không cần URL asset hoặc route mới.
- Di chuyển, né nhau, va chạm và sát thương vẫn chạy trên main thread. SIM tiếp tục
  di chuyển trong lúc chờ; đường trả về bị bỏ nếu actor chết, đổi generation/mục
  tiêu, di chuyển quá xa hoặc yêu cầu quá hạn. Reset/rời/kết thúc trận hủy worker.
  Worker không hỗ trợ, lỗi hoặc không phản hồi trong hai giây sẽ dùng đường đồng bộ.
- Tống Kim mặc định tắt log công thức. Có thể bật lại trong kênh Log để debug;
  rời trận khôi phục lựa chọn ghi log trước đó. Log quân trạng vẫn giữ nguyên.
- SIM ngoài viewport (có lề 160 px) bỏ qua ghép sprite và vẽ nameplate nhưng vẫn
  cập nhật animation/hiệu ứng tạm; logic chiến đấu không phụ thuộc camera.

Đo CPU bằng `node tools/benchmark-tongkim.js 40`: so sánh cùng kịch bản quân qua
cầu bằng thuật toán đồng bộ và worker thật. Báo thời gian main thread, gồm gửi
snapshot và nhận kết quả, không gồm thời gian chờ worker; đây không phải FPS
trình duyệt. Benchmark cũng kiểm tra địa hình và khoảng cách tránh chồng người.
`test/path-worker.test.js` kiểm tra batching, lỗi/timeout, hủy và kết quả lỗi thời;
`test/nameplates.test.js` kiểm tra culling; `test/combat-sandbox.test.js` kiểm tra
log và vòng đời trận.

## SIM đồng hành và công cụ test online

Chế độ `dev:arena` và panel Test room cũ đã bỏ. Lệnh bài SIM mở giao diện
`dev/online-training-01.js`, dùng API `/api/multiplayer/companions`. SIM đồng hành
không bật chế độ test, không khóa map và không thay đổi cách chủ hồi sinh.
Mỗi nhân vật có tối đa 3 SIM, tên `SIM#1`–`SIM#3`; tạo mới không thay SIM đang có.
Chọn avatar môn phái để chỉnh riêng từng SIM hoặc bấm **Xóa SIM này**.
Sau khi xóa/chết, số thứ tự trống được dùng lại cho SIM tạo tiếp theo.

SIM dùng builder native/trang bị Tống Kim và thực thi combat Rust thông thường,
không dùng damage client hoặc buff giả. Hai checkbox mặc định tắt:
- **Theo sau chủ, kể cả khi đổi bản đồ**: xa hơn 180 px thì quay về, dừng trong
  72 px; đổi map thường thì sang cùng chủ tại vị trí đi được gần chủ. Không theo
  vào Tống Kim. Tắt checkbox thì SIM ở lại map cũ và tiếp tục chế độ chiến đấu.
- **Tự nhận lời mời tổ đội từ chủ**: chỉ nhận lời mời hợp lệ từ chủ. Vào đội chiếm
  một chỗ trong giới hạn 8 thành viên nhưng không chiếm phần EXP.

SIM hết HP từ bất kỳ nguồn sát thương hợp lệ nào đều bị xóa, không tự hồi sinh.
Chủ chết không xóa SIM. Khi chủ ngắt kết nối, SIM rời runtime chiến đấu để tạm dừng
an toàn; khi cùng nhân vật kết nối lại sẽ phục hồi. Checkpoint `.state.json` lưu
SIM theo tài khoản/ô nhân vật, gồm cấu hình native, HP/MP, map/vị trí và tùy chọn;
tạo/xóa/đổi tùy chọn được ghi ngay và trạng thái chiến đấu cập nhật định kỳ.
Tổ đội vẫn chỉ tồn tại trong phiên, không tự khôi phục sau reconnect/restart.

Lệnh bài Test tiếp tục dùng API `/api/multiplayer/training`, chỉ trong development.
Tạo quái/bao cát hoặc đổi phái test mới khóa map và hồi sinh chủ tại chỗ; **Kết thúc
test / mở khóa map** chỉ kết thúc trạng thái đó, không xóa SIM đồng hành.
Wire trailer và renderer SIM cũ được dùng lại; chỉ metadata SIM cùng map được đưa
vào world snapshot, còn danh sách quản lý trả đủ SIM của chủ kể cả khác map.

Các test private Tống Kim còn dùng fixture `test/helpers/legacy-combat-sandbox.js`;
fixture này không được bundle hoặc chạy trong game.
