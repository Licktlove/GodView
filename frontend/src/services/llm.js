import { api } from '../api/client';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

async function retryWithBackoff(fn, label = 'LLM') {
  let lastErr;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (status === 400 || status === 401) throw err;
      if (i < MAX_RETRIES) {
        const delay = RETRY_DELAYS[i] || 4000;
        console.warn(`[${label}] 第 ${i + 1} 次重试，${delay}ms 后…`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// 调用后端 /api/chat 代理（密钥在服务端，前端不持有）
export async function callChat(messages, { json = false, temperature = 0.7, max_tokens = 2048 } = {}) {
  const fn = async () => {
    const { data } = await api.post('/api/chat', { messages, json, temperature, max_tokens });
    if (data && data.error) {
      throw new Error(data.error + (data.detail ? ' :: ' + data.detail : ''));
    }
    const content = (data && data.content) || '';
    if (!json) return content;
    try {
      return JSON.parse(content);
    } catch (e) {
      const i = content.indexOf('{');
      const j = content.lastIndexOf('}');
      if (i >= 0 && j > i) {
        try {
          return JSON.parse(content.slice(i, j + 1));
        } catch (_) { /* fall through */ }
      }
      throw new Error('JSON解析失败：' + content.slice(0, 160));
    }
  };
  return retryWithBackoff(fn, 'LLM call');
}

export async function fetchHealth() {
  const { data } = await api.get('/api/health');
  return data;
}

// 真流式：POST /api/chat/stream，逐 token 回调 onToken(content)
// 兼容 OpenAI / dashscope SSE 格式（data: {...} / data: [DONE]）
export async function streamChat(messages, { temperature = 0.7, max_tokens = 2048, onToken, signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  if (signal) signal.addEventListener('abort', () => controller.abort());

  const fn = async () => {
    const resp = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature, max_tokens }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      throw new Error(j.error || ('HTTP ' + resp.status));
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let acc = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const ev = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 2);
        if (!ev.startsWith('data:')) continue;
        const payload = ev.slice(5).trim();
        if (payload === '[DONE]') return acc;
        try {
          const j = JSON.parse(payload);
          if (j.error) throw new Error(j.error + (j.detail ? ' :: ' + j.detail : ''));
          const delta = j.choices?.[0]?.delta?.content || j.choices?.[0]?.message?.content || '';
          if (delta) { acc += delta; onToken && onToken(delta, acc); }
        } catch (e) {
          if (e.message && (e.message.includes('error') || e.message.includes('HTTP'))) throw e;
        }
      }
    }
    return acc;
  };

  try {
    return await retryWithBackoff(fn, 'LLM stream');
  } finally {
    clearTimeout(timeout);
  }
}
