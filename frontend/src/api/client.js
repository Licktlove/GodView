import axios from 'axios';

// 相对路径：开发时经 Vite 代理到后端 :3001，生产时由同一服务同源提供，天然无 CORS
export const api = axios.create({
  baseURL: '',
  timeout: 180000,
});
