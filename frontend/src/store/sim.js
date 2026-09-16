import { reactive } from 'vue';
import { getScenario, DEFAULT_SCENARIO_ID } from '../scenarios';

export const store = reactive({
  health: { ok: false, model: '', keyConfigured: false, baseURL: '' },

  // 当前场景包（领域知识配置）：引擎读取它，而非写死的零售常量
  scenarioId: DEFAULT_SCENARIO_ID,
  scenario: getScenario(DEFAULT_SCENARIO_ID),

  entities: [],
  edges: [],          // now includes: round, status, created_by, reason, effect, _conflict
  growth: [],
  episodes: {},
  history: [],
  logs: [],

  // Report - multi-section
  reportOutline: null,
  reportSections: {},
  report: null,

  // Causal chains (feature 3)
  causalChains: [],   // {path:[entityIds], relations:[], effect, confidence, highlight:false}

  // Decisions (feature 2)
  decisions: [],      // {id, action, reasoning, expected_gain, confidence, based_on:[edgeIdx], status}

  // Conflicts (feature 1)
  conflicts: [],      // {edge1Idx, edge2Idx, source, target, rel1, rel2, round1, round2}

  // Graph analytics (feature 5)
  communities: [],    // [{id, members:[entityIds], label}]
  bridgeNodes: [],    // [entityId]

  // Chat / deep interaction
  chat: { target: null, messages: [], running: false },

  // Input
  seed: '',
  assumptions: [],   // WHAT IF：结构化假设事件 [{id, text}]，注入实体抽取与世界局势
  entN: 12,
  rounds: 6,
  perR: 6,

  // SIMULATE：实时活动流（每轮每个 agent 的动作摘要）
  activityFeed: [],  // [{round, actor, text, kind}] kind: 'rel'|'effect'|'born'|'info'
  simRound: 0,       // 当前推演轮次（用于进度显示）
  lockedIds: [],     // ② 核心角色锁定：常驻焦点（每轮必出场）
  simWantsPause: false,  // #8 暂停请求：当前轮跑完后从下一轮起停（避免打断半途 LLM JSON）
  simStopped: false,     // #8 手动停止：解析并保留已完成部分

  nodeInfo: null,

  // 对比模拟：基线 vs 干预
  comparison: { active: false, baseline: null, withAssumptions: null },

  // OBSERVE 元层分析对话（问全局，区别于 Interview 问个体）
  analysis: { messages: [], running: false },

  // ACT 作战台：仅「零售 · 学清路生态」按需加载学清路店 POS。
  // approvals / feedback 只记录人工审批与回放回流，不会自动执行任何业务动作。
  ops: {
    loaded: false, data: null, forecastReason: '', forecastBusy: false, approvals: {}, feedback: {},
    // 世界记忆只保存被人工记录的回放结论；它不改写 POS 原始事实。
    worldMemory: [],
    // LLM 每轮提出的可证伪关系假设，供报告、回放和下一次推演读取。
    hypotheses: [],
    // 盲测评分与世界记忆分离：评分不会自动反哺模型，须由运营人员确认后才进入记忆。
    hypothesisScores: [],
  },

  ui: {
    b1: 'pending', b2: 'pending', b3: 'pending', b4: 'pending', b5: 'pending',
    genRunning: false, simRunning: false, reportRunning: false,
    enrichRunning: false,
    step1Done: false,
  },
});

export function pushLog(msg, cls = '') {
  store.logs.push({ t: new Date().toLocaleTimeString('en-GB'), msg, cls });
  if (store.logs.length > 400) store.logs.splice(0, store.logs.length - 400);
}

export function resetWorld() {
  store.entities = []; store.edges = []; store.growth = []; store.episodes = {};
  store.reportOutline = null; store.reportSections = {}; store.report = null;
  store.causalChains = []; store.decisions = []; store.conflicts = [];
  store.communities = []; store.bridgeNodes = [];
  store.chat = { target: null, messages: [], running: false };
  store.activityFeed = []; store.simRound = 0;
  store.simWantsPause = false; store.simStopped = false;
  store.lockedIds = [];
  store.analysis = { messages: [], running: false };
  store.nodeInfo = null;
  store.comparison = { active: false, baseline: null, withAssumptions: null };
  store.ui.b1 = 'pending'; store.ui.b2 = 'pending'; store.ui.b3 = 'pending'; store.ui.b4 = 'pending';
  store.ops.loaded = false;
  store.ops.data = null;
  store.ops.forecastReason = '';
  store.ops.forecastBusy = false;
  store.ops.approvals = {};
  store.ops.feedback = {};
  store.ops.worldMemory = [];
  store.ops.hypotheses = [];
  store.ops.hypothesisScores = [];
  store.ui.b5 = 'pending';
  store.ui.step1Done = false;
}

export function pushActivity(round, actor, text, kind = 'info') {
  store.activityFeed.push({ round, actor, text, kind });
  if (store.activityFeed.length > 300) store.activityFeed.splice(0, store.activityFeed.length - 300);
}

// ② 核心角色锁定：toggle 常驻焦点
export function toggleLock(id) {
  const i = store.lockedIds.indexOf(id);
  if (i >= 0) store.lockedIds.splice(i, 1);
  else store.lockedIds.push(id);
}

// 切换场景包：换领域知识，并重置世界 + 加载该包的默认参数/示例
export function setScenario(id) {
  const s = getScenario(id);
  store.scenarioId = s.id;
  store.scenario = s;
  store.seed = '';
  store.assumptions = [];
  store.entN = s.defaultParams?.entN || 12;
  store.rounds = s.defaultParams?.rounds || 6;
  store.perR = s.defaultParams?.perR || 6;
  resetWorld();
  pushLog('已切换场景：' + s.label + '（领域：' + s.domain + '）', 'ac');
}

export function addEpisode(entityId, ep) {
  if (!store.episodes[entityId]) store.episodes[entityId] = [];
  store.episodes[entityId].push(ep);
  if (store.episodes[entityId].length > 50) store.episodes[entityId].shift();
}
