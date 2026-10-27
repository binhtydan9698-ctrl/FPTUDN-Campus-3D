// Banner tuyển sinh trong không gian 3D — chữ lấy từ sheet CaiDat nên đổi năm/khẩu hiệu không cần dựng lại mô hình.
import * as THREE from 'three';
import { BRAND } from '../config.js';

export function createBanner(scene, meta, settings) {
  const W = 1024, H = 384;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, BRAND.orange);
  grad.addColorStop(1, '#ff9a3c');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  for (let i = 0; i < 8; i++) g.fillRect(i * 150 - 40, 0, 60, H);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = '800 120px "Plus Jakarta Sans", system-ui, sans-serif';
  g.fillText(settings.admissionBanner || 'TUYỂN SINH', W / 2, 170);
  g.font = '600 52px "Plus Jakarta Sans", system-ui, sans-serif';
  g.fillText(settings.campusName || 'FPT University', W / 2, 270);
  const stripe = [BRAND.orange, BRAND.blue, BRAND.green];
  stripe.forEach((c, i) => { g.fillStyle = c === BRAND.orange ? '#ffffff' : c; g.fillRect(W / 2 - 120 + i * 80, 310, 70, 14); });

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const group = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(24, 9), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  board.position.y = 9.5;
  group.add(board);
  const postMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
  for (const x of [-11, 11]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 8), postMat);
    post.position.set(x, 7, -0.2);
    post.castShadow = true;
    group.add(post);
  }
  group.position.set(...meta.banner.pos);
  group.rotation.y = meta.banner.rotY;
  scene.add(group);
  return group;
}
