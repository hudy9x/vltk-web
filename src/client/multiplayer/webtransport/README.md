# Multiplayer trong game — WebTransport + Rust, protocol v8

Chạy `pnpm dev:online` để bật Node + Rust. `pnpm dev` vẫn chỉ bật Node.
**Restart cả hai server và tải lại client sau khi nâng v7 → v8.**
Demo tham khảo tại `src/{client,server}/multiplayer-demo/` giữ nguyên; commit `6d6a72f`.

## Phạm vi hiện có

| Dữ liệu / hành vi | Trạng thái | Nguồn quyết định |
| --- | --- | --- |
| Người thật, ngoại hình, màu tên theo phái, FX phụ trợ | Có | Appearance client; phòng và identity account do Rust |
| Di chuyển, đường đi, va chạm địa hình | Có | Rust; client dự đoán và nội suy hình ảnh |
| Spawn quái dùng chung ID, HP, truy đuổi, về vị trí, hồi sinh | Có | Rust, mặc định 24 quái/map, hồi sinh sau 20 giây |
| Chọn mục tiêu, đánh thường, chọn chiêu từ hotbar | Có, cơ chế combat cơ bản | Rust kiểm tra MP, hồi chiêu, khoảng cách, tầm nhìn |
| Thời điểm phát đòn, đạn bay, sát thương và chí mạng | Có, công thức cơ bản | Rust duyệt CAST; client báo va chạm sau frame FX; Rust xác minh rồi cập nhật HP |
| Animation skill, số tia, hướng và FX va chạm | Pipeline gốc của client | CAST mang cấp chiêu và tọa độ lúc phát; kết quả combat vẫn do Rust |
| Chiêu xuyên dạng đường thẳng có độ rộng | Có | Rust quét từng đoạn bay, trúng từng thân quái; giữ hướng lúc tung đòn |
| Băng làm chậm, độc theo tick, choáng trên quái | Có | Rust; các client cùng nhận thời gian còn lại |
| Luyện công tự động | Có | Nút **Auto** / phím **F**; Rust dùng chiêu chính đã chọn, tìm quái và nhặt tiền thuộc nhân vật |
| HP/MP người thật, quái đánh người, chết/hồi sinh | Có | Giữ trạng thái chết; nút “Về thành” hồi sinh tại Biện Kinh, hiển thị người/quái đã hạ gục |
| Vị trí khi reload/reconnect | Có | Checkpoint tọa độ server theo account + slot; khôi phục bản đồ và tọa độ, không gửi lệnh vào lại cổng map khi kết nối |
| Ngân lượng rơi khi nhân vật chết | Có | SQLite trừ 20%, tối đa 1.000.000 lượng/lần; tối đa 8 đống công khai, ai cũng nhặt được |
| XP, lên cấp và ngân lượng | Có | Rust ghi grant → Node commit SQLite, retry cùng ID |
| Tiền rơi, quyền nhặt và reconnect | Có | Quyền theo account + slot; mất sau 120 giây, tối đa 64 đống/map |
| Trang bị rơi, affix, vật phẩm và giao dịch | Chưa | Cần port generator và inventory commands |
| Thuốc HP/MP và thuốc hồi cả hai | Có | Rust kiểm tra tồn kho/cấp/cooldown 0,3 giây; hồi tức thì, journal trước khi áp dụng |
| Hút HP/MP của vũ khí và skill | Có | Tính trên sát thương đòn trực tiếp sau kháng; đạn xuyên tính từng va chạm, không hút thêm từ tick độc |
| Buff có lợi tự động/thủ công, bật/tắt aura | Có, áp lên bản thân | Rust kiểm tra cost/cooldown/thời hạn; cập nhật chỉ số và gửi trạng thái cho mọi client |
| Curse, chia sẻ aura/buff cho đồng đội | Chưa | Không suy ra tác dụng cho party từ FX đang hiển thị |
| Chuỗi chiêu, nhiều nhịp sát thương, hình học/trigger riêng từng skill | Chưa tương đương bản offline | Cần port và kiểm chứng từng họ chiêu |
| Cộng/rút tiềm năng, học/nâng/rút chiêu, gợi ý và tẩy tủy | Có | Intent → kiểm tra công thức gốc → transaction SQLite → revision Rust/client |
| Gia nhập/đổi môn phái | Có | Server kiểm tra cấp/hệ/giới tính/vật phẩm đổi phái, tạo đồ nhập môn |
| GM cấp/EXP/điểm/chiêu | Có trong development | API kiểm tra môi trường phía server; không nhận profile tải lên |
| Thay trang bị trong phiên online | Chưa | Chưa có inventory/equipment commands đầy đủ |
| Đồ Sát và tổ đội | Có | Luật màu tên/đội ở Rust, không chia thưởng/buff đội tự động |
| Dungeon, tower, Tống Kim và chia thưởng | Chưa | Không nằm trong bản PvE thế giới chung này |

