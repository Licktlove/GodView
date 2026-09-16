// 促销异常诊断：只消费已聚合的 POS / 促销 / 商品字段。
// 这里不调用大模型，也不生成新的业务事实；模型只负责把这些结果写成报告。

const moneyNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function findSku(data, event) {
  const packs = [
    ...(data?.sku?.losingPromos || []),
    ...(data?.sku?.push || []),
    ...(data?.sku?.cut || []),
  ];
  return packs.find((s) => String(s.id) === String(event.skuId)) || null;
}

function sourceContract(data) {
  const train = data?.facts?.floorTrain || {};
  const promoCount = (data?.sku?.losingPromos || []).length;
  return [
    {
      key: 'sales', label: '销售流水', fields: '门店 · SKU · 日期 · 数量 · 实付金额', status: train.gmv ? 'ready' : 'missing',
      note: train.gmv ? `已接入 ${train.days || 23} 日到店 POS` : '缺少训练期销售流水',
    },
    {
      key: 'promo', label: '促销记录', fields: '活动期 · 原价/实付 · 让利金额', status: promoCount ? 'ready' : 'missing',
      note: promoCount ? `已识别 ${promoCount} 条高风险促销` : '缺少促销让利记录',
    },
    {
      key: 'mechanism', label: '促销机制主数据', fields: '满减 · 买赠 · 第二件半价 · 成本分摊', status: data?.promotionCatalog ? 'ready' : 'missing',
      note: data?.promotionCatalog ? '可比较具体促销机制' : '未接入；只能比较公开折扣、会员券和维持策略',
    },
    {
      key: 'inventory', label: '库存记录', fields: '实时库存 · 缺货时长 · 在途数量', status: data?.inventory ? 'ready' : 'missing',
      note: data?.inventory ? '已接入库存快照' : '未接入；补货/调拨动作自动拒绝',
    },
    {
      key: 'product', label: '商品资料', fields: '品类 · 成本 · 毛利 · 保质期', status: data?.productCatalog ? 'ready' : 'partial',
      note: data?.productCatalog ? '已接入商品主数据' : '已有品类/毛利；成本与保质期待接入',
    },
  ];
}

function candidateActions(event, sku) {
  const promoProfit = moneyNumber(event.metrics?.promoProfit ?? sku?.promoProfit);
  const skuProfit = moneyNumber(sku?.profit);
  const loss = promoProfit < 0;
  return [
    {
      id: 'stop', label: '停止促销', action: '停止全场让利，改为面价或会员专享小额券',
      allowed: loss, score: loss ? 0.92 : 0.28,
      rule: loss ? '通过：促销期毛利为负' : '拒绝：当前证据没有证明停促优于维持',
    },
    {
      id: 'member_coupon', label: '改会员券', action: '取消公开让利，只给会员发小额券，观察 3 天',
      allowed: loss && skuProfit >= 0, score: loss && skuProfit >= 0 ? 0.78 : 0.36,
      rule: !loss ? '拒绝：未发现促销毛利异常' : skuProfit >= 0 ? '通过：常态仍有毛利，可做小范围试验' : '拒绝：常态毛利也为负，先补齐商品成本与售价证据',
    },
    {
      id: 'keep', label: '维持折扣', action: '维持当前促销，继续观察促销销售与毛利',
      allowed: !loss, score: !loss ? 0.62 : 0.12,
      rule: loss ? '拒绝：会继续放大促销期负毛利' : '通过：促销期毛利尚未触发底线',
    },
    {
      id: 'transfer', label: '补货 / 调拨', action: '先补货或跨店调拨，扩大促销覆盖',
      allowed: false, score: 0,
      rule: '拒绝：当前没有实时库存、缺货时长和在途数量，不能估算可执行量',
    },
  ];
}

function verdictLabel(verdict) {
  return { hit: '回放坐实', miss: '回放打脸', insufficient: '证据不足' }[verdict] || '待回放';
}

export function buildPromoDiagnosis(data, { includeReplay = true } = {}) {
  const events = (data?.anomalies || []).filter((e) => e.type === 'losing_promo');
  const playbook = data?.playbook || [];
  const items = events.map((event) => {
    const sku = findSku(data, event);
    const promoProfit = moneyNumber(event.metrics?.promoProfit ?? sku?.promoProfit);
    const promoDiscount = moneyNumber(event.metrics?.promoDiscount ?? sku?.discount);
    const skuProfit = moneyNumber(sku?.profit);
    const action = playbook.find((a) => String(a.skuId) === String(event.skuId));
    const candidates = candidateActions(event, sku);
    const diagnosis = promoProfit < 0
      ? '促销让利没有换回毛利，当前更像价格让利问题。'
      : '促销期仍有毛利，但缺少对照组，不能单凭结果判断促销带来了增量。';
    return {
      id: `promo-${event.skuId}`,
      event,
      sku,
      diagnosis,
      evidence: [
        { label: '促销让利', value: promoDiscount, unit: '元' },
        { label: '促销期毛利', value: promoProfit, unit: '元' },
        { label: '训练期商品毛利', value: skuProfit, unit: '元' },
      ],
      evidenceReady: promoDiscount > 0 && Number.isFinite(promoProfit),
      candidates,
      recommendation: candidates.find((c) => c.allowed) || null,
      backtest: includeReplay && action ? { verdict: action.backtestVerdict || 'insufficient', label: verdictLabel(action.backtestVerdict), note: action.holdoutEvidence || '尚未回放' } : null,
    };
  });

  const totalCandidates = items.reduce((n, item) => n + item.candidates.length, 0);
  const rejectedCandidates = items.reduce((n, item) => n + item.candidates.filter((c) => !c.allowed).length, 0);
  const validated = items.filter((item) => item.backtest && item.backtest.verdict !== 'insufficient');
  const causeHits = validated.filter((item) => item.backtest.verdict === 'hit').length;
  const actionSummary = data?.backtest?.actionSummary || {};
  const actionValidated = Number(actionSummary.hit || 0) + Number(actionSummary.miss || 0);
  return {
    sources: sourceContract(data),
    items,
    metrics: {
      causeAccuracy: validated.length ? causeHits / validated.length : null,
      causeSample: validated.length,
      actionEffectiveness: actionValidated ? Number(actionSummary.hit || 0) / actionValidated : null,
      actionSample: actionValidated,
      invalidRate: totalCandidates ? rejectedCandidates / totalCandidates : null,
      rejectedCandidates,
      totalCandidates,
    },
  };
}

