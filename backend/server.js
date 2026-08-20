/**
 * 门店上帝视角推演沙盘 — 后端服务
 * 职责：
 *   1. 代理 LLM 调用（密钥在服务端 .env，前端不暴露）→ 根治 CORS + 密钥泄露
 *   2. 实验（图谱/推演快照）持久化为 JSON 文件，支持回溯与对比
 *   3. 生产环境托管前端构建产物 frontend/dist
 *
 * 启动：node server.js  （开发建议用 npm run dev，带 --watch）
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

const PORT = process.env.PORT || 3001;
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-chat';
const DATA_DIR = path.join(__dirname, 'data', 'experiments');
fs.mkdirSync(DATA_DIR, { recursive: true });

// 清理 LLM 输出里的 <think> 与 markdown 代码围栏，便于 JSON 解析
function cleanLLM(s) {
  s = (s || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\n?```\s*$/, '').trim();
  return s;
}

// ---------- 健康检查 ----------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: LLM_MODEL, keyConfigured: !!LLM_API_KEY, baseURL: LLM_BASE_URL });
});

// ---------- LLM 代理（核心：密钥不出服务端） ----------
app.post('/api/chat', async (req, res) => {
  const { messages, json = false, temperature = 0.7, max_tokens = 2048 } = req.body || {};
  if (!LLM_API_KEY) {
    return res.status(400).json({ error: 'LLM_API_KEY 未配置：请在 backend/.env 设置 LLM_API_KEY（前端不持有密钥）' });
  }
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'messages 不能为空' });
  }
  // kimi-k2.x / kimi-k3 等推理模型仅支持 temperature=1，自动修正避免 400
  const adjTemp = /^kimi-k[23]/.test(LLM_MODEL) ? 1 : temperature;
  // 推理模型需要额外 token 做 reasoning，给足上限
  const adjMax = /^kimi-k[23]/.test(LLM_MODEL) ? Math.max(max_tokens, 6000) : max_tokens;
  const body = { model: LLM_MODEL, messages, temperature: adjTemp, max_tokens: adjMax };
  if (json) body.response_format = { type: 'json_object' };

  let r;
  try {
    r = await fetch(LLM_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + LLM_API_KEY },
      body: JSON.stringify(body),
    });
  } catch (netErr) {
    return res.status(502).json({ error: '上游 LLM 请求失败（base_url 不可达或被网络拦截）：' + (netErr.message || netErr) });
  }

  const text = await r.text();
  if (!r.ok) {
    return res.status(r.status).json({ error: '上游 LLM 返回错误 HTTP ' + r.status, detail: text.slice(0, 400) });
  }
  let d;
  try {
    d = JSON.parse(text);
  } catch (e) {
    const isHtml = /^\s*<(!doctype|html|head|body|!)/i.test(text) || /<html[\s>]/i.test(text.slice(0, 200));
    return res.status(502).json({
      error: '上游未返回 JSON' + (isHtml ? '（疑似 HTML 错误页：检查 LLM_BASE_URL / LLM_API_KEY）' : ''),
      detail: text.slice(0, 400),
    });
  }
  const content = cleanLLM(d.choices?.[0]?.message?.content || '');
  res.json({ content, usage: d.usage || null });
});

// ---------- LLM SSE 流式代理（真流式：逐 token 透传，报告/对话可实时渲染） ----------
app.post('/api/chat/stream', async (req, res) => {
  const { messages, temperature = 0.7, max_tokens = 2048 } = req.body || {};
  if (!LLM_API_KEY) {
    res.status(400).json({ error: 'LLM_API_KEY 未配置：请在 backend/.env 设置 LLM_API_KEY' });
    return;
  }
  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: 'messages 不能为空' });
    return;
  }
  const adjTemp = /^kimi-k[23]/.test(LLM_MODEL) ? 1 : temperature;
  const adjMax = /^kimi-k[23]/.test(LLM_MODEL) ? Math.max(max_tokens, 6000) : max_tokens;
  const body = { model: LLM_MODEL, messages, temperature: adjTemp, max_tokens: adjMax, stream: true };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let upstream;
  try {
    upstream = await fetch(LLM_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + LLM_API_KEY },
      body: JSON.stringify(body),
    });
  } catch (netErr) {
    res.write(`data: ${JSON.stringify({ error: '上游 LLM 请求失败：' + (netErr.message || netErr) })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }
  if (!upstream.ok) {
    const txt = await upstream.text();
    res.write(`data: ${JSON.stringify({ error: '上游 LLM 返回错误 HTTP ' + upstream.status, detail: txt.slice(0, 400) })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // 逐块透传上游 SSE（OpenAI / dashscope 兼容格式）
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // 上游以 \n\n 分隔事件，逐条转发
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (chunk.startsWith('data:')) res.write(chunk + '\n\n');
      }
    }
    if (buf.trim()) res.write(buf + '\n\n');
    res.write('data: [DONE]\n\n');
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: '流式读取中断：' + (e.message || e) })}\n\n`);
    res.write('data: [DONE]\n\n');
  } finally {
    res.end();
  }
});

// ---------- 实验持久化（JSON 文件） ----------
function safeId(id) {
  return /^[A-Za-z0-9_\-]+$/.test(id) ? id : null;
}

app.post('/api/experiment', (req, res) => {
  const { name, state } = req.body || {};
  const id = 'exp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rec = { id, name: name || '未命名推演', createdAt: new Date().toISOString(), state };
  try {
    fs.writeFileSync(path.join(DATA_DIR, id + '.json'), JSON.stringify(rec, null, 2));
    res.json({ id, name: rec.name });
  } catch (e) {
    res.status(500).json({ error: '保存实验失败：' + (e.message || e) });
  }
});

app.get('/api/experiments', (req, res) => {
  let files = [];
  try {
    files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  } catch (e) {
    return res.json([]);
  }
  const list = files
    .map((f) => {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
        return {
          id: j.id,
          name: j.name,
          createdAt: j.createdAt,
          nodes: (j.state && j.state.entities && j.state.entities.length) || 0,
          edges: (j.state && j.state.edges && j.state.edges.length) || 0,
        };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json(list);
});

app.get('/api/experiment/:id', (req, res) => {
  const id = safeId(req.params.id);
  if (!id) return res.status(400).json({ error: '非法实验 id' });
  const p = path.join(DATA_DIR, id + '.json');
  if (!fs.existsSync(p)) return res.status(404).json({ error: '未找到实验' });
  res.json(JSON.parse(fs.readFileSync(p, 'utf8')));
});

app.delete('/api/experiment/:id', (req, res) => {
  const id = safeId(req.params.id);
  if (!id) return res.status(400).json({ error: '非法实验 id' });
  const p = path.join(DATA_DIR, id + '.json');
  if (!fs.existsSync(p)) return res.status(404).json({ error: '未找到实验' });
  fs.unlinkSync(p);
  res.json({ ok: true });
});

// ---------- 生产环境托管前端构建产物 ----------
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[god-view] backend listening on http://localhost:${PORT}`);
  console.log(`[god-view] LLM model=${LLM_MODEL}  key=${LLM_API_KEY ? '已配置' : '未配置(请在 .env 设置 LLM_API_KEY)'}`);
});
