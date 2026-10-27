// Renderer, camera, ánh sáng, bầu trời, nạp mô hình GLB và chuẩn bị vật liệu đặc biệt (gió, nước, đèn đêm).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MODEL, CAMERA_LIMITS } from '../config.js';

export const shared = {
  time: { value: 0 },
  wind: { value: 1 },
  rain: { value: 0 },
};

export class World {
  constructor(canvas, viewport) {
    this.viewport = viewport;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(viewport.profile.fov, viewport.profile.aspect, 2, 4000);
    const o = viewport.profile.overview;
    this.camera.position.set(...o.pos);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(...o.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = CAMERA_LIMITS.minDistance;
    this.controls.maxDistance = CAMERA_LIMITS.maxDistance;
    this.controls.maxPolarAngle = CAMERA_LIMITS.maxPolar;
    this.controls.screenSpacePanning = false;
    this.controls.zoomToCursor = true;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.addEventListener('change', () => this.clampTarget());

    this._initLights();
    this._initSky();

    this.buildings = new Map();   // id -> { root, box, center, radius, materials[] }
    this.special = { windows: [], lamps: [], water: [] };

    viewport.onResize((w, h) => this.resize(w, h));
  }

  _initLights() {
    this.hemi = new THREE.HemisphereLight('#dcefff', '#8db86b', 1.1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff3dc', 3);
    this.sun.position.set(180, 260, 140);
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.set(2048, 2048);
    Object.assign(s.camera, { left: -290, right: 290, top: 210, bottom: -210, near: 10, far: 900 });
    s.bias = -0.0004;
    s.normalBias = 0.6;
    this.sun.target.position.set(10, 0, 5);
    this.scene.add(this.sun, this.sun.target);
  }

  _initSky() {
    this.skyUniforms = { top: { value: new THREE.Color('#5fa8e8') }, bottom: { value: new THREE.Color('#d8ecfa') } };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1800, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: this.skyUniforms,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
          void main() {
            float t = smoothstep(-0.05, 0.55, vP.y);
            gl_FragColor = vec4(mix(bottom, top, t), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    sky.renderOrder = -1;
    this.scene.add(sky);
    this.scene.fog = new THREE.FogExp2('#cfe4f5', 0.0009);
  }

  resize(w, h) {
    const tier = this.qualityTier;
    const pr = Math.min(window.devicePixelRatio || 1, tier ? tier.pixelRatio : 1.5);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this._applyShift();
  }

  /** Dịch khung nhìn để chừa chỗ cho thẻ thông tin (fx, fy = tỉ lệ chiều rộng/cao, dương = nội dung sang trái/lên trên). */
  setShift(fx, fy) { this.shiftTarget = [fx, fy]; }

  _applyShift() {
    const [fx, fy] = this.shift || [0, 0];
    const w = this.viewport.width, h = this.viewport.height;
    if (Math.abs(fx) < 1e-3 && Math.abs(fy) < 1e-3) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, fx * w, fy * h, w, h);
    this.camera.updateProjectionMatrix();
  }

  applyQuality(tier) {
    this.qualityTier = tier;
    this.renderer.shadowMap.enabled = tier.shadows;
    if (this.sun.shadow.mapSize.x !== tier.shadowMap) {
      this.sun.shadow.mapSize.set(tier.shadowMap, tier.shadowMap);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.renderer.shadowMap.needsUpdate = true;
    this.resize(this.viewport.width, this.viewport.height);
  }

  clampTarget() {
    const t = this.controls.target;
    const b = CAMERA_LIMITS.bounds;
    t.x = THREE.MathUtils.clamp(t.x, -b, b + 20);
    t.z = THREE.MathUtils.clamp(t.z, -b * 0.7, b * 0.7);
    t.y = THREE.MathUtils.clamp(t.y, 0, 60);
  }

  async load(onProgress) {
    const draco = new DRACOLoader().setDecoderPath(MODEL.draco);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const [gltf, meta] = await Promise.all([
      loader.loadAsync(MODEL.url, (e) => e.total && onProgress?.(e.loaded / e.total)),
      fetch(MODEL.meta).then((r) => r.json()),
    ]);
    draco.dispose();
    this.meta = meta;
    this.model = gltf.scene;
    this._prepare(gltf.scene);
    this.scene.add(gltf.scene);
    this.renderer.shadowMap.needsUpdate = true;
    return meta;
  }

  _prepare(root) {
    const replaced = new Map();
    const swap = (mat) => {
      if (replaced.has(mat)) return replaced.get(mat);
      let out = mat;
      const n = mat.name || '';
      if (n.startsWith('Foliage')) out = windMaterial(mat);
      else if (n === 'Water' || n === 'PoolWater') { out = waterMaterial(mat, n === 'PoolWater'); this.special.water.push(out); }
      else if (n === 'Window') { out = mat.clone(); out.emissive = new THREE.Color('#ffd28a'); out.emissiveIntensity = 0; this.special.windows.push(out); }
      else if (n === 'LampBulb') { out = mat.clone(); out.emissive = new THREE.Color('#ffe2a8'); out.emissiveIntensity = 0; this.special.lamps.push(out); }
      else if (n === 'Glass' || n === 'Canopy') { out = mat.clone(); out.transparent = true; out.opacity = 0.55; out.depthWrite = false; }
      // vật liệu dùng chung có hiệu ứng riêng: không nhân bản theo tòa (đèn đêm phải bật đồng loạt)
      if (out !== mat || /^(Window|LampBulb)$/.test(n)) out.userData.special = true;
      out.flatShading = true;
      replaced.set(mat, out);
      return out;
    };

    root.traverse((o) => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
      const big = /^(BASE|ROADS|WALKWAYS|NEIGHBOURHOOD)/.test(o.name);
      o.castShadow = !big && !/WATER|LAMPS/.test(o.name);
      o.receiveShadow = true;
      o.matrixAutoUpdate = false;
      o.updateMatrix();
    });

    // Mỗi tòa có bản sao vật liệu riêng để tô sáng khi chọn mà không ảnh hưởng tòa khác.
    root.traverse((o) => {
      if (!o.name.startsWith('BLD_') || o.isMesh) return;
      const id = o.userData.buildingId || o.name.slice(4);
      if (!/^[A-Z0-9]+$/.test(id)) return;
      const materials = [];
      o.traverse((m) => {
        if (!m.isMesh) return;
        m.userData.buildingId = id;
        const own = (mat) => {
          if (mat.userData.special) return mat;
          const c = mat.clone();
          c.userData.baseEmissive = c.emissive ? c.emissive.clone() : null;
          c.userData.baseIntensity = c.emissiveIntensity ?? 0;
          materials.push(c);
          return c;
        };
        m.material = Array.isArray(m.material) ? m.material.map(own) : own(m.material);
      });
      const box = new THREE.Box3().setFromObject(o);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      this.buildings.set(id, { id, root: o, box, center, size, radius: size.length() / 2, materials });
    });
  }

  render(dt) {
    shared.time.value += dt;
    if (this.shiftTarget) {
      const s = (this.shift ||= [0, 0]);
      const k = 1 - Math.exp(-dt * 6);
      s[0] += (this.shiftTarget[0] - s[0]) * k;
      s[1] += (this.shiftTarget[1] - s[1]) * k;
      this._applyShift();
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// ------------------------------------------------------------------ vật liệu có shader tùy biến
function windMaterial(src) {
  const m = new THREE.MeshStandardMaterial({ color: src.color, roughness: 0.9, flatShading: true });
  m.name = src.name;
  m.userData.special = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.time;
    sh.uniforms.uWind = shared.wind;
    sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float h = max(position.y - 2.5, 0.0);
       float ph = position.x * 0.07 + position.z * 0.05;
       transformed.x += sin(uTime * 1.6 + ph) * 0.05 * h * uWind;
       transformed.z += cos(uTime * 1.3 + ph) * 0.035 * h * uWind;`,
    );
  };
  m.customProgramCacheKey = () => 'wind';
  return m;
}

function waterMaterial(src, pool) {
  const m = new THREE.MeshStandardMaterial({
    color: pool ? '#45c7ef' : '#2fa3b3', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.92,
  });
  m.name = src.name;
  m.userData.special = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.time;
    sh.uniforms.uRain = shared.rain;
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    sh.fragmentShader = 'uniform float uTime; uniform float uRain; varying vec3 vWP;\n' + sh.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float w = sin(vWP.x * 0.35 + uTime * 1.2) * sin(vWP.z * 0.42 - uTime * 0.9);
       w += 0.5 * sin((vWP.x + vWP.z) * 0.9 + uTime * 2.1);
       float sparkle = smoothstep(1.05, 1.45, w);
       float r = 0.0;
       if (uRain > 0.0) {
         vec2 cell = floor(vWP.xz * 0.5); vec2 f = fract(vWP.xz * 0.5) - 0.5;
         float t = fract(uTime * 0.9 + fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453));
         float d = length(f);
         r = smoothstep(0.04, 0.0, abs(d - t * 0.45)) * (1.0 - t) * uRain;
       }
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.98, 1.0), sparkle * 0.55 + r * 0.6);`,
    );
  };
  m.customProgramCacheKey = () => (pool ? 'pool' : 'water');
  return m;
}
