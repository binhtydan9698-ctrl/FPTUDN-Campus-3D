// Chuyển đổi Ngày / Hoàng hôn / Đêm / Mưa có hiệu ứng chuyển mượt, mưa rơi, chớp, mây trôi và đèn đêm.
import * as THREE from 'three';
import { ATMOSPHERE } from '../config.js';
import { shared } from './world.js';

const C = (v) => new THREE.Color(v);

export class Atmosphere {
  constructor(world, profile) {
    this.world = world;
    this.mode = 'day';
    this.from = null;
    this.t = 1;
    this.state = snapshot(ATMOSPHERE.day);
    this.lightning = 0;
    this.nextFlash = 4;
    this._initRain(profile.rainDrops);
    this._initClouds();
    this._initLampPool(profile.targetFps >= 60 ? 10 : 5);
    this._initGlow();
    this.apply(this.state);
  }

  // quầng sáng quanh bóng đèn (thay cho bloom hậu kỳ — rẻ hơn nhiều trên điện thoại)
  _initGlow() {
    const lamps = this.world.meta?.lamps;
    if (!lamps?.length) return;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,236,190,1)');
    grad.addColorStop(0.25, 'rgba(255,210,140,0.55)');
    grad.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lamps.flat(), 3));
    this.glow = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 9, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false,
    }));
    this.glow.visible = false;
    this.world.scene.add(this.glow);
  }

  set(mode) {
    if (!ATMOSPHERE[mode] || mode === this.mode) return;
    this.from = this.state;
    this.to = snapshot(ATMOSPHERE[mode]);
    this.mode = mode;
    this.t = 0;
  }

  update(dt) {
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / 1.6);
      const k = this.t * this.t * (3 - 2 * this.t);
      this.state = lerpState(this.from, this.to, k);
      this.apply(this.state);
      this.world.renderer.shadowMap.needsUpdate = true;
    }
    this._updateRain(dt);
    this._updateClouds(dt);
    this._updateLightning(dt);
    this._updateLampPool();
  }

  apply(s) {
    const w = this.world;
    w.skyUniforms.top.value.copy(s.skyTop);
    w.skyUniforms.bottom.value.copy(s.skyBottom);
    w.scene.fog.color.copy(s.fog);
    w.scene.fog.density = s.fogDensity;
    w.sun.color.copy(s.sunColor);
    w.sun.intensity = s.sunIntensity;
    w.sun.position.copy(s.sunPos);
    w.hemi.color.copy(s.hemiSky);
    w.hemi.groundColor.copy(s.hemiGround);
    w.hemi.intensity = s.hemiIntensity;
    w.renderer.toneMappingExposure = s.exposure;
    w.special.windows.forEach((m) => { m.emissiveIntensity = s.windowGlow; });
    w.special.lamps.forEach((m) => { m.emissiveIntensity = s.lampGlow; });
    if (this.glow) {
      this.glow.material.opacity = Math.min(1, s.lampGlow / 2.5);
      this.glow.visible = s.lampGlow > 0.05;
    }
    shared.rain.value = s.rain;
    shared.wind.value = 1 + s.rain * 1.8;
    this.rain.material.opacity = 0.55 * s.rain;
    this.rain.visible = s.rain > 0.02;
    this.clouds.children.forEach((c) => {
      c.material.color.copy(s.cloud);
      c.material.opacity = s.cloudOpacity;
    });
    this.lampLights.forEach((l) => { l.intensity = s.lampGlow * 60; });
  }

  // ---------------------------------------------------------------- mưa: các vệt rơi quanh camera
  _initRain(count) {
    const pos = new Float32Array(count * 6);
    this.drops = [];
    for (let i = 0; i < count; i++) {
      this.drops.push({ x: rnd(-260, 260), y: rnd(0, 220), z: rnd(-200, 200), v: rnd(70, 95) });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#cfe0f0', transparent: true, opacity: 0, fog: true }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.world.scene.add(this.rain);
  }

  _updateRain(dt) {
    if (!this.rain.visible) return;
    const p = this.rain.geometry.attributes.position.array;
    const c = this.world.controls.target;
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      d.y -= d.v * dt;
      if (d.y < 0) { d.y = rnd(150, 230); d.x = c.x + rnd(-260, 260); d.z = c.z + rnd(-200, 200); }
      const k = i * 6;
      p[k] = d.x; p[k + 1] = d.y; p[k + 2] = d.z;
      p[k + 3] = d.x + 0.4; p[k + 4] = d.y + 2.6; p[k + 5] = d.z;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  // ---------------------------------------------------------------- mây low-poly
  _initClouds() {
    this.clouds = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, flatShading: true });
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(geo, mat);
        m.scale.setScalar(rnd(9, 16));
        m.position.set(k * 12 - 18, rnd(-3, 3), rnd(-6, 6));
        c.add(m);
      }
      // mây đặt thành vòng xa quanh đế để không che khuôn viên khi nhìn toàn cảnh
      const a = (i / 9) * Math.PI * 2 + rnd(-0.2, 0.2);
      const r = rnd(620, 900);
      c.position.set(Math.cos(a) * r, rnd(90, 180), Math.sin(a) * r);
      c.scale.setScalar(rnd(1.4, 2.2));
      c.userData.speed = rnd(2, 5);
      c.material = mat;
      this.clouds.add(c);
    }
    this.world.scene.add(this.clouds);
  }

  _updateClouds(dt) {
    for (const c of this.clouds.children) {
      // trôi chậm theo vòng tròn quanh khuôn viên
      const a = Math.atan2(c.position.z, c.position.x) + (c.userData.speed * dt) / 800;
      const r = Math.hypot(c.position.x, c.position.z);
      c.position.x = Math.cos(a) * r;
      c.position.z = Math.sin(a) * r;
    }
  }

  // ---------------------------------------------------------------- chớp khi mưa
  _updateLightning(dt) {
    const w = this.world;
    if (this.mode !== 'rain' || this.t < 1) { this.lightning = 0; return; }
    this.nextFlash -= dt;
    if (this.nextFlash <= 0) {
      this.lightning = 1;
      this.nextFlash = rnd(5, 12);
      this.onThunder?.();
    }
    if (this.lightning > 0) {
      this.lightning = Math.max(0, this.lightning - dt * 3.5);
      const flicker = this.lightning > 0.5 ? (Math.random() > 0.5 ? 1 : 0.4) : this.lightning;
      w.hemi.intensity = this.state.hemiIntensity + flicker * 2.5;
      w.skyUniforms.top.value.copy(this.state.skyTop).lerp(C('#e8ecff'), flicker * 0.6);
    }
  }

  // ---------------------------------------------------------------- đèn đêm: một ít PointLight gắn vào các cột đèn gần camera
  _initLampPool(n) {
    this.lampLights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight('#ffd9a0', 0, 26, 1.6);
      l.castShadow = false;
      this.world.scene.add(l);
      this.lampLights.push(l);
    }
    this._lampTick = 0;
  }

  _updateLampPool() {
    const lamps = this.world.meta?.lamps;
    if (!lamps || this.state.lampGlow < 0.05) return;
    if ((this._lampTick = (this._lampTick + 1) % 20) !== 0) return;
    const t = this.world.controls.target;
    const near = lamps
      .map((p) => [p, (p[0] - t.x) ** 2 + (p[2] - t.z) ** 2])
      .sort((a, b) => a[1] - b[1])
      .slice(0, this.lampLights.length);
    near.forEach(([p], i) => this.lampLights[i].position.set(p[0], p[1] - 0.6, p[2]));
  }
}

