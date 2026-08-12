import { store, pushLog, addEpisode } from '../store/sim';
import { callChat } from '../services/llm';
import { computeImportance } from './importance';

export { computeImportance };

const TYPECOLOR = {
  '顾客分群': '#FF6B35', '门店': '#004E89', '竞品': '#C5283D', '供应商': '#1A936F',
  '员工': '#795548', '环境': '#9E9E9E', '商品': '#4CAF50', 'KPI': '#FFC107', '组织': '#9C27B0',
};
export { TYPECOLOR };

const PERSON_TYPES = ['顾客分群', '门店', '员工', '竞品', '供应商', '组织', '物流', '平台', '媒体'];
const OBJECT_TYPES = ['商品', '环境', 'KPI'];
const PERSON_KEYWORDS = ['人', '客', '员', '长', '师', '者', '商', '户', '家', '管', '导', '工', '手', '达'];
function isPersonType(type) { if (PERSON_TYPES.includes(type)) return true; if (OBJECT_TYPES.includes(type)) return false; return PERSON_KEYWORDS.some(k => type.includes(k)); }

// ============ Step 1: Generate Entities + Auto-recommend params ============

const SYS_GEN =
  '你是零售决策推演引擎。根据用户给出的经营场景，自动实例化一批在该场景中会相互作用的实体。每个实体要有鲜明人格/目标。';
const USR_GEN = (N, seed) =>
  `场景：${seed}\n请生成最多 ${N} 个实体。\n基础类型有9种：顾客分群、门店、竞品、供应商、员工、环境、商品、KPI、组织。你也可以根据场景需要创建新的实体类型（如物流、平台、政策、媒体等）。\n严格输出JSON：{"entities":[{"id":"英文唯一id","name":"中文名","type":"实体类型(基础9种或自定义新类型)","persona":"一句话人格/行为特征","goal":"核心目标"}],"recommend":{"rounds":推荐推演轮数3-200的整数,"perR":每轮焦点实体数3-200的整数,"reason":"推荐理由"}}`;

export async function genEntities() {
  const N = +store.entN;
  const seed = store.seed.trim();
  if (!seed) { pushLog('请先输入场景', 'err'); return; }
  store.ui.genRunning = true;
  store.ui.b1 = 'processing';
  store.entities = []; store.edges = []; store.growth = []; store.episodes = {};
  try {
    const data = await callChat(
      [{ role: 'system', content: SYS_GEN }, { role: 'user', content: USR_GEN(N, seed) }],
      { json: true, temperature: 0.85, max_tokens: 3000 }
    );
    store.entities = (data.entities || [])
      .filter(e => e && e.id)
      .filter((e, i, a) => a.findIndex(x => x.id === e.id) === i)
      .slice(0, N);
    if (!store.entities.length) throw new Error('未返回实体');
    pushLog(`LLM 生成实体 ${store.entities.length} 个`, 'ac');

    // Auto-recommend params (feature 5)
    if (data.recommend) {
      const r = data.recommend;
      if (r.rounds) { store.rounds = Math.max(1, Math.min(200, r.rounds)); pushLog(`推荐轮数: ${store.rounds}（${r.reason || ''}）`, 'ac'); }
      if (r.perR) { store.perR = Math.max(1, Math.min(200, r.perR)); }
    }

    store.ui.b1 = 'success';
    store.ui.step1Done = true;
    store.growth = [{ round: 0, nodes: store.entities.length, edges: 0 }];
  } catch (err) {
    store.ui.b1 = 'pending';
    pushLog('实体生成失败：' + err.message, 'err');
  } finally {
    store.ui.genRunning = false;
  }
}

// ============ Entity Profile Enrichment (feature 3) ============

const SYS_ENRICH_PERSON =
  '你是零售角色设计师。为给定实体生成丰富的人物画像，包括年龄、性别、MBTI、详细背景故事和行为偏好。输出JSON。';
