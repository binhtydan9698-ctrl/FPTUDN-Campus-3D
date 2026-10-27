// Chép bộ giải nén Draco của three.js vào public/draco để GLB nén tải được cả khi deploy tĩnh.
import fs from 'node:fs';

const src = 'node_modules/three/examples/jsm/libs/draco/gltf';
const dst = 'public/draco';
fs.mkdirSync(dst, { recursive: true });
for (const f of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
  fs.copyFileSync(`${src}/${f}`, `${dst}/${f}`);
}
