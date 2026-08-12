import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 开发时把 /api 代理到后端（默认 3001），避免了浏览器直连 LLM 的 CORS 问题
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
});
