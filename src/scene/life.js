// Hoạt cảnh sống động: sinh viên đi theo đồ thị lối đi bộ, xe chạy trên đường bao và đường phía Nam.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SHIRTS = ['#F37021', '#F37021', '#F37021', '#ffffff', '#0066B3', '#6DB33F', '#f4d35e'];
const CARS = ['#d94040', '#3a66c4', '#eeeeee', '#2b2d31', '#eeeeee', '#F37021'];
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export class Life {
  constructor(world, meta, profile) {
    this.world = world;
    this._initPeople(meta.walk, profile.people);
    this._initCars(meta, profile.cars);
  }

  // ---------------------------------------------------------------- người đi bộ
  _initPeople(walk, count) {
    this.nodes = Object.fromEntries(Object.entries(walk.nodes).map(([k, v]) => [k, new THREE.Vector3(...v)]));
    this.adj = {};
    for (const [a, b] of walk.edges) {
      (this.adj[a] ||= []).push(b);
      (this.adj[b] ||= []).push(a);
    }
    const body = new THREE.CapsuleGeometry(0.32, 0.9, 2, 6).translate(0, 0.78, 0);
    const legs = new THREE.CylinderGeometry(0.22, 0.2, 0.55, 6).translate(0, 0.28, 0);
    const head = new THREE.SphereGeometry(0.26, 8, 6).translate(0, 1.72, 0);
    this.bodyMesh = new THREE.InstancedMesh(mergeGeometries([body]), new THREE.MeshLambertMaterial({ flatShading: true }), count);
    this.legMesh = new THREE.InstancedMesh(legs, new THREE.MeshLambertMaterial({ color: '#2d3a4f', flatShading: true }), count);
    this.headMesh = new THREE.InstancedMesh(head, new THREE.MeshLambertMaterial({ color: '#f1c7a1', flatShading: true }), count);
    const keys = Object.keys(this.nodes).filter((k) => this.adj[k]);
    const col = new THREE.Color();
    this.people = [];
    for (let i = 0; i < count; i++) {
      const from = keys[(Math.random() * keys.length) | 0];
      const to = pick(this.adj[from]);
      this.people.push({
        from, to, t: Math.random(), speed: 1.1 + Math.random() * 0.6,
        side: (Math.random() - 0.5) * 2.6, pause: 0, phase: Math.random() * 6,
        scale: 0.9 + Math.random() * 0.2,
      });
      this.bodyMesh.setColorAt(i, col.set(pick(SHIRTS)));
    }
    for (const m of [this.bodyMesh, this.legMesh, this.headMesh]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = false;
      this.world.scene.add(m);
    }
  }

  _updatePeople(dt) {
    const time = performance.now() / 1000;
    for (let i = 0; i < this.people.length; i++) {
      const p = this.people[i];
      const a = this.nodes[p.from], b = this.nodes[p.to];
      const len = a.distanceTo(b) || 1;
      if (p.pause > 0) p.pause -= dt;
      else p.t += (p.speed * dt) / len;
      if (p.t >= 1) {
        const options = this.adj[p.to].filter((n) => n !== p.from);
        p.from = p.to;
        p.to = options.length ? pick(options) : pick(this.adj[p.to]);
        p.t = 0;
        if (Math.random() < 0.18) p.pause = 2 + Math.random() * 5;   // dừng lại trò chuyện
      }
      const A = this.nodes[p.from], B = this.nodes[p.to];
      _p.lerpVectors(A, B, p.t);
      const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz) || 1;
      _p.x += (-dz / L) * p.side;
      _p.z += (dx / L) * p.side;
      const walking = p.pause <= 0;
      _p.y += walking ? Math.abs(Math.sin(time * 7 + p.phase)) * 0.08 : 0;
      _q.setFromAxisAngle(_up, Math.atan2(dx, dz));
      _s.setScalar(p.scale);
      _m.compose(_p, _q, _s);
      this.bodyMesh.setMatrixAt(i, _m);
      this.legMesh.setMatrixAt(i, _m);
      this.headMesh.setMatrixAt(i, _m);
    }
    this.bodyMesh.instanceMatrix.needsUpdate = true;
    this.legMesh.instanceMatrix.needsUpdate = true;
    this.headMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- xe
  _initCars(meta, count) {
    const loop = new THREE.CatmullRomCurve3(meta.carLoop.map((p) => new THREE.Vector3(...p)), true, 'centripetal');
    const lines = meta.carLines.map((l) => new THREE.CatmullRomCurve3(l.map((p) => new THREE.Vector3(...p)), false));
    this.routes = [{ curve: loop, closed: true, len: loop.getLength() }, ...lines.map((c) => ({ curve: c, closed: false, len: c.getLength() }))];
    const bodyG = new THREE.BoxGeometry(1.9, 0.8, 4.3).translate(0, 0.65, 0);
    const cabinG = new THREE.BoxGeometry(1.7, 0.6, 2.2).translate(0, 1.35, -0.2);
    this.carBody = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3, flatShading: true }), count);
    this.carCabin = new THREE.InstancedMesh(cabinG, new THREE.MeshStandardMaterial({ color: '#6c8eaa', roughness: 0.1, metalness: 0.2 }), count);
    this.headlights = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.5, 0.2, 0.1).translate(0, 0.75, 2.17),
      new THREE.MeshBasicMaterial({ color: '#fff4d0' }), count,
    );
    const col = new THREE.Color();
    this.cars = [];
    for (let i = 0; i < count; i++) {
      const r = i % 3 === 0 ? 1 + (i % 2) : 0;
      this.cars.push({ route: this.routes[Math.min(r, this.routes.length - 1)], s: Math.random(), speed: 7 + Math.random() * 4 });
      this.carBody.setColorAt(i, col.set(pick(CARS)));
    }
    for (const m of [this.carBody, this.carCabin, this.headlights]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = true;
      this.world.scene.add(m);
    }
    this.headlights.castShadow = false;
  }

  _updateCars(dt) {
    const tan = new THREE.Vector3();
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      c.s += (c.speed * dt) / c.route.len;
      if (c.s >= 1) c.s = c.route.closed ? c.s - 1 : 0;
      c.route.curve.getPointAt(c.s, _p);
      c.route.curve.getTangentAt(c.s, tan);
      _q.setFromAxisAngle(_up, Math.atan2(tan.x, tan.z));
      _s.setScalar(1);
      _m.compose(_p, _q, _s);
      this.carBody.setMatrixAt(i, _m);
      this.carCabin.setMatrixAt(i, _m);
      this.headlights.setMatrixAt(i, _m);
    }
    this.carBody.instanceMatrix.needsUpdate = true;
    this.carCabin.instanceMatrix.needsUpdate = true;
    this.headlights.instanceMatrix.needsUpdate = true;
  }

  setNight(k) { this.headlights.visible = k > 0.3; }

  update(dt) {
    this._updatePeople(Math.min(dt, 0.1));
    this._updateCars(Math.min(dt, 0.1));
  }
}

function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
