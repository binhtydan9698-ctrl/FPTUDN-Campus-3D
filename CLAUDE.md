# FPT Campus 3D — quy tắc dự án

Diorama 3D khuôn viên FPT University Đà Nẵng phục vụ tuyển sinh. Mô hình dựng bằng script Python cho Blender, web chạy bằng Three.js + Vite.

## Quy tắc bắt buộc

- **Khung hình:** điện thoại luôn hiển thị khung dọc **9:16**, máy tính và máy tính bảng luôn hiển thị khung ngang **16:9**. Logic nằm ở `src/viewport.js` và `PROFILES` trong `src/config.js`. Mọi giao diện mới phải nằm trong `#stage` và dùng đơn vị container (`cqw`/`cqh`) để co giãn theo khung. Kiểm tra cả `?view=mobile` và `?view=desktop`.
- **Dữ liệu tòa nhà chỉ sửa trong `data/campus-data.xlsx`.** Không ghi số liệu tòa nhà vào code. `public/data/campus-data.json` là file sinh tự động (`npm run data`), không sửa tay.
- **Không tự bịa số liệu thật** (diện tích, số tầng, ngành). Chưa có thì để "(cần cập nhật)".
- **Mã tòa (A, B, C...)** nối Excel với mô hình qua Empty `BLD_<Mã>` trong Blender. Đổi mã ở một bên thì phải đổi cả bên kia.
- **Tên vật liệu trong Blender là hợp đồng với web:** `Foliage*` có gió, `Water`/`PoolWater` có shader nước, `Window` và `LampBulb` sáng ban đêm. Đổi tên thì phải sửa `src/scene/world.js`.
- **Web chỉ để xem.** Không thêm chức năng sửa dữ liệu phía người xem. Chỉ chủ dự án chỉnh qua Excel/Google Sheet rồi deploy.

## Lệnh

- `npm run dev`: chạy thử, mở `http://localhost:5173`. Thêm `?debug` để xem FPS.
- `npm run model`: dựng lại mô hình bằng Blender (`blender/build.py`), xuất `public/models/campus.glb` và render `blender/preview.png`. Thêm `-- --no-render` để bỏ bước render.
- `npm run data`: chuyển Excel sang JSON.
- `npm run build`: bản deploy nằm trong `dist/`.

## Cấu trúc

- `blender/campus/layout.py`: tọa độ và kích thước mọi công trình (mét; X = Đông, Y = Bắc).
- `blender/campus/buildings.py`, `landscape.py`: hình khối.
- `src/scene/*`: world (renderer, vật liệu), atmosphere (thời tiết), life (người, xe), banner.
- `src/ui/hud.js`: giao diện; `src/interaction.js`: chọn tòa, bay camera, nhãn.
