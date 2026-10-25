# YouTube → SFX

Tải video YouTube rồi trích âm thanh bằng ffmpeg có sẵn trên máy. CLI chạy độc lập với game, cần Python >= 3.10, ffmpeg và ffprobe trong PATH (encoder `libopus` để xuất OGG); Node.js để yt-dlp xử lý YouTube.

## Cài đặt

```sh
python3 -m venv tools/sound/.venv
tools/sound/.venv/bin/python -m pip install -r tools/sound/requirements.txt
```

Dùng yt-dlp để tải YouTube; ffmpeg xử lý media. Nếu YouTube thay đổi và tải lỗi, nâng cấp yt-dlp bằng pip với `--upgrade`. Lỗi yêu cầu đăng nhập/chặn bot cần được xử lý trước khi tải lại; công cụ không tự đọc cookie trình duyệt.

## Sử dụng từ thư mục gốc repo

```sh
tools/sound/.venv/bin/python tools/sound/sound.py 'https://youtube.com/shorts/262NZC1Gjuo' --name sample
```

Mặc định xuất cả WAV PCM 16-bit và OGG Opus (128 kbps); WAV ở 44.1 kHz, OGG ở 48 kHz, giữ số kênh của nguồn. WAV phù hợp biên tập, OGG nhẹ hơn để dùng trong game. File tải gốc và metadata nằm tại `tools/sound/output/source/`; âm thanh xuất ở `tools/sound/output/`. Thư mục output và môi trường Python được bỏ qua bởi Git. Không ghi đè SFX đã tồn tại.

Cắt đoạn từ giây 1.2 đến 2.8 thành SFX mono:

```sh
tools/sound/.venv/bin/python tools/sound/sound.py tools/sound/output/source/262NZC1Gjuo.mkv --start 1.2 --end 2.8 --name hit --mono
```

Đuôi file nguồn có thể khác tùy định dạng YouTube cung cấp; dùng đường dẫn thực tế trong output/source. Có thể truyền bất kỳ file video/audio cục bộ nào để cắt thêm mà không tải lại.

Tùy chọn: `--format wav|ogg|both`, `--output /path/to/folder`, `--start SECONDS`, `--end SECONDS`, `--mono`, `--name NAME`.

Trích âm thanh giữ nguyên hỗn hợp SFX, nhạc và giọng nói của nguồn, không tự phân tách từng loại âm thanh. Chọn đoạn theo thời gian để lấy hiệu ứng cần dùng.

## Cân âm tự động

Mọi lần xuất mới mặc định đọc `settings.json` cạnh script:

- `target_mean_dbfs: -17`: mức âm trung bình mục tiêu, gần bản Thiên Lôi đã tăng âm. Số càng gần 0 càng lớn.
- `peak_ceiling_dbfs: -3`: trần đỉnh mẫu trước mã hóa.
- `max_gain_db: 24`: không tăng quá 24 dB cho nguồn quá nhỏ.
- `silence_threshold_dbfs: -70`: giữ nguyên đoạn im lặng/gần im lặng, tránh khuếch đại nhiễu.

Công cụ đo đúng đoạn đã chọn, sau khi trộn mono nếu dùng `--mono`, rồi áp dụng gain cố định để giữ tương quan âm lớn/nhỏ trong hiệu ứng. Cả nguồn nhỏ và lớn đều được cân lại. Trần peak và giới hạn gain được ưu tiên; nếu không đạt mean mục tiêu, CLI sẽ báo rõ. Mức trung bình không đồng nghĩa độ lớn cảm nhận giữa mọi loại hiệu ứng; vẫn cần nghe thử trong game. AAC/Opus có thể tăng đỉnh sau mã hóa, vì vậy trần -3 dBFS chừa khoảng dự phòng, không phải bảo đảm true peak sau mã hóa. Không tự sửa âm lượng master trong game, không ghi đè asset đang dùng hoặc cân lại file đã xuất.

Ghi đè tạm cho một lần chạy: `--target-db -15 --peak-db -3`. Bỏ cân âm: `--no-normalize`. Muốn đổi mốc chung cho các SFX tiếp theo, sửa `settings.json`.

## Thay SFX đang dùng trong game

Sau khi cắt xong, chạy script riêng để tự cân âm theo `settings.json`, chuyển mono và ghi đè asset đã gắn cho skill:

```sh
tools/sound/.venv/bin/python tools/sound/replace_sfx.py \
  tools/sound/output/yd8jh_3ck8Y-43-47.wav --skill 1081
```

Dùng `--dry-run` để xem đích mà không thay file. Đường dẫn được lấy từ `window.JS["skill"]` trong `src/client/data/audio-tables-01.js`. Script giữ nguyên mapping và phần mở rộng đích; M4A dùng AAC 64 kbps, OGG dùng Opus 48 kbps, MP3 dùng 96 kbps, WAV dùng PCM 16-bit. Mỗi lần thay đều lưu bản cũ tại `tools/sound/output/backups/`, chỉ thay file sau khi convert thành công. Lỗi convert giữ nguyên asset cũ. Script từ chối asset đang được nhiều skill dùng chung để tránh đổi nhầm âm các skill khác.

Sau khi chạy, hard reload game bằng Cmd+Shift+R rồi test arena. Không cần build lại JS vì chỉ thay asset âm thanh tại đường dẫn cũ. Với website đã deploy, cần deploy lại asset để cập nhật bản online.

Script chỉ thay SFX đã được gắn vào skill. Skill chưa có mapping hoặc chưa có luồng phát riêng cần tích hợp trước; hiện Thiên Lôi Chấn Nhạc là `1081`, còn Cửu Thiên Cương Phong `1080` chưa được gắn.
