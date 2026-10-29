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

## 2026-10-27: Thay hình theo asset pack v1 và concept
Mọi hình vẽ bằng code (nền, cá, món ăn, mặt gỗ) đã được thay bằng ảnh trong `art/source/v1`,
build bằng `pnpm art`. Bố cục màn Nhà, Câu, Kho cá và Gian bếp làm lại theo ảnh concept.

**Đã xem trên simulator** (iPhone 16 Pro, Expo Go): đủ 32 màn và trạng thái. Gồm màn mở đầu, Nhà
(sáng và hoàng hôn), hướng dẫn, chuẩn bị, tiệm (3 tab), kho cá, bếp, sổ tay, cài đặt, hộp đồ, tạm
dừng, và màn câu ở mọi pha (ngắm, chờ, giật, đấu, vớt, kết quả, giữ cá) vào 8h, 12h, 18h35 và 22h.
Có cả bố cục tay trái.

**Chưa thấy:** chuyển động của shader nước mới (ảnh chụp chỉ cho thấy khung tĩnh), hơi nóng bốc
lên ở bếp, hiệu năng trên máy thật, viền sprite ở độ phân giải máy thật, Android.

**Đã biết:**
- Tranh là cảnh buổi sáng: lúc 22h trời tối đi nhưng mặt trời trong tranh vẫn còn.
- Không có tay người hay máy câu như trong concept. Cần câu vẽ bằng code để cong được theo lực.
- Điểm "Gốc tràm ngập" không có cây tràm đứng trong nước trên tranh.

## 2026-10-28: tích hợp asset v3

**Nguồn:** `Tidelora-V3.zip` cùng `CLAUDE_IMPLEMENTATION.md`. File ZIP nhận được bị cụt: `catch-mat.png` hỏng, thiếu
`docs/` (REVIEW_V2, LAYOUT_V3, ASSET_INTEGRATION, SCREEN_CHECKLIST), `scripts/`, `integration/`,
`reference/v3-layout-target.png` và `manifest.json`. Vì vậy không chạy được `install-assets.mjs` hay
`verify-assets.mjs`, và tỉ lệ bố cục lấy theo phần mô tả trong CLAUDE_IMPLEMENTATION.md.

**Đã làm:**
- Màn câu: chuyển và hòa giữa bốn tranh hồ theo giờ trong game. Lấp lánh dọc đường nắng hoặc đường trăng.
- Cần: cần carbon dùng tranh tay cầm + máy, thân cần vẽ nối tại đầu khớp; cần tre vẽ bằng code, không có máy.
- Phao: phao balsa dùng tranh, cắt ở mực nước.
- HUD: nút thao tác 84 dp, cột đấu cá 210 dp.
- Tạm nghỉ đè lên hộp đồ: hộp đồ ẩn khi đang tạm nghỉ, hiện lại khi câu tiếp.
- Tiệm: chia 3 cột 20/45/35, có ảnh sản phẩm đúng SKU.
- Kho: lưới 55%, chi tiết 45%, cá chiếm khoảng 78% vùng ảnh.
- Bếp: 21/45/34, nhưng danh sách tối thiểu 150 dp và cột chi tiết tối thiểu 272 dp; lời khuyên "bán sống lời hơn" không còn tô màu cảnh báo.
- Sổ tay: chia 25/75.
- Chuẩn bị: nút "Xuống bàu" ghim dưới danh sách đồ nghề.
- Cài đặt: mỗi dãy chỉ sáng một mức, có `accessibilityRole="radio"`.
- Về nhà: thanh tiến độ được kẹp trong 0–1.
- Bắt cá: vạch chiều dài lấy từ dữ liệu.
- Panel gần như đặc (0,93); nút cao 48 dp.

**Đã chạy:** `pnpm verify` (tsc, lint, 48 test qua, 1 bỏ qua). Đã chụp lại đủ 32 trạng thái trên iPhone 16 Pro
(iOS 18.1, ngang, có Dynamic Island). Ảnh 06 nay là màn nhà thật. Sau khi sửa, chụp lại sổ tay, bếp,
kho, cảnh đấu cá và tạm nghỉ.

**Chưa kiểm:**
- Viewport hẹp (iPhone SE) và rộng (Pro Max, iPad).
- Chữ lớn ở mọi màn.
- Chuyển cảnh hòa liên tục khi giờ đổi lúc đang câu: chỉ xem ảnh tĩnh lúc 16:30.
- Bộ nhớ khi hòa hai ảnh nền trên máy thật, và Android.
- Bấm mua, nấu, giữ cá hai lần liên tiếp: chỉ có test logic, chưa thử tay.
