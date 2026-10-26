# Tidelora

*A living world beneath the surface.* Game câu cá và khám phá thiên nhiên. Vertical slice: **Bàu Sen**,
một bàu sen ở Đồng Tháp Mười, câu phao, 4 loài cá bản địa đã đối chiếu với FishBase.

## Chạy
```bash
pnpm install
pnpm start            # mở bằng Expo Go 58 (iOS hoặc Android)
pnpm verify           # typecheck + lint + test
BALANCE=1 pnpm test balance   # in bảng cân bằng đấu cá
pnpm sounds           # tạo lại âm thanh placeholder
```
Game chạy trong Expo Go: mọi module native dùng ở đây đều có sẵn trong Expo Go 58.

### Deep link khi phát triển (chỉ `__DEV__`)
```
exp://127.0.0.1:<port>/--/dev?new=1&to=fish                                   # hành trình mới, xuống nước
exp://127.0.0.1:<port>/--/dev?act=cast&dir=-0.5&power=0.6&auto=strike,fight,net # quăng, tự giật, tự đấu, tự vớt
exp://127.0.0.1:<port>/--/dev?store=keep | store=release | store=home
exp://127.0.0.1:<port>/--/dev?rich=1&to=kitchen                               # save có sẵn cá và tiền
exp://127.0.0.1:<port>/--/dev?debug=1                                         # lớp debug chọn loài trên màn câu
exp://127.0.0.1:<port>/--/journal?sp=channa-striata
```

## Tài liệu
`docs/PRODUCT_VISION.md` · `GAME_DESIGN.md` · `ART_DIRECTION.md` · `SPECIES_SOURCES.md` ·
`ARCHITECTURE.md` · `IMPLEMENTATION_PLAN.md` · `ASSET_MANIFEST.md` · `QA_REPORT.md` · `screenshots/`
