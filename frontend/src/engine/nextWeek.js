function kindLabel(kind) {
  return { push: '推', cut: '砍', stop_promo: '停促', ops: '节奏' }[kind] || kind || '动作';
}

const TRAIN_DAYS = 23;
const PUSH_LIFT = 0.2;
const CUT_SHARE = 0.5;
const STOP_VOLUME_DRAG = 0.12;
const MISS_HAIRCUT = 0.3;

const SHOCKS = {
  weather: { gmv: 0.96, profit: 0.93, label: '天气/损耗' },
  traffic: { gmv: 0.95, profit: 0.95, label: '竞品/截流' },
  price: { gmv: 1.03, profit: 0.92, label: '跟价' },
};

export const KEYWORD_GUIDE = [
  { key: 'weather', sample: '阴雨一周', words: '阴雨 / 下雨 / 雨天 / 高温 / 黄警 / 损耗', effect: '销售 −4% · 毛利 −7%' },
  { key: 'traffic', sample: '竞品新店开业', words: '社区团购 / 团购截流 / 切团长 / 竞品 / 新店开业 / 折扣王 / 硬折扣', effect: '销售与毛利 −5%' },
  { key: 'price', sample: '跟价打价格战', words: '跟价 / 砸价 / 打价格战 / 降价跟进', effect: '销售 +3% · 毛利 −8%' },
];

export function classifyAssumption(text) {
  const t = String(text || '').replace(/企业团购/g, '');
  if (/阴雨|下雨|雨天|高温|黄警|损耗/.test(t)) return 'weather';
  if (/跟价|砸价|打价格战|降价跟进/.test(t)) return 'price';
  if (/社区团购|团购截流|切团长/.test(t)) return 'traffic';
  if (/竞品|新店开业|对面.*开|折扣王|硬折扣/.test(t)) return 'traffic';
  return null;
}

function weekFromTrain(v) {
  return (Number(v) || 0) / TRAIN_DAYS * 7;
}

function skuLookup(data, action) {
  const id = action.skuId;
  const packs = [
    ...(data?.sku?.push || []),
    ...(data?.sku?.cut || []),
    ...(data?.sku?.losingPromos || []),
  ];
  if (id) {
    const hit = packs.find((s) => String(s.id) === String(id));
    if (hit) return hit;
  }
  if (action.sku) {
    const hit = packs.find((s) => s.name === action.sku);
    if (hit) return hit;
  }
  return null;
}

function signed(n) {
  const v = Math.round(n);
  if (v > 0) return '+' + v.toLocaleString('zh-CN') + ' 元';
  return v.toLocaleString('zh-CN') + ' 元';
}

export function computeNextWeek(data, assumptions = []) {
  const bt = data?.backtest || {};
  const baseGmv = Number(bt.gmvPred) || 0;
  const baseProfit = Number(bt.profitPred) || 0;
  const lines = [];
  let dGmv = 0;
  let dProfit = 0;

  for (const a of data?.playbook || []) {
    const sku = skuLookup(data, a);
    const weekGmv = weekFromTrain(sku?.gmv);
    const weekProfit = weekFromTrain(sku?.profit);
    const weekPromoProfit = weekFromTrain(sku?.promoProfit != null ? sku.promoProfit : sku?.profit);
    const miss = a.backtestVerdict === 'miss';
    const w = miss ? MISS_HAIRCUT : 1;
    let g = 0;
    let p = 0;
    let rule = '';
    if (a.kind === 'push') {
      g = weekGmv * PUSH_LIFT * w;
      p = weekProfit * PUSH_LIFT * w;
      rule = `主推「${a.sku}」按训练期周贡献 ${PUSH_LIFT * 100}% 计增量`;
    } else if (a.kind === 'cut') {
      g = -Math.abs(weekGmv) * CUT_SHARE * w;
      p = weekProfit < 0 ? Math.abs(weekProfit) * CUT_SHARE * w : -weekProfit * CUT_SHARE * w;
      rule = `砍「${a.sku}」按训练期周贡献 ${CUT_SHARE * 100}% 计减量；负毛利则一半损失不再发生`;
    } else if (a.kind === 'stop_promo') {
      p = weekPromoProfit < 0 ? Math.abs(weekPromoProfit) * w : -weekPromoProfit * 0.2 * w;
      g = -Math.abs(weekFromTrain(sku?.discount || sku?.gmv * 0.1)) * STOP_VOLUME_DRAG * w;
      rule = `停「${a.sku}」亏本促：挽回训练期周负毛利，并按让利的 ${STOP_VOLUME_DRAG * 100}% 计销量流失`;
    } else {
      continue;
    }
    if (miss) rule += '（盲测打脸，增量只计 30%）';
    dGmv += g;
    dProfit += p;
    lines.push({
      id: a.id,
      kind: a.kind,
      label: kindLabel(a.kind) + ' ' + (a.sku || a.action),
      rule,
      gmv: g,
      profit: p,
    });
  }

  let gmv = baseGmv + dGmv;
  let profit = baseProfit + dProfit;
  const shocks = [];
  const seen = new Set();
  for (const a of assumptions) {
    const text = typeof a === 'string' ? a : a.text;
    const key = classifyAssumption(text);
    if (!key) {
      shocks.push({ text, key: null, label: '未匹配关键词', applied: false });
      continue;
    }
    if (seen.has(key)) {
      shocks.push({ text, key, label: SHOCKS[key].label, applied: false, note: '同类假设已计一次' });
      continue;
    }
    seen.add(key);
    const s = SHOCKS[key];
    gmv *= s.gmv;
    profit *= s.profit;
    shocks.push({
      text,
      key,
      label: s.label,
      applied: true,
      rule: `${s.label}：销售 ×${s.gmv}，毛利 ×${s.profit}`,
    });
  }

  return {
    method: '下一周底稿 = 1–23 日星期几均值外推 7 天（不用 24–30 日）。再叠加动作单公式和假设关键词。图谱与轮数不进公式。',
    baseGmv,
    baseProfit,
    gmv: Math.round(gmv * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    dGmv: Math.round((gmv - baseGmv) * 100) / 100,
    dProfit: Math.round((profit - baseProfit) * 100) / 100,
    lines,
    shocks,
    formulaText: [
      `底稿销售 ${signed(baseGmv).replace(/^\+/, '')}，毛利 ${signed(baseProfit).replace(/^\+/, '')}`,
      ...lines.map((l) => `${l.rule} → 销售 ${signed(l.gmv)}，毛利 ${signed(l.profit)}`),
      ...shocks.filter((s) => s.applied).map((s) => s.rule),
      ...shocks.filter((s) => !s.applied && s.key == null).map((s) => `假设「${s.text}」无关键词，数字不变`),
    ].join('\n'),
  };
}

export function fallbackReason(nw) {
  if (!nw) return '';
  const bits = [];
  if (nw.dGmv || nw.dProfit) {
    bits.push(`相对 1–23 日外推底稿，销售 ${signed(nw.dGmv)}，毛利 ${signed(nw.dProfit)}。`);
  }
  const shock = (nw.shocks || []).filter((s) => s.applied).map((s) => s.label);
  if (shock.length) bits.push('已计入假设：' + shock.join('、') + '。');
  bits.push('数字由固定公式计算，不是图谱轮数改出来的。');
  return bits.join('');
}
