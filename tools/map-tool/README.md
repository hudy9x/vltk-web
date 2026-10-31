# Võ Lâm Map Editor

Desktop editor dùng **Tauri 2 + React + TypeScript + shadcn/ui**. Làm việc trực tiếp với repository game, không cần server ghi file hay sửa registry thủ công.

## NPC dùng chung

Mở tab **NPC**, chọn một trong bốn mẫu (bán đồ, mua máu, Tống Kim, mua ngựa), rồi bấm trên map để đặt. Phím **N** bật công cụ đặt NPC. Bấm **V** để chọn và kéo NPC; có thể chọn NPC từ danh sách bên trái để sửa tọa độ, phe, hướng đứng, tỉ lệ ảnh và animation trong bảng Thuộc tính. Bấm **thùng rác cạnh từng NPC** trong danh sách để xóa trực tiếp, hoặc **Delete** để xóa NPC đang chọn. Xóa riêng NPC của một phe vẫn giữ NPC bên phe còn lại. Undo/Redo hoạt động như các thao tác map khác. **Lưu map** lưu vị trí và build game; reload game để áp dụng.

Hỗ trợ Biện Kinh và Hoang Nguyên. Editor hiện cả hai phe trên map; game chỉ hiện NPC thuộc phe người chơi hoặc NPC không gán phe. Có thể đặt cùng một mẫu nhiều lần. Toàn bộ mẫu và sprite nằm trong [`src/client/npcs`](../../src/client/npcs/README.md), các map chỉ lưu vị trí và ID tham chiếu.

## Chạy ứng dụng

Cần Node.js >= 24, pnpm và môi trường Rust/Tauri đã cài. Cài dependencies ở root repository trước (`npm install`), sau đó:

```sh
cd tools/map-tool
pnpm install
pnpm tauri dev
```

Tool tự tìm repository từ thư mục hiện tại và nhớ workspace đã mở. Có thể đổi bằng nút **Workspace**. Để chạy game, mở terminal ở root và chạy `npm run dev`; nút **Mở game** mở `http://127.0.0.1:3000`.

```sh
pnpm build                         # TypeScript + frontend
pnpm tauri build                   # Native release + bundle theo hệ điều hành
cargo test --manifest-path src-tauri/Cargo.toml
```

`pnpm dev` chỉ mở frontend; thao tác đọc/lưu workspace cần chạy trong Tauri. Bản đóng gói vẫn cần Node.js và dependencies của repository để validate/build game; đây là công cụ dành cho người phát triển.

## Dùng editor

