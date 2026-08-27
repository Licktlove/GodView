import { store, pushLog, addEpisode, pushActivity } from '../store/sim';
import { callChat } from '../services/llm';
import { computeImportance } from './importance';
import { detectCommunities, detectBridgeNodes, detectConflicts } from './analytics';
import { getScenario } from '../scenarios';
import { typeColorFor } from './palette';
import { predictKPIs } from './kpi';
import { fillEntityQuota, uniqueEntities } from './entityQuota';

export { computeImportance, typeColorFor };

function scn() { return store.scenario; }
function isPersonType(type) {
  const s = scn();
  const personTypes = s.personTypes || [];
  if (personTypes.includes(type)) return true;
  const obj = s.objectTypes || [];
  if (obj.includes(type)) return false;
  const kw = s.personKeywords || [];
  if (kw.some(k => type.includes(k))) return true;
  return false;
}
export { isPersonType };

function fill(t, ...args) { return t.replace(/\{(\w+)\}/g, (m, k) => (k in args[0] ? args[0][k] : m)); }

// 把 prompt 模板里的 {domain} 替换为当前场景领域
function P(key, extra = {}) { return fill(scn().prompts[key] || '', { domain: scn().domain, ...extra }); }
function Praw(key) { return (scn().prompts[key] || '').replace(/\{domain\}/g, scn().domain); }

// ============ Step 1: 直接用 LLM 抽取种子图谱（替代 Zep） ============
// 把"原始场景文本"交给大模型，一次性抽取实体(agent) + 初始关系，并推荐参数。
// 这是 GodView 对标 MiroFish「Zep 图谱抽取」的轻量实现：无需外部记忆云，单 LLM 即可。

// WHAT IF 假设 → 文本块（供注入 prompt）
export function assumptionsText() {
  if (!store.assumptions.length) return '';
  return '初始假设事件（世界设定的前提，所有实体与关系都应围绕这些假设展开）：\n- ' +
    store.assumptions.map(a => a.text).join('\n- ');
}

