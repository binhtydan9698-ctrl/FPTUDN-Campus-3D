// Tự hạ/tăng chất lượng theo FPS thực tế: máy tính nhắm 60 FPS, điện thoại nhắm 30 FPS.
import { QUALITY_TIERS } from './config.js';

export class AdaptiveQuality {
  constructor(world, profile, onChange) {
    this.world = world;
    this.target = profile.targetFps;
    this.maxTier = profile.startQuality;
    this.tier = profile.startQuality;
    this.onChange = onChange;
    this.frames = 0;
    this.elapsed = 0;
    this.low = 0;
    this.high = 0;
    this.fps = 0;
    this.apply();
  }

  apply() {
    const t = QUALITY_TIERS[this.tier];
    this.world.applyQuality(t);
    this.onChange?.(this.tier, t);
  }

  update(dt) {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < 2) return;
    this.fps = this.frames / this.elapsed;
    this.frames = 0;
    this.elapsed = 0;
    if (document.hidden) return;
    if (this.fps < this.target * 0.8) { this.low++; this.high = 0; }
    else if (this.fps > this.target * 0.95) { this.high++; this.low = 0; }
    else { this.low = 0; this.high = 0; }
    if (this.low >= 2 && this.tier > 0) { this.tier--; this.low = 0; this.apply(); }
    else if (this.high >= 6 && this.tier < this.maxTier) { this.tier++; this.high = 0; this.apply(); }
  }
}
