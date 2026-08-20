import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 开发时把 /api 代理到后端（3001 被其他项目占用，改用 3100），避免浏览器直连 LLM 的 CORS 问题
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3100',
    },
  },
  build: {
    outDir: 'dist',
  },
});
