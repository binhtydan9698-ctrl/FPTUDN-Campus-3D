import './style.css';
import * as THREE from 'three';
import { Viewport } from './viewport.js';
import { World } from './scene/world.js';
import { Atmosphere } from './scene/atmosphere.js';
import { Life } from './scene/life.js';
import { createBanner } from './scene/banner.js';
import { Interaction } from './interaction.js';
import { AdaptiveQuality } from './optimizer.js';
import { Ambience } from './audio.js';
import { Hud } from './ui/hud.js';
import { loadCampusData } from './data.js';

const stage = document.getElementById('stage');
const loadbar = document.getElementById('loadbar');
const params = new URLSearchParams(location.search);

async function start() {
  const viewport = new Viewport(stage);
  const world = new World(document.getElementById('c'), viewport);

  const [data, meta] = await Promise.all([
    loadCampusData(),
    world.load((p) => { loadbar.style.width = `${Math.round(p * 90)}%`; }),
  ]);
  const dataById = new Map(data.buildings.map((b) => [b.id, b]));

  const atmosphere = new Atmosphere(world, viewport.profile);
  const life = new Life(world, meta, viewport.profile);
  createBanner(world.scene, meta, data.settings || {});
  const interaction = new Interaction(world, stage, dataById);
  const audio = new Ambience();
  atmosphere.onThunder = () => audio.thunder();
  const hud = new Hud({ stage, data, world, interaction, atmosphere, audio, life });

  const fpsBadge = document.getElementById('fps');
  const debug = params.has('debug');
  fpsBadge.hidden = !debug;
  const quality = new AdaptiveQuality(world, viewport.profile, (i, t) => {
    if (debug) fpsBadge.dataset.tier = t.name;
  });

  // mở thẳng một tòa qua link chia sẻ ?b=A, hoặc thời tiết qua ?mode=night
  const mode = params.get('mode');
  if (mode) hud.setMode(mode);
  const b = params.get('b');
  if (b && world.buildings.has(b.toUpperCase())) setTimeout(() => interaction.select(b.toUpperCase(), true), 400);
  else world.camera.position.multiplyScalar(1.35);   // hiệu ứng zoom vào khi mở trang

  if (!b) interaction.flyTo(new THREE.Vector3(...viewport.profile.overview.pos), new THREE.Vector3(...viewport.profile.overview.target), 2.4);
  if (!b) stage.querySelector('[data-view="overview"]')?.classList.add('on');

  loadbar.style.width = '100%';
  setTimeout(() => document.getElementById('loading').classList.add('done'), 250);

  const clock = new THREE.Clock();
  world.renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    atmosphere.update(dt);
    life.update(dt);
    interaction.update(dt);
    world.render(dt);
    quality.update(dt);
    if (debug) fpsBadge.textContent = `${quality.fps.toFixed(0)} FPS · ${fpsBadge.dataset.tier || ''} · ${world.renderer.info.render.calls} draw`;
  });

  window.campus = { world, hud, interaction, atmosphere, quality };   // tiện kiểm tra trong DevTools
}

start().catch((err) => {
  console.error(err);
  document.getElementById('loadtip').textContent = `Không tải được mô hình: ${err.message}`;
});