const USR_ENRICH_PERSON = (e) =>
  `实体：${e.name}（类型：${e.type}）\n基础人格：${e.persona || '—'}\n目标：${e.goal || '—'}\n请生成详细画像。输出JSON：{"age":年龄整数或null,"gender":"男|女|未知","mbti":"MBTI类型","bio":"2-3句详细背景故事","traits":["性格特征关键词"],"preferences":["行为偏好"]}`;

const SYS_ENRICH_OBJECT =
  '你是零售商品/环境分析师。为给定实体生成丰富的属性描述，包括规格、影响力、趋势等。输出JSON。';
const USR_ENRICH_OBJECT = (e) =>
  `实体：${e.name}（类型：${e.type}）\n基础描述：${e.persona || '—'}\n目标/作用：${e.goal || '—'}\n请生成详细属性。输出JSON：{"specs":"规格/特征描述","impact":"对经营的影响力分析","trend":"趋势判断","lifecycle":"生命周期描述","attributes":{"自定义属性名":"属性值"}}`;

export async function enrichProfiles() {
  if (!store.entities.length) { pushLog('请先生成实体', 'err'); return; }
  store.ui.enrichRunning = true;
  pushLog('开始实体画像丰富…', 'ac');
  let enriched = 0;
  for (const e of store.entities) {
    try {
      const isPerson = isPersonType(e.type);
      const data = await callChat(
        [{ role: 'system', content: isPerson ? SYS_ENRICH_PERSON : SYS_ENRICH_OBJECT },
         { role: 'user', content: isPerson ? USR_ENRICH_PERSON(e) : USR_ENRICH_OBJECT(e) }],
        { json: true, temperature: 0.8, max_tokens: 600 }
      );
      if (isPerson) {
        e.age = data.age; e.gender = data.gender; e.mbti = data.mbti;
        e.bio = data.bio; e.traits = data.traits || []; e.preferences = data.preferences || [];
      } else {
        e.specs = data.specs; e.impact = data.impact; e.trend = data.trend;
        e.lifecycle = data.lifecycle; e.attributes = data.attributes || {};
      }
      enriched++;
    } catch (err) {
      pushLog(`丰富 ${e.name} 失败：${err.message}`, 'err');
    }
  }
  pushLog(`✓ 画像丰富完成：${enriched}/${store.entities.length}`, 'ok');
  store.ui.enrichRunning = false;
}

// ============ Step 2: Self-growth Simulation (feature 4 + 7) ============

const SYS_ROUND =
  '你是零售推演模拟器。给定当前世界状态，让焦点实体基于人格行动，可能产生新关系或催生新实体。输出严格JSON。';
const USR_ROUND = (e, round, total, summary) =>
  `当前世界：\n${summary}\n\n焦点实体：${e.name}（人格：${e.persona || '—'}；目标：${e.goal || '—'}）\n轮次 ${round}/${total}。\n输出JSON：{"interactions":[{"from":"焦点实体名或id","to":"另一实体名或id","relation":"关系(<=12字)","effect":"对经营指标影响简述"}],"new_entities":[{"id":"新英文id","name":"新实体中文名","type":"实体类型(基础9种或自定义新类型)","persona":"一句话","goal":"核心目标"}]}`;

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
function graphSummary() {
  const ents = store.entities.map(e => `${e.name}(${e.type})`).join('、');
  const eds = store.edges.length
    ? '\n已有关系：' + store.edges.slice(0, 30).map(x => {
        const s = store.entities.find(y => y.id === x.source);
        const t = store.entities.find(y => y.id === x.target);
        return `${s ? s.name : x.source}→${t ? t.name : x.target}:${x.relation || ''}`;
      }).join('；')
    : '（暂无边）';
  return ents + eds;
}

