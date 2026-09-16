// 学清路店促销策略沙盘。
// 场景包提供世界结构与有限推演步骤；所有数字仍由 POS 聚合结果计算。

import { buildPromoDiagnosis, formatMoney, promoDecisions } from './promoDiagnosis.js';

const PROMO_QUESTION = /促销|折扣|优惠|让利|会员券|停促|打几折|价格/;

export function isPromotionSandboxQuestion(text) {
  return PROMO_QUESTION.test(String(text || ''));
}

function itemSkuId(item) {
  return String(item?.event?.skuId || item?.sku?.id || item?.id || 'unknown');
}

function storeName(data) {
  return data?.store?.name || '学清路店';
}

function firstAllowed(item) {
  return item.candidates.find((candidate) => candidate.allowed) || null;
}

// “预训练”不改变基础模型参数，而是把训练期 POS 压缩为每次推演都可检索的世界先验。
// 它只读取训练期字段；盲测结果只能在用户显式记录回放后作为“已校正记忆”加入。
export function buildPromotionWorldPriors(data, corrections = []) {
  const diagnosis = buildPromoDiagnosis(data, { includeReplay: false });
  const train = data?.facts?.floorTrain || {};
  const store = data?.store || {};
  const productPriors = diagnosis.items.map((item) => ({
    id: itemSkuId(item),
    sku: item.event.sku,
    category: item.event.cat || item.sku?.cat || '未分类',
    knownFacts: {
      promoDiscount: item.evidence[0].value,
      promoProfit: item.evidence[1].value,
      trainProfit: item.evidence[2].value,
    },
    behavioralPrior: item.evidence[1].value < 0
      ? '公开让利持续侵蚀毛利；销量对价格的响应尚未被证明。'
      : '促销期尚有毛利；是否带来增量需求尚未被证明。',
    uncertainty: ['实时库存和缺货时长缺失', '促销机制与成本分摊缺失', 'SKU 级会员响应缺失'],
  }));
  const relationPriors = productPriors.map((product) => ({
    id: `prior-promo-margin-${product.id}`,
    relation: `公开促销 → ${product.sku} 毛利`,
    direction: Number(product.knownFacts.promoProfit) < 0 ? '负向压力' : '未触发负毛利',
    strength: Number(product.knownFacts.promoProfit) < 0 ? '高' : '低',
    evidence: `训练期让利 ${formatMoney(product.knownFacts.promoDiscount)} 元，促销期毛利 ${formatMoney(product.knownFacts.promoProfit)} 元。`,
  }));
  return {
    version: 'xueqing-pos-prior-v1',
    store: {
      name: store.name || '学清路店',
      trainingWindow: (data?.split?.train || []).join('–') || '训练窗口',
      floorGmv: train.gmv,
      floorProfit: train.profit,
      floorMargin: train.margin,
      memberShare: data?.facts?.train?.member_share,
    },
    productPriors,
    relationPriors,
    corrections: corrections.slice(-12),
    hardBoundaries: [
      '不得生成 POS 中不存在的销量、库存、顾客身份或竞品事实。',
      '不得把未知的促销机制写成满减、买赠或第二件半价。',
      '毛利、让利和销量数值只能引用世界先验或明确标记为假设区间。',
      '任何新关系都必须标记为假设、置信度和可推翻条件。',
    ],
  };
}

export function promotionWorldPriorText(data, corrections = []) {
  const prior = buildPromotionWorldPriors(data, corrections);
  const products = prior.productPriors.map((product) => [
    `SKU：${product.sku}（${product.category}）`,
    `已知：促销让利 ${formatMoney(product.knownFacts.promoDiscount)} 元；促销期毛利 ${formatMoney(product.knownFacts.promoProfit)} 元；训练期商品毛利 ${formatMoney(product.knownFacts.trainProfit)} 元。`,
    `行为先验：${product.behavioralPrior}`,
    `未知：${product.uncertainty.join('、')}。`,
  ].join(' ')).join('\n');
  const relations = prior.relationPriors.map((relation) =>
    `- ${relation.relation}：${relation.direction}，强度${relation.strength}。${relation.evidence}`,
  ).join('\n');
  const memory = prior.corrections.length
    ? prior.corrections.map((correction) => `- 已校正记忆：${typeof correction === 'string' ? correction : correction.text || JSON.stringify(correction)}`).join('\n')
    : '- 尚无已记录的运营回流修正。';
  return [
    '【学清路店零售世界先验 · 只基于训练期 POS】',
    `门店：${prior.store.name}；训练窗口：${prior.store.trainingWindow}；到店销售 ${formatMoney(prior.store.floorGmv)} 元；毛利率 ${prior.store.floorMargin ?? '—'}%；会员订单占比 ${prior.store.memberShare ?? '—'}%。`,
    '商品 Agent 记忆：', products || '暂无可用商品记忆。',
    '已证据化关系：', relations || '暂无关系。',
    '过去回流后的校正记忆：', memory,
    '硬边界：', ...prior.hardBoundaries.map((boundary) => `- ${boundary}`),
  ].join('\n');
}

