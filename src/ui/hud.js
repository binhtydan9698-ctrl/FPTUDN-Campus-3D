// Giao diện kính mờ: nút góc nhìn, thời tiết, công cụ, thẻ thông tin, tour tự động.
import { ATMOSPHERE, VIEWS, TOUR_STEP_MS } from '../config.js';
import { esc } from '../interaction.js';

const ICON = {
  day: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  sunset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4"/></svg>',
  night: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2M12 15v2"/></svg>',
  tour: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  labels: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
};

const TODO_RE = /cần cập nhật/i;
const fmt = (v, unit = '') => (v === null || v === undefined || v === '' ? '—' : (typeof v === 'number' ? v.toLocaleString('vi-VN') + unit : esc(v)));
const text = (v) => (TODO_RE.test(String(v ?? '')) ? `<span class="todo">${esc(v)}</span>` : esc(v));

export class Hud {
  constructor({ stage, data, world, interaction, atmosphere, audio, life }) {
    Object.assign(this, { stage, data, world, interaction, atmosphere, audio, life });
    this.byId = new Map(data.buildings.map((b) => [b.id, b]));
    this.card = stage.querySelector('#card');
    this.tourTimer = null;
    this._settings(data.settings || {});
    this._views();
    this._weather();
    this._tools();
    interaction.onSelect = (id) => this.showCard(id);
    interaction.onUserMove = () => this.stopTour();
  }

  _settings(s) {
    const $ = (id) => this.stage.querySelector(id);
    if (s.campusName) $('#campusName').textContent = s.campusName;
    if (s.tagline) $('#tagline').textContent = s.tagline;
    const cta = $('#cta');
    cta.textContent = s.ctaLabel || 'Đăng ký tư vấn';
    cta.href = s.ctaUrl || '#';
    if (s.campusName) document.title = `${s.campusName} · Campus 3D`;
  }

  _views() {
    const nav = this.stage.querySelector('#views');
    nav.innerHTML = VIEWS.map((v) => `<button class="chip" data-view="${v.key}">${esc(v.label)}</button>`).join('');
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (!b) return;
      this.stopTour();
      this.goView(b.dataset.view);
    });
  }

  goView(key) {
    const v = VIEWS.find((x) => x.key === key);
    if (!v) return;
    this.stage.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === key));
    if (key === 'overview') {
      const o = this.world.viewport.profile.overview;
      this.interaction.select(null);
      this.interaction.flyTo(new this.world.camera.position.constructor(...o.pos), new this.world.camera.position.constructor(...o.target));
      return;
    }
    const ids = Array.isArray(v.building) ? v.building : [v.building];
    this.interaction.focus(ids, v.dir);
    this.interaction.select(ids.length === 1 ? ids[0] : null);
  }

  _weather() {
    const seg = this.stage.querySelector('#weather');
    seg.innerHTML = Object.entries(ATMOSPHERE)
      .map(([k, a]) => `<button data-mode="${k}" class="${k === 'day' ? 'on' : ''}" title="${esc(a.label)}">${ICON[k]}<span>${esc(a.label)}</span></button>`)
      .join('');
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (b) this.setMode(b.dataset.mode);
    });
  }

  setMode(mode) {
    this.atmosphere.set(mode);
    this.audio.setMode(mode);
    this.life.setNight(ATMOSPHERE[mode].windowGlow);
    this.stage.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  }

  _tools() {
    const tools = this.stage.querySelector('#tools');
    tools.innerHTML = `
      <button data-act="tour" title="Tour tự động">${ICON.tour}<span>Tour</span></button>
      <button data-act="labels" class="on" title="Hiện tên tòa nhà">${ICON.labels}<span>Nhãn</span></button>
      <button data-act="sound" title="Âm thanh">${ICON.sound}<span>Âm thanh</span></button>
      <button data-act="full" title="Toàn màn hình">${ICON.full}<span>Toàn màn hình</span></button>`;
    tools.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'tour') this.tourTimer ? this.stopTour() : this.startTour();
      if (act === 'labels') {
        const on = !b.classList.contains('on');
        b.classList.toggle('on', on);
        this.interaction.setLabelsVisible(on);
      }
      if (act === 'sound') b.classList.toggle('on', this.audio.toggle());
      if (act === 'full') {
        if (document.fullscreenElement) document.exitFullscreen();
        else (document.documentElement.requestFullscreen?.() ?? this.stage.requestFullscreen?.());
      }
    });
  }

  showCard(id) {
    const d = id && this.byId.get(id);
    const url = new URL(location.href);
    if (d) url.searchParams.set('b', id); else url.searchParams.delete('b');
    history.replaceState(null, '', url);
    const open = !!d && d.visible !== false;
    const mobile = this.world.viewport.profileName === 'mobile';
    this.world.setShift(open && !mobile ? 0.16 : 0, open && mobile ? 0.24 : 0);
    if (!open) { this.card.hidden = true; return; }
    const s = this.data.settings || {};
    const majors = (d.majors || []).map((m) => `<span class="tag">${text(m)}</span>`).join('');
    this.card.innerHTML = `
      <button class="close" aria-label="Đóng">✕</button>
      <span class="cat">${esc(d.category || '')} · ${esc(d.id)}</span>
      <h2>${esc(d.name || d.id)}</h2>
      <p class="fn">${text(d.function || '')}</p>
      ${d.image ? `<img src="${esc(d.image)}" alt="${esc(d.name)}" loading="lazy" />` : ''}
      <div class="stats">
        <div class="stat"><b>${fmt(d.floors)}</b><small>Số tầng</small></div>
        <div class="stat"><b>${fmt(d.area, ' m²')}</b><small>Diện tích</small></div>
        <div class="stat"><b>${text(d.capacity || '—')}</b><small>Sức chứa</small></div>
      </div>
      ${majors ? `<div class="tags">${majors}</div>` : ''}
      ${d.description ? `<p class="desc">${text(d.description)}</p>` : ''}
      <div class="actions">
        <a class="primary" href="${esc(s.ctaUrl || '#')}" target="_blank" rel="noopener">${esc(s.ctaLabel || 'Đăng ký tư vấn')}</a>
        ${d.link ? `<a class="ghost" href="${esc(d.link)}" target="_blank" rel="noopener">Xem chi tiết</a>` : ''}
      </div>`;
    this.card.hidden = false;
    this.card.querySelector('.close').onclick = () => this.interaction.select(null);
  }

  // ---------------------------------------------------------------- tour tự động theo cột "Thứ tự tour"
  startTour() {
    const steps = this.data.buildings
      .filter((b) => b.visible !== false && Number.isFinite(b.tourOrder) && this.world.buildings.has(b.id))
      .sort((a, b) => a.tourOrder - b.tourOrder);
    if (!steps.length) return;
    let i = 0;
    const btn = this.stage.querySelector('[data-act="tour"]');
    btn.classList.add('on');
    btn.innerHTML = `${ICON.stop}<span>Dừng</span>`;
    const next = () => {
      const b = steps[i % steps.length];
      this.interaction.focus(b.id, [Math.sin(i * 1.3) * 0.8, 0.6, Math.cos(i * 1.3)]);
      this.interaction.select(b.id);
      i++;
      this.tourTimer = setTimeout(next, TOUR_STEP_MS);
    };
    next();
  }

  stopTour() {
    if (!this.tourTimer) return;
    clearTimeout(this.tourTimer);
    this.tourTimer = null;
    const btn = this.stage.querySelector('[data-act="tour"]');
    btn.classList.remove('on');
    btn.innerHTML = `${ICON.tour}<span>Tour</span>`;
  }
}