async function runRound(round, total) {
  const focus = sample(store.entities, Math.min(store.perR, store.entities.length));
  for (const e of focus) {
    let data;
    try {
      data = await callChat(
        [{ role: 'system', content: SYS_ROUND }, { role: 'user', content: USR_ROUND(e, round, total, graphSummary()) }],
        { json: true, temperature: 0.9, max_tokens: 1500 }
      );
    } catch (err) {
      pushLog(`轮${round} ${e.name} 交互失败：${err.message}`, 'err');
      continue;
    }
    (data.interactions || []).forEach(it => {
      const f = nameToId(it.from);
      const t = nameToId(it.to);
      if (f && t && f !== t) {
        if (!store.edges.some(x => x.source === f && x.target === t && x.relation === it.relation)) {
          // Feature 7: temporal edges - track round and status
          store.edges.push({ source: f, target: t, relation: it.relation, _new: true, round, status: 'active' });
        }
      }
      // Feature 4: episode logging
      if (it.effect) {
        const targetName = store.entities.find(x => x.id === nameToId(it.to))?.name || it.to;
        addEpisode(e.id, { round, text: `与${targetName}的${it.relation || '互动'}：${it.effect}`, targetName, relation: it.relation, effect: it.effect });
        if (f && t && f !== e.id) {
          addEpisode(t, { round, text: `被${e.name}${it.relation || '互动'}：${it.effect}`, targetName: e.name, relation: it.relation, effect: it.effect });
        }
      }
    });
    (data.new_entities || []).forEach(ne => {
      if (ne.id && !store.entities.some(x => x.id === ne.id)) {
        store.entities.push({ id: ne.id, name: ne.name, type: ne.type || '组织', persona: ne.persona, goal: ne.goal, _new: true, _bornRound: round });
        pushLog(`轮${round} 涌现新实体：${ne.name}`, 'ok');
      }
    });
    pushLog(`轮${round}/${total} · ${e.name} 完成交互`, 'ac');
  }
  store.growth.push({ round, nodes: store.entities.length, edges: store.edges.length });
}

export async function runSim() {
  if (!store.ui.step1Done) { pushLog('请先生成实体', 'err'); return; }
  store.ui.simRunning = true;
  store.ui.b2 = 'processing';
  const total = +store.rounds;
  pushLog(`▶ 启动自生长推演：${total} 轮，每轮 ${store.perR} 实体`, 'ac');
  try {
    for (let r = 1; r <= total; r++) { await runRound(r, total); }
    pushLog(`✓ 推演完成：节点 ${store.entities.length}，关系 ${store.edges.length}`, 'ok');
    store.ui.b2 = 'success';
  } catch (err) {
    store.ui.b2 = 'pending';
    pushLog('推演中断：' + err.message, 'err');
  } finally {
    store.ui.simRunning = false;
  }
}

// ============ Step 3: ReACT Multi-section Report (feature 2) ============

const SYS_OUTLINE =
  '你是零售决策参谋。基于推演终态世界，规划一份结构化预测报告的大纲。输出JSON。';
const USR_OUTLINE = (summary, seed) =>
  `推演场景：${seed}\n推演终态：\n${summary}\n\n请规划报告大纲。输出JSON：{"title":"报告标题","summary":"一句话摘要","sections":[{"title":"章节标题"}]}`;

const SYS_SECTION =
  '你是零售决策分析师。基于推演数据和报告大纲，撰写指定章节的详细内容。使用Markdown格式。内容要有数据支撑、有因果分析。严禁把推演当作确定预测。';

