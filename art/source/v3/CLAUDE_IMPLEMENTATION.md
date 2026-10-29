# Prompt triển khai Tidelora V3 cho Claude

Bạn là senior React Native/Expo engineer và game UI designer. Hãy trực tiếp sửa dự án Tidelora theo bộ tài liệu/asset này đến khi build và các flow liên quan hoạt động. Đừng chỉ trả về kế hoạch. Đọc AGENTS.md/rules và cấu trúc repo trước khi sửa. Giữ ngôn ngữ tiếng Việt, phong cách câu cá Việt Nam chân thật, xanh rừng–kem–đồng trầm.

## Đầu vào và mức ưu tiên

1. Logic/data/save hiện có là nguồn sự thật cho loài cá, mồi, trang bị, tiền, công thức, nhiệm vụ và tutorial.
2. Đọc `docs/REVIEW_V2.md`, `docs/LAYOUT_V3.md`, `docs/ASSET_INTEGRATION.md`, `docs/SCREEN_CHECKLIST.md`.
3. Mở `reference/v3-layout-target.png`: chỉ tham khảo bố cục/thẩm mỹ. Không sao chép chữ lỗi, số liệu, thêm loài, món hoặc SKU từ mockup.
4. `manifest.json` có 23 PNG, kích thước, bounds alpha, SHA256, màn dùng và ghi chú từng ảnh. `gallery.html` cho phép xem toàn bộ.

Đây là review từ screenshots, chưa chứng minh lỗi runtime. Kiểm tra scroll/state trước khi kết luận và sửa. Không có source code trong ZIP này; làm việc trong repo app người dùng cung cấp.

## Bước 1 — Khảo sát và cài assets

Xác định navigation, safe-area, game-state, tutorial-state, renderer cần/phao/cá, font, gesture, modal owner và screenshot harness đang dùng. Không nâng SDK hoặc thêm thư viện chỉ để vẽ panel. Tái dùng Reanimated/SVG/Skia nếu repo đã có; chọn cách native hiện có đơn giản nhất.

Tại thư mục gói V3 đã giải nén, chạy (thay đường dẫn app thật):

```bash
node scripts/verify-assets.mjs
node scripts/install-assets.mjs --project /absolute/path/to/app --dry-run
node scripts/install-assets.mjs --project /absolute/path/to/app
```

Script chép vào `assets/tidelora-v3`, tạo registry static require cùng theme/layout helpers, không tự sửa screen. Nếu báo conflict: đọc diff, chỉ dùng `--overwrite` khi bản trong gói phải thay thế bản đang có; script tự backup file conflict. Không xóa thư mục asset cũ trước khi xóa hết references.

## Bước 2 — Hệ thống bố cục chung

Lấy window dimensions theo dp, safe-area thực, không hardcode 1400×644 screenshot pixels. Áp dụng spacing/token trong theme.ts; header 52dp, nút chính 48dp và touch target tối thiểu44dp. Layout co giãn; font scale lớn vẫn có scroll và CTA truy cập được. Không giảm opacity parent chứa chữ.

Tạo/tái dùng ScreenFrame, Header, Panel, PrimaryButton, ItemCard, StatRow, EmptyState bằng code. Panel nền gần đặc; loại bỏ viền và lớp trang trí dư. Tách vùng header, hint tutorial và scene tương tác. Text có contrast đủ, tiêu đề tối đa2 dòng; mô tả dài scroll, không ép font quá nhỏ.

Giữ navigation và accessibility labels, selected/disabled state, hitSlop. Chỉ nội dung trang trí được ẩn khỏi screen reader. Modal dùng một owner rõ ràng; pause/tackle/tutorial không chồng sai lifecycle.

## Bước 3 — Cảnh câu và state

Dùng bộ morning/noon/dusk/night theo game clock qua lakeAssetForHour hoặc adapter tương đương. Không dùng đồng hồ hệ điều hành thay game time. Cùng cover transform cho background và điểm neo. Cho phép crossfade ánh sáng; giữ tọa độ phao ổn định. Weather và ecology tách biệt với art.