- Danh sách map theo khoảng cấp luyện công; map phụ nằm ngay dưới map chính, các map ngoài tiến trình ở cuối. Chọn map, tạo mới hoặc nhân bản. Toàn bộ ảnh map nằm trong `public/app/maps/content/<id>/assets/`, được tham chiếu bằng đường dẫn `./assets/...`. Tool từ chối ảnh map ngoài thư mục này; preview quái chỉ đọc ảnh có trong catalog quái.
- **Layers** thêm shadow, world, foreground hoặc atmosphere. Chọn layer để thay ảnh/opacity. Thêm PNG/WebP trong suốt vào world, kéo object trên canvas hoặc chỉnh anchor/scale/depth bên phải.
- **Collision** tô/chặn/xóa theo ô 32×16 (map cũ giữ kích thước ô hiện có). Collider ellipse quanh gốc object được compile cùng vùng tô tay; kéo/xóa object không phá vùng đã tô.
- **Điểm vào** được dùng khi chọn map luyện công chính/phụ hoặc về thành (Biện Kinh); nếu bị chặn, game chọn vị trí đi được gần nhất. Làm mới cùng bãi giữ tọa độ hiện tại; phó bản/tháp/thuyền giữ vị trí riêng.
- **Hiện điểm spawn** bật/tắt trên canvas: xanh là thường, vàng là tinh anh, cam là boss. Map không có điểm cố định hiển thị mẫu bãi ngẫu nhiên và nút **Tạo mẫu khác**; hover hoặc zoom để xem tên quái. Mẫu dùng chung generator/navigation và kiểm tra nền đen, dùng mật độ tham khảo 6–8; vị trí/số lượng thực tế còn phụ thuộc random và level nhân vật trong game. Mẫu chỉ được ghi vào map khi bạn thêm hoặc chọn một điểm để chỉnh sửa; toàn bộ vị trí, loại quái/boss và delay đang hiển thị được giữ lại. Chỉ xem mẫu rồi Save không thay đổi chế độ spawn.
- **Chọn vùng spawn (Q)**: kéo khung theo bất kỳ hướng nào để chọn tất cả spawn thường/tinh anh/boss có tâm trong vùng (kể cả đường biên). Các điểm được chọn sáng trắng. Nhấn Delete/Backspace hoặc **Xóa … điểm đã chọn** trong Thuộc tính; Undo/Redo phục hồi cả nhóm. Kéo vùng trống để bỏ chọn. Áp dụng cả bãi ngẫu nhiên: toàn bộ mẫu được giữ thành điểm cố định trước khi xóa, các điểm ngoài khung vẫn còn.
- **Spawn** thêm điểm mới và giữ toàn bộ điểm cũ. Dùng **Chọn (V)** bấm một điểm, rồi **Xóa điểm spawn** hoặc **Delete**; có Undo/Redo. Chọn lại quái/boss có ảnh và lọc cấp ngay trong thuộc tính điểm; chỉ điểm đó thay đổi. Tab Gameplay vẫn chỉnh boss của encounter dùng chung.
- Map cũ tiếp tục dùng bãi procedural nếu chưa đặt điểm. Map đã chỉnh spawn lưu `spawnMode: "fixed"`; xóa hết điểm sẽ giữ map trống, kể cả sau Save và mở lại.
- **Gameplay** sửa quái/boss/level/trọng số trang bị. Bộ chọn quái/boss có ảnh local, tìm theo tên/ID và lọc theo khoảng cấp bãi; quái xuất hiện ở nhiều bãi có thể thuộc nhiều nhóm cấp. Asset thiếu hiển thị ảnh thay thế, không tự tải từ mạng. UI liệt kê map bị ảnh hưởng; nhân bản profile riêng để tránh sửa chung. HP và damage vẫn do gameplay tính.
- **Tiến trình** thêm map mới vào cuối danh sách chính hoặc làm map phụ. Thứ tự map chính cũ được giữ để tương thích save.
- **Lưu map** validate → compile navigation → ghi JSON/asset theo transaction → tự sinh catalog và build game. Reload game để áp dụng. Revision theo dõi cả JSON và nội dung ảnh được tham chiếu. Nếu file bị sửa từ ngoài, tool chặn Save; bản nháp vẫn còn để bạn đối chiếu trước khi tải lại.
- **Thay ảnh nền**: ảnh hiện tại được giữ nguyên byte dưới tên `assets/default.<ext>` ở lần thay đầu tiên. Ảnh mới dùng `assets/ground.<ext>` và các lần sau ghi đè cùng tên. Map mới giữ ảnh tải lên đầu tiên làm default. Khi đổi định dạng, transaction dọn file ground ở định dạng trước; nếu Save/build lỗi thì khôi phục cả ảnh cũ. Ảnh layer khác có slot riêng theo ID; ảnh object không ghi đè lẫn nhau. Undo/Redo khôi phục đúng nội dung ảnh ngay cả khi tên file không đổi. Các file lịch sử khác đã có sẵn không được tự động xóa.


| Phím | Thao tác |
| --- | --- |
| V / H | Chọn, kéo canvas |
| B / E / R | Cọ chặn, xóa, hình chữ nhật |
| I / S | Đặt entry, spawn |
| Q | Chọn vùng spawn: kéo khung rồi Delete hoặc nút Xóa trong Thuộc tính |
| P / T | Thử đường đi, nhân vật thử |
| ⌘/Ctrl+S | Lưu |
| ⌘/Ctrl+Z, ⇧⌘/Ctrl+Z | Undo, redo |
| Delete | Xóa object/spawn/layer đã chọn |
| Cuộn / ⌘ hoặc Ctrl+cuộn | Pan / zoom |