export function replayCorrection(item) {
  if (!item?.backtest) return null;
  const verdict = item.backtest.verdict;
  const result = verdict === 'hit' ? '历史结果支持该方向' : verdict === 'miss' ? '历史结果不支持该方向' : '历史样本不足';
  return `SKU「${item.event.sku}」：${result}。${item.backtest.note}。后续推演必须降低对未被证据支持的客群或价格反应假设的置信度。`;
}

// 盲测只对模型已提前声明、且现有数据能观测的方向性预测评分。
// 它检验“与后来事实是否一致”，不把自然变化误称为策略带来的因果效果。
export function scorePromotionHypotheses(data, hypotheses = []) {
  const train = data?.facts?.floorTrain || {};
  const holdout = data?.facts?.holdout || {};
  const dayTrain = Number(train.days) || 1;
  const dayHoldout = Number(holdout.days) || 1;
  const metrics = {
    store_gmv_per_day: { label: '到店日均销售', train: Number(train.gmv) / dayTrain, actual: Number(holdout.gmv) / dayHoldout },
    store_profit_per_day: { label: '到店日均毛利', train: Number(train.profit) / dayTrain, actual: Number(holdout.profit) / dayHoldout },
    margin: { label: '到店毛利率', train: Number(train.margin), actual: Number(holdout.margin), absolute: true },
    member_share: { label: '会员订单占比', train: Number(train.member_share), actual: Number(holdout.member_share), absolute: true },
    promo_share: { label: '促销销售占比', train: Number(train.promo_share), actual: Number(holdout.promo_share), absolute: true },
  };
  return hypotheses.map((hypothesis) => {
    const metric = metrics[hypothesis.validation_target];
    const expected = hypothesis.expected_direction;
    if (!metric || !['up', 'down', 'flat'].includes(expected) || !Number.isFinite(metric.train) || !Number.isFinite(metric.actual)) {
      return { hypothesisId: hypothesis.id, status: 'insufficient', label: '无法验证', note: '该关系没有提前声明可观测指标或方向，不能用盲测替它背书。' };
    }
    const delta = metric.absolute ? metric.actual - metric.train : (metric.actual - metric.train) / Math.max(Math.abs(metric.train), 1);
    const observed = Math.abs(delta) <= (metric.absolute ? 1 : 0.03) ? 'flat' : delta > 0 ? 'up' : 'down';
    const status = observed === expected ? 'hit' : 'miss';
    return {
      hypothesisId: hypothesis.id, status, label: status === 'hit' ? '趋势吻合' : '趋势不吻合',
      metric: metric.label, expected, observed, train: metric.train, actual: metric.actual,
      note: `盲测只比较 ${metric.label} 的方向：预测“${directionLabel(expected)}”，实际“${directionLabel(observed)}”。这不是策略因果证明。`,
    };
  });
}

function directionLabel(direction) {
  return { up: '上升', down: '下降', flat: '基本稳定' }[direction] || '未声明';
}

