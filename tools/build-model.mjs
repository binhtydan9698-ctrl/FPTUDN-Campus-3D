// Chạy Blender ở chế độ nền để dựng lại mô hình: npm run model [-- --no-render]
// Đường dẫn Blender lấy từ biến môi trường BLENDER_PATH, nếu không có thì tìm bản mới nhất trong Program Files.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function findBlender() {
  if (process.env.BLENDER_PATH) return process.env.BLENDER_PATH;
  const base = 'C:\\Program Files\\Blender Foundation';
  if (fs.existsSync(base)) {
    const dirs = fs.readdirSync(base).filter((d) => d.startsWith('Blender')).sort().reverse();
    for (const d of dirs) {
      const exe = path.join(base, d, 'blender.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return 'blender';
}

const blender = findBlender();
const extra = process.argv.slice(2);
console.log(`Dùng Blender: ${blender}`);
const r = spawnSync(blender, ['--background', '--factory-startup', '--python', 'blender/build.py', '--', ...extra], {
  stdio: 'inherit',
});
if (r.status !== 0) process.exit(r.status ?? 1);
// cập nhật lại JSON để đối chiếu mã tòa nhà với mô hình mới
spawnSync(process.execPath, ['tools/xlsx-to-json.mjs'], { stdio: 'inherit' });
