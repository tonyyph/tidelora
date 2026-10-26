# Asset manifest and art briefs

Máy đọc được: `assets/manifest.json`. **Mọi hình ảnh hiện tại đều là placeholder procedural**
(trạng thái `temporary`). Âm thanh được tổng hợp bằng `pnpm sounds`, cũng là tạm. Font dùng giấy
phép OFL và là bản cuối.

## Quy tắc chung khi thay asset
- Cùng một nguồn sáng: mặt trời thấp bên trái, ánh đào ấm, bóng xanh lạnh.
- Không viền đen, không neon. Saturation vừa phải.
- Cá vẽ theo **mặt bên, đầu quay trái**, nền trong suốt. Chiều rộng ảnh bằng tổng chiều dài, vì bảng đo tính tỉ lệ theo đó.
- Lớp cảnh có cùng kích thước khung và đường chân trời ở 40% chiều cao. Riêng lớp backdrop phải phủ được vùng phản chiếu.
- Thay asset không cần sửa logic. Renderer chỉ cần vẽ `Image` thay cho `Picture`.

## Brief và prompt sản xuất

### scene.bau-sen.backdrop
Bầu trời bình minh trên đồng Tháp Mười, sương mỏng; hai lớp rừng tràm (Melaleuca cajuputi) mờ dần theo phối cảnh không khí; bờ cỏ năn thấp; không có nước (shader lo phần nước).
> *Prompt:* "Painterly naturalistic matte painting, Mekong Delta wetland at dawn, Plain of Reeds Vietnam, low sun left of center behind distant melaleuca forest, layered tree lines fading in atmospheric haze, thin mist on horizon, peach and blue-grey sky with faint stratus, no water, horizon line at 40% height, cinematic, soft light, no people, no text, 16:9 wide"

### scene.bau-sen.root-trees
Năm cây tràm đứng trong nước bên phải, thân xám bạc tróc vỏ, tán rủ, rễ và gối rễ trồi lên khỏi mặt nước; nền trong suốt; có bóng phản chiếu mờ.
> *Prompt:* "Isolated melaleuca trees standing in still tea-colored water, peeling papery pale bark, drooping narrow leaves, knees breaking the surface, dawn side light from left, transparent background, painterly realism"

### scene.bau-sen.lotus
Đám sen (Nelumbo nucifera) và súng: lá nổi, lá đứng hình chén, vài nụ hồng và một ít hoa nở; sắp theo phối cảnh nhìn từ cầu gỗ cao 1,6 m.
> *Prompt:* "Lotus patch seen from 1.6 m above water, perspective receding to horizon, floating pads and emergent cupped leaves, a few pink buds and open flowers, dawn light, subtle reflections, transparent background, painterly naturalism"

### scene.bau-sen.foreground and scene.bau-sen.grass
Cầu gỗ cũ có ván lệch và cọc chìm trong nước; bờ cỏ góc trái, hơi mờ như có độ sâu trường ảnh.

### fish.* (một ảnh chi tiết và một ảnh nhỏ dùng trong cảnh cho mỗi loài)
| ID | Brief |
|---|---|
| `fish.anabas-testudineus` | Cá rô đồng: thân dày, dẹt bên vừa phải; vây lưng dài, phần trước là tia gai; nắp mang có gai; đốm sẫm ở gốc đuôi và sau nắp mang; màu ô liu xám, bụng nhạt. |
| `fish.barbonymus-gonionotus` | Cá mè vinh: thân cao, vảy bạc lớn, miệng nhỏ, vây lưng tam giác cao, đuôi chẻ sâu, vây ánh vàng cam. |
| `fish.trichopodus-pectoralis` | Cá sặc rằn: thân bầu dục dẹt; sọc sẫm đứt quãng từ mắt tới đuôi; vạch chéo kiểu da rắn; vây hậu môn rất dài; vây bụng dạng sợi kéo dài quá đuôi. |
| `fish.channa-striata` | Cá lóc đồng: thân dài gần hình trụ; đầu dẹt như đầu rắn, miệng rộng; vây lưng và vây hậu môn dài liên tục; mảng sẫm hình chữ V trên lưng; đuôi tròn. |

> *Prompt mẫu:* "Scientific naturalist illustration of {species, scientific name}, lateral view facing left, accurate fin counts and proportions per FishBase description, wet natural sheen, soft daylight from upper left, transparent background, no text"

Bắt buộc so lại với ảnh tham khảo có giấy phép rõ ràng. Không tải ảnh không rõ quyền.

### dish.*
Kho tộ trong nồi đất có nước màu keo; canh chua với me, cà chua, bạc hà, giá và thơm, đựng trong
tô sứ; cá lóc nướng trui cháy vảy trên lá chuối với rau sống. Chụp góc 30°, ánh đèn ấm.