export function buildPromotionWorld(data) {
  const diagnosis = buildPromoDiagnosis(data, { includeReplay: false });
  const train = data?.facts?.floorTrain || {};
  const name = storeName(data);
  const entities = [
    {
      id: 'xq-store', name, type: '门店',
      persona: `训练期到店销售 ${formatMoney(train.gmv)} 元，经营动作必须守住毛利。`,
      goal: '在可执行约束下比较促销策略',
    },
    {
      id: 'xq-manager', name: '店长审批角色', type: '员工',
      persona: '只审批经过证据核验和规则筛选的小范围动作。',
      goal: '守住毛利并形成可回流的经营决策',
    },
    {
      id: 'xq-members', name: '到店会员客群', type: '顾客分群',
      persona: `训练期会员订单占比 ${data?.facts?.train?.member_share ?? '—'}%，可作为会员券试验对象。`,
      goal: '在不公开扩大让利的情况下维持复购',
    },
    {
      id: 'xq-margin', name: '毛利约束', type: 'KPI',
      persona: `训练期到店毛利率 ${train.margin ?? '—'}%，促销不能持续用负毛利换销售。`,
      goal: '阻止违反毛利底线的策略',
    },
  ];
  const relations = [
    { source: 'xq-manager', target: 'xq-store', relation: '审批经营动作' },
    { source: 'xq-manager', target: 'xq-margin', relation: '守住毛利' },
    { source: 'xq-members', target: 'xq-store', relation: '会员试验对象' },
  ];

  diagnosis.items.forEach((item) => {
    const skuId = itemSkuId(item);
    const skuName = item.event.sku;
    const promoName = `公开促销·${skuName}`;
    entities.push(
      {
        id: `sku-${skuId}`, name: skuName, type: '商品',
        persona: `训练期促销让利 ${formatMoney(item.evidence[0].value)} 元，促销期毛利 ${formatMoney(item.evidence[1].value)} 元。`,
        goal: '比较公开折扣、会员券和维持促销的结果',
      },
      {
        id: `promo-${skuId}`, name: promoName, type: '组织',
        persona: '促销状态来自训练期 POS 聚合，不推断未提供的活动机制。',
        goal: '在规则约束下进入策略比较',
      },
    );
    relations.push(
      { source: `promo-${skuId}`, target: `sku-${skuId}`, relation: '产生促销让利' },
      { source: `sku-${skuId}`, target: 'xq-margin', relation: '影响商品毛利' },
      { source: 'xq-manager', target: `promo-${skuId}`, relation: '选择促销策略' },
    );
  });

  return { entities, relations, lockedIds: ['xq-manager'] };
}

export function buildPromotionSteps(data) {
  const diagnosis = buildPromoDiagnosis(data, { includeReplay: false });
  const evidence = [];
  const constraints = [];
  const comparisons = [];

  diagnosis.items.forEach((item) => {
    const skuId = itemSkuId(item);
    const skuName = item.event.sku;
    const candidate = firstAllowed(item);
    evidence.push(
      {
        from: `promo-${skuId}`, to: `sku-${skuId}`, relation: '核验促销让利',
        effect: `${skuName}：让利 ${formatMoney(item.evidence[0].value)} 元，促销期毛利 ${formatMoney(item.evidence[1].value)} 元。`,
      },
      {
        from: `sku-${skuId}`, to: 'xq-margin', relation: '识别毛利压力',
        effect: item.diagnosis,
      },
    );
    item.candidates.filter((action) => !action.allowed).forEach((action) => {
      constraints.push({
        from: 'xq-margin', to: `promo-${skuId}`, relation: '规则拦截',
        effect: `${skuName} · ${action.label}：${action.rule}`,
      });
    });
    if (candidate) {
      comparisons.push({
        from: 'xq-manager', to: `promo-${skuId}`, relation: `比较${candidate.label}`,
        effect: `${skuName}：${candidate.action}。是否进入审批由本轮推演选择和规则核验共同决定。`,
      });
    }
    if (item.candidates.some((action) => action.id === 'member_coupon' && action.allowed)) {
      comparisons.push({
        from: 'xq-members', to: `promo-${skuId}`, relation: '会员券候选',
        effect: `${skuName} 只允许作为小范围会员券试验，不形成公开促销结论。`,
      });
    }
  });

  return [
    { title: '证据核验', interactions: evidence },
    { title: '规则筛选', interactions: constraints },
    { title: '策略比较', interactions: comparisons },
  ];
}

function trainingEvidence(item) {
  return `「${item.event.sku}」促销让利 ${formatMoney(item.evidence[0].value)} 元，促销期毛利 ${formatMoney(item.evidence[1].value)} 元，训练期商品毛利 ${formatMoney(item.evidence[2].value)} 元。`;
}

function candidateEvidence(item) {
  return item.candidates.map((candidate) => {
    const result = candidate.allowed ? '通过' : '拒绝';
    return `- **${item.event.sku} · ${candidate.label}：${result}**。${candidate.rule}。`;
  }).join('\n');
}

function replayEvidence(item) {
  if (!item.backtest) return `- 「${item.event.sku}」尚无历史回放样本，未来结果应通过运营回流验证。`;
  return `- **${item.event.sku}：${item.backtest.label}**。${item.backtest.note}。盲测只用于验证既有判断，未参与训练期动作选择。`;
}