Đây là **bản PvE nền tảng để thử nghiệm**, chưa phải bản chuyển toàn bộ gameplay
ngoại tuyến lên server. Stats đầu vào dùng công thức game hiện tại, nhưng công thức
hit, phòng thủ, AI và chiêu đặc thù của combat Rust chưa đạt đầy đủ parity.
Tuning XP/ngân lượng thử nghiệm nằm trong `src/shared/multiplayer/rules.json`,
không mặc định bằng phần thưởng của game offline.

## Tổ chức dữ liệu để bảo trì

Va chạm đòn đánh online theo thứ tự `CAST → client va chạm/hiện FX → CONTACT → Rust xác minh → HP/HIT`.
Command `16` gửi target, skill và ID sự kiện CAST (16 bit thấp trong `x`, 16 bit cao trong `y`, giữ nguyên packet 25 byte).
Client người xuất chiêu báo CONTACT; với PvP, client người trúng đòn cũng phải xác nhận đã hiện va chạm. Người xem không được xác nhận thay họ; server không nhận lượng sát thương từ client.
Rust cần cả va chạm mô phỏng và CONTACT hợp lệ, xử lý một lần cho mỗi CAST/mục tiêu.
Không có CONTACT thì không gây sát thương đòn đó; báo cáo hết hạn sau 100 tick và bị hủy phía client khi đổi map/reset.
Sau cập nhật này phải restart Rust và tải lại client cùng phiên bản.

Checkpoint online nằm cạnh reward journal: `database/multiplayer-outbox.state.json` (hoặc đường dẫn tương ứng với `PVE_OUTBOX_FILE`). Lưu mỗi giây và ngay khi ngắt kết nối, chết, hồi thành, tạo/nhặt ngân lượng. File này giữ cả trạng thái chết và các đống tiền qua restart; không xóa file khi triển khai.

Mất ngân lượng dùng death grant có ID riêng: Node trừ tiền và lưu biên nhận trong cùng transaction SQLite, rồi `/deaths/ack` mới tạo đống ngân lượng. Retry không trừ lại; nhặt dùng ID ổn định của từng đống, cộng ngân lượng, không thay đổi KNB. Các đống hết hạn theo `lootSeconds` hiện có (120 giây).

```text
src/shared/multiplayer/
  rules.json                tick, giới hạn, spawn/respawn, loot, tuning thưởng
src/server/multiplayer/
  definitions/
    runtime.cjs             adapter chạy source game tin cậy trong VM
    catalog.cjs             đổi catalog/stats hiện có thành DTO
    projectiles.cjs         nhận diện chiêu xuyên, range/width/speed từ metadata native
  domain/
    definitions.rs          DTO chỉ số và dữ liệu tĩnh
    mod.rs                  actor/monster/loot runtime state, commands, tick
    navigation.rs           grid, clearance, A*; cùng map content với client
    movement.rs             di chuyển và chọn mục tiêu luyện công
    attacks.rs, combat.rs   phát đòn, kiểm tra hit, damage/status
    projectiles.rs          quét dải đạn thẳng, thứ tự va chạm, hit một lần/thân
    monsters.rs             AI, đánh người, hồi sinh
    loot.rs                 quyền nhặt và phát thưởng
    tests.rs                test logic, không cần QUIC/browser
  persistence/
    outbox.rs               journal thưởng ghi đĩa trước khi hoàn tất hành động
    characters.ts           profile online + ledger idempotent trong SQLite
  webtransport/
    session.ts              cookie → slot/profile → admission + vé HMAC
    src/control.rs          HTTP nội bộ có secret: catalog/admit/refresh/rewards
    src/pve_protocol.rs     encode snapshot/decode command binary
    src/world.rs            liên kết phiên/presence với domain
src/client/multiplayer/
  state/
    protocol.ts             DTO binary runtime, ID thay vì asset URL
    local-motion.ts         giữ đích click, replay theo ACK/tick/tốc độ server
    skill-visuals.js         replay skill gốc trong world chỉ có proxy/FX
    legacy-pve.js           replica, nối motion/FX và chuyển input
  webtransport/
    protocol.ts             wire presence/appearance
    transport.ts            QUIC; hàng đợi stream có giới hạn
    index.ts                phiên, reconnect, map, profile revision
    interpolation.ts        nội suy người thật, bỏ snapshot trùng/cũ
    legacy-bridge.js        ngoại hình, renderer người thật, nút trạng thái
```

Definitions là dữ liệu tĩnh. State là các entity có ID và trạng thái đang chạy.
Commands chỉ mang ý định (`MOVE`, `TARGET`, `CAST`, `AUTO`, `PICKUP`), không chứa
HP, damage, XP hoặc gold do client đề xuất. Events chỉ phục vụ hiển thị;
**nhận lại một event không phát thêm phần thưởng**.
Domain không phụ thuộc WebTransport. Wire codec nằm trong adapter transport.

