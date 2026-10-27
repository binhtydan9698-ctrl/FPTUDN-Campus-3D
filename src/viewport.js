// Quy tắc khung hình: điện thoại 9:16, máy tính 16:9. Khung (#stage) luôn đúng tỉ lệ và nằm giữa màn hình.
import { PROFILES } from './config.js';

export function detectProfile() {
  const forced = new URLSearchParams(location.search).get('view');
  if (forced === 'mobile' || forced === 'desktop') return forced;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const shortSide = Math.min(screen.width, screen.height);
  const phoneUA = /Android.+Mobile|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);
  return phoneUA || (coarse && shortSide < 820) ? 'mobile' : 'desktop';
}

export class Viewport {
  constructor(stage) {
    this.stage = stage;
    this.profileName = detectProfile();
    this.profile = PROFILES[this.profileName];
    this.listeners = new Set();
    this.width = 0;
    this.height = 0;
    stage.dataset.profile = this.profileName;
    document.documentElement.dataset.profile = this.profileName;
    const update = () => this.fit();
    addEventListener('resize', update);
    addEventListener('orientationchange', update);
    document.addEventListener('fullscreenchange', update);
    this.fit();
  }

  fit() {
    const vw = document.documentElement.clientWidth;
    const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
    const a = this.profile.aspect;
    let w = vw;
    let h = w / a;
    if (h > vh) { h = vh; w = h * a; }
    w = Math.floor(w);
    h = Math.floor(h);
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.stage.style.width = `${w}px`;
    this.stage.style.height = `${h}px`;
    // Điện thoại đang xoay ngang: nhắc xoay dọc vì khung 9:16 sẽ rất nhỏ
    const landscapePhone = this.profileName === 'mobile' && vw > vh;
    document.documentElement.classList.toggle('rotate-hint', landscapePhone);
    this.listeners.forEach((fn) => fn(w, h));
  }

  onResize(fn) {
    this.listeners.add(fn);
    if (this.width) fn(this.width, this.height);
  }
}
