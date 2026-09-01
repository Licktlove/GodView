import { store, pushLog, pushActivity } from '../store/sim';
import { callChat } from '../services/llm';
import { isPersonType } from './simulate';

// Agent 记忆演化：每 N 轮把每个 agent 的新 episode 压缩成记忆摘要 + 心境/态度演化，
// 摘要回流到后续轮次的焦点 prompt 与访谈 persona 中，实现「人格随推演演化」。

const SUMMARY_INTERVAL = 2;

// 下次触发摘要的轮次（全局），在 runRound 尾部检查
export function shouldSummarize(round) {
  return round > 0 && round % SUMMARY_INTERVAL === 0;
}

function newEpisodesSince(entityId, sinceRound) {
  return (store.episodes[entityId] || []).filter(ep => ep.round > sinceRound);
}

// 单个 agent 的记忆压缩 + 演化判断（非人格实体只做状态更新，不做心境）
async function evolveOne(e, sinceRound) {
  const eps = newEpisodesSince(e.id, sinceRound);
  if (!eps.length) return false;
  const recent = eps.slice(-12).map(ep => `[R${ep.round}] ${ep.text}`).join('\n');
  const isPerson = isPersonType(e.type);
  const prev = e.memory ? `该 agent 的当前记忆：${e.memory.summary}\n当前心境/态度：${e.memory.mood}` : '';
  const sys = isPerson
    ? `你是「${store.scenario.domain}」推演世界的记忆管理器。把 agent 最近的经历压缩为第一人称记忆，并判断其人格/心境如何被经历改变。输出JSON。`
    : `你是「${store.scenario.domain}」推演世界的状态管理器。把实体最近的变化压缩为状态摘要，并判断其态势如何演化。输出JSON。`;
  const usr = `实体：${e.name}（类型：${e.type}）
人格设定：${e.persona || '—'}
目标：${e.goal || '—'}${prev ? '\n' + prev : ''}

最近经历：
${recent}

输出JSON：{"summary":"第一人称记忆摘要（60字内，保留关键事件与数字）","mood":"演化后的心境/态度（8字内）","evolved":true或false,"evolveNote":"若 evolved=true，一句话说明心境或立场如何变化（20字内）；否则为空"}`;
  try {
    const data = await callChat([{ role: 'system', content: sys }, { role: 'user', content: usr }], { json: true, temperature: 0.5, max_tokens: 400 });
    if (!data || !data.summary) return false;
    e.memory = {
      summary: data.summary,
      mood: data.mood || (e.memory && e.memory.mood) || '平静',
      lastRound: store.simRound,
      evolveNote: data.evolved ? (data.evolveNote || '') : '',
    };
    if (data.evolved && data.evolveNote && isPerson) {
      pushActivity(store.simRound, e.name, `${e.name} 的心境变了：${data.evolveNote}`, 'mind');
    }
    return true;
  } catch (err) {
    pushLog(`记忆演化失败（${e.name}）：${err.message}`, 'err');
    return false;
  }
}

// 对「自上次摘要以来有新行为」的 agent 批量演化；返回下次触发的起点轮次
export async function evolveMemories(sinceRound) {
  const active = store.entities.filter(e => newEpisodesSince(e.id, sinceRound).length);
  if (!active.length) return sinceRound;
  pushLog(`🧠 第 ${store.simRound} 轮：${active.length} 个 agent 进行记忆演化…`, 'ac');
  const results = await Promise.all(active.map(e => evolveOne(e, sinceRound)));
  const evolved = results.filter(Boolean).length;
  pushLog(`✓ 记忆演化完成：${evolved}/${active.length} 个 agent 更新了记忆`, 'ok');
  return store.simRound;
}

// 演化块文本：注入焦点 prompt 与访谈 system prompt
export function memoryBlock(entity) {
  const m = entity && entity.memory;
  if (!m) return '';
  const lines = [`\n【演化记忆（截至 R${m.lastRound}）】`, m.summary];
  if (m.mood && m.mood !== '平静') lines.push(`当前心境：${m.mood}`);
  if (m.evolveNote) lines.push(`心境变化：${m.evolveNote}`);
  return lines.join('\n');
}
