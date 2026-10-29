# Tidelora V3 — UI review & implementation kit

Gói cải tiến từ 32 screenshot V2: tập trung độ rõ chữ, phân cấp, tỷ lệ ảnh, thời điểm trong ngày và HUD không chồng nhau.

## Có trong gói

- 23 PNG runtime: **12 ảnh mới + 11 ảnh V1 giữ lại**; không cần tải lại V1.
- `reference/v3-layout-target.png`: bảng định hướng4 màn, không phải UI đã chạy.
- `gallery.html`: mở trực tiếp để xem từng asset.
- `CLAUDE_IMPLEMENTATION.md`: prompt triển khai đầy đủ; đưa nguyên file cho Claude cùng repo app.
- `docs/`: review có bằng chứng, layout, mapping từng ảnh và checklist32 trạng thái.
- `scripts/`: cài asset có dry-run, phát hiện conflict/backup; kiểm tra checksum/kích thước.
- `integration/`: registry static require cho Metro, theme và hàm layout TypeScript.

## Dùng nhanh

Giải nén. Mở terminal tại thư mục Tidelora-V3, dùng Node18+:

```bash
node scripts/verify-assets.mjs
node scripts/install-assets.mjs --project /absolute/path/to/your-app --dry-run
node scripts/install-assets.mjs --project /absolute/path/to/your-app
```

Sau đó yêu cầu Claude đọc `CLAUDE_IMPLEMENTATION.md` và sửa repo. Script chỉ cài assets/helpers, **không tự viết lại UI hoặc sửa logic game**. Registry được cài tại `assets/tidelora-v3/assets.ts` trong app; ảnh nằm bên dưới cùng thư mục, các require đã đúng tương đối.

Ảnh nguồn là master chất lượng cao, không có chữ UI. Đừng dùng mockup làm một ảnh màn hình trong app. Không tự thêm loài, món, giá hoặc thông số từ mockup. Gói này không bổ sung tôm/loài mới: muốn mở rộng cần thêm dữ liệu sinh thái và art đã kiểm chứng riêng.

Review chỉ dựa trên screenshot, chưa chạy app vì không có source. Các lỗi state/scroll nghi ngờ đều cần xác minh. Ảnh AI giữ phong cách tự nhiên nhưng không phải chứng cứ định danh sinh học; kiểm tra tên loài và đặc điểm trước release.