```text
Chuột / hotbar
    → binary command → Rust domain tick 20 Hz
    → snapshot + cosmetic events → client dựng hình
    → grant ID cố định → journal fsync → Node SQLite transaction
                                     ← ACK / retry cùng ID
```

Adapter VM chỉ chạy source có sẵn trong repo; profile là dữ liệu JSON, không chạy
nội dung save như code. Đây là cầu nối để tái sử dụng công thức, chưa phải module
server độc lập hoàn toàn khỏi legacy client.

## Chiêu xuyên mục tiêu

`Skill.projectile` là DTO tĩnh do Node dựng từ skill native: `range`, `width` (bề rộng toàn dải),
`speed`, `ignoreTerrain`. Cờ xuyên và điều kiện cấp chiêu lấy từ cấu hình impact gốc;
Vân Long Kích (361), Nhân Kiếm Hợp Nhất (368), Giang Hải Nộ Lan (1075) giữ dải hẹp
24 đơn vị × QA như `combat/casting.ts`; các tia xuyên thường dùng bề rộng 16 pixel.
Đơn vị va chạm là X và Y × 2, cùng hệ với renderer; cộng hitbox thân quái 17 khi xét giao nhau.

Rust giữ origin/hướng tại thời điểm tung đòn, rồi quét **toàn bộ đoạn di chuyển mỗi tick**.
Quái ở trước trúng trước; mỗi thân quái chỉ nhận một hit của lượt bay này, không bị giới hạn
bởi `targets` của đòn đơn. Quái nằm ngoài bề rộng hoặc ngoài tầm không trúng. Đạn không
đổi hướng khi mục tiêu di chuyển/chết, dừng ở vật cản trừ skill có cờ bỏ qua địa hình.
HIT vẫn dùng binary event cũ, damage/status/thưởng dùng cùng pipeline với đòn trực tiếp.
Phần này chưa port toàn bộ fan/ring, splash phụ và nhịp hit đặc thù của mọi chiêu.

## Binary v8

Số nhiều byte đều little endian; tọa độ/HP/status là float32, ID/seq là u32.
QUIC không dùng JSON. HTTP bootstrap/control và đồng bộ profile thưa dùng JSON.
Profile trả HTTP 204 khi revision không đổi; sau bootstrap chỉ trả trường tiến triển
khi thay đổi, không tải lại toàn bộ inventory mỗi lần polling.

| Opcode | Kênh | Kích thước / tần số |
| --- | --- | --- |
| HELLO (1) | Client uni stream | 18 + 2 × effects + tên UTF-8 + vé 69 byte |
| POSITION (2) | Client datagram, 20 Hz | 28 byte; vị trí client chỉ là hint, Rust thay bằng vị trí domain |
| APPEARANCE (3) | Client uni stream khi đổi | 18 + 2 × effects + tên byte |
| SNAPSHOT (4) | Server datagram, 20 Hz | 16 + 26 × người; 32 người = 848 byte |
| ROSTER (5) | Server uni stream khi đổi | Identity/appearance; tối đa 32 người/map |
| COMMAND (16) | Client uni stream có thứ tự | 25 byte, giới hạn tốc độ; MOVE được gộp tối đa 10 Hz |
| WORLD (17) | Server uni stream, 10 Hz | Header 43 + actors × 55 + monsters × 48 + loot × 17 + events (23 byte; HIT 24 byte; CAST 47 byte) + count u16 + support × 15 + party trailer |

COMMAND: version/opcode u8, seq u32, kind u8, map u32, target u32,
skill u16, x/y f32. Kind: JOIN=1, MOVE=2, TARGET=3, CAST=4, AUTO=5, PICKUP=6, POTION=7, SUPPORT=8, SUPPORT_AUTO=9, SLAUGHTER=10, PLAYER_TARGET=11.
CAST với target=0 chọn chiêu đã học, giữ nguyên đích di chuyển/mục tiêu/Auto.
Client gửi lựa chọn ngay cả khi chưa có mục tiêu; hotbar và nút chiêu chính hiển thị
chiêu đang khóa. Bấm chiêu trong Manual ngoài thành tìm quái sống gần nhất để đánh.
Chiêu sai trang bị giữ dấu chọn và báo không dùng được, không âm thầm đánh bằng chiêu khác.
JOIN chỉ tới map có catalog và còn chỗ; Rust đặt lại entry. Cấp map là cấp quái,
không phải điều kiện cấp nhân vật để vào map. Khi chưa nhận snapshot của map mới
sau 5 giây, client báo lỗi và thử kết nối lại thay vì chờ vô hạn.
POSITION không thể tự đổi map hoặc dịch chuyển actor trên server.

