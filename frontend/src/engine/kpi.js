import { store, pushLog } from '../store/sim';
import { callChat } from '../services/llm';

function scn() { return store.scenario; }

// 构造当前图谱的轻量摘要（用于 KPI 预测 prompt）
function roundSummary(round) {
  const ents = store.entities.map(e => `${e.name}(${e.type})`).join('、');
  const recentEdges = store.edges.filter(e => e.round >= round - 2);
  const eds = recentEdges.slice(-30).map(x => {
    const s = store.entities.find(y => y.id === x.source);
    const t = store.entities.find(y => y.id === x.target);
    return (s ? s.name : x.source) + '→' + (t ? t.name : x.target) + ':' + (x.relation || '');
  }).join('；');
  const recentEps = [];
  Object.entries(store.episodes).forEach(([id, list]) => {
    (list || []).forEach(ep => { if (ep.round >= round - 2) recentEps.push(`[R${ep.round}] ${ep.text}`); });
  });
  return {
    entities: ents,
    edges: eds || '（暂无）',
    recentEvents: recentEps.slice(-10).join('；'),
    round,
  };
}

// 每轮推演后，调用 LLM 估算每个 KPI 的数值
export async function predictKPIs(round) {
  const kpis = scn().kpiSchema || [];
  if (!kpis.length) return;

  const s = roundSummary(round);
  const kpiNames = kpis.join('、');
  const prevCurves = {};
  kpis.forEach(k => {
    const curve = store.kpiCurves[k] || [];
    if (curve.length) prevCurves[k] = curve.map(p => `R${p.round}:${p.value.toFixed(2)}`).join('→');
  });

  try {
    const data = await callChat(
      [{ role: 'system', content: `你是${scn().domain}KPI预测专家。根据当前图谱状态，估算每个KPI的数值（0-1之间的归一化值，1=最优）。` },
       { role: 'user', content:
         `当前轮次：${round}\n实体：${s.entities}\n关系：${s.edges}\n近期事件：${s.recentEvents}\n` +
         `KPI列表：${kpiNames}\n` +
         (Object.keys(prevCurves).length ? `历史趋势：\n${Object.entries(prevCurves).map(([k, v]) => `${k}: ${v}`).join('\n')}\n` : '') +
         `输出JSON：{"kpis":[{"name":"KPI名","value":0.0-1.0,"trend":"up|down|stable","confidence":0.0-1.0,"reason":"一句话"}]}` }],
      { json: true, temperature: 0.3, max_tokens: 800 }
    );

    (data.kpis || []).forEach(kpi => {
      if (!kpi.name || kpi.value == null) return;
      const name = kpis.find(k => k === kpi.name || k.includes(kpi.name) || kpi.name.includes(k)) || kpi.name;
      if (!store.kpiCurves[name]) store.kpiCurves[name] = [];
      store.kpiCurves[name].push({
        round,
        value: Math.max(0, Math.min(1, Number(kpi.value))),
        trend: kpi.trend || 'stable',
        confidence: Math.max(0, Math.min(1, Number(kpi.confidence) || 0.5)),
        reason: kpi.reason || '',
      });
    });
  } catch (err) {
    pushLog(`KPI预测失败(R${round})：${err.message}`, 'err');
    // 兜底：用上轮值插值
    kpis.forEach(k => {
      const curve = store.kpiCurves[k] || [];
      const lastVal = curve.length ? curve[curve.length - 1].value : 0.5;
      if (!store.kpiCurves[k]) store.kpiCurves[k] = [];
      store.kpiCurves[k].push({ round, value: lastVal, trend: 'stable', confidence: 0.1, reason: 'fallback' });
    });
  }
}

// 为合成数据/demo 生成模拟 KPI 曲线
export function synthesizeKPIs(growth) {
  const kpis = scn().kpiSchema || [];
  if (!kpis.length) return;
  store.kpiCurves = {};

  const trends = kpis.map(() => 0.5 + Math.random() * 0.3);
  growth.forEach(g => {
    kpis.forEach((k, i) => {
      const delta = (Math.random() - 0.45) * 0.12;
      trends[i] = Math.max(0.1, Math.min(1, trends[i] + delta));
      if (!store.kpiCurves[k]) store.kpiCurves[k] = [];
      const trend = delta > 0.02 ? 'up' : delta < -0.02 ? 'down' : 'stable';
      store.kpiCurves[k].push({
        round: g.round,
        value: Math.round(trends[i] * 100) / 100,
        trend,
        confidence: 0.5 + Math.random() * 0.3,
        reason: '',
      });
    });
  });
}