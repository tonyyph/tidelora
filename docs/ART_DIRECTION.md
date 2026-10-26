# Art direction

**Naturalistic, cinematic, yên tĩnh.** Thiên nhiên chiếm phần lớn màn hình. UI là chữ ngà trên nền
mực trong suốt nhẹ, không glassmorphism và không card tràn màn hình.

## Palette UI (`src/ui/theme.ts`)
| Tên | Mã màu |
|---|---|
| Deep water | `#102E35` |
| River green | `#385B4F` |
| Mist | `#DCE4DC` |
| Warm ivory | `#F3EBDD` |
| Weathered wood | `#79634F` |
| Brass | `#B99B63` |
| Warning | `#C9755E` |

Màu môi trường thuộc về từng cảnh (`DAWN` trong `bauSenBackdrop.ts`).

## Chữ
- **Lora** (display, có bản italic cho logo và tên khoa học).
- **Be Vietnam Pro** (dữ liệu và thao tác).
Cả hai đều có đủ dấu tiếng Việt. Không dùng chữ mảnh nhỏ trên cảnh. Có tùy chọn chữ lớn (+15%).

## Bàu Sen lúc bình minh: các lớp cảnh
1. Bầu trời: gradient từ xanh xám xuống đào, mặt trời thấp bên trái, mây tầng mỏng bắt nắng.
2. Rừng tràm xa (mờ, ám màu không khí), lớp sương giữa, rừng tràm gần hơn.
3. Bờ xa với cụm cỏ năn.
4. Mặt nước: shader SkSL phản chiếu toàn bộ lớp 1–3. Có gợn theo phối cảnh, fresnel chuyển sang màu trà sẫm ở gần, lấp lánh dọc đường nắng, và vòng gợn đúng vị trí phao, cá rỉa hay cá quẫy.
5. Năm cây tràm đứng trong nước bên phải (điểm "Gốc tràm ngập"), có bóng phản chiếu và rễ trồi.
6. Ruộng sen và súng bên trái (điểm "Mép đám sen"), có lá nổi, lá đứng, nụ, hoa và bóng cuống.
7. Bóng cá dưới nước khi cá đến gần và khi đấu.
8. Phao, dây và cần: dây võng theo độ căng, cần cong theo tải.
9. Cầu gỗ ở tiền cảnh, bờ cỏ góc trái đung đưa.
10. Hai dải sương trôi, một nhóm muỗi nhỏ trong vùng nắng, vignette nhẹ.

Particle được dùng tiết chế: chín con muỗi, không phủ toàn màn hình. Chế độ giảm chuyển động làm
chậm sóng và sương, đồng thời tắt muỗi.

## Giới hạn của hướng 2.5D
Đây là thế giới 2.5D gồm picture tĩnh và một shader mặt nước. Không có hình học 3D, không có
khúc xạ thật, cá dưới nước chỉ là bóng. Để đạt chất lượng "painted", cần thay các picture
procedural bằng ảnh vẽ, phân lớp theo `ASSET_MANIFEST.md`. Shader và logic giữ nguyên.

## Sinh vật
Hiện là vector procedural (`src/rendering/fish/fishShapes.ts`), mỗi loài có silhouette riêng theo
mô tả hình thái:
- **Rô:** thân dày, vây lưng gai dài, đốm gốc đuôi và đốm nắp mang.
- **Mè vinh:** thân cao, vảy bạc, vây lưng tam giác, đuôi chẻ sâu, vây ánh vàng.
- **Sặc rằn:** thân bầu dục dẹt, sọc đứt quãng, vạch chéo, vây bụng dạng sợi dài.
- **Lóc:** thân trụ dài, đầu rắn, vây lưng và vây hậu môn dài, mảng chữ V.

Đây vẫn là placeholder. Phần chi tiết sẽ được thay bằng tranh vẽ.

## Cấm
Emoji thay sinh vật, các loài chỉ khác màu trên cùng một dáng, chớp sáng mỗi lần bắt cá, màu
rarity rực, neon.
