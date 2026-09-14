import { store, pushLog, addEpisode } from '../store/sim';
import { detectCommunities, detectBridgeNodes, detectConflicts } from './analytics';
import { synthesizeKPIs } from './kpi';
import { matchPlaybookToGraph, loadStoreOps } from './posOps';

function applyAssumptions(list) {
  if (!Array.isArray(list) || !list.length) return;
  store.assumptions = list.map((text, i) => ({
    id: 'asm_demo_' + i,
    text: typeof text === 'string' ? text : text.text,
  }));
}

function asPilotTask(decision, index) {
  return {
    id: decision.id || 'd' + (index + 1),
    action: `在有限范围内验证：${decision.action || '关键经营动作'}`,
    owner: decision.owner || '业务负责人',
    reasoning: decision.reasoning || '该动作来自演示推演，尚未用真实业务结果验证。',
    based_on: decision.based_on || [],
    required_data: decision.required_data || ['相关门店/客群交易明细', '成本、库存与执行记录'],
    pilot_scope: decision.pilot_scope || '由责任角色选定一个最小可控的门店、客群或商品范围。',
    treatment: decision.treatment || decision.action || '在处理组执行单一经审批的干预。',
    control: decision.control || '选择条件相近且保持原策略的对照组。',
    metric: decision.metric || '预先约定核心业务指标，并与对照组比较。',
    stop_rule: decision.stop_rule || '证据不足、指标恶化或超出授权范围时停止并复核。',
    promotion_rule: decision.promotion_rule || '结果可比且达到预先约定阈值后，才提交全量审批。',
    expected_gain: '待真实数据与试验验证',
    confidence: 0,
    status: 'pilot-only',
    execution: '暂不全量执行；经人工审批后仅启动小范围试验',
  };
}

/** 只填种子和假设，留给现场点「生成实体」走真 LLM。 */
export function loadFlagshipProposition() {
  const c = store.scenario.flagship;
  if (!c) { pushLog('当前场景没有旗舰演示命题', 'err'); return; }
  store.seed = c.seed;
  applyAssumptions(c.assumptions);
  if (c.entN) store.entN = c.entN;
  if (c.rounds) store.rounds = c.rounds;
  if (c.perR) store.perR = c.perR;
  store.ui.b1 = 'pending';
  pushLog('已填入演示命题：' + c.title, 'ok');
  (c.talkingPoints || []).forEach((t) => pushLog(t, 'ac'));
  loadStoreOps();
}

/** 空世界、空输入时默认学清路店命题，避免现场还停在团购截流。 */
export function fillFlagshipIfIdle() {
  if (store.scenario.id !== 'retail' || !store.scenario.flagship) return false;
  if (store.entities.length) return false;
  if (store.seed.trim()) return false;
  loadFlagshipProposition();
  return true;
}

// 加载当前场景包的 demoData（无 LLM Key 或快速体验时使用）。
export function loadDemo() {
  const demo = store.scenario.demoData;
  if (!demo) { pushLog('当前场景无内置示例', 'err'); return; }
  store.seed = demo.seed || store.seed;
  if (demo.assumptions) applyAssumptions(demo.assumptions);

  pushLog('加载示例推演（非实时 LLM）', 'ac');
  store.entities = demo.entities.map(e => ({ ...e }));
  store.edges = demo.edges.map(([s, t, r, round]) => ({ source: s, target: t, relation: r, _new: false, round, status: 'active', created_by: s, reason: '', effect: '' }));
  store.episodes = {};
  store.growth = [{ round: 0, nodes: store.entities.length, edges: store.edges.length }];
  store.lockedIds = Array.isArray(demo.lockedIds) ? [...demo.lockedIds] : [];
  store.ui.b1 = 'success';
  store.ui.step1Done = true;

  const episodes = demo.episodes || [];
  episodes.forEach((ep) => addEpisode(ep.id, { round: ep.round, text: ep.text, targetName: ep.targetName, relation: ep.relation, effect: ep.effect }));

  const waves = demo.waves || [];
  waves.forEach((w) => {
    w.add.forEach((ne) => { if (!store.entities.some(x => x.id === ne.id)) store.entities.push({ ...ne, _new: true, _bornRound: w.round }); });
    w.rel.forEach(([s, t, r]) => {
      if (!store.edges.some(x => x.source === s && x.target === t && x.relation === r))
        store.edges.push({ source: s, target: t, relation: r, _new: true, round: w.round, status: 'active', created_by: s, reason: '', effect: '' });
    });
    store.growth.push({ round: w.round, nodes: store.entities.length, edges: store.edges.length });
  });

  store.ui.b2 = 'success';

  store.conflicts = detectConflicts(store.edges);
  store.communities = detectCommunities(store.entities, store.edges);
  store.bridgeNodes = detectBridgeNodes(store.entities, store.edges, store.communities);

  store.causalChains = demo.causalChains || [];
  store.decisions = (demo.decisions || []).map(asPilotTask);
  store.reportOutline = demo.reportOutline || null;
  store.reportSections = demo.reportSections || {};
  store.report = demo.report ? {
    ...demo.report,
    verdict: '演示推演仅用于生成受控试验，不形成收益承诺或全量执行指令。',
    confidence: 0,
    confidence_note: '合成演示数据；未接入真实业务结果。',
    execution_decision: '暂不全量执行；仅在责任角色完成数据核验并人工审批后，启动有限范围的对照试验。',
  } : null;
  if (store.report) {
    store.ui.b3 = 'success';
    store.ui.b4 = 'pending';
  }
  synthesizeKPIs(store.growth);
  matchPlaybookToGraph();
  pushLog('示例推演完成：节点 ' + store.entities.length + '，关系 ' + store.edges.length, 'ok');
  const hint = store.scenario.flagship;
  if (hint?.interviewQ) pushLog('访谈开场：点「价格敏感客群」→ ' + hint.interviewQ, 'ac');
}