export function formatMoney(value) {
  return moneyNumber(value).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

// 规则只定义可选范围和否决条件，不替推演做推荐排序。
export function promotionDecisionCandidates(data) {
  const diagnosis = buildPromoDiagnosis(data, { includeReplay: false });
  return diagnosis.items.flatMap((item) => item.candidates
    .filter((candidate) => candidate.allowed)
    .map((candidate) => ({
      id: `${item.id}:${candidate.id}`,
      itemId: item.id,
      sku: item.event.sku,
      candidateId: candidate.id,
      label: candidate.label,
      action: candidate.action,
      rule: candidate.rule,
      evidence: item.evidence,
      diagnosis: item.diagnosis,
    })));
}

export function modelSelectedPromoDecisions(data, selections = []) {
  const candidates = promotionDecisionCandidates(data);
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const seenSku = new Set();
  return (Array.isArray(selections) ? selections : []).flatMap((selection, index) => {
    const candidate = byId.get(selection?.candidateId);
    if (!candidate || seenSku.has(candidate.sku)) return [];
    seenSku.add(candidate.sku);
    return [{
      id: `sim-${candidate.id}`,
      candidateId: candidate.candidateId,
      sourceItemId: candidate.itemId,
      action: candidate.action,
      owner: '店长 / 促销员',
      reasoning: String(selection.reasoning || candidate.diagnosis).trim(),
      based_on: [candidate.sku],
      required_data: ['促销记录', '商品成本与毛利', '处理组/对照组销售与毛利'],
      pilot_scope: `仅限「${candidate.sku}」单 SKU，观察 3 天`,
      treatment: candidate.action,
      control: '相近 SKU 维持当前策略，作为可比对照',
      metric: 'SKU 销量、毛利、促销让利额；与对照组比较',
      stop_rule: '毛利继续为负、销量显著下滑或出现库存约束时停止',
      promotion_rule: '处理组毛利改善且销量未显著恶化，才提交扩大范围审批',
      expected_gain: '待人工审批后的真实试验验证',
      confidence: Math.max(0, Math.min(1, Number(selection.confidence) || 0.5)),
      status: 'pilot-only',
      selected_by: 'simulation',
      execution: '仅可在人工审批后启动小范围试验',
      priority: Number(selection.priority) || index + 1,
    }];
  }).sort((a, b) => a.priority - b.priority).slice(0, 3);
}

export function promoDecisions(data) {
  const diagnosis = buildPromoDiagnosis(data);
  return diagnosis.items.map((item, index) => {
    const candidate = item.recommendation;
    if (!candidate) {
      return {
        id: `promo-reject-${index + 1}`,
        action: `拒绝自动建议：${item.event.sku} 先补齐证据`,
        owner: '店长 / 采购',
        reasoning: `${item.diagnosis} 当前候选动作均未通过规则预检。`,
        based_on: [item.event.sku],
        required_data: ['商品成本', '促销活动类型', '实时库存与在途数量'],
        pilot_scope: '不执行；待数据补齐后重新诊断',
        treatment: '不改变当前促销策略',
        control: '保留当前策略作为基线',
        metric: '证据完整率',
        stop_rule: '证据不足时保持拒绝',
        promotion_rule: '四类数据齐备并通过规则预检后再审批',
        expected_gain: '避免无效建议',
        confidence: 0,
        status: 'rejected',
        execution: '已拒绝：证据不足',
      };
    }
    return {
      id: `promo-${item.event.skuId || index + 1}`,
      action: candidate.action,
      owner: '店长 / 促销员',
      reasoning: `${item.diagnosis} 促销让利 ${formatMoney(item.evidence[0].value)} 元，促销期毛利 ${formatMoney(item.evidence[1].value)} 元。`,
      based_on: [item.event.sku],
      required_data: ['促销记录', '商品成本与毛利', '处理组/对照组销售与毛利'],
      pilot_scope: `仅限「${item.event.sku}」单 SKU，观察 3 天`,
      treatment: candidate.action,
      control: '相近 SKU 维持当前策略，作为可比对照',
      metric: 'SKU 销量、毛利、促销让利额；与对照组比较',
      stop_rule: '毛利继续为负、销量跌破训练期日均 50%，或出现库存约束时停止',
      promotion_rule: '处理组毛利改善且销量未显著恶化，才提交扩大范围审批',
      expected_gain: '待处理组与对照组验证',
      confidence: candidate.score,
      status: 'pilot-only',
      execution: '仅可在人工审批后启动小范围试验',
    };
  });
}
