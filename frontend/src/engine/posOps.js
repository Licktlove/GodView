import { store, pushLog } from '../store/sim';
import { api } from '../api/client';

export function posEvidenceText() {
  const d = store.ops?.data;
  if (!d) return '';
  const t = d.facts?.floorTrain || {};
  const f = d.facts?.train || {};
  const b = d.backtest || {};
  const pb = (d.playbook || []).slice(0, 8).map((a) => `- [${kindLabel(a.kind)}] ${a.action}（${a.backtestLabel || '待盲测'}）`).join('\n');
  const push = (d.sku?.push || []).slice(0, 4).map((s) => `${s.name} 销售${s.gmv}元/毛利${s.profit}元`).join('；');
  const cut = (d.sku?.cut || []).slice(0, 3).map((s) => s.name).join('、');
  const lose = (d.sku?.losingPromos || []).slice(0, 3).map((s) => s.name).join('、');
  return [
    '【学清路店 POS 硬约束 · 仅 1–23 日到店成交，24–30 日是盲测不得当论据】',
    `到店销售 ${t.gmv} 元，毛利 ${t.profit} 元，毛利率 ${t.margin}%，订单 ${t.orders}，客单价 ${t.aov} 元。`,
    `全渠道训练期销售 ${f.gmv} 元（含企业团购），促销销售占比 ${f.promo_share}%，让利 ${f.discount} 元，会员订单 ${f.member_share}%。`,
    push ? `建议主推：${push}` : '',
    cut ? `建议减面/观察：${cut}` : '',
    lose ? `建议停亏本促：${lose}` : '',
    `回测（星期几均值→24–30 日到店）：销售 MAPE ${fmtMape(b.gmvMape)}，毛利 MAPE ${fmtMape(b.profitMape)}，头部20交叉 ${b.top20Overlap}/${b.top20Size}。`,
    b.actionSummary ? `动作盲测：坐实 ${b.actionSummary.hit} 条，打脸 ${b.actionSummary.miss} 条，证据不足 ${b.actionSummary.insufficient} 条（打脸保留）。` : '',
    pb ? `作战台动作：\n${pb}` : '',
  ].filter(Boolean).join('\n');
}

export function kindLabel(kind) {
  return { push: '推', cut: '砍', stop_promo: '停促', ops: '节奏' }[kind] || kind || '动作';
}

export function matchPlaybookToGraph() {
  const pb = store.ops?.data?.playbook;
  if (!Array.isArray(pb) || !pb.length) return;
  const names = store.entities.map((e) => e.name || '');
  const blob = names.join('｜') + '｜' + store.edges.map((e) => e.relation || '').join('｜');
  for (const a of pb) {
    a.graphAlign = actionMatchesGraph(a, names, blob) ? '对齐' : '未对齐';
  }
}

function actionMatchesGraph(a, names, blob) {
  const keys = [a.sku, a.cat].filter((x) => x && x !== '全店' && x !== '会员');
  if (!keys.length) {
    const opsKeys = ['晚高峰', '会员', '理货', '促销', '客流', '毛利'];
    return opsKeys.some((k) => blob.includes(k) || names.some((n) => n.includes(k)));
  }
  return keys.some((k) => {
    const token = String(k).replace(/\s+/g, '').slice(0, 6);
    if (token.length < 2) return false;
    return names.some((n) => n.includes(token) || token.includes(n)) || blob.includes(token);
  });
}

export function applyPosToRetailScenario(data) {
  if (!data?.seed) return;
  const s = store.scenario;
  if (s.id !== 'retail') return;
  if (s.flagship) {
    s.flagship.title = `${data.store?.name || '学清路店'} · 下周动作`;
    s.flagship.seed = data.seed;
    s.flagship.assumptions = data.assumptions || [];
    s.flagship.interviewQ = '这些亏本促销再打下去，你还会进店吗？';
    s.flagship.talkingPoints = [
      '口播① 这不是故事沙盘：学清路店 6 月真 POS，1–23 日决策，24–30 日回测。',
      '口播② 命题只有一句：下周推什么、砍什么、停哪场亏本促。',
      '口播③ 图谱解释因果；作战台给店长动作。主结论看盲测坐实/打脸，打脸留着。图谱只标对齐或未对齐。',
    ];
  }
  const examples = s.seedExamples || [];
  if (examples[0]) {
    examples[0].title = '学清路店下周';
    examples[0].text = data.seed;
  }
}

export async function loadStoreOps() {
  try {
    const { data } = await api.get('/api/store/ops');
    store.ops.data = data;
    store.ops.loaded = true;
    store.ui.b5 = 'success';
    applyPosToRetailScenario(data);
    matchPlaybookToGraph();
    pushLog('已加载 ' + (data.store?.name || '门店') + ' POS 作战台（' + (data.ingest?.rows || 0) + ' 行）', 'ok');
    return data;
  } catch (err) {
    store.ops.loaded = false;
    store.ops.data = null;
    store.ui.b5 = 'pending';
    const msg = err.response?.data?.error || err.message || '作战台数据缺失';
    pushLog('作战台未就绪：' + msg, 'err');
    return null;
  }
}

function fmtMape(v) {
  return v == null ? '—' : v + '%';
}
