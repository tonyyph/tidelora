# Asset manifest

Máy đọc được: `assets/manifest.json`.

## Nguồn
Hình vẽ đến từ hai gói do chủ dự án cung cấp. Theo ghi chú của gói, ảnh được tạo bằng Imagegen và
không dựa trên ảnh stock bên thứ ba. Ảnh gốc giữ nguyên, không sửa:
- **v1** (`art/source/v1`, kèm `INTEGRATION.md` và prompt trong `manifest.json`): nền nhà, hồ buổi
  sáng, bếp, kho cũ; 4 loài cá; 3 món; cần + máy (`rod-reel`); atlas 6 vật dụng.
- **v3** (`art/source/v3`, kèm `CLAUDE_IMPLEMENTATION.md`): hồ trưa, chiều, đêm (cùng góc máy với
  hồ buổi sáng); kho yên tĩnh; bàn tiệm đồ câu; trùn, giỏ tre, thùng đá, phao balsa, máy câu,
  tay cầm có máy. File ZIP v3 nhận được **bị cụt**: `catch-mat.png` hỏng, thiếu `docs/`,
  `scripts/`, `integration/`, `reference/`, `manifest.json` và `gallery.html`. Các ảnh v3 trùng với
  v1 (hồ sáng, nhà, bếp, cá, món, `rod-reel`) đã được so byte, giống hệt nên không chép lại.

## Quy trình build
`pnpm art` (macOS, `tools/prepare-art.swift`) tạo ảnh chạy trong app ở `assets/art`:
- **Nền:** giữ kích thước gốc 1774×887, mã hóa lại JPEG (mỗi ảnh khoảng 0,45–0,8 MB).
- **Sprite:** cắt sát vùng có alpha, bỏ đốm lẻ nhỏ hơn 3% mảng lớn nhất, rồi thu nhỏ: cá rộng
  1024 px (cá lóc 1200 px), món ăn 800–900 px, vật dụng 256–400 px, tay cầm 720 px, phao 48 px.
  Nhờ vậy chiều rộng ảnh cá đúng bằng tổng chiều dài cá, và bảng đo ở màn bắt cá tính được tỉ lệ.
- `src/rendering/artManifest.ts` (file sinh tự động) lưu kích thước sau khi cắt, để tính tỉ lệ khung
  mà không phải tải ảnh.

## Dùng ở đâu
| Ảnh | Màn |
|---|---|
| `bg-home-morning` | Mở đầu, Nhà, Chuẩn bị, Về đến nhà, Cài đặt (phủ màu theo giờ) |
| `bg-fishing-lake-morning`, `bg-lake-noon`, `bg-lake-dusk`, `bg-lake-night` | Màn câu. Chọn theo giờ trong game (`lakeLight` trong `src/rendering/art.ts`): sáng 5:30–9:30, trưa 10:30–15:30, chiều 17:00–18:45, đêm 19:45–4:30, giữa các khoảng thì hòa dần. Chỉ tải ảnh đang hiện và ảnh đang hòa tới. Bờ xa ở 37,5% chiều cao ảnh, ghim vào đường chân trời (`LAKE_HORIZON`). |
| `bg-storage-quiet` | Kho cá, Sổ tay |
| `bg-tackle-workbench` | Tiệm đồ câu |
| `bg-kitchen-interior` | Gian bếp |
| `fish-*` | Mọi chỗ hiện cá (`FishArt`) |
| `dish-*` | Gian bếp, tab Món ăn ở Kho cá (`DishArt`, hơi nóng và bóng đổ vẽ bằng code) |
| `rod-grip-reel` | Màn câu khi dùng **cần carbon**: tay cầm và máy đặt thẳng từ gốc về phía ngọn, thân cần nối tiếp từ đầu khớp (`GRIP_SOCKET`) vẽ bằng code |
| `float-balsa` | Màn câu và kính phóng khi dùng **phao balsa**; mực nước ở 56% chiều cao ảnh |
| `item-rod-carbon` (từ `rod-reel` v1), `item-reel`, `float-balsa`, `item-basket`, `item-cooler`, `item-earthworm` | Tiệm (`GEAR_ART`), ô mồi và ô giỏ trên màn câu, Kho cá |

## Vẫn vẽ bằng code
Mặt nước (shader lấy mẫu lại ảnh hồ, thêm gợn, vòng sóng và lấp lánh theo mặt trời hoặc trăng),
**cần tre** (thân vàng có đốt, chuôi quấn dây, không có máy), thân cần carbon, dây, **phao lông
nhím**, bóng cá dưới nước, kính phóng phao, hơi nóng món ăn, toàn bộ UI. Icon dùng
MaterialCommunityIcons (Apache 2.0) cho đồ chưa có ảnh: cần tre, cước, lưỡi, phao lông nhím, cám, tép.

## Chưa có hoặc chưa dùng
- `catch-mat.png` (v3) hỏng do ZIP cụt. Màn bắt cá vẫn dùng bảng gỗ vẽ bằng code, có thước và vạch
  chiều dài lấy từ dữ liệu con cá.
- Nhà chỉ có ảnh buổi sáng, phủ màu theo giờ. Không ghép cảnh hồ làm nền nhà.
- Cảnh câu là ảnh tĩnh: cỏ không đung đưa, không có cây tràm đứng trong nước cho "Gốc tràm ngập".
- Hình thái cá chưa được đối chiếu độc lập với FishBase. Ảnh AI không phải chứng cứ định danh.
- Atlas v1 (hộp đồ, sổ tay, phao cũ) và `bg-storage-interior` không còn dùng.