export function buildPromotionReport(data, question) {
  const diagnosis = buildPromoDiagnosis(data);
  const actions = promoDecisions(data).map((decision) => {
    const item = diagnosis.items.find((x) => decision.id === `promo-${itemSkuId(x)}`);
    if (item?.backtest?.verdict === 'miss') {
      return {
        ...decision,
        execution: '历史回放打脸：不得直接执行；若继续探索，只能重新设计小范围试验。',
        promotion_rule: '先解释回放差异并补齐促销机制、库存或客群证据，再重新审批。',
      };
    }
    if (item?.backtest?.verdict === 'hit') {
      return {
        ...decision,
        execution: '历史回放坐实：仍需人工审批后，才可在未来窗口启动小范围试验。',
      };
    }
    return decision;
  });
  const facts = diagnosis.items.map((item) => `- ${trainingEvidence(item)}`).join('\n') || '- 当前没有满足规则的促销异常。';
  const candidates = diagnosis.items.map(candidateEvidence).join('\n');
  const rejected = diagnosis.items.flatMap((item) => item.candidates
    .filter((candidate) => !candidate.allowed)
    .map((candidate) => `- 「${item.event.sku}」的${candidate.label}：${candidate.rule}`)).join('\n') || '- 没有被规则拦截的候选动作。';
  const replays = diagnosis.items.map(replayEvidence).join('\n');
  const trainWindow = (data?.split?.train || []).join('–') || '训练窗口';
  const holdoutWindow = (data?.split?.holdout || []).join('–') || '未来窗口';
  const evidenceCoverage = diagnosis.items.length
    ? diagnosis.items.filter((item) => item.evidenceReady).length / diagnosis.items.length
    : 0;
  const summary = diagnosis.items.length
    ? `学清路店识别出 ${diagnosis.items.length} 条高风险促销；结论只进入人工审批或后续验证，不自动执行。`
    : '当前没有符合促销异常规则的 SKU，系统不生成凭空促销建议。';
  const sections = [
    {
      title: '问题与证据边界',
      content: `本次命题：**${question || '下周哪些促销该停？'}**。训练窗口为 ${trainWindow}，系统只使用到店 POS、促销让利和商品毛利计算诊断。${holdoutWindow} 的数据只在“验证闭环”章节中出现，不参与动作选择。`,
    },
    { title: '训练期促销事实', content: facts },
    { title: '有限动作推演', content: candidates || '- 没有可比较的候选动作。' },
    { title: '规则拦截与证据缺口', content: `${rejected}\n\n当前未接入实时库存、缺货时长和在途数量，因此补货、调拨和扩大覆盖范围一律不进入执行建议。促销机制主数据不完整时，也不比较满减、买赠或第二件半价。` },
    { title: '验证闭环', content: `历史回放窗口为 ${holdoutWindow}：\n${replays}\n\n没有历史未来数据的场景，报告仍然成立；该章节会改为记录未来执行结果、持续监测或补齐数据。` },
    { title: '决策后续', content: '报告本身是本次推演的正式输出。后续可根据场景能力选择人工审批小范围试验、持续监测，或因证据不足暂不建议。任何动作都必须带责任人、观察指标和停止条件。' },
  ];
  const chains = diagnosis.items.map((item) => ({
    path: [`公开促销·${item.event.sku}`, item.event.sku, '毛利约束'],
    relations: ['产生促销让利', '影响商品毛利'],
    effect: item.diagnosis,
    confidence: item.evidenceReady ? 0.7 : 0.35,
  }));

  return {
    outline: {
      title: `${storeName(data)} · 促销策略沙盘报告`,
      summary,
      sections: sections.map(({ title }) => ({ title })),
    },
    sections,
    decisions: actions,
    chains,
    report: {
      verdict: summary,
      confidence: evidenceCoverage,
      confidence_note: `训练期证据覆盖度 ${Math.round(evidenceCoverage * 100)}%；${holdoutWindow} 仅用于历史回放，不参与事前动作选择。`,
      execution_decision: '按动作状态进入人工审批、持续监测或补充证据；不自动下发促销策略。',
      proposition: question || '下周哪些促销该停？',
      fullContent: sections.map((section) => `## ${section.title}\n${section.content}`).join('\n\n'),
    },
  };
}