function snapshot(a) {
  return {
    skyTop: C(a.skyTop), skyBottom: C(a.skyBottom), fog: C(a.fog), fogDensity: a.fogDensity,
    sunColor: C(a.sun.color), sunIntensity: a.sun.intensity, sunPos: new THREE.Vector3(...a.sun.pos),
    hemiSky: C(a.hemi.sky), hemiGround: C(a.hemi.ground), hemiIntensity: a.hemi.intensity,
    exposure: a.exposure, windowGlow: a.windowGlow, lampGlow: a.lampGlow, bloom: a.bloom, rain: a.rain ? 1 : 0,
    cloud: C(a.rain ? '#7d8794' : (a.windowGlow > 1 ? '#3b4766' : (a.windowGlow > 0 ? '#ffd2b0' : '#ffffff'))),
    cloudOpacity: a.rain ? 0.95 : (a.windowGlow > 1 ? 0.35 : 0.88),
  };
}

function lerpState(a, b, k) {
  const out = {};
  for (const key of Object.keys(b)) {
    const x = a[key], y = b[key];
    if (x?.isColor) out[key] = x.clone().lerp(y, k);
    else if (x?.isVector3) out[key] = x.clone().lerp(y, k);
    else out[key] = x + (y - x) * k;
  }
  return out;
}

function rnd(a, b) { return a + Math.random() * (b - a); }