WORLD header: version/opcode u8, tick/map/self/ackCommand u32,
actorCount/monsterCount/lootCount/eventCount u16; commandTick u32, speed/goalX/goalY f32, motion u8 (0=không có đích, 1=đang đi, 2=đã tới).
Actor: id u32, x/y/hp/mp/maxHp/maxMp/cold/stun f32, farming u8.
Monster: id/definition u32, x/y/hp/maxHp/cold/stun/poison f32,
level u16, direction/moving u8, life u32, coldPower f32. `life` tăng khi hồi sinh;
client đặt ngay vị trí khi đổi vòng đời, không nội suy từ xác cũ. Loot: id u32, x/y f32, gold u32, mine u8.
Event: id/source/target u32, skill u16, kind u8, value f32, tick u32.
CAST thêm level u16, missiles/flags u8, range/originX/originY/targetX/targetY f32.
Flags: bit 0 melee, bit 1 physical. Client dựng animation bằng pipeline skill gốc;
contact ở client chỉ phát FX, không thay đổi HP/MP/thưởng. Server quyết định kết quả.
Di chuyển giữ đích tới khi có lệnh mới và replay phần thời gian còn thiếu từ commandTick
bằng tốc độ server, tránh kéo nhân vật về snapshot cũ khi gần tới đích.
HIT thêm một byte: bits 0–2 = phys/poison/cold/fire/light (0–4), bit 3 = bạo kích,
bit 4 = phản ứng hurt, bit 5 = tick độc (không phát hurt/nháy trúng đòn).
Events CAST=1, HIT=2, DEATH=3, PICKUP=4; client bỏ event ID đã xử lý.
Vòng đệm sự kiện ngắn có giới hạn, không dùng làm lịch sử chiến đấu bền vững.

Snapshot đủ state được gửi tin cậy để đơn giản hóa phục hồi. Đây chưa phải delta
compression/AOI. Decoder giới hạn 32 actor, 64 mob, 64 loot, 128 event và 16384 byte.
Default 24 mob, 32 actor, 64 loot, 128 event CAST = tối đa 9291 byte/WORLD, chưa tính
QUIC/IP. Tần số và tải thực tế cần đo trên VPS, không suy ra sức chứa từ kích thước gói.

Timestamp vị trí là clock đơn điệu của người gửi; nội suy 150 ms, xử lý wraparound,
snapshot trùng và teleport. `effectTime` giữ phase FX. Appearance mang faction index,
sex/bodySex/ride, helm/armor/weapon/horse, rebirth, tối đa 12 effect ID và tên UTF-8.
Các ID effect tra catalog `U1`; màu tên lấy `Tb`, vẽ cùng `F3` của game.

## Lưu dữ liệu và giới hạn phiên thử nghiệm

Node có bảng `multiplayer_characters` theo account + slot và `multiplayer_rewards`
với grant ID duy nhất. Lần đầu online sao chép nhân vật đã lưu; các lần sau lấy profile
online này, không nhận HP/damage/XP/gold từ lệnh game hay ghi đè bằng localStorage.
Việc nhập save cũ chưa xác minh lịch sử của trang bị/chỉ số; chưa đủ để coi là nền
kinh tế production chống gian lận hoàn chỉnh. Các thay đổi tiến triển đã đi qua API intent
hợp lệ; giao dịch/trang bị tổng quát vẫn chưa được port đầy đủ. Dùng tài khoản test hoặc
database riêng cho giai đoạn này.

Journal mặc định `database/multiplayer-outbox.jsonl`. `pnpm dev:online` đặt journal
cạnh `DB_PATH` qua `PVE_OUTBOX_FILE` để các database thử nghiệm không trộn thưởng.
Node đọc grant, commit profile/ledger trong một transaction rồi ACK Rust. Giữ nguyên
journal khi restart; retry sau commit nhưng trước ACK không nhân đôi phần thưởng.
World, mob sống và đồ đang nằm đất chỉ ở RAM; restart Rust tạo lại world, không khôi
phục đống tiền chưa nhặt. Grant đã ghi bền vững vẫn tiếp tục được chuyển vào SQLite.
Khi reset dữ liệu test, dừng cả hai tiến trình và dùng một DB/journal mới cùng nhau.

Một account chỉ có một kết nối; tối đa 32 người/map, 128 phiên/server.
Client không chạy nhánh sát thương, spawn hay thưởng offline khi online bị mất mạng.
Chỉ chuột trái điều khiển di chuyển; WASD/mũi tên/touch/gamepad không ra lệnh di chuyển.
`?multiplayer=off` chọn lại đường game ngoại tuyến cho lần mở trang đó.

## Chạy và kiểm tra

```sh
pnpm dev:online
# http://localhost:3000; Ctrl+C dừng cả hai và tiến trình con

# Database thử nghiệm riêng:
DB_PATH=database/online-test.sqlite PORT=3001 pnpm dev:online
```

Cần Rust toolchain, Node 24+, Chromium hỗ trợ WebTransport và HTTPS/localhost.
`dev:online` chờ Rust build xong rồi bật Node watch. Sửa Rust cần restart lệnh.
Có thể dùng hai terminal với cùng secret dài ít nhất 32 ký tự:

```sh
MULTIPLAYER_SECRET=local-development-only-0123456789 \
  cargo run --manifest-path src/server/multiplayer/webtransport/Cargo.toml

MULTIPLAYER_SECRET=local-development-only-0123456789 \
MULTIPLAYER_WT_CONTROL_URL=http://127.0.0.1:3104 pnpm dev
```