export async function genEntities() {
  const N = +store.entN;
  const seed = store.seed.trim();
  if (!seed) { pushLog('请先输入场景', 'err'); return; }
  const s = scn();
  store.ui.genRunning = true;
  store.ui.b1 = 'processing';
  store.entities = []; store.edges = []; store.growth = []; store.episodes = {};
  store.causalChains = []; store.decisions = []; store.conflicts = [];
  store.communities = []; store.bridgeNodes = [];
  store.activityFeed = []; store.simRound = 0;
  store.kpiCurves = {};
  try {
    const sys = P('sysGen');
    const asm = assumptionsText();
    const extractionTokens = Math.max(3500, Math.min(8000, 1800 + N * 180));
    const usr =
      `场景：${seed}\n\n${asm ? asm + '\n\n' : ''}请严格抽取恰好 ${N} 个相互作用的实体（agent），不能少于或多于 ${N} 个。` +
      `\n允许的类型（可自定义新类型）：${(s.entityTypes || []).join('、')}` +
      `\n严格输出JSON：{"entities":[{"id":"英文唯一id","name":"中文名","type":"实体类型","persona":"一句话人格/行为特征","goal":"核心目标"}],` +
      `"relations":[{"source":"实体id","target":"实体id","relation":"关系(<=12字)"}],` +
      `"recommend":{"rounds":推荐推演轮数3-200,"perR":每轮焦点agent数3-200,"reason":"理由"}}`;
    const data = await callChat([{ role: 'system', content: sys }, { role: 'user', content: usr }], { json: true, temperature: 0.85, max_tokens: extractionTokens });
    let ents = uniqueEntities(data.entities, N);
    let relations = Array.isArray(data.relations) ? [...data.relations] : [];
    if (ents.length < N) {
      const missing = N - ents.length;
      pushLog(`LLM 首轮抽取 ${ents.length}/${N} 个实体，正在补充 ${missing} 个…`, 'ac');
      try {
        const existing = ents.map(e => `${e.id}（${e.name || '未命名'}）`).join('、');
        const supplement = await callChat([
          { role: 'system', content: `${sys}\n你现在只负责补齐缺失实体，必须遵守数量要求，不要重复已有实体。` },
          { role: 'user', content: `当前场景：${seed}\n已有实体：${existing || '无'}\n请补充恰好 ${missing} 个全新的相互作用实体，并返回它们之间或它们与已有实体之间的必要关系。严格输出JSON：{"entities":[{"id":"英文唯一id","name":"中文名","type":"实体类型","persona":"一句话人格/行为特征","goal":"核心目标"}],"relations":[{"source":"实体id","target":"实体id","relation":"关系(<=12字)"}]}` },
        ], { json: true, temperature: 0.7, max_tokens: Math.max(1600, Math.min(6000, 900 + missing * 220)) });
        ents = uniqueEntities([...ents, ...(supplement.entities || [])], N);
        relations.push(...(Array.isArray(supplement.relations) ? supplement.relations : []));
      } catch (supplementErr) {
        pushLog(`实体补充请求失败：${supplementErr.message || supplementErr}`, 'err');
      }
    }
    if (!ents.length) throw new Error('未返回实体');
    if (ents.length < N) {
      const beforeFallback = ents.length;
      ents = fillEntityQuota(ents, N);
      pushLog(`已用本地兜底补齐 ${N - beforeFallback} 个实体，已标记为“场景补充”`, 'ac');
    }
    store.entities = ents;
    relations.forEach(r => {
      const f = store.entities.find(x => x.id === r.source || x.name === r.source);
      const t = store.entities.find(x => x.id === r.target || x.name === r.target);
      if (f && t && f.id !== t.id) {
        if (!store.edges.some(e => e.source === f.id && e.target === t.id && e.relation === r.relation))
          store.edges.push({ source: f.id, target: t.id, relation: r.relation, _new: false, round: 0, status: 'active', created_by: f.id, reason: '', effect: '' });
      }
    });

    // B1 孤儿实体兜底：LLM 可能漏抽部分关系，导致某些实体出生即孤立。
    // 把没有任何边的实体自动挂到当前最枢纽（度数最高）的实体上，避免"外圈孤点"。
    const deg = {};
    store.edges.forEach(x => { deg[x.source] = (deg[x.source] || 0) + 1; deg[x.target] = (deg[x.target] || 0) + 1; });
    const hooked = [];
    store.entities.forEach(e => {
      if (deg[e.id]) return;
      let hub = null, hubD = -1;
      store.entities.forEach(o => {
        if (o.id === e.id) return;
        const d = deg[o.id] || 0;
        if (d > hubD) { hubD = d; hub = o; }
      });
      if (hub) {
        store.edges.push({ source: e.id, target: hub.id, relation: '关联', _new: false, round: 0, status: 'active', created_by: e.id, reason: '', effect: '' });
        deg[e.id] = 1; deg[hub.id] = hubD + 1;
        hooked.push(`${e.name} → ${hub.name}`);
      }
    });
    pushLog(`LLM 抽取实体 ${store.entities.length} 个、关系 ${store.edges.length} 条` + (hooked.length ? `（孤儿挂接 ${hooked.length}）` : ''), 'ac');
    if (data.recommend) {
      const r = data.recommend;
      if (r.rounds) { store.rounds = Math.max(1, Math.min(200, r.rounds)); pushLog(`推荐轮数: ${store.rounds}（${r.reason || ''}）`, 'ac'); }
      if (r.perR) { store.perR = Math.max(1, Math.min(200, r.perR)); }
    }
    store.ui.b1 = 'success';
    store.ui.step1Done = true;
    store.growth = [{ round: 0, nodes: store.entities.length, edges: store.edges.length }];
  } catch (err) {
    store.ui.b1 = 'pending';
    pushLog('实体抽取失败：' + err.message + '（可点「加载示例」）', 'err');
  } finally {
    store.ui.genRunning = false;
  }
}

// ============ 实体画像丰富（可选，保留） ============