export async function genReport() {
  if (!store.entities.length) { pushLog('请先推演', 'err'); return; }
  store.ui.reportRunning = true;
  store.ui.b3 = 'processing';
  store.reportOutline = null;
  store.reportSections = {};
  store.report = null;

  const summary = '实体：' + store.entities.map(e => `${e.name}(${e.type})`).join('、') +
    '\n关系：' + store.edges.slice(0, 60).map(x => {
      const s = store.entities.find(y => y.id === x.source);
      const t = store.entities.find(y => y.id === x.target);
      return `${s ? s.name : x.source}→${t ? t.name : x.target}:${x.relation || ''}${x.round ? '(R'+x.round+')' : ''}`;
    }).join('；');

  try {
    // Phase 1: Generate outline
    pushLog('报告规划中…', 'ac');
    const outline = await callChat(
      [{ role: 'system', content: SYS_OUTLINE }, { role: 'user', content: USR_OUTLINE(summary, store.seed) }],
      { json: true, temperature: 0.5, max_tokens: 800 }
    );
    store.reportOutline = outline;
    pushLog(`报告大纲：${outline.sections?.length || 0} 章节`, 'ac');

    // Phase 2: Generate each section
    const sections = outline.sections || [];
    for (let i = 0; i < sections.length; i++) {
      store.reportSections[i] = { content: '', status: 'generating' };
      pushLog(`生成章节 ${i + 1}/${sections.length}：${sections[i].title}…`, 'ac');
      try {
        const sectionSummary = summary + `\n\n已有章节：` + Object.values(store.reportSections)
          .filter(s => s.status === 'done')
          .map(s => s.content.slice(0, 100))
          .join('；');
        const content = await callChat(
          [{ role: 'system', content: SYS_SECTION },
           { role: 'user', content: `报告标题：${outline.title}\n当前章节：${sections[i].title}\n推演数据：\n${sectionSummary}\n\n请撰写本章节内容（Markdown格式，300-600字）。` }],
          { json: false, temperature: 0.6, max_tokens: 1500 }
        );
        store.reportSections[i] = { content: content || '（生成失败）', status: 'done' };
        pushLog(`✓ 章节 ${i + 1} 完成`, 'ok');
      } catch (err) {
        store.reportSections[i] = { content: '生成失败：' + err.message, status: 'done' };
        pushLog(`章节 ${i + 1} 失败：${err.message}`, 'err');
      }
    }

    // Phase 3: Assemble final report with redline
    const allContent = sections.map((s, i) => `## ${s.title}\n${store.reportSections[i]?.content || ''}`).join('\n\n');
    store.report = {
      verdict: outline.summary || outline.title,
      pros: [], cons: [], actions: [], causality: '', risks: [],
      confidence: 0.5, confidence_note: '多章节 ReACT 报告，置信度基于推演内部自洽度评估。',
      fullContent: allContent,
    };
    store.ui.b3 = 'success';
    store.ui.b4 = 'pending';
    pushLog('✓ 决策报告已生成', 'ok');
  } catch (err) {
    store.ui.b3 = 'pending';
    pushLog('报告生成失败：' + err.message, 'err');
  } finally {
    store.ui.reportRunning = false;
  }
}

// ============ Step 4: Deep Interaction (feature 1) ============

const SYS_CHAT_PERSON = (e, episodes) =>
  `你现在是「${e.name}」，一个${e.type}。你在零售推演世界中行动。\n人格：${e.persona || '—'}\n目标：${e.goal || '—'}${e.bio ? '\n背景：' + e.bio : ''}${e.traits ? '\n特征：' + e.traits.join('、') : ''}\n\n你在推演中的经历：\n${episodes || '（暂无交互记录）'}\n\n请以该角色身份回答用户的问题。保持角色一致，基于你的经历和人格回答。不要脱离角色。`;

const SYS_CHAT_OBJECT = (e, episodes) =>
  `你现在是「${e.name}」，一个${e.type}实体。虽然你不是人，但请以拟人化方式描述你的状态和影响。\n描述：${e.persona || '—'}\n作用：${e.goal || '—'}${e.specs ? '\n规格：' + e.specs : ''}${e.impact ? '\n影响力：' + e.impact : ''}\n\n在推演中的变化：\n${episodes || '（暂无变化记录）'}\n\n请以该实体视角回答用户问题。`;

export async function interactWith(entityId, userMessage) {
  const e = store.entities.find(x => x.id === entityId);
  if (!e) { pushLog('未找到实体', 'err'); return; }
  store.chat.running = true;
  store.chat.target = entityId;
  store.chat.messages.push({ role: 'user', content: userMessage });

  const eps = (store.episodes[entityId] || []).map(ep => `[R${ep.round}] ${ep.text}`).join('\n');
  const isPerson = isPersonType(e.type);
  const sysContent = isPerson ? SYS_CHAT_PERSON(e, eps) : SYS_CHAT_OBJECT(e, eps);
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
  pushLog(`开始与「${e.name}」深度互动`, 'ac');
}

export function endChat() {
  store.chat.target = null;
  store.chat.messages = [];
  store.ui.b4 = store.ui.b3 === 'success' ? 'success' : 'pending';
}