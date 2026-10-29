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

Màu môi trường thuộc về tranh vẽ của từng cảnh (`assets/art`). Panel dùng nền xanh rêu `#142D27`, viền mờ, chữ phụ `#C4C6AF`; chỉ nút chính dùng gradient đồng.

## Chữ
- **Lora** (display, có bản italic cho logo và tên khoa học).
- **Be Vietnam Pro** (dữ liệu và thao tác).
Cả hai đều có đủ dấu tiếng Việt. Không dùng chữ mảnh nhỏ trên cảnh. Có tùy chọn chữ lớn (+15%).

## Bàu Sen: cảnh câu
Nền là bốn tranh hồ sen cùng một góc máy: sáng, trưa, chiều, đêm (xem `ASSET_MANIFEST.md`), chọn
theo giờ trong game và hòa dần giữa hai tranh. Tranh phủ kín màn hình theo kiểu cover, đường bờ xa
được ghim vào đường chân trời của phép chiếu, nên phao rơi cùng một chỗ ở mọi giờ. Trên tranh, code
vẽ thêm:
1. Mặt nước sống: shader lấy mẫu lại cả hai tranh đang hòa, gợn nhẹ ở vùng nước giữa (không gợn ở
   sen và cầu gỗ tiền cảnh), vòng sóng đúng vị trí phao, lấp lánh dọc đường nắng hoặc đường trăng.
2. Bóng cá dưới nước khi cá đến gần và khi đấu.
3. Cần theo đồ đang dùng. **Cần tre:** thân vàng có đốt, chuôi quấn dây, không có máy. **Cần
   carbon:** tay cầm bần và máy là tranh (`rod-grip-reel`), thân graphite và khoen vẽ nối từ đầu
   khớp, cong theo tải.
4. Phao theo đồ đang dùng: **phao balsa** là tranh, cắt ở mực nước; **phao lông nhím** vẽ bằng code.
   Chìm, nghiêng và nằm theo trạng thái câu.
5. Hai dải sương trôi (mờ hơn về đêm) và vignette nhẹ quanh nguồn sáng.

Chế độ giảm chuyển động làm chậm gợn và sương.

## Giới hạn
Mỗi giờ là một tranh tĩnh cộng shader: không có lớp cảnh tách rời, không có hình học 3D, cá dưới
nước chỉ là bóng. Nhà chỉ có tranh buổi sáng, đổi tông theo giờ.

## Sinh vật
Cá là tranh mặt bên, đầu quay trái (`src/rendering/fish/FishArt.tsx`). Hình thái mong muốn của
từng loài:
- **Rô:** thân dày, vây lưng gai dài, đốm gốc đuôi và đốm nắp mang.
- **Mè vinh:** thân cao, vảy bạc, vây lưng tam giác, đuôi chẻ sâu, vây ánh vàng.
- **Sặc rằn:** thân bầu dục dẹt, sọc đứt quãng, vạch chéo, vây bụng dạng sợi dài.
- **Lóc:** thân trụ dài, đầu rắn, vây lưng và vây hậu môn dài, mảng chữ V.

## Cấm
Emoji thay sinh vật, các loài chỉ khác màu trên cùng một dáng, chớp sáng mỗi lần bắt cá, màu
rarity rực, neon.
