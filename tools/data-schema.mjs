// Cấu trúc file data/campus-data.xlsx — dùng chung cho script tạo mẫu và script chuyển sang JSON.
// Thêm cột mới: thêm một dòng vào BUILDING_COLUMNS rồi chạy `npm run data`.

export const XLSX_PATH = 'data/campus-data.xlsx';
export const JSON_OUT = 'public/data/campus-data.json';
export const MODEL_IDS = 'public/models/campus.ids.json';

export const SHEET_BUILDINGS = 'ToaNha';
export const SHEET_SETTINGS = 'CaiDat';
export const SHEET_GUIDE = 'HuongDan';

/** key: tên trường trong JSON; label: tiêu đề cột trong Excel; type: string | number | list | bool */
export const BUILDING_COLUMNS = [
  { key: 'id', label: 'Mã', type: 'string', width: 7, note: 'Khớp với khối BLD_<Mã> trong mô hình 3D. Không đổi nếu không đổi mô hình.' },
  { key: 'name', label: 'Tên hiển thị', type: 'string', width: 22 },
  { key: 'category', label: 'Loại', type: 'string', width: 16, note: 'Học tập / Ký túc xá / Thể thao / Cảnh quan / Dịch vụ' },
  { key: 'function', label: 'Chức năng', type: 'string', width: 34 },
  { key: 'floors', label: 'Số tầng', type: 'number', width: 9 },
  { key: 'area', label: 'Diện tích (m²)', type: 'number', width: 13 },
  { key: 'capacity', label: 'Sức chứa', type: 'string', width: 16 },
  { key: 'majors', label: 'Ngành / hoạt động', type: 'list', width: 34, note: 'Ngăn cách bằng dấu ;' },
  { key: 'description', label: 'Mô tả', type: 'string', width: 50 },
  { key: 'image', label: 'Ảnh (URL)', type: 'string', width: 30 },
  { key: 'link', label: 'Link chi tiết / 360°', type: 'string', width: 30 },
  { key: 'visible', label: 'Hiển thị', type: 'bool', width: 9, note: 'Có / Không' },
  { key: 'tourOrder', label: 'Thứ tự tour', type: 'number', width: 11, note: 'Để trống = không đưa vào tour tự động' },
  { key: 'internalNote', label: 'Ghi chú nội bộ', type: 'string', width: 30, note: 'Không xuất ra web' },
];

/** Các khóa cài đặt chung (sheet CaiDat: cột A = khóa, B = giá trị, C = giải thích) */
export const SETTINGS_ROWS = [
  ['campusName', 'FPT University Đà Nẵng', 'Tên hiển thị trên thanh trên cùng'],
  ['tagline', 'Khám phá khuôn viên 3D', 'Dòng phụ dưới tên'],
  ['admissionYear', '2027', 'Năm tuyển sinh hiển thị trên banner'],
  ['admissionBanner', 'TUYỂN SINH 2027', 'Chữ trên banner trong mô hình và nút kêu gọi'],
  ['ctaLabel', 'Đăng ký tư vấn', 'Chữ trên nút đăng ký'],
  ['ctaUrl', 'https://daihoc.fpt.edu.vn', 'Link khi bấm nút đăng ký'],
  ['hotline', '(cần cập nhật)', 'Số hotline tuyển sinh'],
  ['address', 'Khu đô thị FPT City, Ngũ Hành Sơn, Đà Nẵng', 'Địa chỉ'],
];
