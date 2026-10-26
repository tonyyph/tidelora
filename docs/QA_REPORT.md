# QA report: vertical slice, 2026-10-22

## Đã chạy
| Kiểm tra | Kết quả |
|---|---|
| `pnpm typecheck` (TS 6 strict) | sạch |
| `pnpm lint` (eslint-config-expo, có luật React Compiler) | sạch |
| `pnpm test` | 40 test qua, 1 bị bỏ qua (test cân bằng chỉ chạy khi `BALANCE=1`) |
| `npx expo-doctor` | 20/20 |
| Simulator iPhone 16 Pro (iOS 18.1), Expo Go 58.0.4 | Xem bên dưới |

Các test khóa những rủi ro sau:
- Loài không xuất hiện ngoài ràng buộc cứng (vùng, độ mặn, phương pháp, mồi).
- Phương pháp câu phải tương thích với loài.
- Fuzz 60 seed × 4.000 bước với input ngẫu nhiên: không có cạnh chuyển trạng thái sai, không có NaN.
- Cùng seed và cùng input cho ra cùng kết quả.
- Trang bị thay đổi gameplay thật: tầm quăng, độ lệch, đứt dây khi siết drag.
- Bấm liên tục gần như không thu được dây.
- Người chơi giỏi bắt được cả 4 loài.
- Kho không âm và không nhân đôi; bán chỉ trả tiền một lần; nấu tiêu thụ đúng nguyên liệu và
  từ chối dùng lại hoặc dùng sai loài.
- Pending catch sống sót qua lưu và tải lại, và không ghi kép.
- Migration v0, và từ chối save có version mới hơn bản build.
- Trở lại từ background không chạy catch-up dài.

## Đã xem trên simulator (ảnh trong `docs/screenshots/`)
Màn mở đầu có cảnh sống (phiên câu tự động chạy nền), màn câu ở các trạng thái ngắm, chờ, rỉa và đấu
(có thanh căng và drag), kết quả bắt cá trên bảng đo, banner thất bại "mắc gốc tràm", nhà, chuẩn bị,
kho (trống và có cá), bếp (chọn cá, so giá món với giá bán sống), chợ và tiệm, và sổ tay với cả 4 loài.

Các thao tác được điều khiển bằng deep link dev (`/--/dev?...`) và autopilot. Tôi **không** chạm vào
simulator bằng chuột, để tránh click nhầm sang máy của bạn.

## Chưa kiểm tra (cần làm tiếp)
- Thao tác ngón tay thật: kéo để ngắm, giữ nút Thu dây, vuốt để lái cá, các nút −/+ drag. Logic đã
  có test, nhưng cảm giác chạm chưa được thử.
- Mini-game giữ lửa trong bếp, hộp xác nhận bán, màn tạm dừng, các nút trong cài đặt.
- Âm thanh: không nghe được trong môi trường này. Haptic: simulator không rung.
- Android, iPad, iPhone SE (màn hẹp có thể làm chữ hướng dẫn chồng lên nút).
- FPS trên thiết bị thật, và mức đồ họa "Tiết kiệm".
- VoiceOver.
- Quay video vòng chơi.

## Vấn đề đã biết
- Đồng hồ trong game vẫn chạy nhưng ánh sáng giữ nguyên bình minh (slice dùng giờ cố định).
- Bóng cá khi đấu ở xa bên phải có thể ra khỏi khung; dây khi đó cũng đi ra ngoài màn hình.
- Toàn bộ art và âm thanh là placeholder.
- Nút tròn màu xanh trong các ảnh chụp là nút dev-menu của Expo Go, không thuộc game.

## 2026-10-26: UI/UX pass (items 1–10)
Added: float loupe, shorter coach line at the top that fades after 6 s, bite rings on the float and
a pulsing strike button for every player, a fight panel (fish stamina, heading, mode, steering hint)
next to the thumb, 48 pt drag buttons, a basket chip, a "Về nhà · bán N con" button on the water, a trip
summary screen (`/trip`) with one-tap selling and goal progress, a next-goal card and tip on the home
screen, a price on the catch result, and a floating +/− on every coin display.

Verified: typecheck, lint, 44 tests. In the simulator the waiting HUD and the loupe were checked by
screenshot (loupe framing adjusted after that).
Not yet seen running: the hook-window pulse, the fight panel, the trip summary, the home goal card
and the coin animation. Someone else started using the simulator during the check, so I stopped driving it.
