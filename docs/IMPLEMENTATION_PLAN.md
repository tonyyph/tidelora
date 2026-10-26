# Implementation plan

## Giai đoạn 1: vertical slice Bàu Sen (bản này)
| # | Milestone | Trạng thái |
|---|---|---|
| M0 | Khung Expo 58, TS strict, ESLint, Jest, pnpm | xong |
| M1 | Lõi mô phỏng: RNG, fixed step, danh mục 4 loài kèm nguồn, địa điểm và 4 microhabitat, chọn loài kèm báo cáo debug, máy trạng thái câu phao, vật lý đấu cá | xong, có test |
| M2 | Transaction: kho từng cá thể, độ tươi theo giờ game, bán, mua, nấu (3 công thức), sổ tay, lưu và migration | xong, có test |
| M3 | Cảnh Bàu Sen: Skia, shader nước, các lớp cảnh | xong (art placeholder) |
| M4 | Màn câu: ngắm, quăng, chờ, giật, đấu, vớt, HUD, giữ hoặc thả, hộp đồ, tạm dừng, debug overlay | xong |
| M5 | Màn mở đầu, nhà, chuẩn bị, kho, bếp (mini-game lửa và nấu nhanh), chợ và tiệm, sổ tay, cài đặt | xong |
| M6 | Âm thanh tổng hợp, haptic, hướng dẫn chuyến đầu | xong (âm tạm) |
| M7 | Kiểm thử trên simulator, chỉnh cân bằng, tài liệu | xong một phần, xem QA_REPORT |

**Một nâng cấp có tác động rõ:** cần carbon 4m5. Tầm quăng tăng từ 13 lên 21 m, đủ tới gốc tràm và
lòng bàu sâu; độ lệch giảm từ 1,3 xuống 0,7 m. Đổi lại cần cứng nên dễ đứt cước mảnh và xé miệng cá sặc.

## Việc tiếp theo, theo thứ tự ưu tiên
1. Chơi thử bằng tay trên iPhone thật để chỉnh ngưỡng kéo ngắm, nhịp giật và độ rung; đo FPS.
2. Thay art placeholder bằng tranh vẽ theo `ASSET_MANIFEST.md`, bắt đầu với backdrop và 4 loài cá.
3. Thu âm hoặc mua ambience có giấy phép (chim và côn trùng ĐBSCL), tiếng máy câu thật.
4. Đơn hàng (bán nhanh, giữ cho giá tốt, mở công thức).
5. Giai đoạn 2: thêm sông vùng thấp (câu đáy) và cửa sông rừng ngập mặn (bẫy giáp xác cho một loài
   cua hoặc tôm đã kiểm chứng), thời tiết và giờ trong ngày thay đổi ánh sáng của shader.
