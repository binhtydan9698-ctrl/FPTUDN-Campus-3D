// Bấm/chạm chọn tòa nhà, tô sáng, bay camera, nhãn tên nổi trên tòa nhà.
import * as THREE from 'three';
import { BRAND } from './config.js';

const HIGHLIGHT = new THREE.Color(BRAND.orange);

export class Interaction {
  constructor(world, stage, dataById) {
    this.world = world;
    this.stage = stage;
    this.dataById = dataById;
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hovered = null;
    this.selected = null;
    this.onSelect = null;
    this.onUserMove = null;
    this.fly = null;
    this.pickables = [];
    for (const b of world.buildings.values()) {
      if (this.dataById.get(b.id)?.visible === false) continue;
      b.root.traverse((m) => { if (m.isMesh) this.pickables.push(m); });
    }
    this._bind();
    this._initLabels();
  }

  _bind() {
    const el = this.world.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; this.cancelFly(); this.onUserMove?.(); });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved < 6 && performance.now() - down.t < 450) this.select(this.pick(e), true);
      down = null;
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || down) return;
      const id = this.pick(e);
      if (id !== this.hovered) {
        this.hovered = id;
        el.style.cursor = id ? 'pointer' : '';
        this._paint();
      }
    });
    el.addEventListener('wheel', () => { this.cancelFly(); this.onUserMove?.(); }, { passive: true });
  }

  pick(e) {
    const r = this.world.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.world.camera);
    const hit = this.ray.intersectObjects(this.pickables, false)[0];
    return hit ? hit.object.userData.buildingId : null;
  }

  select(id, focus = false) {
    this.selected = id;
    this._paint();
    if (id && focus) this.focus(id);
    this.onSelect?.(id);
  }

  _paint() {
    for (const b of this.world.buildings.values()) {
      const k = b.id === this.selected ? 0.45 : b.id === this.hovered ? 0.22 : 0;
      for (const m of b.materials) {
        if (!m.emissive) continue;
        if (k > 0) { m.emissive.copy(HIGHLIGHT); m.emissiveIntensity = k; }
        else { m.emissive.copy(m.userData.baseEmissive || new THREE.Color(0)); m.emissiveIntensity = m.userData.baseIntensity; }
      }
    }
  }

  /** Bay camera tới một hoặc nhiều tòa; khoảng cách tính theo FOV dọc/ngang nên hợp cả khung 9:16 lẫn 16:9. */
  focus(ids, dir = [0.55, 0.6, 1]) {
    const list = (Array.isArray(ids) ? ids : [ids]).map((i) => this.world.buildings.get(i)).filter(Boolean);
    if (!list.length) return;
    const box = new THREE.Box3();
    list.forEach((b) => box.union(b.box));
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const cam = this.world.camera;
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
    // điện thoại: thẻ thông tin chiếm nửa dưới khung nên lùi camera xa hơn
    const room = this.world.viewport.profileName === 'mobile' ? 1.7 : 1.25;
    const dist = (sphere.radius * room) / Math.sin(Math.min(vfov, hfov) / 2);
    const d = new THREE.Vector3(...dir).normalize();
    const target = sphere.center.clone();
    target.y = Math.min(target.y, 18);
    this.flyTo(target.clone().addScaledVector(d, Math.max(dist, 45)), target);
  }

  flyTo(pos, target, duration = 1.6) {
    const c = this.world.controls;
    this.fly = {
      p0: this.world.camera.position.clone(), p1: pos.clone(),
      t0: c.target.clone(), t1: target.clone(), k: 0, duration,
    };
  }

  cancelFly() { this.fly = null; }

  update(dt) {
    if (this.fly) {
      const f = this.fly;
      f.k = Math.min(1, f.k + dt / f.duration);
      const e = f.k < 0.5 ? 4 * f.k ** 3 : 1 - (-2 * f.k + 2) ** 3 / 2;
      this.world.camera.position.lerpVectors(f.p0, f.p1, e);
      // nâng cung bay để không xuyên qua tòa nhà
      this.world.camera.position.y += Math.sin(e * Math.PI) * f.p0.distanceTo(f.p1) * 0.12;
      this.world.controls.target.lerpVectors(f.t0, f.t1, e);
      if (f.k >= 1) this.fly = null;
    }
    this._updateLabels();
  }

  // ---------------------------------------------------------------- nhãn tên tòa nhà (DOM)
  _initLabels() {
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'labels';
    this.stage.appendChild(this.labelLayer);
    this.labels = [];
    const heights = this.world.meta.heights || {};
    for (const b of this.world.buildings.values()) {
      const d = this.dataById.get(b.id);
      if (!d || d.visible === false) continue;
      const el = document.createElement('button');
      el.className = 'label';
      el.innerHTML = `<span class="label-id">${esc(b.id)}</span><span class="label-name">${esc(d.name || b.id)}</span>`;
      el.addEventListener('click', () => this.select(b.id, true));
      this.labelLayer.appendChild(el);
      const anchor = b.center.clone();
      anchor.y = (heights[b.id] ?? b.box.max.y) + 3;
      this.labels.push({ id: b.id, el, anchor });
    }
    this.showLabels = true;
  }

  setLabelsVisible(v) {
    this.showLabels = v;
    this.labelLayer.hidden = !v;
  }

  _updateLabels() {
    if (!this.showLabels) return;
    const cam = this.world.camera;
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    const v = new THREE.Vector3();
    for (const L of this.labels) {
      v.copy(L.anchor).project(cam);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      L.el.style.display = visible ? '' : 'none';
      if (!visible) continue;
      const dist = cam.position.distanceTo(L.anchor);
      L.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
      L.el.classList.toggle('compact', dist > 420);
      L.el.classList.toggle('active', L.id === this.selected);
      L.el.style.zIndex = String(1000 - Math.round(dist));
    }
  }
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
