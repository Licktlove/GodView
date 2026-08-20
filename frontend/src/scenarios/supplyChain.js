// 场景包：供应链韧性（证明「换领域」架构可行）
// 聚焦：核心供应商断供 / 海运涨价 / 关税骤变，经牛鞭效应在渠道层层放大，
// 谁是先用崩的薄弱节点（桥节点=单一货源）。
export default {
  id: 'supplyChain',
  label: '供应链 · 韧性推演',
  domain: '供应链韧性',
  entityTypes: ['工厂', '供应商', '物流商', '港口', '渠道', '终端门店', '平台', '政策', '商品', '环境'],
  typeColor: {
    '工厂': '#0E62C4', '供应商': '#4CAF50', '物流商': '#00BCD4', '港口': '#3F51B5',
    '渠道': '#FF9800', '终端门店': '#E91E63', '平台': '#0088CC', '政策': '#F44336',
    '商品': '#FFC107', '环境': '#607D8B',
  },
  personKeywords: ['厂', '商', '物流', '港', '渠', '店', '台', '政', '管', '仓', '主'],
  personTypes: ['工厂', '供应商', '物流商', '港口', '渠道', '终端门店', '平台'],
  objectTypes: ['商品', '政策', '环境'],
  kpiSchema: ['交付周期', '断供风险', '牛鞭放大倍数', '库存周转', '履约成本'],
  seedExamples: [
    '核心供应商突发断供，主力商品30天后缺货，如何保交付？',
    '海运运费翻倍+港口拥堵，进口商品交期拉长，渠道如何分担？',
    '新关税政策落地，某类商品成本骤增25%，价格怎么传导？',
  ],
  defaultParams: { entN: 12, rounds: 8, perR: 6 },
  demoData: {
    entities: [
      { id: 'core_supplier', name: '核心供应商A', type: '供应商', persona: '独家货源、议价强', goal: '保大单控账期', bio: '占本渠道60%货源', traits: ['强势', '单点依赖'] },
      { id: 'factory', name: '代工厂B', type: '工厂', persona: '产能有限、切换慢', goal: '高稼动率', bio: '可承接转单但需2周爬坡', traits: ['弹性不足'] },
      { id: 'logistics', name: '干线物流商', type: '物流商', persona: '运力强、成本敏感', goal: '满载率', bio: '海运+陆运组合', traits: ['成本导向'] },
      { id: 'port', name: '主要港口', type: '港口', persona: '吞吐瓶颈', goal: '通关效率', bio: '近期拥堵+3天', traits: ['拥堵', '外部'] },
      { id: 'channel', name: '区域经销商', type: '渠道', persona: '压库存怕断货', goal: '不断供', bio: '安全库存仅10天', traits: ['牛鞭敏感'] },
      { id: 'store', name: '终端门店', type: '终端门店', persona: '要现货', goal: '货架不空', bio: '缺货即流失', traits: ['零容忍缺货'] },
      { id: 'platform', name: '电商履约平台', type: '平台', persona: '时效承诺', goal: '履约率', bio: '超时罚款', traits: ['强考核'] },
      { id: 'policy', name: '新关税政策', type: '政策', persona: '外部不可控', goal: '—', specs: '成本+25%', impact: '终端价传导', trend: '已落地', lifecycle: '长期' },
      { id: 'goods', name: '主力商品X', type: '商品', persona: '高周转引流', goal: '动销', specs: '毛利30%', impact: '占GMV40%', trend: '稳定', lifecycle: '常青' },
      { id: 'env', name: '地缘波动', type: '环境', persona: '外部', goal: '—', specs: '航运指数+40%', impact: '运费上行', trend: '上升', lifecycle: '季度' },
    ],
    edges: [
      ['core_supplier', 'factory', '代工供货', 0],
      ['factory', 'logistics', '干线发运', 0],
      ['logistics', 'port', '口岸通关', 0],
      ['port', 'channel', '入仓分销', 0],
      ['channel', 'store', '门店铺货', 0],
      ['channel', 'platform', '线上履约', 0],
      ['goods', 'store', '货架贡献', 0],
      ['core_supplier', 'goods', '独家供应', 0],
      ['policy', 'goods', '成本传导', 0],
      ['env', 'logistics', '运费上行', 0],
    ],
  },
};
