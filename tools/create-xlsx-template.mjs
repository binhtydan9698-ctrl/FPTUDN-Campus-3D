// Tạo file data/campus-data.xlsx ban đầu. Chỉ chạy một lần — nếu file đã có thì dừng để không ghi đè dữ liệu.
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  XLSX_PATH, SHEET_BUILDINGS, SHEET_SETTINGS, SHEET_GUIDE, BUILDING_COLUMNS, SETTINGS_ROWS,
} from './data-schema.mjs';

const TODO = '(cần cập nhật)';

const ROWS = [
  { id: 'A', name: 'Tòa A', category: 'Học tập', function: 'Tòa tháp trung tâm: sảnh đón, văn phòng tuyển sinh, phòng học', tourOrder: 1 },
  { id: 'B', name: 'Tòa B', category: 'Học tập', function: 'Khối giảng đường mái xanh', tourOrder: 2 },
  { id: 'C', name: 'Tòa C', category: 'Học tập', function: 'Khối giảng đường mái xanh', tourOrder: 3 },
  { id: 'D', name: 'Tòa D', category: 'Ký túc xá', function: 'Ký túc xá dãy phía Tây', tourOrder: 5 },
  { id: 'E', name: 'Tòa E', category: 'Ký túc xá', function: 'Ký túc xá dãy phía Đông', tourOrder: 6 },
  { id: 'F', name: 'Tòa F', category: 'Thể thao', function: 'Nhà thi đấu đa năng', tourOrder: 7 },
  { id: 'G', name: 'Tòa G', category: 'Dịch vụ', function: 'Tòa nhỏ giữa hồ', tourOrder: 4 },
  { id: 'H', name: 'Sân bóng', category: 'Thể thao', function: 'Cụm 4 sân bóng đá cỏ nhân tạo', tourOrder: 8 },
  { id: 'I', name: 'Bể bơi', category: 'Thể thao', function: 'Bể bơi ngoài trời' },
  { id: 'J', name: 'Hồ cảnh quan', category: 'Cảnh quan', function: 'Hồ nước trung tâm' },
  { id: 'K', name: 'Quảng trường', category: 'Cảnh quan', function: 'Quảng trường sự kiện trước Tòa A' },
  { id: 'L', name: 'Bãi xe', category: 'Dịch vụ', function: 'Bãi đỗ xe có mái che' },
];

if (fs.existsSync(XLSX_PATH)) {
  console.error(`Đã có ${XLSX_PATH} — không ghi đè. Xóa file nếu muốn tạo lại mẫu.`);
  process.exit(1);
}

const wb = new ExcelJS.Workbook();
wb.creator = 'FPT Campus 3D';

// --- Sheet tòa nhà
const ws = wb.addWorksheet(SHEET_BUILDINGS, { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
ws.columns = BUILDING_COLUMNS.map((c) => ({ header: c.label, key: c.key, width: c.width }));
for (const r of ROWS) {
  ws.addRow({
    floors: null, area: null, capacity: TODO, majors: TODO, description: TODO,
    image: '', link: '', visible: 'Có', internalNote: 'Tên và số liệu tạm — cần xác nhận',
    ...r,
  });
}
const header = ws.getRow(1);
header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF37021' } };
header.alignment = { vertical: 'middle', wrapText: true };
header.height = 30;
BUILDING_COLUMNS.forEach((c, i) => { if (c.note) ws.getCell(1, i + 1).note = c.note; });
const visibleCol = BUILDING_COLUMNS.findIndex((c) => c.key === 'visible') + 1;
for (let r = 2; r <= 200; r++) {
  ws.getCell(r, visibleCol).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Có,Không"'] };
}
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: BUILDING_COLUMNS.length } };

// --- Sheet cài đặt chung
const st = wb.addWorksheet(SHEET_SETTINGS);
st.columns = [
  { header: 'Khóa (không sửa)', key: 'k', width: 20 },
  { header: 'Giá trị', key: 'v', width: 45 },
  { header: 'Giải thích', key: 'd', width: 45 },
];
SETTINGS_ROWS.forEach(([k, v, d]) => st.addRow({ k, v, d }));
st.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
st.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066B3' } };

// --- Sheet hướng dẫn
const g = wb.addWorksheet(SHEET_GUIDE);
g.getColumn(1).width = 110;
[
  'HƯỚNG DẪN CẬP NHẬT THÔNG TIN CAMPUS 3D',
  '',
  '1. Sửa thông tin ở sheet "ToaNha" (mỗi dòng = một tòa/khu) và "CaiDat" (thông tin chung, banner tuyển sinh).',
  '2. Cột "Mã" nối dòng với khối 3D tương ứng (BLD_A, BLD_B...). Đổi tên hiển thị thoải mái, chỉ đổi Mã khi mô hình đổi theo.',
  '3. Cột "Ngành / hoạt động": nhiều mục ngăn cách bằng dấu chấm phẩy ;',
  '4. "Hiển thị" = Không: tòa vẫn có trong mô hình nhưng không bấm/không hiện thẻ thông tin.',
  '5. Lưu file, đóng Excel, chạy lệnh:  npm run data   (lệnh dev/build cũng tự chạy bước này).',
  '6. Đưa lên web: chạy  npm run build  rồi tải thư mục dist lên hosting (xem README.md).',
  '',
  'Không đổi tên các sheet và không xóa dòng tiêu đề.',
].forEach((t, i) => {
  const c = g.getCell(i + 1, 1);
  c.value = t;
  if (i === 0) c.font = { bold: true, size: 14, color: { argb: 'FFF37021' } };
});

fs.mkdirSync(path.dirname(XLSX_PATH), { recursive: true });
await wb.xlsx.writeFile(XLSX_PATH);
console.log(`Đã tạo ${XLSX_PATH} với ${ROWS.length} tòa/khu.`);