Vùng nước trống là trung tâm. HUD compact, hint dưới header, điều khiển ở mép không che phao. Cột fight 190–210dp khi đủ chỗ, clamp theo viewport. Reel control 76–88dp. Left-hand mode chuyển cụm control/hit area, không lật toàn cảnh hoặc chữ.

Cần máy: dùng rod-grip-reel làm tay cầm; vẽ thân cong và dây bằng renderer hiện có, nối thật tại socket/tip. Cần tre vẫn cần hình/renderer đúng loại; không ép có reel. Phao dùng float-balsa, waterline và trạng thái aim/wait/bite/hook/fight/landing điều khiển code. Không tạo timing hoặc xác suất mới chỉ để khớp mockup.

Tutorial phải chỉ đúng target, state và tiến độ; không còn label aim ở frame fight. Capture chỉ khi state thực đã sẵn sàng.

## Bước 4 — Các màn còn lại

- Home: bố cục rõ CTA chính, nav nhẹ, scrim dưới chữ. Không tự ghép cảnh câu làm nền home-dusk khác camera.
- Prep: chọn trang bị/mồi/giỏ rõ ràng, footer CTA cố định, phần dài scroll.
- Shop: category khoảng20%, product45%, stats/price/CTA35%; ảnh sản phẩm 100–130dp cao. Map đúng SKU; không có SKU máy câu rời thì không thêm. Nội dung mô tả ngắn, chi tiết mở rộng được.
- Stash: lưới55%, chi tiết45%; cá hero chiếm70–80% vùng ảnh; bỏ capsule xám, không stretch; số liệu lấy data. CTA không bị cắt.
- Kitchen: recipe list21%, hero45%, detail34% của chiều rộng còn lại sau gaps; món chiếm khoảng85% vùng hero. Giữ nguyên economics, đổi phân cấp cảnh báo, không sửa giá/buff để làm đẹp.
- Journal: sidebar25%, nội dung75%, nền đọc rõ; correct species mapping và unknown/locked state.
- Catch: nền catch-mat; cá và thước cùng hệ scale. Nếu chiều dài là gameplay data thì vẽ marker từ data; không tuyên bố ảnh AI có đo lường sinh học chuẩn. Keep/release rõ.
- Trip: progress clamp0–1 nhưng giữ số thực trong text; kiểm tra mục tiêu705/20 là loại dữ liệu gì trước khi sửa.
- Settings: state selected đơn nghĩa, mỗi slider/radio phản ánh một value, hỗ trợ safe-area và scroll. Không lấy screenshot06 làm home vì nó trùng settings15.

## Bước 5 — Kiểm tra và bàn giao

Chạy lint/typecheck/test/build theo scripts có sẵn, không tự dựng lệnh giả hoặc nói đã test khi chưa chạy. Kiểm tra ít nhất một viewport landscape hẹp, một rộng và safe-area notch; dựa viewport thật trong harness. Re-capture đủ32 state theo checklist, dùng state assertion trước screenshot. Ảnh06 phải là home-rich thực, khác settings15. Kiểm tra font scaling, left-hand mode, modal close/resume và không double-submit buy/cook/keep.

Tối ưu: ảnh nền chỉ preload cảnh hiện tại và biến thể kế tiếp; tránh giữ cả PNG fullres decoded đồng thời. Nếu build cần resize/WebP thì giữ master, tạo bước build riêng sau khi kiểm tra alpha/chất lượng; không thay file trong gói tùy tiện. Không animate opacity/position bằng React state từng frame nếu renderer sẵn có hỗ trợ animation thread.

Bàn giao: list file sửa, ảnh before/after4 màn chính, kết quả checks thật, các state chưa verify và lý do. Ưu tiên xử lý hết overlap/crop/sai asset trước hiệu ứng trang trí. Không kết luận hoàn thiện nếu chưa chạy được app; mô tả rõ giới hạn.