HTTP Rust mặc định 3104, QUIC UDP 4434. Các biến: `WT_BIND`, `WT_HTTP_BIND`,
`WT_PUBLIC_URL`, `WT_CERT_HOST`, `WT_ORIGINS`, `MULTIPLAYER_SECRET`, `PVE_OUTBOX_FILE`.
Vé HMAC v1 độc lập với wire v8: expires u32 + accountUUID 16 byte + nonce 16 byte,
HMAC-SHA256; toàn vé 69 byte gồm version. Hạn 30 giây, chỉ dùng một lần, ràng buộc
admission account/slot. Control catalog/admit/refresh/rewards yêu cầu secret nội bộ.
Cert P-256 tự ký 14 ngày, pin SHA-256 do Node cung cấp; cần restart Rust trước khi hết hạn.
Xem `deploy/multiplayer/README.md`; chưa triển khai bản PvE này lên VPS.

```sh
npm run build
node --test test/multiplayer-pve.test.js test/multiplayer-webtransport.test.js \
  test/multiplayer-interpolation.test.js test/manual-target.test.js test/accounts.test.js
cargo test --manifest-path src/server/multiplayer/webtransport/Cargo.toml
cargo clippy --manifest-path src/server/multiplayer/webtransport/Cargo.toml --all-targets -- -D warnings
cargo build --manifest-path src/server/multiplayer/webtransport/Cargo.toml
node --test src/server/multiplayer/webtransport/browser.test.cjs
```

Bài browser dùng hai account/context độc lập, SQLite/journal/port tạm và tự dọn tiến
trình: di chuyển chuột, màu tên/FX, phòng map, shared mob IDs/HP/death, loot ownership,
reconnect rồi nhặt và xác nhận XP/ngân lượng đã commit. Có thể đặt `PLAYWRIGHT_MODULE`
trỏ tới Playwright đã cài. Ảnh: `output/multiplayer/game-webtransport.png`.

## Trạng thái combat online

Quy tắc ở `src/server/multiplayer/domain/status.rs`; adapter chỉ số/skill ở
`src/server/multiplayer/definitions/catalog.cjs`; client chỉ trình bày qua
`src/client/multiplayer/state/legacy-pve.js`.

| Trạng thái | Server xử lý | Client hiển thị |
| --- | --- | --- |
| Băng | Chỉ áp khi có băng sát; mặc định 1,5 giây + coldEnh/18. Mức chậm = 75% × băng sát sau kháng/(băng sát sau kháng + 200), ảnh hưởng đi và nhịp đánh; đòn yếu hơn không kéo dài băng mạnh | slowT/slowPower, màu trạng thái và animation gốc |
| Choáng | Tỉ lệ skill + stunAdd; thời gian 0,8 × (1 + stunLong/100), giữ thời gian còn lại dài hơn; chặn đi và đánh | Đứng yên và icon choáng gốc |
| Độc | Ngân sách sát thương sau kháng, chỉ trừ theo thời gian; cộng phần độc còn lại khi trúng thêm, không gây thêm lần sát thương tức thì | Màu độc, số sát thương độc gộp mỗi 0,5 giây; không gây hurt |
| Vật lý | Theo kháng vật lý; không chia thêm cho giáp. Bạo kích ×2 chỉ nhân phần vật lý. Đòn không có băng đạt 15% HP tối đa gây hurt 0,5 giây | Đúng loại số sát thương/bạo kích và phản ứng trúng đòn |

Hồi sinh xóa đường đi, trạng thái và cooldown cũ; tăng `life` để client bỏ vị trí
của vòng đời trước, kể cả khi không nhận được snapshot chết.
Đây vẫn là tập quy tắc PvE đã port, chưa cam kết toàn bộ công thức offline
(né/tránh, hóa giải của boss, lời nguyền động và các hiệu ứng phụ riêng từng chiêu).

## Đồng nhất lực tay và sát thương

Adapter native nạp các bảng dữ liệu theo `modules.json`: phần chuẩn hóa
`SK_STD` phải chạy trước `skill-150-details`, nếu không sẽ xóa cộng hưởng
`addskilldamage150_*`. Danh hiệu, bộ sưu tập và chỉ số chuyển sinh được dựng
bằng hàm gốc trên bản sao profile canonical, không dùng số lực tay gửi từ client.

Rust giải quyết sát thương của đòn đã trúng theo `ja`/`hs`: dao động từng hệ
85–115%, xuyên kháng và trần kháng, khắc hệ, bạo kích vật lý ×2, chí mạng ×1,5
và các hệ số tăng sát thương theo hệ. Chỉ số phòng thủ không được dùng để
chia sát thương thêm lần nữa; nhánh xác suất trúng/né chưa port đầy đủ.
HIT hiển thị toàn bộ sát thương của đòn đã tính, kể cả phần vượt HP quái, như game gốc.
HP còn lại được chặn riêng ở 0; độc vẫn hiển thị lượng HP thực sự bị trừ mỗi tick.

