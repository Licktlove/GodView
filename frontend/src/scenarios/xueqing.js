// 场景包：零售 · 学清路生态
// 这是绑定学清路店 POS 数据、促销动作边界和验证规则的独立零售世界。
import { RETAIL_TAXONOMY } from './retail.js';

export const XUEQING_PROMOTION_SEED = `我是物美学清路店店长。手里是门店到店成交数据，企业团购不进入货架动作判断。

命题：下周哪些促销该停？公开折扣改为会员券会怎样？动作必须落到 SKU、责任人、观察指标和停止条件。图谱解释角色与传导关系，但不能编造门店没有记录的销量、库存或顾客事实。`;

export default {
  id: 'xueqing',
  label: '零售 · 学清路生态',
  domain: '学清路店经营',
  ...RETAIL_TAXONOMY,
  defaultParams: { entN: 12, rounds: 6, perR: 6 },
  seedExamples: [
    { title: '促销该停什么', text: XUEQING_PROMOTION_SEED },
    { title: '公开折扣改会员券', text: '学清路店：公开折扣改成会员券后，哪些 SKU 适合先小范围试？' },
    { title: '先收窄哪款折扣', text: '学清路店：哪些 SKU 的折扣应该先收窄，才能守住毛利？' },
  ],

  promotionSandbox: {
    id: 'xueqing-promo-sandbox',
    title: '学清路店 · 促销策略沙盘',
    dataset: {
      source: 'backend/data/xueqing/store_ops.json',
      caseId: 'xueqing-2026-06',
      trainWindow: '2026-06-01 至 2026-06-23',
      holdoutWindow: '2026-06-24 至 2026-06-30',
    },
    roles: ['店长审批角色', '到店会员客群', 'SKU', '公开促销', '毛利约束'],
    actions: ['停止公开折扣', '改会员券', '维持当前折扣', '调整折扣力度'],
    capabilities: { report: true, actionMode: 'pilot', evaluationMode: 'historicalReplay' },
  },

  flagship: {
    title: '学清路店 · 促销策略',
    seed: XUEQING_PROMOTION_SEED,
    entN: 12,
    rounds: 6,
    perR: 6,
    interviewId: 'store_mgr',
    interviewQ: '公开折扣改为会员券时，哪些证据支持这个小范围试验？',
    followups: [
      { id: 'floor_staff', q: '晚高峰缺货，是货没到还是排面让给滞销了？' },
      { id: 'loyal_vip', q: '停全场促、改会员价，你会不会觉得被亏待？' },
      { id: 'price_sensitive', q: '头部品不打折，你还来吗？' },
    ],
    assumptions: [
      '到店成交数据用于形成促销策略判断；后续观察仅用于验证，不参与事前推演',
      '企业团购大单不进货架动作；作战台只对到店客负责',
      '结论必须可执行：SKU、责任人、观察指标和停止条件；验证结果只在作战台呈现',
    ],
    talkingPoints: [
      '口播① 这不是故事沙盘：学清路店的成交数据先形成世界先验。',
      '口播② 命题只有一句：哪些促销该停，公开折扣是否改会员券。',
      '口播③ 图谱解释促销、SKU、会员与毛利的传导；报告给店长行动建议。',
    ],
  },

  decisionLens: {
    stakeholder: '学清路店店长',
    concerns: [
      '决定下周主推 SKU、减陈列面和停掉哪些促销',
      '避免让利超过毛利，同时服务到店会员和晚高峰客流',
      '把结论落到 SKU、岗位、观察指标和停止条件',
    ],
    framing: '报告只围绕“当前该推什么、砍什么、停哪场促销”展开。正文不写日期、历史数据窗口或验证过程。',
  },
};