Preview dùng chung renderer và navigation/A* với game. Nhân vật thử là hình đại diện để kiểm tra đường đi/che khuất; chưa chạy combat hay hoạt ảnh quái. Canvas hiển thị mẫu vị trí procedural; chu kỳ chết/hồi sinh kiểm tra trong game. Ảnh nền cũ chưa tách cây: muốn che khuất đúng phải thay nền sạch và thêm object/layer riêng; tool không tự tách ảnh.

Map tạo mới hoặc nhân bản mặc định được thêm cuối danh sách map chính, giữ nguyên stage index của các map cũ. Trước lần Save đầu tiên, tab **Tiến trình** cho phép chuyển thành map phụ hoặc **Ẩn khỏi danh sách luyện công**. Map mới mặc định **Test**. Bật **Available** rồi Save để xuất hiện trong game. Save cập nhật `progression.json`, tạo lại catalog imports và build game; reload game local để thấy nội dung map mới.

## Available / Test

- Switch nằm ngay đầu panel Thuộc tính, áp dụng sau khi Save. Biện Kinh luôn Available để làm điểm về thành.
- **Available**: game có thể tải map; map được gán vào progression sẽ hiện trong menu luyện công.
- **Test**: chỉ editor đọc nội dung; game build không import JSON/layers/navigation của map, không tải ảnh, ẩn khỏi cả hai menu. Progression và chỉ số map phụ được giữ nguyên để tương thích save nhân vật.
- Game kiểm tra URL `/app/maps/availability.json` mỗi 5 giây. Nếu map đang ở bị tắt/xóa khỏi manifest, game dừng mô phỏng và hiện “Map không tồn tại. sử dụng Thổ địa phù ngay”. Chỉ khi bấm **OK**, game dùng luồng Thổ địa phù về Biện Kinh, bỏ qua hồi chiêu, dừng tự đổi map/quest và thoát phó bản/tháp nếu cần.
- Mạng lỗi hoặc manifest không hợp lệ không làm nhân vật bị đẩy về thành. Bật lại một map đã Test từ lúc game khởi động cần reload game để tải nội dung mới.
- 5 map cũ chưa có ảnh trên ổ đĩa (#8, #50, #141, #206, #212) được giữ ở Test; thêm ảnh trước khi chuyển Available.

## Tổ chức code

```text
src/
  components/ui/       shadcn/ui
  editor/              Canvas, sidebar, inspector, gameplay panel, trường nhập dùng chung
  lib/model.ts         Document, brush/collider compiler, validation
  lib/image-editing.ts  Ảnh gốc, slot ảnh thay thế và phiên bản Undo/Redo
  lib/native.ts        IPC + image cache
  lib/types.ts         Kiểu dữ liệu riêng của editor
  App.tsx              Workspace, lịch sử, save/import và shell
src-tauri/src/
  workspace.rs         Native commands, revision, validation/build bridge
  image_assets.rs      Quy tắc giữ ảnh gốc, ghi đè và dọn ảnh thay thế
  transactions.rs      Allowlist, staging, journal, rollback/recovery (ghi/xóa)
../maps/
  editor-data.ts       Node bridge dùng model/validation và catalog quái thật
../../src/client/maps/            Runtime/renderer/navigation dùng chung
```

`project.json` giữ `schemaVersion`, `mapId`, `paintedNavigation`, `colliders` theo khóa `<layer-id>/<object-id>`, `originalImages` theo layer và `imageRevision` để nhận diện phiên bản ảnh khi lưu. Game chỉ đọc `map.json` với navigation đã compile. Save lỗi rollback dữ liệu nguồn; journal trong `.map-tool/transactions/` phục hồi khi mở workspace sau lần lưu bị ngắt. Build artifacts không nằm trong transaction; build lại từ nguồn được phục hồi.

Kiểm tra từ root: `npm run build`, `npm test`. Đặc tả gốc: [SPEC.md](../../docs/SPEC.md).

## Sidebar Map / Sound

Thanh điều hướng nhỏ bên trái chuyển giữa **Map Tool** và **Sound Tool**. Hai
màn hình giữ bản nháp riêng khi đổi tab; đổi tab không lưu và không bỏ thay đổi.
Âm thanh đang nghe dừng khi về Map. `⌘/Ctrl+S` lưu màn hình đang chọn; phím tắt
map không tác động lên sound. Khi đóng ứng dụng hoặc đổi workspace, tool kiểm
tra cả bản nháp map và âm thanh chưa lưu.

Trong **Sound Tool**:

- Thư viện đọc trực tiếp danh mục `sounds` và mapping `skills` trong config game.
  Tìm tên/Sound ID, lọc hiệu ứng hoặc tiếng hô nam/nữ và nghe bằng nút Play.
- Chọn **Import sound**, chọn WAV/MP3, đặt tên, loại và giới tính. Tool tự tạo
  Sound ID cùng tên file không dấu; nếu tên trùng trong thư viện thì thêm hậu tố.
  Import chỉ thêm vào bản nháp; **Lưu âm thanh** mới ghi file vào workspace.
  File đã có trên ổ đĩa được giữ nguyên, không ghi đè âm thầm.
- Chọn môn phái/kỹ năng, gắn Sound ID vào **Xuất chiêu**, **Phóng đạn/kình khí**
  hoặc **Va chạm**. Xuất chiêu có tiếng hô nam/nữ, hiệu ứng chung và hiệu ứng
  theo giới tính. Chọn một sound trong thư viện để xem những skill đang dùng,
  bao gồm skill kế thừa.
- Skill 150 hiển thị sound kế thừa từ skill 80; sửa một trường chỉ ghi đè trường
  đó. Chọn **Kế thừa** để bỏ ghi đè. Mục **Không gắn sound** bỏ sound riêng ở
  trường đó; tiếng hô vẫn có thể dùng fallback mặc định của game.
- Các mục `review` hiện dưới **Cần xác minh** để nghe và đối chiếu; chưa tự bật
  chúng trong combat. Metadata gốc `index.json` là tài liệu nhập ban đầu;
  các thay đổi của tool được lưu vào config runtime, không tự sinh lại metadata gốc.
- **Lưu âm thanh** kiểm tra ID/file/kế thừa → kiểm tra revision → ghi config và
  file upload theo transaction → build game. Lỗi build khôi phục dữ liệu nguồn;
  bản nháp được giữ. Reload game sau khi lưu. **Hoàn tác** áp dụng cho bản nháp;
  **Tải lại** đọc cấu hình mới từ ổ đĩa và hỏi trước khi bỏ bản nháp chưa lưu.

### Một nơi cấu hình đường dẫn

Toàn bộ vị trí dữ liệu sound của tool được khai báo tại
[`paths.json`](paths.json), dùng chung cho TypeScript và Rust:

```json
{
  "publicRoot": "public",
  "soundDirectory": "public/snd/skill",
  "soundConfig": "src/client/combat/audio/config.json",
  "factionPortraitDirectory": "public/img/portraits",
  "elementIconDirectory": "public/img/elements",
  "maxSoundBytes": 20971520
}
```

Các đường dẫn tính từ **root workspace**, không phải từ thư mục map-tool.
`soundDirectory` phải nằm trong `publicRoot`. `sounds[ID].src` vẫn là đường dẫn
so với `publicRoot`, do đó file mới có dạng `snd/skill/ten-sound.wav`.
`maxSoundBytes` là giới hạn mỗi file import/đọc (mặc định 20 MiB).

Khi đổi vị trí thư viện/config, sửa **một file `paths.json`**, rồi build lại app
hoặc khởi động lại `pnpm tauri dev` để cả frontend và native nhận cấu hình mới.
Tool không di chuyển file tự động: thư mục và config cần có ở vị trí đã khai báo.
Việc chuyển vị trí source config của game còn cần cập nhật import phía game;
`paths.json` chỉ quản lý đường dẫn mà editor sử dụng.

Avatar phái lấy từ `factionPortraitDirectory` (10 file `<faction>.webp`), biểu
tượng ngũ hành lấy từ `elementIconDirectory` (`kim.svg`, `moc.svg`, `thuy.svg`,
`hoa.svg`, `tho.svg`). Hai đường dẫn này cũng tính từ root workspace.
Preview chỉ đọc sound/icon được liệt kê trong config và ảnh trong catalog bộ lọc. Native chỉ ghi vào file
config và thư mục âm thanh đã cấu hình; từ chối đường dẫn thoát workspace hoặc
symbolic link. Revision âm thanh độc lập với map, theo dõi config và nội dung
file sound để không ghi đè thay đổi bên ngoài tool.

Kiểm tra riêng tính năng:

```sh
node --test test/sound-tool.test.js test/map-tool.test.js test/map-tool-import.test.js test/map-tool-window.test.js
cargo test --manifest-path tools/map-tool/src-tauri/Cargo.toml
pnpm --dir tools/map-tool build
```

## Bảng âm thanh nhiều kỹ năng

Sound Tool hiển thị các kỹ năng thành bảng: mỗi hàng có icon, tên/cấp/ID,
âm thanh **Xuất chiêu**, **Phóng đạn/kình khí**, **Va chạm** và nút nghe cả chiêu.
Chọn **avatar môn phái** là thấy toàn bộ chiêu của phái; có thể kết hợp tìm kiếm,
chọn biểu tượng **Ngũ hành** và bộ lọc **Cấp chiêu** (chọn nhiều cấp cùng lúc,
không chọn cấp nào nghĩa là tất cả). ID của mỗi chiêu được tô nổi bật trong bảng.
Nếu đổi ngũ hành không khớp phái đang chọn, bộ lọc phái trở
về “Tất cả môn phái” trong ngũ hành đó.
Chọn avatar phái không khớp ngũ hành hiện tại sẽ bỏ lọc ngũ hành để luôn thấy
đúng phái vừa chọn. Các bộ lọc được đặt cùng một hàng; cửa sổ hẹp có thể cuộn ngang.

**Giới tính nghe** chọn Nam, Nữ hoặc Nam và nữ: điều chỉnh các trường theo
giới tính đang hiển thị và phiên bản âm thanh được nghe thử. **Hệ Thủy chỉ dùng
âm nữ**: chọn Thủy/Nga My/Thúy Yên sẽ khóa giới tính ở Nữ; trong danh sách hỗn
hợp, từng skill Thủy vẫn chỉ hiện/nghe bản nữ. Quy tắc dùng chung với runtime
game tại `src/client/combat/audio/rules.ts`.
Bấm **Thư viện** trên thanh đầu để mở/đóng danh sách sound và thông tin file.

Nút **Tắt âm** lưu `skills[ID].disabled = true`: hàng bị làm mờ, các ô sound/nút
nghe bị khóa, Play all và game đều bỏ qua toàn bộ giai đoạn của skill (kể cả
tiếng hô mặc định). Mapping được giữ để **Bật lại**; skill kế thừa nhận trạng
thái của cha nếu chưa ghi đè `disabled`. Mộng Điệp #89 và Vô Hình Độc #69 được
tắt sẵn. Bấm **Lưu âm thanh** để ghi thay đổi bật/tắt trong tool vào config.

- Click một select âm thanh rồi dùng **↑/↓** để đổi lựa chọn và nghe ngay,
  không cần Enter. Có thể tìm theo tên/ID trong danh sách mở; Escape đóng danh sách.
  Lựa chọn mới được ghi vào bản nháp, chỉ **Lưu âm thanh** mới ghi xuống file.
- Nút Play cạnh mỗi select nghe sound của trường đó. Nút **Nghe cả chiêu**
  phát lần lượt các sound của hàng theo thứ tự xuất chiêu → phóng đạn → va chạm.
- **Play all** phát các hàng đang hiển thị theo thứ tự bảng. Chế độ Nam và nữ
  nghe toàn bộ bản nam rồi bản nữ trong mỗi hàng. Các tiếng hô dự phòng và
  hiệu ứng theo giới tính được phân giải từ config giống game; mục `review`
  chưa xác minh không được đưa vào hàng đợi.
- **Dừng nghe**, đổi bộ lọc, chọn sound mới, hoàn tác hoặc chuyển Map sẽ hủy
  hàng đợi cũ. Các file được nghe tuần tự, không chồng nhiều bản phát. File lỗi
  được báo ở thanh trạng thái và hàng đợi tiếp tục với file sau.
