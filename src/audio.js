// Âm thanh nền tạo hoàn toàn bằng Web Audio (không cần file nhạc): nhạc nền dịu, chim hót ban ngày, dế ban đêm, mưa, sấm.
export class Ambience {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.mode = 'day';
  }

  _init() {
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // tiếng ồn trắng dùng cho mưa và sấm
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    const rain = ctx.createBufferSource();
    rain.buffer = buf; rain.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
    rain.connect(lp).connect(this.rainGain).connect(this.master);
    rain.start();

    // pad hợp âm êm (Cmaj7 - Am7 - Fmaj7 - G)
    this.padGain = ctx.createGain(); this.padGain.gain.value = 0.05;
    const padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 900;
    this.padGain.connect(padFilter).connect(this.master);
    this.voices = [0, 1, 2, 3].map(() => {
      const o = ctx.createOscillator(); o.type = 'triangle';
      const g = ctx.createGain(); g.gain.value = 0.25;
      o.connect(g).connect(this.padGain); o.start();
      return o;
    });
    this.chords = [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 392.0]];
    this.chordIdx = 0;
    this._nextChord();
    this.timer = setInterval(() => this._tick(), 250);
  }

  _nextChord() {
    const t = this.ctx.currentTime;
    this.chords[this.chordIdx].forEach((f, i) => this.voices[i].frequency.setTargetAtTime(f / 2, t, 0.8));
    this.chordIdx = (this.chordIdx + 1) % this.chords.length;
    this.chordAt = t + 6;
  }

  _tick() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    if (t > this.chordAt) this._nextChord();
    if (this.mode === 'day' && Math.random() < 0.18) this._chirp();
    if (this.mode === 'night' && Math.random() < 0.5) this._cricket();
  }

  _chirp() {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    const g = ctx.createGain();
    const f = 2400 + Math.random() * 1800;
    const n = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const s = t + i * 0.11;
      o.frequency.setValueAtTime(f, s);
      o.frequency.exponentialRampToValueAtTime(f * 1.5, s + 0.06);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.03, s + 0.01);
      g.gain.linearRampToValueAtTime(0, s + 0.08);
    }
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + n * 0.11 + 0.1);
  }

  _cricket() {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 4200 + Math.random() * 400;
    const g = ctx.createGain(); g.gain.value = 0;
    for (let i = 0; i < 4; i++) {
      g.gain.setValueAtTime(0.006, t + i * 0.05);
      g.gain.setValueAtTime(0, t + i * 0.05 + 0.025);
    }
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.25);
  }

  thunder() {
    if (!this.on) return;
    const ctx = this.ctx, t = ctx.currentTime + 0.4 + Math.random();
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
    s.connect(lp).connect(g).connect(this.master);
    s.start(t); s.stop(t + 2.7);
  }

  setMode(mode) {
    this.mode = mode;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(mode === 'rain' ? 0.18 : 0, t, 0.6);
    this.padGain.gain.setTargetAtTime(mode === 'rain' ? 0.03 : 0.05, t, 0.6);
  }

  toggle() {
    if (!this.ctx) this._init();
    this.on = !this.on;
    this.ctx.resume();
    this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ctx.currentTime, 0.3);
    this.setMode(this.mode);
    return this.on;
  }
}
