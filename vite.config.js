import { defineConfig } from 'vite';

export default defineConfig({
  // Đường dẫn tương đối để bản build chạy được ở mọi nơi: GitHub Pages, Netlify, thư mục con...
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
