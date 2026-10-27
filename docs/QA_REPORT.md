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
- Ánh sáng theo giờ chỉ là lớp màu phủ lên tranh bình minh: mặt trời vẫn nằm sát chân trời cả buổi trưa và đêm.
- Chưa có "ngủ đến sáng": chơi nhiều chuyến liền thì trời tối dần và đêm kéo dài tới 4:30.
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

## 2026-10-26: UI/UX pass (items 11–18)
- Prep: presets, bait and depth come first as one-line chips; the rig is a list on the right with
  "Đổi n/m" (cycle owned gear) or "Tiệm ›" (opens the shop on that slot). Place info moved below.
- Shop: bait is its own tab, so nothing is cut off. Two cards per row. Non-equipped gear explains the
  difference in words (`gear/compare.ts`), e.g. "Quăng xa hơn 8 m" and "Cứng hơn: cá giật mạnh dễ
  đứt cước mảnh". A dot marks slots that still have gear to buy. Opens on a slot with `/shop?slot=`.
- Stash: species filters on one scrolling row, larger fish art, the chest's total value, and "Chọn N con
  kém tươi".
- Kitchen: a cook-vs-sell box (dish value, spice cost, raw price) with a coloured verdict. A fade and
  flashed scroll bar on long fish lists.
- Text: captions 12.5 → 13.5 pt, labels 12 → 12.5 pt, dim text opacity 0.68 → 0.8, small buttons 14 pt.
- Tutorial: "Bước n/5" on the coach line; the line stays up. A ghost fingertip shows the aim drag. A
  "Bấm →" or "Giữ →" tag sits beside Giật, Thu dây and Vớt. During a fight the coach line moves to the
  side away from the fight panel.
- Transitions: 320 ms fade between screens, and the Skia scenes fade in.
- Time of day: `timeOfDay.ts` grades the dawn painting by the game clock (dawn, morning, noon,
  afternoon, dusk, night). The HUD and prep say "Ráng chiều · Lặng gió" and similar.

Verified: typecheck, lint, 48 tests. Screenshots in the simulator: prep, shop (rod tab), stash,
kitchen (verdict "Bán sống lời hơn 49 xu"), home at dusk, fishing at 18:10, 22:00 and 12:00, the
tutorial aim step with the fingertip, the hook window with "Bấm →", and the fight with the moved coach
line (frozen with `hold=`). Layout bugs found that way were fixed: truncated preset text, stacked shop
cards, an overflowing stash panel, the coach overlapping the fight panel, and ▶ drawn as an emoji.
Not seen: the screen fade (screenshots can't show motion), the shop bait tab, the stash "kém tươi"
button (no fading fish in the test save), the kitchen fade on a long list, and left-handed mode.
