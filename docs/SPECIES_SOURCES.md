# Species sources

**Vùng tham chiếu:** Đồng Tháp Mười, đồng bằng sông Cửu Long, Việt Nam (lưu vực hạ Mekong).
Thủy vực của slice là bàu nước ngọt, nước tù, có sen súng và tràm.

Dữ liệu sinh học nằm trong `src/ecology/species.ts` (`SPECIES_BIO`). Tham số cân bằng nằm riêng ở
`SPECIES_TUNING`. Mỗi trường sinh học mang một nhãn:
- `verified`: đọc trên trang FishBase species summary, truy cập ngày 2026-10-22.
- `approximate`: nguồn thứ cấp, hoặc ước lượng làm cho game.
- `unknown`: nguồn bỏ trống.

| Loài | Tên khoa học | Nguồn | Đã kiểm | Ước lượng / chưa rõ |
|---|---|---|---|---|
| Cá rô đồng | *Anabas testudineus* (Anabantidae) | [FishBase 495](https://www.fishbase.se/summary/495) | Nước ngọt và lợ; 22–30 °C; dài max 25 cm TL, thường 12,5 cm; sống ở sông, kênh, ruộng ngập, nước tù nhiều thực vật; cơ quan hô hấp phụ; mùa khô vùi bùn | Độ sâu (FishBase ghi 0–? m); khối lượng max; giờ hoạt động; thức ăn; hệ số a, b của công thức khối lượng |
| Cá mè vinh | *Barbonymus gonionotus* (Cyprinidae) | [FishBase 286](https://www.fishbase.se/summary/286) | Nước ngọt; 22–28 °C; max 43 cm TL; có ở lưu vực Mekong và Chao Phraya; vào đồng ngập khi mùa mưa | Độ sâu; thức ăn (ăn tạp, thiên về thực vật, theo nguồn thứ cấp); hệ số a, b |
| Cá sặc rằn | *Trichopodus pectoralis* (Osphronemidae) | [FishBase 499](https://www.fishbase.se/summary/499) | Nước ngọt; 23–28 °C; max 25 cm, thường 15 cm TL; nước nông chảy chậm nhiều thực vật; vào rừng ngập hạ Mekong; thở khí trời bắt buộc; chủ yếu ăn thực vật thủy sinh | Độ sâu; giờ hoạt động; hệ số a, b |
| Cá lóc đồng | *Channa striata* (Channidae) | [FishBase 343](https://www.fishbase.se/summary/343) | Nước ngọt và lợ; 23–27 °C; độ sâu 1–10 m, thường 1–2 m; max 100 cm SL, thường 61 cm TL; khối lượng max 3,0 kg; a = 0,00912, b = 2,97 (ước lượng Bayes của FishBase); ưa nước tù và đục; thở khí trời bắt buộc | Giờ hoạt động; thức ăn (săn mồi, theo nguồn thứ cấp) |

## Tách sinh học khỏi game
- **Kích thước trong game:** phân phối của bàu nhỏ, luôn nằm dưới max sinh học (có test kiểm tra).
  Ví dụ cá lóc trung bình 36 cm, tối đa 75 cm.
- **Kiểu phao báo cá ăn** (rô giật lắc, mè vinh kéo trượt, sặc nổi phao nằm, lóc kéo chìm) và
  **mode đấu** là đơn giản hóa cho game. Mỗi loài ghi rõ điều này trong `gameNotes`, hiển thị
  trong Sổ tay ở mục "Ghi chú mô phỏng".
- **Cách câu và mồi:** câu phao dùng trùn, cám hoặc tép là cách câu phổ biến ở vùng này. Ma trận
  "loài nào ăn mồi nào" là quyết định thiết kế dựa trên chế độ ăn ở trên, không phải dữ liệu đo.
- **Không khẳng định** trạng thái bảo tồn hay quy định khai thác hiện hành của bất kỳ loài nào.

## Cần làm trước Giai đoạn 2
- Lấy hệ số a, b của công thức khối lượng từ trang Length-Weight trên FishBase cho rô, mè vinh và sặc.
- Kiểm tra lại các ghi nhận ở Đồng Tháp Mười bằng tài liệu của Viện Nghiên cứu Nuôi trồng Thủy sản II,
  hoặc danh lục cá ĐBSCL (ví dụ Trần Đắc Định và cộng sự, 2013, "Fishes of the Mekong Delta, Vietnam").
- Bổ sung nguồn cho giờ hoạt động và thức ăn, thay cho nhãn "ước lượng".
