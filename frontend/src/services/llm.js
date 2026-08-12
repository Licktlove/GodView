import { api } from '../api/client';

// 调用后端 /api/chat 代理（密钥在服务端，前端不持有）
export async function callChat(messages, { json = false, temperature = 0.7, max_tokens = 2048 } = {}) {
  const { data } = await api.post('/api/chat', { messages, json, temperature, max_tokens });
  if (data && data.error) {
    throw new Error(data.error + (data.detail ? ' :: ' + data.detail : ''));
  }
  const content = (data && data.content) || '';
  if (!json) return content;
  // 解析 JSON（带兜底：截取首个 { 到末个 }）
  try {
    return JSON.parse(content);
  } catch (e) {
    const i = content.indexOf('{');
    const j = content.lastIndexOf('}');
    if (i >= 0 && j > i) {
      try {
        return JSON.parse(content.slice(i, j + 1));
      } catch (_) {
        /* fall through */
      }
    }
    throw new Error('JSON解析失败：' + content.slice(0, 160));
  }
}

export async function fetchHealth() {
  const { data } = await api.get('/api/health');
  return data;
}
