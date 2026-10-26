# Game design — vertical slice

## Vòng chơi
Màn mở đầu → Nhà ven bàu → Chuẩn bị (bàn đồ nghề) → Bàu Sen → ngắm, quăng → chờ, quan sát →
rỉa → cắn → giật → đấu → vớt → **Giữ / Thả** → về nhà → Kho (bán) / Bếp (nấu) / Chợ (nâng cấp) → Sổ tay.

Mỗi bước đều là một quyết định:

| Bước | Quyết định |
|---|---|
| Chuẩn bị | Mồi (trùn miễn phí, cám, tép), độ sâu phao (0,4 / 0,9 / 1,8 m), lưỡi, cần, cước, phao, thùng giữ cá |
| Ngắm | Điểm rơi phao quyết định microhabitat. Gió đẩy lệch, độ lệch tùy theo cần |
| Chờ | Phân biệt gió, cá con, lá với cá thật |
| Giật | Giật sớm thì trượt, giật trễ thì mất mồi |
| Đấu | Thu hay nhả, chỉnh drag, lái cá ra khỏi gốc cây |
| Sau khi bắt | Giữ để có giá trị kinh tế, hoặc thả để được ghi chép và điểm hiểu biết |
| Ở nhà | Bán sống, nấu thành món (không mất tươi), hay để dành |

## Máy trạng thái câu phao (`src/fishing/session.ts`)
`aiming → casting → settling → waiting → investigating → nibbling → hookWindow → fighting → landing → catchResult`,
với các nhánh `missedHook`, `baitLost`, `fishEscaped`, `lineBroken`, `snagged`, `cancelled`.
Các cạnh hợp lệ nằm trong `TRANSITIONS`. Đi sai cạnh sẽ ném lỗi, và fuzz test kiểm tra điều này.
Không có đường nào đi thẳng từ `waiting` tới `catchResult`. `preparing` có sẵn trong mô hình nhưng
slice bỏ qua, vì bàn chuẩn bị là một màn riêng.

## Mô hình đấu cá (đơn vị: m, s, kgf; stamina, dip là normalized 0..1)
- Lực kéo nền = `power × khối lượng^0.7`, nhân với hệ số của mode hành vi và stamina.
- Mỗi loài có bộ mode riêng (`SPECIES_TUNING.modes`):
  - **Rô đồng:** `shake`, `dive`, `rest`. Lắc đầu 6 Hz, giữ lưỡi chắc.
  - **Mè vinh:** `run`, `turn`, `rest`. Chạy dài và quay đầu gấp.
  - **Sặc rằn:** `flutter`, `rest`. Lực yếu nhưng miệng mềm (0,48 kgf).
  - **Cá lóc:** `cover`, `thrash`, `dive`, `rest`. Lao vào gốc tràm và quẫy mặt nước.
- **Drag:** lực vượt drag thì dây tuột ra, độ căng giữ bằng drag. Máy 2500 nhả giật cục hơn.
- **Cần:** độ dẻo hấp thụ cú bứt tốc. Cần carbon cứng nên spike dồn vào dây.
- **Thu dây:** lực tăng dần trong 0,4 s, nên bấm liên tục gần như không tác dụng. Thu khi cá lắc đầu sẽ tạo xung lực lên lưỡi.
- **Thất bại có lý do:**
  - Quá sức cước hơn 0,22 s thì đứt dây.
  - Vượt sức giữ miệng cá thì xé lưỡi.
  - Dây chùng lúc cá lắc thì văng lưỡi.
  - Cá ở trong gốc tràm (mode `cover`) quá 3,2 s thì có thể mắc kẹt.
  - Hết sức chứa ống cước thì đứt dây.
- **Vớt:** đưa cá về dưới 2,8 m dây khi stamina dưới 0,5. Cửa sổ vớt 5 s (7 s ở chế độ thư giãn).
- **Giật sớm không phạt nặng:** giật khi chưa có cá thì phao vẫn nằm đó, chỉ hiện gợi ý. Giật lúc cá đang rỉa thường chỉ làm cá bỏ đi (30% mất mồi). Cửa sổ giật 0,9–1,9 s tuỳ loài.

Cân bằng được đo bằng `BALANCE=1 pnpm test balance` (600 seed, cao thủ so với người chơi giữ nút):

| Loài | Thời gian đấu | Cao thủ | Người chơi giữ nút |
|---|---|---|---|
| Rô đồng | ~11 s | không mất con nào | không mất con nào (cá khởi đầu dễ) |
| Mè vinh | 22–28 s | gần như không mất | gần như không mất |
| Sặc rằn | 11–24 s | không mất con nào | xé lưỡi ~3% |
| Cá lóc | 26–46 s | 50/50 vớt được | 29/50 vớt được, còn lại mắc gốc tràm hoặc đứt cước mảnh |

