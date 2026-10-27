// Đọc data/campus-data.xlsx → public/data/campus-data.json (file web đọc khi chạy).
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  XLSX_PATH, JSON_OUT, MODEL_IDS, SHEET_BUILDINGS, SHEET_SETTINGS, BUILDING_COLUMNS,
} from './data-schema.mjs';

const PRIVATE_KEYS = new Set(['internalNote']);

function cellText(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    if ('text' in v) return String(v.text);               // hyperlink
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('result' in v) return cellText(v.result);          // công thức
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

function convert(raw, type) {
  const s = cellText(raw);
  switch (type) {
    case 'number': {
      if (!s) return null;
      const n = Number(s.replace(/[.\s](?=\d{3}\b)/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : s; // giữ nguyên chữ nếu người nhập ghi "~1200"
    }
    case 'list': return s ? s.split(/[;\n]/).map((x) => x.trim()).filter(Boolean) : [];
    case 'bool': return !/^(không|khong|no|false|0|ẩn|an)$/i.test(s);
    default: return s;
  }
}

if (!fs.existsSync(XLSX_PATH)) {
  console.error(`Không thấy ${XLSX_PATH}. Chạy "npm run data:template" để tạo file mẫu.`);
  process.exit(1);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(XLSX_PATH);

const ws = wb.getWorksheet(SHEET_BUILDINGS);
if (!ws) throw new Error(`Thiếu sheet "${SHEET_BUILDINGS}"`);

// Ghép cột theo tiêu đề để người dùng có thể đổi thứ tự cột trong Excel.
const colByKey = {};
ws.getRow(1).eachCell((cell, col) => {
  const label = cellText(cell.value).toLowerCase();
  const def = BUILDING_COLUMNS.find((c) => c.label.toLowerCase() === label);
  if (def) colByKey[def.key] = col;
});
const missing = BUILDING_COLUMNS.filter((c) => !colByKey[c.key]).map((c) => c.label);
if (missing.length) console.warn(`Cảnh báo: thiếu cột ${missing.join(', ')}`);

const buildings = [];
const seen = new Set();
ws.eachRow((row, r) => {
  if (r === 1) return;
  const b = {};
  for (const c of BUILDING_COLUMNS) {
    if (PRIVATE_KEYS.has(c.key) || !colByKey[c.key]) continue;
    b[c.key] = convert(row.getCell(colByKey[c.key]).value, c.type);
  }
  if (!b.id) return;
  b.id = b.id.toUpperCase();
  if (seen.has(b.id)) { console.warn(`Cảnh báo: Mã "${b.id}" bị trùng (dòng ${r}) — bỏ qua dòng này.`); return; }
  seen.add(b.id);
  buildings.push(b);
});

const settings = {};
const st = wb.getWorksheet(SHEET_SETTINGS);
st?.eachRow((row, r) => {
  if (r === 1) return;
  const k = cellText(row.getCell(1).value);
  if (k) settings[k] = cellText(row.getCell(2).value);
});

// Đối chiếu với mô hình 3D (nếu đã dựng).
if (fs.existsSync(MODEL_IDS)) {
  const modelIds = new Set(JSON.parse(fs.readFileSync(MODEL_IDS, 'utf8')));
  const noModel = buildings.filter((b) => !modelIds.has(b.id)).map((b) => b.id);
  const noData = [...modelIds].filter((id) => !seen.has(id));
  if (noModel.length) console.warn(`Cảnh báo: chưa có khối 3D cho mã ${noModel.join(', ')}`);
  if (noData.length) console.warn(`Ghi chú: khối 3D ${noData.join(', ')} chưa có dòng dữ liệu`);
}

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, JSON.stringify({ updatedAt: new Date().toISOString(), settings, buildings }, null, 2));
console.log(`Đã xuất ${buildings.length} tòa/khu → ${JSON_OUT}`);
