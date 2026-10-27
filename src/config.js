// Mọi hằng số tinh chỉnh của app nằm ở đây.

/**
 * QUY TẮC KHUNG HÌNH (bắt buộc):
 *  - Điện thoại: khung dọc 9:16
 *  - Máy tính / máy tính bảng: khung ngang 16:9
 * Khung luôn giữ đúng tỉ lệ, phần dư của màn hình là viền thương hiệu.
 * Thử nhanh bằng tham số URL: ?view=mobile hoặc ?view=desktop
 */
export const PROFILES = {
  desktop: {
    aspect: 16 / 9,
    fov: 38,
    targetFps: 60,
    startQuality: 2,
    people: 70,
    cars: 16,
    rainDrops: 4000,
    overview: { pos: [260, 300, 380], target: [10, 0, 5] },
  },
  mobile: {
    aspect: 9 / 16,
    fov: 50,
    targetFps: 30,
    startQuality: 1,
    people: 32,
    cars: 8,
    rainDrops: 1500,
    overview: { pos: [120, 520, 470], target: [15, 0, 0] },
  },
};

/** Các nút góc nhìn nhanh. `building` = Mã tòa trong Excel; camera tự tính khoảng cách theo kích thước tòa và tỉ lệ khung. */
export const VIEWS = [
  { key: 'overview', label: 'Toàn cảnh' },
  { key: 'A', label: 'Tòa A', building: 'A', dir: [0.6, 0.55, 1] },
  { key: 'study', label: 'Khu học tập', building: ['B', 'C'], dir: [0.2, 0.75, 1] },
  { key: 'dorm', label: 'Ký túc xá', building: ['D', 'E'], dir: [-0.1, 0.8, 1] },
  { key: 'sport', label: 'Thể thao', building: ['F', 'H', 'I'], dir: [-0.3, 0.8, 1] },
  { key: 'lake', label: 'Hồ cảnh quan', building: ['J', 'G'], dir: [0.3, 0.6, 1] },
];

/** Nguồn dữ liệu tòa nhà.
 *  - Mặc định: file JSON sinh ra từ data/campus-data.xlsx (npm run data).
 *  - Tùy chọn: dán link CSV của Google Sheet (Tệp > Chia sẻ > Công bố lên web > CSV) để sửa trực tuyến không cần build lại.
 */
export const DATA = {
  json: './data/campus-data.json',
  sheetCsvUrl: '',
};

export const MODEL = {
  url: './models/campus.glb',
  meta: './models/campus.meta.json',
  draco: './draco/',
};

export const BRAND = {
  orange: '#F37021',
  blue: '#0066B3',
  green: '#6DB33F',
};

/** Thời tiết / thời điểm trong ngày */
export const ATMOSPHERE = {
  day: {
    label: 'Ngày', skyTop: '#5fa8e8', skyBottom: '#d8ecfa', fog: '#cfe4f5', fogDensity: 0.0009,
    sun: { color: '#fff3dc', intensity: 3.0, pos: [180, 260, 140] }, hemi: { sky: '#dcefff', ground: '#8db86b', intensity: 1.15 },
    exposure: 1.0, windowGlow: 0.0, lampGlow: 0.0, bloom: 0.0,
  },
  sunset: {
    label: 'Hoàng hôn', skyTop: '#5b4b8a', skyBottom: '#ffb36b', fog: '#f0b38a', fogDensity: 0.0011,
    sun: { color: '#ffb070', intensity: 2.2, pos: [-260, 70, 60] }, hemi: { sky: '#ffcfa0', ground: '#6a6a50', intensity: 0.75 },
    exposure: 1.05, windowGlow: 0.5, lampGlow: 0.8, bloom: 0.35,
  },
  night: {
    label: 'Đêm', skyTop: '#060b1f', skyBottom: '#1b2b52', fog: '#101a33', fogDensity: 0.0012,
    sun: { color: '#9fb6ff', intensity: 0.45, pos: [-120, 220, -160] }, hemi: { sky: '#3a4f8a', ground: '#141a24', intensity: 0.35 },
    exposure: 1.1, windowGlow: 1.6, lampGlow: 2.5, bloom: 0.9,
  },
  rain: {
    label: 'Mưa', skyTop: '#4d5866', skyBottom: '#9aa6b2', fog: '#8e99a4', fogDensity: 0.0022,
    sun: { color: '#d6dde6', intensity: 0.9, pos: [60, 300, 80] }, hemi: { sky: '#b6c2cf', ground: '#55604f', intensity: 0.9 },
    exposure: 0.95, windowGlow: 0.6, lampGlow: 1.0, bloom: 0.25, rain: true,
  },
};

export const QUALITY_TIERS = [
  { name: 'Thấp', pixelRatio: 1.0, shadows: false, shadowMap: 1024 },
  { name: 'Vừa', pixelRatio: 1.5, shadows: true, shadowMap: 1024 },
  { name: 'Cao', pixelRatio: 2.0, shadows: true, shadowMap: 2048 },
];

export const CAMERA_LIMITS = { minDistance: 25, maxDistance: 950, maxPolar: Math.PI * 0.46, bounds: 240 };

export const TOUR_STEP_MS = 7000;