Đo ngày 2026-10-26 sau đợt nới độ khó. Cá lóc vẫn là thử thách chính: muốn chắc ăn cần lái cá khỏi gốc tràm và nâng cước.

## Chọn loài (`src/ecology/encounter.ts`)
1. **Loại cứng:** vùng địa lý, ghi nhận tại địa điểm, độ mặn, phương pháp, mồi (ví dụ cá lóc không ăn cám).
2. **Chấm điểm:** cover của microhabitat × mồi × tầng nước (độ sâu phao so với độ sâu điểm) × giờ hoạt động × nhiệt độ × độ cảnh giác (cước to dễ bị thấy) × trọng số nền. Mỗi hệ số có sàn, nên không loài hợp lệ nào xuống dưới 1%.
3. **Lấy mẫu** bằng seeded RNG (mulberry32). Seed của phiên câu hiện trong debug overlay.
4. **Cá thể** có độ dài phân phối log-normal quanh trung bình của game, bị kẹp trong khoảng cho phép. Khối lượng theo công thức W = aL^b nhân hệ số thể trạng ±6%.

## Trang bị (`src/gear/catalog.ts`) có trade-off
| Món | Được | Mất |
|---|---|---|
| Cần carbon 4m5 (300 xu) | Quăng 21 m thay vì 13 m, độ lệch 0,7 m thay vì 1,3 m | Cứng: cá sặc dễ xé lưỡi, cước mảnh dễ đứt |
| Cước 0.28 mm | Chịu lực 4,3 kgf | Cá cảnh giác (mè vinh) dễ bỏ đi |
| Lưỡi số 4 | Giữ chắc cá lóc | Cá nhỏ hay trượt |
| Phao balsa | Đứng vững, quăng xa thêm 2 m | Tín hiệu rỉa mờ hơn |
| Máy 2500 | Thu nhanh, drag 5 kgf | Drag giật cục |
| Thùng đá | Chứa 12 con, mất tươi chậm | 8 xu tiền đá mỗi chuyến |

Bộ khởi đầu không bao giờ mất, trùn đất luôn miễn phí, tiền không thể âm. Người chơi không bao giờ bị kẹt hoàn toàn.

## Kho, độ tươi, nấu ăn và kinh tế
- Mỗi con cá là một bản ghi riêng (`CatchItem`). Kho chỉ gom nhóm khi hiển thị.
- **Độ tươi** chỉ giảm theo giờ trong game: quăng câu +3 phút, mỗi con bắt +6, đi lại +25 mỗi lượt, nấu cộng thêm theo thời lượng công thức. Không giảm khi đóng ứng dụng. Thấp nhất là 0,3 (kém tươi) chứ không bao giờ hỏng. Giá bán = 50% + 50% × độ tươi.
- **Nấu ăn** là một transaction: cá được đánh dấu `cooked`, trừ gia vị và tạo một lô món, hoặc không gì thay đổi. Số phần = ⌊khối lượng × yield ÷ khối lượng mỗi phần⌋. Món không mất tươi. Bếp hiển thị trung thực "bán sống lời hơn" khi đúng như vậy. Ví dụ: canh chua biến cá mè vinh rẻ thành món đắt, còn cá lóc nhỏ thì bán sống lời hơn.
- Lần đầu nấu một món là mini-game giữ lửa 5 giây. Từ lần sau có thể nấu nhanh với chất lượng ổn định.
- Món "Cá lóc nướng trui" mở khi bắt được con cá lóc đầu tiên.
- **Nhịp kinh tế** (giá theo kg: rô 320, sặc 260, mè vinh 160, cá lóc 400 xu): một con rô ~11 xu, sặc ~15, mè vinh ~29, cá lóc ~180. Giỏ tre chứa 8 con, nên chuyến đầu bằng trùn đất được ~100–130 xu. Bắt đầu với 60 xu: sau chuyến đầu đủ mua lưỡi số 4 (20) và tôm (15) để săn cá lóc. Cần carbon (300) đến sau khoảng 3 chuyến, thùng đá (160) sau 2 chuyến.

## Accessibility
- Thanh căng dây có nhãn chữ (Ổn / Căng / Sắp đứt), gạch chéo và nhịp nháy, không chỉ dựa vào màu.
- Có âm thanh và rung riêng cho rỉa, cắn và căng dây. Rung luôn có giới hạn tần suất, không rung liên tục.
- Cài đặt có chế độ thư giãn, giảm chuyển động, tắt rung, tay trái, chữ lớn, và đồ họa tiết kiệm.

## Cố ý chưa làm trong slice
Đơn hàng, thời tiết động, chu kỳ ngày đêm (trời giữ cố định lúc bình minh dù đồng hồ chạy),
nhạc nền (mới có ambience), độ bền dụng cụ, bẫy giáp xác. Tất cả nằm trong Giai đoạn 2.
