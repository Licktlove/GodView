// 场景包：零售 · 单店生态（把原 simulate.js 里写死的零售领域知识外置到此）
export default {
  id: 'retail',
  label: '零售 · 单店生态',
  domain: '零售经营',
  entityTypes: ['顾客分群', '门店', '竞品', '供应商', '员工', '平台', '商品', '环境', 'KPI', '组织'],
  typeColor: {
    '顾客分群': '#0088CC', '门店': '#E91E63', '竞品': '#FF5722', '供应商': '#4CAF50',
    '员工': '#0E62C4', '环境': '#607D8B', '平台': '#00BCD4', '商品': '#FF9800', 'KPI': '#455A64', '组织': '#795548',
  },
  personKeywords: ['人', '客', '员', '长', '师', '者', '商', '户', '家', '管', '导', '工', '手', '达', '主'],
  personTypes: ['顾客分群', '门店', '竞品', '供应商', '员工', '组织', '平台'],
  objectTypes: ['商品', '环境', 'KPI'],
  kpiSchema: ['客流', '客单价', '复购率', '坪效', '毛利'],
  seedExamples: [
    '社区团购低价截流，本店客流下滑，如何应对？',
    '连续阴雨一周，生鲜损耗加剧，怎样稳毛利？',
    '街角竞品开业大促，会员流失风险高',
    '总部下达GMV同比增长20%的硬指标',
  ],
  defaultParams: { entN: 12, rounds: 6, perR: 6 },
  // 可选：直接给种子实体（LLM 抽取失败或点「加载示例」时使用）
  demoData: {
    entities: [
      { id: 'price_sensitive', name: '价格敏感客群', type: '顾客分群', persona: '只认折扣，决策快', goal: '最低到手价', age: 35, gender: '未知', mbti: 'ESTP', bio: '精打细算，活跃于社区团购群', traits: ['价格敏感', '决策快'], preferences: ['比价', '囤货'] },
      { id: 'loyal_vip', name: '高忠诚会员', type: '顾客分群', persona: '认品牌与服务', goal: '稳定复购', age: 42, gender: '女', mbti: 'ISFJ', bio: '注重品质，复购率超60%', traits: ['品质导向', '高忠诚'], preferences: ['预售', '尊享'] },
      { id: 'store_mgr', name: '本店店长', type: '门店', persona: '扛指标、怕库存', goal: '坪效与毛利', age: 38, gender: '男', mbti: 'ENTJ', bio: '零售老兵10年，背负GMV考核', traits: ['结果导向', '抗压'], preferences: ['数据驱动'] },
      { id: 'competitor', name: '街角竞品', type: '竞品', persona: 'aggressive 促销', goal: '抢客流', age: null, gender: '未知', mbti: 'ESTP', bio: '新开业3个月，烧钱补贴', traits: ['激进', '烧钱'], preferences: ['低价爆破'] },
      { id: 'supplier', name: '生鲜供应商', type: '供应商', persona: '控交货与账期', goal: '稳定大单', age: 50, gender: '男', mbti: 'ISTJ', bio: '本地最大生鲜批发商', traits: ['保守', '控盘'], preferences: ['大客户优先'] },
      { id: 'staff', name: '导购员', type: '员工', persona: '靠提成', goal: '高客单', age: 26, gender: '女', mbti: 'ESFP', bio: '亲和力强，擅长关联推荐', traits: ['热情', '灵活'], preferences: ['提成激励'] },
      { id: 'platform', name: '外卖平台', type: '平台', persona: '抽佣压利润', goal: 'GMV与抽佣', bio: '到店+到家双场景', traits: ['强势', '流量垄断'], preferences: ['高抽佣'] },
      { id: 'weather', name: '连续阴雨', type: '环境', persona: '外部不可控', goal: '—', specs: '7天降雨50mm+', impact: '到店客流-20-30%', trend: '短期', lifecycle: '7-10天' },
      { id: 'fresh_tea', name: '明前新茶', type: '商品', persona: '高毛利引流', goal: '带动关联购买', specs: '龙井250g，毛利45%', impact: '关联购买率35%', trend: '上升', lifecycle: '2个月' },
      { id: 'kpi_gmv', name: 'GMV锚点', type: 'KPI', persona: '总部考核', goal: '同比增长', specs: '月度GMV同比+15%', impact: '决定评级奖金', trend: '压力上升', lifecycle: '月度' },
      { id: 'region', name: '区域督导', type: '组织', persona: '盯排名', goal: '区域标杆', age: 45, gender: '男', mbti: 'INTJ', bio: '管理20家门店', traits: ['严谨', '考核导向'], preferences: ['排名驱动'] },
    ],
    edges: [
      ['price_sensitive', 'competitor', '比价流失', 0],
      ['loyal_vip', 'store_mgr', '私域唤醒', 0],
      ['store_mgr', 'staff', '排班激励', 0],
      ['staff', 'fresh_tea', '关联推荐', 0],
      ['competitor', 'fresh_tea', '价格压制', 0],
      ['weather', 'price_sensitive', '到店下降', 0],
      ['supplier', 'store_mgr', '缺货协商', 0],
      ['fresh_tea', 'kpi_gmv', '贡献增长', 0],
      ['region', 'store_mgr', '巡检压任务', 0],
      ['loyal_vip', 'fresh_tea', '尝鲜复购', 0],
      ['platform', 'store_mgr', '抽佣挤压', 0],
    ],
  },
  // 报告主笔视角：决定报告「为谁写、回应什么」。让报告围绕决策者的核心关切组织，
  // 而非泛泛而谈。文中博士(张文中)的真实经营理念已写入这里，零售场景的报告会据此回应。
  decisionLens: {
    stakeholder: '零售企业决策者（张文中式：回归商业本质、全面数字化、AI 控损提效）',
    concerns: [
      '天天低价(EDLP)不靠高频促销',
      'AI 选品/补货/出清精准控损提效',
      '零供协同共降流通成本、不挤压供应商',
      '以人为本：员工提薪分红→体验→复购的信任闭环',
      '生鲜·熟食·烘焙现制加工为核心品类',
    ],
    framing: '报告须围绕「在低毛利(约19%)、净利润仅1%-4%、不靠促销的硬约束下，靠 AI 控损 + 零供协同 + 员工提效，能否把效率和品质双赢做实」这一命题展开。每一章都要回应决策者的某一项核心关切，给出可落地的依据、量化影响与建议，避免空话。',
  },
};