export async function enrichProfiles() {
  if (!store.entities.length) { pushLog('请先生成实体', 'err'); return; }
  store.ui.enrichRunning = true;
  pushLog('开始实体画像丰富…', 'ac');
  let enriched = 0;
  await Promise.all(store.entities.map(async (e) => {
    try {
      const isPerson = isPersonType(e.type);
      const sys = isPerson
        ? '你是' + scn().domain + '角色设计师。为给定 agent 生成丰富画像。输出JSON。'
        : '你是' + scn().domain + '对象分析师。为给定实体生成属性描述。输出JSON。';
      const usr = isPerson
        ? `实体：${e.name}（类型：${e.type}）\n基础人格：${e.persona || '—'}\n目标：${e.goal || '—'}\n输出JSON：{"age":年龄或null,"gender":"男|女|未知","mbti":"MBTI","bio":"2-3句背景","traits":["特征"],"preferences":["偏好"]}`
        : `实体：${e.name}（类型：${e.type}）\n描述：${e.persona || '—'}\n作用：${e.goal || '—'}\n输出JSON：{"specs":"规格","impact":"影响力","trend":"趋势","lifecycle":"生命周期","attributes":{"属性名":"值"}}`;
      const data = await callChat([{ role: 'system', content: sys }, { role: 'user', content: usr }], { json: true, temperature: 0.8, max_tokens: 600 });
      if (isPerson) {
        e.age = data.age; e.gender = data.gender; e.mbti = data.mbti; e.bio = data.bio; e.traits = data.traits || []; e.preferences = data.preferences || [];
      } else {
        e.specs = data.specs; e.impact = data.impact; e.trend = data.trend; e.lifecycle = data.lifecycle; e.attributes = data.attributes || {};
      }
      enriched++;
    } catch (err) { pushLog(`丰富 ${e.name} 失败：${err.message}`, 'err'); }
  }));
  pushLog(`✓ 画像丰富完成：${enriched}/${store.entities.length}`, 'ok');
  store.ui.enrichRunning = false;
}

// ============ Step 2: 多智能体涌现推演 ============
// 每个焦点 agent 基于「自己的邻居 + 全局近期事件」做出反应：
//   - 调整/新增与邻居的关系（含 effect）
//   - 可催生新的 agent（新实体）与新的关系
// 实体之间不靠导演"编排"，而是各自基于局势行动，宏观结构自下而上涌现。

function nameToId(s) {
  if (!s) return null;
  const e = store.entities.find(x => x.id === s || x.name === s);
  return e ? e.id : null;
}
function sample(arr, k) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}

// ⑦ 枢纽加权：按边度数计算每个实体的权重（度数越高越常出场）
function degreeMap() {
  const d = {};
  store.edges.forEach(x => { d[x.source] = (d[x.source] || 0) + 1; d[x.target] = (d[x.target] || 0) + 1; });
  return d;
}
function weightedSample(ents, k, exclude = []) {
  const pool = ents.filter(e => !exclude.includes(e.id));
  if (!pool.length || k <= 0) return [];
  const deg = degreeMap();
  const picked = [];
  const rest = pool.slice();
  while (picked.length < k && rest.length) {
    // +1 保底避免零度实体永不被抽；^0.8 平滑权重避免枢纽垄断
    const weights = rest.map(e => Math.pow((deg[e.id] || 0) + 1, 0.8));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = rest.length - 1;
    for (let i = 0; i < rest.length; i++) {
      r -= weights[i];
      if (r <= 0) { idx = i; break; }
    }
    picked.push(rest.splice(idx, 1)[0]);
  }
  return picked;
}

// 焦点选择：② 锁定角色必出场 + B2 零度/低度实体保底（治本：让孤立实体主动建边）+ ⑦ 其余按枢纽加权补足
function pickFocus() {
  const locked = store.entities.filter(e => store.lockedIds.includes(e.id));
  const lockedIds = locked.map(e => e.id);
  const quota = Math.min(store.perR, store.entities.length) - lockedIds.length;
  if (quota <= 0) return locked.slice(0, Math.min(store.perR, store.entities.length));

  // B2：预留约 40% 名额给"最不活跃"的实体（度数升序，孤立/低度优先）
  const deg = degreeMap();
  const pool = store.entities.filter(e => !lockedIds.includes(e.id));
  const sorted = pool.slice().sort((a, b) => (deg[a.id] || 0) - (deg[b.id] || 0));
  const reserve = Math.min(Math.max(1, Math.round(quota * 0.4)), sorted.length);
  const lowDeg = sorted.slice(0, reserve);
  const lowIds = lowDeg.map(e => e.id);

  // ⑦ 剩余名额按枢纽加权（排除已选）
  const rest = weightedSample(store.entities, Math.max(0, quota - reserve), [...lockedIds, ...lowIds]);
  return [...locked, ...lowDeg, ...rest].slice(0, Math.min(store.perR, store.entities.length));
}

