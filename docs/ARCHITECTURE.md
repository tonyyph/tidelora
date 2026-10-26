# Architecture

Expo SDK 58, React Native 0.88, TypeScript 6 strict, Expo Router (thư mục `src/app`), Reanimated 4.7,
Gesture Handler 3.3 (hook API), React Native Skia 2.14, expo-audio, expo-haptics, AsyncStorage,
zustand. pnpm (`nodeLinker: hoisted`). Chạy được trong **Expo Go 58**: mọi module native dùng ở đây
đều có sẵn trong Expo Go, nên chưa cần development build.

## Các domain
| Thư mục | Nội dung | Phụ thuộc React? |
|---|---|---|
| `simulation/` | Seeded RNG (mulberry32, trạng thái serialize được), fixed timestep (tối đa 6 bước mỗi frame, phần còn lại bị bỏ) | Không |
| `ecology/` | Kiểu dữ liệu, danh mục loài (bio tách khỏi tuning), địa điểm và microhabitat, chọn loài kèm báo cáo debug | Không |
| `fishing/session.ts` | Máy trạng thái và vật lý đấu cá, pure TypeScript | Không |
| `fishing/runtime.ts` | Adapter: vòng requestAnimationFrame, chuyển session thành `SceneFrame`, ghi đúng 1 shared value mỗi frame, phát sự kiện | Chỉ dùng kiểu Reanimated |
| `gear/`, `inventory/`, `preservation/`, `cooking/`, `economy/`, `progression/` | Transaction thuần `(save) → {ok, save} \| {ok:false, error}` | Không |
| `persistence/` | Schema có version, migration, bộ ghi tuần tự gộp ghi; settings lưu ở key riêng | Không |
| `rendering/` | Phép chiếu, cảnh Bàu Sen (picture ghi một lần, shader nước), cá, món ăn | Có |
| `audio/` | Lớp âm thanh (ambience, vòng reel và drag theo trạng thái, âm one-shot), haptic có giới hạn tần suất | Không |
| `state/gameStore.ts` | zustand: chạy transaction, chỉ commit và lưu khi `ok` | Có |
| `app/`, `ui/` | Màn hình và primitive | Có |

## Luồng một frame
`rAF → advance(accumulator) → step(session, 1/60)×n → drainEvents → audio/haptic/ripples →
frame.set(SceneFrame)`. Skia đọc `frame` trên UI thread qua `useDerivedValue`. React chỉ
render lại khi đổi phase, nên không có `setState` mỗi frame. Hai vòng âm thanh reel và drag được
cập nhật bằng poll 100 ms, không phải mỗi frame.

## Pause, resume, background
Khi `AppState` khác `active`, runtime dừng (`pause()`), tắt các vòng âm thanh, flush bản lưu và
hiện màn tạm nghỉ. Khi resume, bộ tích lũy được reset nên không có catch-up. `advance()` cũng tự
giới hạn khung thời gian ở 0,1 s và tối đa 6 bước.

## Persistence và an toàn giao dịch
- `SaveGame.version = 1`, migration từ v0, save lỗi được cất sang `tidelora/save.corrupt`.
- **Bắt cá gồm 2 bước:** `landCatch` ghi pending catch, cập nhật sổ tay và lưu. Sau đó
  `keepPending` hoặc `releasePending` xử lý. Nếu ứng dụng bị tắt ở màn kết quả, pending catch hiện
  lại khi mở; nó không vào kho và không được ghi sổ lần thứ hai.
- Bán, nấu, mua đều idempotent theo trạng thái: chạm nhanh hai lần thì lần thứ hai bị từ chối.
- Tiền, mồi và gia vị không thể âm. Cá đã nấu không dùng lại được.

## Hiệu năng
- Backdrop được raster một lần trên CPU ở tỉ lệ 1,5×, chỉ để làm nguồn phản chiếu.
- Các lớp tĩnh là SkPicture (vector, ghi một lần).
- Shader nước có 3 octave noise và 4 vòng gợn. Đồ họa tiết kiệm chỉ giữ 1 octave và tắt muỗi.
- **Chưa đo FPS trên thiết bị thật.** Xem `QA_REPORT.md`.

## Ghi chú cho simulator
Tạo texture GPU từ JS thread (`drawAsImageFromPicture`) từng làm sập SimMetalHost. Bản hiện tại
raster backdrop trên CPU, và màn mở đầu dùng `router.replace` để không bao giờ có hai cảnh Skia
cùng chạy.