`test/fixtures/multiplayer-damage.json` được dùng chung cho test Rust và đối chiếu
với hàm `ja` native trong Node; browser test so từng thành phần sát thương của
chiêu đã học với adapter server. Không áp dụng sửa này bằng cách ghi đè profile
online từ local save hoặc nhân sát thương bằng một hệ số bù.

Animation online chỉ chờ sprite chính. Sprite của các sự kiện phụ được prefetch
nhưng không chặn chiêu chính nếu tải chậm; riêng form 12 dùng child làm đạn
chính thì vẫn chờ sprite child đó. Test có tình huống ảnh phụ chờ chưa xong,
đánh sát người, nhiều lượt Auto và số HIT vượt HP quái trên cả hai client.

## Log chẩn đoán skill

`pnpm dev:online` bật log Rust (`ONLINE_DEBUG=1`) và log client trong môi trường dev.
Terminal lọc `[online:server]`, DevTools Console lọc `[online:client]`. Hai bên phải
cùng revision `skill-trace-20261028-1`; restart Rust và reload trang để nạp mã mới.

Theo cùng `event` để lần chuỗi: `cast-generated` → `world-sent` → `cast-received`
→ `visual-release` → `canvas-draw`. Log có skill, map, sprite và trạng thái ảnh;
`asset-error`, `asset-stalled`, `render-error`, `visual-missing` giúp xác định chỗ dừng.
`render-no-draw` có thể chỉ là frame chờ; `visual-contact-only` là đối tượng va chạm
không có sprite, không tự nó chứng minh mất animation.

Trong Console: `onlineDebug.report()` lấy tối đa 500 bản ghi gần nhất;
`await onlineDebug.inspectCache()` xem cache và Service Worker. Ngoài dev có thể bật
bằng `?onlineDebug=1`; tắt bằng `onlineDebug.setEnabled(false)`. Rust tắt bằng
`ONLINE_DEBUG=0 pnpm dev:online`. Không ghi ticket, save hoặc thông tin đăng nhập.

JS được phục vụ với `no-store`; Service Worker chỉ cache media ở production và
bỏ qua fetch trong dev. Ảnh còn có cache trong RAM của tab cho tới khi reload.
Chẩn đoán chỉ kiểm kê cache, không xóa dữ liệu hay cache của người chơi.

Browser test lưu log JSON tại `output/multiplayer/trace-{cuiyan,kunlun}.json`.
Đặt `ONLINE_TEST_SW=1` để thử cả đường Service Worker.

API mở phiên phải dùng `parseJsonBody(request.body)`: parser Fastify của dự án
trả JSON dạng chuỗi. Đọc trực tiếp `.slot` sẽ luôn rơi về ô 0, khiến nhân vật
ô 2/3 dùng nhầm hồ sơ, mất skill và sai sát thương. Test
`test/multiplayer-slot.test.js` kiểm tra ô 3 có skill 339 và từ chối slot sai kiểu.
Sau khi sửa, reload để cấp phiên mới đúng ô; không cần reset hồ sơ nhân vật.

## Hút tài nguyên và thuốc online

`domain/recovery.rs` xử lý hút HP/MP và thuốc; `definitions/consumables.cjs`
chuyển catalog/stock canonical sang DTO; `persistence/consumables.ts` áp debit
idempotent vào SQLite. Client `state/consumables.js` chỉ chọn thuốc và gửi lệnh
binary kind 7 (skill = ID thuốc: life=tier, mana=100+tier, both=200+tier).
Event kind 5 trả số lượng còn lại; HP/MP lấy từ snapshot như trước.

Hút từ trang bị áp dụng cho đánh thường/chiêu dùng vũ khí (`basic || wpn`),
cộng phần hút riêng của skill, theo quy tắc native. Hồi tài nguyên không vượt
HP/MP tối đa; DOT độc không phát sinh thêm hút.

Thuốc dùng số lượng đã lưu trong hồ sơ online, cấp tối thiểu và lượng hồi từ
catalog game. Nút HP/MP và tự bơm theo ngưỡng đều dùng cùng lệnh; thuốc hồi cả
hai khóa cả hai cooldown. Không trừ thuốc khi đầy, chết, sai map, hết thuốc
hoặc đang cooldown. Khi túi hết thuốc, phím 1/2 gửi intent `potionBuy` để Node
kiểm tra cấp, giá và ngân lượng, commit một bình rồi cập nhật stock tới Rust trước
lệnh dùng. Tự mua tuân theo tùy chọn và giới hạn 20% ngân lượng; không dùng giá,
ngân lượng hoặc stock gửi từ localStorage làm nguồn tin cậy.