// 构造「世界局势」摘要：所有 agent + 近期若干轮的事件流（让涌现有全局上下文）
function worldContext(recentRounds) {
  const ents = store.entities.map(e => `${e.name}(${e.type})`).join('、');
  const recentEps = [];
  Object.entries(store.episodes).forEach(([id, list]) => {
    (list || []).forEach(ep => { if (ep.round >= recentRounds) recentEps.push(`[R${ep.round}] ${store.entities.find(x => x.id === id)?.name || id}：${ep.text}`); });
  });
  const eds = store.edges.slice(-40).map(x => {
    const s = store.entities.find(y => y.id === x.source); const t = store.entities.find(y => y.id === x.target);
    return (s ? s.name : x.source) + '→' + (t ? t.name : x.target) + ':' + (x.relation || '');
  }).join('；');
  const asm = assumptionsText();
  return `实体：${ents}\n已有关系：${eds || '（暂无边）'}` + (asm ? `\n${asm}` : '') + (recentEps.length ? `\n近期事件：\n${recentEps.join('；')}` : '');
}

async function runRound(round, total) {
  const focus = pickFocus();
  const startEdgeCount = store.edges.length;
  const ctx = worldContext(Math.max(0, round - 2));
  // 并行：每个焦点 agent 独立反应（改并行提速）
  await Promise.all(focus.map(async (e) => {
    let data;
    try {
      data = await callChat(
        [{ role: 'system', content: P('sysRound') },
         { role: 'user', content: `世界局势：\n${ctx}\n\n焦点 agent：${e.name}（类型：${e.type}；人格：${e.persona || '—'}；目标：${e.goal || '—'}）\n轮次 ${round}/${total}。` +
           `\n请基于它与邻居的关系及世界局势做出反应。输出JSON：{"interactions":[{"from":"焦点名或id","to":"另一实体名或id","relation":"关系(<=12字)","effect":"对关键指标的影响简述"}],"new_entities":[{"id":"新英文id","name":"新实体中文名","type":"实体类型","persona":"一句话","goal":"核心目标"}]}` }],
        { json: true, temperature: 0.9, max_tokens: 1500 }
      );
    } catch (err) { pushLog(`轮${round} ${e.name} 交互失败：${err.message}`, 'err'); return; }
    (data.interactions || []).forEach(it => {
      const f = nameToId(it.from); const t = nameToId(it.to);
      if (f && t && f !== t) {
        if (!store.edges.some(x => x.source === f && x.target === t && x.relation === it.relation)) {
          store.edges.push({ source: f, target: t, relation: it.relation, _new: true, round, status: 'active', created_by: e.id, reason: '', effect: it.effect || '' });
          const fn = store.entities.find(x => x.id === f)?.name || it.from;
          const tn2 = store.entities.find(x => x.id === t)?.name || it.to;
          pushActivity(round, fn, `${fn} → ${tn2} 建立「${it.relation}」`, 'rel');
        }
      }
      if (it.effect) {
        const tn = store.entities.find(x => x.id === nameToId(it.to))?.name || it.to;
        addEpisode(e.id, { round, text: '与' + tn + '的' + (it.relation || '互动') + '：' + it.effect, targetName: tn, relation: it.relation, effect: it.effect });
        if (f && t && f !== e.id) addEpisode(t, { round, text: '被' + e.name + (it.relation || '互动') + '：' + it.effect, targetName: e.name, relation: it.relation, effect: it.effect });
        pushActivity(round, e.name, `${e.name} 对 ${tn} 的${it.relation || '互动'}：${it.effect}`, 'effect');
      }
    });
    (data.new_entities || []).forEach(ne => {
      if (ne.id && !store.entities.some(x => x.id === ne.id)) {
        store.entities.push({ id: ne.id, name: ne.name, type: ne.type || '组织', persona: ne.persona, goal: ne.goal, _new: true, _bornRound: round });
        // B3 涌现即建边：新 agent 出生立刻与催生它的父体建立关系，杜绝孤立
        const pid = nameToId(e.name);
        if (pid && pid !== ne.id && !store.edges.some(x => (x.source === pid && x.target === ne.id) || (x.source === ne.id && x.target === pid))) {
          store.edges.push({ source: pid, target: ne.id, relation: '催生', _new: true, round, status: 'active', created_by: e.id, reason: '', effect: '' });
          pushActivity(round, ne.name, `${e.name} 催生 ${ne.name}，并建立「催生」关系`, 'rel');
        }
        pushLog(`轮${round} 涌现新 agent：${ne.name}`, 'ok');
        pushActivity(round, ne.name, `涌现新 agent：${ne.name}（${ne.type || '组织'}）加入世界`, 'born');
      }
    });
    pushLog(`轮${round}/${total} · ${e.name} 反应完成`, 'ac');
  }));
  store.growth.push({ round, nodes: store.entities.length, edges: store.edges.length });
  store.simRound = round;
  return store.edges.length - startEdgeCount;
}

