// Nạp thông tin tòa nhà: Google Sheet (nếu cấu hình) → nếu lỗi thì dùng JSON sinh từ Excel.
import { DATA } from './config.js';
import { BUILDING_COLUMNS } from '../tools/data-schema.mjs';

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function fromCsv(text) {
  const [head, ...rest] = parseCsv(text);
  const idx = BUILDING_COLUMNS.map((c) => head.findIndex((h) => h.trim().toLowerCase() === c.label.toLowerCase()));
  const buildings = rest.map((r) => {
    const b = {};
    BUILDING_COLUMNS.forEach((c, k) => {
      if (c.key === 'internalNote' || idx[k] < 0) return;
      const s = (r[idx[k]] ?? '').trim();
      if (c.type === 'number') b[c.key] = s === '' ? null : (Number.isFinite(+s.replace(',', '.')) ? +s.replace(',', '.') : s);
      else if (c.type === 'list') b[c.key] = s ? s.split(/[;\n]/).map((x) => x.trim()).filter(Boolean) : [];
      else if (c.type === 'bool') b[c.key] = !/^(không|khong|no|false|0)$/i.test(s);
      else b[c.key] = s;
    });
    if (b.id) b.id = b.id.toUpperCase();
    return b;
  }).filter((b) => b.id);
  return { buildings, settings: {} };
}

export async function loadCampusData() {
  const base = await fetch(DATA.json, { cache: 'no-cache' }).then((r) => r.json()).catch(() => ({ buildings: [], settings: {} }));
  if (DATA.sheetCsvUrl) {
    try {
      const text = await fetch(DATA.sheetCsvUrl, { cache: 'no-cache' }).then((r) => r.text());
      const live = fromCsv(text);
      if (live.buildings.length) return { ...base, buildings: live.buildings, source: 'sheet' };
    } catch (e) {
      console.warn('Không đọc được Google Sheet, dùng dữ liệu đóng gói:', e);
    }
  }
  return { ...base, source: 'json' };
}