Debit ghi journal trước hồi phục; `onlinePotionSpent[kind][tier]` là bộ đếm
tích lũy để xử lý retry, delivery đảo thứ tự và reconnect trước ACK mà không
trừ hai lần. Khi nâng cấp cần restart Node/Rust và reload client để nạp DTO
thuốc và hỗ trợ command/event mới. Protocol v6 bổ sung phần trạng thái hỗ trợ ở cuối WORLD.

## Buff có lợi và aura của nhân vật

`domain/support.rs` quản lý tự buff, hồi máu hỗ trợ, cooldown, hết hạn, xóa buff
khi chết, bật/tắt aura và bảo vệ khi nhận đòn. Tự buff chạy ngoài thành khi đứng
yên, không choáng/chết; giữ ngưỡng dự trữ HP/MP của A6 native. Tắt tự buff không
xóa buff còn thời gian. SUPPORT=8 thi triển thủ công/toggle aura, SUPPORT_AUTO=9
đặt enabled cho từng buff đã học (target 0/1); hai lệnh không hủy đường đi/Auto.

Node dùng `runtime.cjs` và `catalog.cjs` dựng mọi tổ hợp buff/aura hợp lệ bằng
`j0()` native, gồm cả damage/cooldown của chiêu tấn công. Rust chọn tổ hợp theo
trạng thái, không cộng dồn bonus hoặc tự viết lại công thức từng phái. Cache 32
cấu hình combat tránh dựng lại tổ hợp mỗi lần ghi XP/nhặt tiền; lượng thuốc được
gắn lại theo stock hiện tại, không lấy stock cũ trong cache. `base_profile` giữ
catalog; `profile` là chỉ số hiệu lực, potions luôn giữ trạng thái đã tiêu hao.

Khi đổi max HP/MP do buff/aura, giữ tỷ lệ tài nguyên như D0 native. Khiên mana
đỡ min(MP hiện có, damage × manaShield/100); phản sát thương dùng damage sau
khiên, không phản dây chuyền. Quái hiện đánh cận chiến. Phản đòn hạ quái vẫn
qua cùng luồng chết/thưởng/loot để không nhân đôi phần thưởng.

WORLD v6 thêm count u16 ở cuối, mỗi support gồm actor u32, skill u16, remaining
f32, cooldown f32, flags u8 (bit 0 active, bit 1 aura). Client `state/support.js`
đưa trạng thái này vào native stats/FX và countdown; remote buff/aura lấy từ
snapshot Rust thay vì tin danh sách FX do người chơi kia khai báo.

Đã có fixture native cho Thúy Yên đơn đao/song đao, Võ Đang, Côn Lôn, Cái Bang,
Thiếu Lâm, Nga Mi, Thiên Vương và Thiên Nhẫn. Tái sinh fixture bằng
`node tools/generate-online-support-fixture.cjs` khi đổi công thức game. Aura gây
độc Vô Hình Độc, curse và lan buff/aura sang đồng đội chưa nằm trong phần hỗ trợ
có lợi lên bản thân này. Trạng thái buff theo phiên, không lưu qua restart.

## Đồ sát — PvP người thật

Chọn Đồ Sát trong menu Chế Độ; giữ màu tên hiện có. Quyền đánh do Rust lấy từ
nhóm màu canonical `Kh/Tb` (Chính phái, Trung lập, Tà phái, Tân thủ), không lấy
faction/FX do appearance client khai báo và không dùng ngũ hành làm nhóm bạn/địch.
Ngoài thành, khác màu và ít nhất một người bật Đồ sát thì có thể đánh/phản công;
cùng màu, khác map, người chết hoặc trong thành đều không trúng đòn. Auto của
người bật Đồ sát tìm người chơi địch; click chuột chọn trực tiếp để đánh thủ công.

`domain/pvp.rs` quản lý quyền đánh, sát thương, băng/choáng/độc/hurt, phản đòn và
chết/hồi sinh. `attacks.rs` và `projectiles.rs` dùng chung va chạm cho người/quái;
kiểm tra quyền ở mỗi tiếp xúc để đạn xuyên/AoE không gây damage đồng màu. ID
người/quái/loot/event lấy chung bộ cấp ID, tránh nhầm entity sau nhiều lần reconnect.

`src/shared/combat-balance.json` chứa `battlefieldPvpDamage=0.2`; cả simulator
Tống Kim lẫn Rust dùng nguồn này. Nhân từng phần damage và flat ngũ hành một lần
trước kháng/khắc hệ/chí mạng; độc cũng được scale, không nhân lần hai mỗi tick.
Phòng thủ sau kháng dùng khiên, hấp thụ, hồi MP và khiên MP; phản đòn không lặp
dây chuyền. HIT hiển thị damage sau phòng thủ kể cả overkill; HP được chặn riêng
ở 0. Hạ người chơi không sinh XP/tiền/loot PvE.