function runAnalytics() {
  store.conflicts = detectConflicts(store.edges);
  if (store.conflicts.length) pushLog(`⚠ 检测到 ${store.conflicts.length} 对冲突关系`, 'err');
  store.communities = detectCommunities(store.entities, store.edges);
  store.bridgeNodes = detectBridgeNodes(store.entities, store.edges, store.communities);
  if (store.communities.length) pushLog(`图谱分析：${store.communities.length} 个群体，${store.bridgeNodes.length} 个桥节点`, 'ac');
}

// #8 推演运行令牌：每次 runSim（含续跑）生成新 id；暂停不递增（靠 simWantsPause 标记），停止/重生成/初始化递增以作废旧令牌
let simRunId = 0;

export function invalidateSimRun() { simRunId++; }

export async function runSim() {
  const runId = ++simRunId;
  if (!store.ui.step1Done) { pushLog('请先生成实体', 'err'); return; }
  store.ui.simRunning = true;
  const isResume = store.ui.b2 === 'paused';
  const total = +store.rounds;
  const startRound = isResume ? Math.min(store.simRound + 1, total) : 1;
  if (isResume && startRound > total) {
    // 全部轮次已跑完的续跑：直接完成（KPI 已生成，simRound 已定格）
    runAnalytics();
    pushLog(`✓ 推演已完成全部 ${total} 轮（继续无新轮次）`, 'ok');
    store.ui.b2 = 'success';
    store.ui.simRunning = false;
    return;
  }
  store.ui.b2 = 'processing';
  // 续跑时收敛计数归零（暂停前已完成轮次不参与新稳态判断）
  let stable = 0;
  if (isResume) {
    pushLog(`▶ 继续推演：从第 ${startRound} 轮续跑，共 ${total} 轮`, 'ac');
  } else {
    pushLog(`▶ 启动多智能体涌现推演：${total} 轮，每轮 ${store.perR} agent` + (store.lockedIds.length ? `，锁定主角 ${store.lockedIds.length} 个` : ''), 'ac');
  }
  let endedByPause = false;
  let endedByStop = false;
  try {
    // ⑤ 稳态早停：连续 2 轮零新增关系（且已跑 >= 3 轮）→ 世界收敛，提前结束省 token
    for (let r = startRound; r <= total; r++) {
      // #8：停止路径由 stopSim 递增 simRunId 让令牌失效（runId !== simRunId → 立刻结束）
      if (runId !== simRunId) { endedByStop = true; break; }
      // #8：暂停只设 store.simWantsPause（runId 不变），本轮后自然停
      if (store.simWantsPause) { endedByPause = true; store.simWantsPause = false; break; }
      const added = await runRound(r, total);
      // KPI 数值预测：每轮推演后估算关键指标
      predictKPIs(r).catch(() => {});
      if (added === 0) stable++; else stable = 0;
      if (r >= 3 && stable >= 2) {
        pushLog(`✓ 连续 ${stable} 轮无新关系，世界在第 ${r} 轮达到稳态，提前收敛`, 'ok');
        pushActivity(r, '系统', `世界在第 ${r} 轮达到稳态，提前收敛（计划 ${total} 轮）`, 'info');
        break;
      }
    }
    runAnalytics();
    if (endedByStop) {
      store.ui.b2 = 'success';
      pushLog(`✓ 推演已停止并保留部分结果：节点 ${store.entities.length}，关系 ${store.edges.length}`, 'ok');
    } else if (endedByPause) {
      store.ui.b2 = 'paused';
      pushLog(`⏸ 已暂停：当前处于 R${store.simRound}，点「继续推演」从下一轮续跑`, 'ac');
    } else {
      store.ui.b2 = 'success';
      pushLog(`✓ 推演完成：节点 ${store.entities.length}，关系 ${store.edges.length}`, 'ok');
    }
  } catch (err) {
    // 只处理当前令牌下的中断错误，避免旧令牌错误串到新一轮
    if (runId === simRunId) {
      store.ui.b2 = 'pending';
      pushLog('推演中断：' + err.message, 'err');
    }
  } finally {
    store.simWantsPause = false; store.simStopped = false;
    store.ui.simRunning = false;
  }
}

