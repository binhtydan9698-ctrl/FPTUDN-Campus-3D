# FPT University Đà Nẵng · Campus 3D

Mô hình 3D tương tác của khuôn viên, phục vụ tuyển sinh. Xem được trên mọi thiết bị:
- Điện thoại hiển thị khung dọc 9:16.
- Máy tính hiển thị khung ngang 16:9.

## Chạy trên máy

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`. Một số tham số URL hữu ích:

| Tham số | Tác dụng |
|---|---|
| `?view=mobile` | Ép hiển thị khung 9:16 |
| `?view=desktop` | Ép hiển thị khung 16:9 |
| `?b=A` | Mở thẳng Tòa A (dùng làm link chia sẻ) |
| `?mode=night` | Mở ở chế độ đêm. Các giá trị khác: `sunset`, `rain` |
| `?debug` | Hiện FPS |

## Cập nhật thông tin tòa nhà

1. Mở **`data/campus-data.xlsx`**.
   - Sheet `ToaNha`: mỗi dòng là một tòa hoặc một khu.
   - Sheet `CaiDat`: tên trường, banner tuyển sinh, link đăng ký, hotline.
2. Lưu file, đóng Excel.
3. Chạy `npm run data` (lệnh `dev` và `build` cũng tự chạy bước này).

Cột **Mã** phải giữ nguyên vì nó nối dòng Excel với khối 3D tương ứng. Các cột khác sửa thoải mái.

### Tự động đưa lên web khi bấm Lưu (đã bật trên máy này)

Một chương trình nhỏ chạy ngầm (`tools/auto-sync.mjs`) và tự bật mỗi khi đăng nhập Windows. Mỗi lần bạn sửa Excel và bấm **Lưu**, sau khoảng 5 giây nó sẽ:
1. Kiểm tra file đọc được và không trùng mã.
2. Commit và push lên GitHub.
3. Vercel tự build lại, web cập nhật sau 1–2 phút.

Mô hình 3D mới (sau `npm run model`) cũng được đưa lên tự động theo cách này.

- Xem đã chạy chưa: mở `logs/auto-sync.log`.
- Tắt: `npm run sync:off`. Bật lại: `npm run sync:on`.
- Máy phải đang bật và có mạng. Nếu mất mạng, chương trình tự thử lại mỗi phút.

**Tùy chọn: sửa trực tuyến bằng Google Sheet, không cần deploy lại**
1. Tải `campus-data.xlsx` lên Google Drive và mở bằng Google Sheets.
2. Vào *Tệp → Chia sẻ → Công bố lên web*, chọn sheet `ToaNha`, định dạng **CSV**.
3. Dán link vừa có vào `DATA.sheetCsvUrl` trong `src/config.js`, rồi build lại một lần.

Từ đó, sửa trên Sheet là web tự cập nhật. Người xem chỉ đọc được, chỉ tài khoản Google của bạn sửa được.

## Sửa mô hình 3D

- Đổi vị trí hoặc kích thước công trình: sửa `blender/campus/layout.py`.
- Đổi hình khối: sửa `blender/campus/buildings.py`.

Sau đó chạy:

```bash
npm run model
```

Lệnh này dựng lại toàn bộ mô hình bằng Blender (chạy nền), xuất `public/models/campus.glb`, lưu `blender/campus.blend` và render ảnh `blender/preview.png` bằng card RTX. Bạn có thể mở `campus.blend` trong Blender để xem hoặc render ảnh đẹp.

## Đưa lên web

```bash
npm run build
```

Kết quả nằm trong thư mục `dist/` (khoảng 3 MB, toàn file tĩnh). Tải thư mục này lên một trong các nơi sau:
- **GitHub Pages**: tạo repo, đẩy nội dung `dist/` lên nhánh `gh-pages`.
- **Netlify / Cloudflare Pages**: kéo thả thư mục `dist/` vào trang quản trị.
- Hosting của trường: chép `dist/` vào một thư mục bất kỳ. Mọi đường dẫn đều là đường dẫn tương đối nên chạy được ở thư mục con.