Protocol v7: actor 55 byte (37 byte cũ + alignment u8 + pk bool + life u32 +
coldPower/hurt/poison f32). COMMAND kind 10 dùng target=0/1 tắt/bật Đồ sát; kind
11 chọn mục tiêu người thật, không nhận damage/HP/màu do client gửi. Client
`state/pvp.js` chỉ điều khiển UI, click và chọn mục tiêu; snapshot quyết định kết quả.
`life` tăng sau hồi sinh để bỏ nội suy của vòng đời trước.

Đây là PvP nền tảng dùng mức balance hiện tại của Tống Kim; không mặc định đã
port toàn bộ né/tránh, curse, chuỗi chiêu và hiệu ứng đặc thù của simulator.
Log debug `pvp-hit` có scale, damage sau kháng/khiên, HP/MP trước/sau và phản đòn.


## Tổ đội online — protocol v8

Nút tổ đội nằm dưới Trợ Thủ. Dialog dùng khung `war-dialog` sẵn có, cột trái chỉ liệt kê
người chơi trong camera hiện tại, cột phải cập nhật đội viên theo Rust. Mời/đồng ý/từ chối/rời
đội dùng command 12–15; đội trưởng quyết định màu tên chung. Khi bật cừu sát, HP cùng màu tên
hiển thị hồng, khác màu tên hiển thị đỏ. Luật miễn sát thương kiểm tra lại cả khi đạn chạm và
khi độc tick. Xem [module tổ đội](../party/README.md) để biết layout binary và vòng đời đội.
Client và Rust cần cập nhật cùng protocol v8.


## Tiến triển nhân vật online

- `definitions/progression.cjs`: reducer intent, dùng điều kiện/công thức gốc của game.
- `persistence/characters.ts`: command ID/hash chống replay, transaction profile + revision,
  bảng `multiplayer_profile_updates` giữ bản cập nhật chưa chuyển thành công tới Rust.
- `domain/progression.rs`: nhận revision mới, giữ tỷ lệ HP/MP và timer buff, lọc buff/chiêu
  đã bỏ, cập nhật màu tổ đội khi đổi phái; revision cũ không ghi đè revision mới.
- `state/progression.js`: tuần tự hóa thao tác, retry cùng ID, không sửa profile trước ACK.
- `bootstrap.js`: tải các profile online đã tồn tại trước khi chạy game/chọn map.
- `shared/multiplayer/progression-fields.json`: danh sách trường tiến triển dùng chung.

`POST /api/multiplayer/progression` nhận `{id,slot,action}` qua session cookie. Action gồm
`potential`, `skill`, `unlearn`, `join`, `changeFaction`, `potentialRoute`, `skillRoute`,
`autoPotential`, `autoSkill`, `equipmentPotential`, `bestPotential`, `reset`, `gm`,
`mainSkill`, `skillSlot`, `potionBuy`, `equipmentTrader`, `shopBuy`, `horseBuy`,
`equip`, `unequip`, `mount`.
Client không gửi damage/HP/profile hoặc tự cấp EXP. EXP đánh quái vẫn đi qua reward journal.
GM chỉ được server chấp nhận khi `development=true`; retry không cấp điểm hai lần.
HTTP dùng JSON cho thao tác nhân vật thưa; combat/di chuyển vẫn binary WebTransport v8.

Chiêu chính và F1–F4 là các lựa chọn riêng: `mainSkill` lưu `main/mainLock`,
`skillSlot` chỉ đổi một ô và hoán đổi ô cũ nếu cần. Đồng bộ thưởng/thuốc và reload
giữ nguyên lựa chọn canonical, tránh đổi về chiêu cũ sau lần đánh đầu.

Kiểm thử trình duyệt trong `webtransport/browser.test.cjs` có các nhánh độc lập:
`PRIMARY_SKILL_TEST=1` kiểm tra bấm chọn chiêu, đánh liên tiếp và reload;
`LIFECYCLE_TEST=1` kiểm tra cache vị trí trước kết nối, chết PvP, tiền rơi, hồi thành
và nền Biện Kinh/Tống Kim. Mỗi nhánh dùng tài khoản, SQLite và server tạm riêng;
cần build Rust và client trước khi chạy, đặt `PLAYWRIGHT_MODULE` nếu Playwright
được cài ngoài repository.

Ví dụ: client hiển thị GM cấp 150 chỉ sau khi SQLite commit và Rust nhận revision mới.
Khi reload, level/phái/điểm/chiêu được nạp trước logic chọn bãi, tránh cấp 1 ở map cấp cao.
Không tự nhập lại các chỉnh sửa legacy đã bị ghi đè trước bản sửa này.

Vị trí hiển thị được lưu tại client theo tài khoản và ô nhân vật (`__volam_position_v1:*`), mỗi 250 ms và khi rời trang. Client khôi phục bản đồ, tọa độ trước khung hình đầu tiên; session gửi vị trí này lên Rust sau đó. Rust chỉ chấp nhận vị trí hợp lệ gần checkpoint cùng map và vòng đời, không phục hồi HP hay bỏ qua trạng thái chết. Biên nhận KNB cũ giữ đúng loại tiền khi retry; các lần chết mới chỉ trừ ngân lượng.