// #8 暂停：不打断在途 agent 的 LLM 调用（保留整轮结果），当前轮全部完成后从下一轮起停
export function pauseSim() {
  if (!store.ui.simRunning) return;
  store.simWantsPause = true;
  store.simStopped = false;
  pushLog(`⏸ 已请求暂停，当前轮结束后停在 R${store.simRound}…`, 'ac');
}

// #8 停止：让所有在途轮令牌失效，保留已完成的轮次结果，并跑完分析
export function stopSim() {
  if (!store.ui.simRunning) return;
  simRunId++;
  store.simStopped = true;
  store.simWantsPause = false;
  pushLog('⏹ 正在停止推演，保留已完成部分…', 'ac');
}

// ============ Step 3: ReACT 多章节报告（章节生成供 SSE 流式调用） ============

function graphSummary() {
  return '实体：' + store.entities.map(e => e.name + '(' + e.type + ')').join('、') +
    '\n关系：' + store.edges.slice(0, 80).map(x => {
      const s = store.entities.find(y => y.id === x.source); const t = store.entities.find(y => y.id === x.target);
      return (s ? s.name : x.source) + '→' + (t ? t.name : x.target) + ':' + (x.relation || '') + (x.round ? '(R' + x.round + ')' : '');
    }).join('；');
}

// ReACT 式"预检索"：报告/分析 agent 在动笔前先查图谱证据（对标 MiroFish 的 Zep 检索工具）
export function graphRetrieval() {
  const deg = {};
  store.edges.forEach(x => { deg[x.source] = (deg[x.source] || 0) + 1; deg[x.target] = (deg[x.target] || 0) + 1; });
  const topInfluencers = Object.entries(deg).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([id, d]) => { const e = store.entities.find(x => x.id === id); return e ? `${e.name}(${e.type})·度${d}` : id; });
  const rel = {};
  store.edges.forEach(x => { rel[x.relation] = (rel[x.relation] || 0) + 1; });
  const topRelations = Object.entries(rel).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([r, c]) => `${r}×${c}`);
  const growthTrend = store.growth.slice(-12).map(g => `R${g.round}:${g.nodes}N/${g.edges}E`).join(' → ');
  const bornAgents = store.entities.filter(e => e._bornRound).map(e => `${e.name}(${e.type})`).join('、');
  return {
    topInfluencers,
    topRelations,
    growthTrend,
    conflicts: store.conflicts.length ? `${store.conflicts.length} 对冲突关系（如 ${store.conflicts.slice(0, 2).map(c => c.rel1 + '↔' + c.rel2).join('、')}）` : '无明显冲突',
    communities: store.communities.length ? `${store.communities.length} 个群体：` + store.communities.slice(0, 3).map(c => c.label).join('、') : '无明显群体聚类',
    bornAgents: bornAgents || '无新增',
    kpis: (store.scenario.kpiSchema || []).join('、'),
  };
}

export function retrievalText() {
  const r = graphRetrieval();
  return '图谱检索证据（来自结构化分析）：\n' +
    '- 影响力中心：' + (r.topInfluencers.join('、') || '—') + '\n' +
    '- 高频关系：' + (r.topRelations.join('、') || '—') + '\n' +
    '- 演化趋势：' + (r.growthTrend || '—') + '\n' +
    '- 涌现新 agent：' + r.bornAgents + '\n' +
    '- 结构：' + r.communities + '；' + r.conflicts;
}

