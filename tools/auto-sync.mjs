// Tự động đưa thay đổi lên web: theo dõi file Excel (và mô hình 3D), mỗi lần bạn bấm Lưu
// thì kiểm tra dữ liệu → commit → push lên GitHub → Vercel tự build và cập nhật web.
//
// Chạy tay:        node tools/auto-sync.mjs
// Bật cùng Windows: powershell -ExecutionPolicy Bypass -File tools/auto-sync-install.ps1
// Nhật ký:          logs/auto-sync.log
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

const WATCH = [
  { dir: 'data', match: (f) => f === 'campus-data.xlsx' },
  { dir: 'public/models', match: (f) => /^campus\.(glb|meta\.json|ids\.json)$/.test(f) },
];
const ADD_PATHS = ['data/campus-data.xlsx', 'public/models'];
const DEBOUNCE_MS = 5000;
const RETRY_MS = 60000;
const LOG_DIR = path.join(ROOT, 'logs');
const LOG = path.join(LOG_DIR, 'auto-sync.log');
const PID = path.join(LOG_DIR, 'auto-sync.pid');

fs.mkdirSync(LOG_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toLocaleString('vi-VN')}] ${msg}`;
  console.log(line);
  try {
    // giữ nhật ký gọn: cắt bớt khi quá 1 MB
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > 1_000_000) fs.renameSync(LOG, `${LOG}.old`);
    fs.appendFileSync(LOG, line + '\n');
  } catch { /* không ghi được nhật ký thì bỏ qua */ }
}

// chỉ cho một bản chạy cùng lúc
try {
  const old = Number(fs.readFileSync(PID, 'utf8'));
  if (old && old !== process.pid) {
    process.kill(old, 0);
    console.log(`Đã có bản tự động cập nhật đang chạy (PID ${old}).`);
    process.exit(0);
  }
} catch { /* chưa có hoặc tiến trình cũ đã tắt */ }
fs.writeFileSync(PID, String(process.pid));
const cleanup = () => { try { if (fs.readFileSync(PID, 'utf8') === String(process.pid)) fs.unlinkSync(PID); } catch { /* */ } };
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    windowsHide: true,
  });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

let timer = null;
let busy = false;
let pending = false;

function schedule(reason) {
  clearTimeout(timer);
  timer = setTimeout(() => sync(reason), DEBOUNCE_MS);
}

function sync(reason) {
  if (busy) { pending = true; return; }
  busy = true;
  try {
    // 1. kiểm tra file Excel đọc được và không lỗi dữ liệu (Excel có thể đang ghi dở → thử lại sau)
    const check = run(process.execPath, ['tools/xlsx-to-json.mjs']);
    if (!check.ok) {
      log(`Chưa đọc được file Excel (có thể đang lưu dở), thử lại sau 1 phút.\n${check.out}`);
      setTimeout(() => sync(reason), RETRY_MS);
      return;
    }
    check.out.split('\n').filter((l) => /Cảnh báo|Ghi chú/.test(l)).forEach((l) => log(l));

    // 2. commit nếu có thay đổi
    run('git', ['add', ...ADD_PATHS]);
    const changed = !run('git', ['diff', '--cached', '--quiet']).ok;
    if (changed) {
      const stamp = new Date().toLocaleString('vi-VN');
      const c = run('git', ['commit', '-m', `Cập nhật dữ liệu campus (${reason}) – ${stamp}`]);
      if (!c.ok) { log(`Commit lỗi:\n${c.out}`); return; }
      log(`Đã lưu thay đổi: ${reason}`);
    }

    // 3. push (kể cả commit cũ chưa push được do mất mạng)
    const ahead = run('git', ['rev-list', '--count', '@{u}..HEAD']);
    if (ahead.ok && ahead.out === '0') { if (!changed) log('Không có gì mới để đưa lên.'); return; }
    run('git', ['pull', '--rebase', '--autostash', '--quiet']);
    const p = run('git', ['push', '--quiet']);
    if (p.ok) log('Đã đưa lên GitHub — Vercel sẽ cập nhật web sau khoảng 1–2 phút.');
    else {
      log(`Chưa push được (mất mạng hoặc cần đăng nhập lại GitHub), thử lại sau 1 phút.\n${p.out}`);
      setTimeout(() => sync(reason), RETRY_MS);
    }
  } finally {
    busy = false;
    if (pending) { pending = false; schedule(reason); }
  }
}

for (const w of WATCH) {
  fs.mkdirSync(w.dir, { recursive: true });
  fs.watch(w.dir, (event, file) => {
    if (file && w.match(file)) schedule(w.dir === 'data' ? 'Excel' : 'mô hình 3D');
  });
}
log(`Bắt đầu theo dõi ${WATCH.map((w) => w.dir).join(', ')} — sửa Excel rồi bấm Lưu là web tự cập nhật.`);
sync('khởi động');