// 报告主笔视角：从场景包 decisionLens 取「为谁写、回应什么」，避免泛泛而谈
function reportLens() {
  const s = scn();
  const lens = s.decisionLens || {};
  return {
    stakeholder: lens.stakeholder || (s.domain + '决策者'),
    concerns: (lens.concerns || []).join('、') || '经营效率与风险',
    framing: lens.framing || '围绕推演命题，给出可落地的依据与建议。',
  };
}

// 推演命题：用户真正想回答的问题 = WHAT IF 种子 + 补充假设
function propositionText() {
  const seed = store.seed.trim();
  const asm = assumptionsText();
  return seed + (asm ? '\n\n补充假设：\n' + asm : '');
}

export async function genOutline(evidence) {
  const summary = graphSummary();
  const ev = evidence || retrievalText();
  const lens = reportLens();
  const prop = propositionText();
  const outline = await callChat(
    [{ role: 'system', content: P('sysOutline', { stakeholder: lens.stakeholder, concerns: lens.concerns, framing: lens.framing, proposition: prop }) },
     { role: 'user', content: `推演终态：\n${summary}\n\n图谱检索证据：\n${ev}\n\n请规划报告大纲（JSON）。` }],
    { json: true, temperature: 0.5, max_tokens: 900 }
  );
  return outline;
}

export async function genSection(title, outline, prevDone) {
  const summary = graphSummary();
  const lens = reportLens();
  const prop = propositionText();
  const sectionSummary = summary + '\n\n已有章节：' + (prevDone || []).map(s => s.slice(0, 120)).join('；');
  const content = await callChat(
    [{ role: 'system', content: P('sysSection', { stakeholder: lens.stakeholder, concerns: lens.concerns, framing: lens.framing }) },
     { role: 'user', content: `报告标题：${outline?.title || ''}\n核心命题：${prop}\n当前章节：${title}\n推演数据：\n${sectionSummary}\n\n请撰写本章实质性内容（200-350字，Markdown）。` }],
    { json: false, temperature: 0.6, max_tokens: 1200 }
  );
  return content || '（生成失败）';
}

export async function genReport() {
  if (!store.entities.length) { pushLog('请先推演', 'err'); return; }
  store.ui.reportRunning = true;
  store.ui.b3 = 'processing';
  store.reportOutline = null; store.reportSections = {}; store.report = null;
  store.causalChains = []; store.decisions = [];
  const summary = graphSummary();
  try {
    pushLog('报告规划中…', 'ac');
    const outline = await genOutline();
    store.reportOutline = outline;
    pushLog(`报告大纲：${outline.sections?.length || 0} 章节`, 'ac');
    const sections = outline.sections || [];
    const doneContents = [];
    for (let i = 0; i < sections.length; i++) {
      store.reportSections[i] = { content: '', status: 'generating' };
      pushLog(`生成章节 ${i + 1}/${sections.length}：${sections[i].title}…`, 'ac');
      const content = await genSection(sections[i].title, outline, doneContents);
      doneContents.push(content);
      store.reportSections[i] = { content, status: 'done' };
      pushLog(`✓ 章节 ${i + 1} 完成`, 'ok');
    }
    store.causalChains = await extractCausalChains(summary);
    store.decisions = await extractDecisions(summary);
    const allContent = sections.map((s, i) => `## ${s.title}\n${store.reportSections[i]?.content || ''}`).join('\n\n');
    const lens = reportLens();
    store.report = {
      verdict: outline.summary || outline.title,
      confidence: 0.5,
      confidence_note: '面向' + lens.stakeholder + '的决策推演报告',
      proposition: propositionText(),
      fullContent: allContent,
    };
    store.ui.b3 = 'success'; store.ui.b4 = 'pending';
    pushLog('✓ 决策报告已生成', 'ok');
  } catch (err) {
    store.ui.b3 = 'pending'; pushLog('报告生成失败：' + err.message, 'err');
  } finally {
    store.ui.reportRunning = false;
  }
}

// ============ Feature 3 + 2: 因果链 / 决策 ============

async function extractCausalChains(summary) {
  try {
    const data = await callChat([{ role: 'system', content: P('sysCausal') },
      { role: 'user', content: '推演终态：\n' + summary + '\n\n请提取3-5条最重要因果链。输出JSON：{"chains":[{"path":["实体名1","实体名2","实体名3"],"relations":["关系1","关系2"],"effect":"最终影响","confidence":0.0-1.0}]}' }],
      { json: true, temperature: 0.4, max_tokens: 1000 });
    const chains = (data.chains || []).map(c => ({ ...c, path: (c.path || []).map(name => { const e = store.entities.find(x => x.name === name); return e ? e.id : null; }).filter(Boolean) }));
    pushLog('提取因果链 ' + chains.length + ' 条', 'ac');
    return chains;
  } catch (e) { pushLog('因果链提取失败：' + e.message, 'err'); return []; }
}

async function extractDecisions(summary) {
  try {
    const data = await callChat([{ role: 'system', content: P('sysDecision') },
      { role: 'user', content: '推演终态：\n' + summary + '\n\n请生成3-5条决策建议。输出JSON：{"decisions":[{"id":"d1","action":"具体行动","reasoning":"理由","expected_gain":"预期增益","confidence":0.0-1.0,"based_on":["依据"]}]}' }],
      { json: true, temperature: 0.5, max_tokens: 1000 });
    const decisions = (data.decisions || []).map((d, i) => ({ ...d, id: d.id || 'd' + (i + 1), status: 'proposed' }));
    pushLog('生成决策建议 ' + decisions.length + ' 条', 'ac');
    return decisions;
  } catch (e) { pushLog('决策提取失败：' + e.message, 'err'); return []; }
}

// ============ Step 4: Interview —— 与单个 agent 对话 ============
// 节点即 agent：把它的 persona/goal/画像 + 推演中的行为记忆，构建成 system prompt，
// 让 LLM 以该 agent 身份回答。对标 MiroFish「与世界里任意 agent 对话」，但用轻量 persona。

export async function interactWith(entityId, userMessage) {
  const e = store.entities.find(x => x.id === entityId);
  if (!e) { pushLog('未找到实体', 'err'); return; }
  store.chat.running = true;
  store.chat.target = entityId;
  store.chat.messages.push({ role: 'user', content: userMessage });
  const eps = (store.episodes[entityId] || []).map(ep => '[R' + ep.round + '] ' + ep.text).join('\n');
  const isPerson = isPersonType(e.type);
  const sysContent = isPerson
    ? P('sysChatPerson', { name: e.name, type: e.type, persona: e.persona || '—', goal: e.goal || '—', bio: e.bio ? '\n背景：' + e.bio : '', traits: e.traits ? '\n特征：' + e.traits.join('、') : '' })
    : P('sysChatObject', { name: e.name, type: e.type, persona: e.persona || '—', goal: e.goal || '—', specs: e.specs ? '\n规格：' + e.specs : '' });
  const messages = [
    { role: 'system', content: sysContent },
    ...store.chat.messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
  ];
  try {
    const reply = await callChat(messages, { json: false, temperature: 0.8, max_tokens: 800 });
    store.chat.messages.push({ role: 'assistant', content: reply || '（无回复）' });
  } catch (err) {
    store.chat.messages.push({ role: 'assistant', content: '交互失败：' + err.message });
    pushLog('交互失败：' + err.message, 'err');
  } finally {
    store.chat.running = false;
  }
}

export function startChat(entityId) {
  const e = store.entities.find(x => x.id === entityId);
  if (!e) return;
  store.chat.target = entityId;
  store.chat.messages = [];
  store.ui.b4 = 'processing';
  pushLog('开始与「' + e.name + '」深度互动（Interview）', 'ac');
}

export function endChat() {
  store.chat.target = null;
  store.chat.messages = [];
  store.ui.b4 = store.ui.b3 === 'success' ? 'success' : 'pending';
}

// ============ Interview 元层：全局分析师 ============
// 区别于「问单个角色」，analyst 带图谱上下文 + 检索证据回答全局问题（如"为什么客流掉了"）
export function analystSystemPrompt() {
  const summary = graphSummary();
  const ev = retrievalText();
  const kpis = (store.scenario.kpiSchema || []).join('、');
  return `你是「${store.scenario.domain}」推演世界的全局分析师。你的职责是对图谱推演的**整体局势**给出解释与判断，而不是扮演某个角色。\n\n当前世界图谱：\n${summary}\n\n${ev}\n\n关键 KPI：${kpis}\n回答要求：基于图谱证据作答，先说结论再给依据；数据支持处引用具体实体/关系；语言简洁（不超过 150 字）。`;
}
