// 场景包：零售 · 单店生态
// 通用零售世界不绑定任何门店数据；学清路数据沙盘见 xueqing.js。

export const HARD_DISCOUNT_SEED = `我是一家社区 AI 新质零售店店长。门店坚持天天低价（EDLP）、不靠高频促销；生鲜 / 熟食 / 烘焙现制占比过半；用 AI 选品、补货、出清控损；与供应商数字化协同，不靠压账期降本；基层刚完成提薪分红（+30%~50%）。硬约束：综合毛利率约 19%，净利 1%–4%。

本周五，街对面「折扣王」硬折扣店开业，粮油蛋奶标价比我们低 8–15%，并砸 3 天地推。同时美团闪购抽佣提到 18%，周末高温黄色预警将推高生鲜损耗。总部仍要本月 GMV +12%，毛利红线不许破。

请推演未来 72 小时：是跟价打价格战，还是死守 EDLP、用 AI 出清 + 现制熟食把客人留住？关键要回答——价格敏感客群会不会走、供应商会不会反水、提薪后的员工还能否撑住体验。`;

export const RETAIL_TAXONOMY = {
  entityTypes: ['顾客分群', '门店', '竞品', '供应商', '员工', '平台', '商品', '环境', 'KPI', '组织'],
  typeColor: {
    '顾客分群': '#0088CC', '门店': '#E91E63', '竞品': '#FF5722', '供应商': '#4CAF50',
    '员工': '#0E62C4', '环境': '#607D8B', '平台': '#00BCD4', '商品': '#FF9800', 'KPI': '#455A64', '组织': '#795548',
  },
  personKeywords: ['人', '客', '员', '长', '师', '者', '商', '户', '家', '管', '导', '工', '手', '达', '主'],
  personTypes: ['顾客分群', '门店', '竞品', '供应商', '员工', '组织', '平台'],
  objectTypes: ['商品', '环境', 'KPI'],
  kpiSchema: ['客流', '客单价', '复购率', '坪效', '毛利'],
};

export default {
  id: 'retail',
  label: '零售 · 单店生态',
  domain: '零售经营',
  ...RETAIL_TAXONOMY,
  seedExamples: [
    { title: '72h 硬折扣', text: HARD_DISCOUNT_SEED },
    { title: '团购截流', text: '社区团购低价截流，本店客流连续两周下滑，会员沉睡加速。是否跟价、切团长、还是用现制熟食把到店理由做厚？' },
    { title: '阴雨损耗', text: '连续阴雨一周，生鲜到店客流掉、损耗抬头。AI 出清节奏怎么排，才能既不砸价也不把毛利打穿？' },
  ],
  defaultParams: { entN: 12, rounds: 6, perR: 6 },

  demoData: {
    seed: HARD_DISCOUNT_SEED,
    lockedIds: ['store_mgr'],
    assumptions: [
      '周五「折扣王」隔街开业，粮油蛋奶比本店低 8–15%，地推 3 天',
      '美团闪购抽佣上调至 18%，到家单几乎不赚钱',
      '周末高温黄警，生鲜损耗预计上冲 40%，出清窗口只剩 36 小时',
    ],
    entities: [
      { id: 'price_sensitive', name: '价格敏感客群', type: '顾客分群', persona: '粮油蛋奶只认到手价，决策快，微信群比价', goal: '最低到手价', age: 36, gender: '未知', mbti: 'ESTP', bio: '家庭采购主力，硬折扣开业第一天就会去摸底', traits: ['价格敏感', '决策快'], preferences: ['比价', '囤货'] },
      { id: 'family_fresh', name: '家庭晚餐客', type: '顾客分群', persona: '下班路过买现制，认新鲜不认传单', goal: '一站买齐晚餐', age: 34, gender: '女', mbti: 'ISFJ', bio: '每周 4 次到店，熟食烘焙是到店理由', traits: ['便利导向', '品质底线'], preferences: ['现制', '一站式'] },
      { id: 'loyal_vip', name: '高忠诚会员', type: '顾客分群', persona: '认店员和熟食，不跟每一分钱', goal: '稳定复购', age: 42, gender: '女', mbti: 'ISFJ', bio: '复购超 60%，提薪后的导购是她留下的原因之一', traits: ['品质导向', '高忠诚'], preferences: ['熟客', '现制'] },
      { id: 'store_mgr', name: '社区店店长', type: '门店', persona: '死守 19% 毛利，怕跟价、怕缺货、怕员工寒心', goal: '毛利红线与客流同时活', age: 38, gender: '男', mbti: 'ENTJ', bio: '零售 10 年，刚完成基层提薪，不允许用员工换流量', traits: ['结果导向', '守红线'], preferences: ['数据驱动', 'EDLP'] },
      { id: 'hard_discount', name: '折扣王硬折扣', type: '竞品', persona: '开业即砸价，只打标品不做现制', goal: '72 小时抢刚需客流', age: null, gender: '未知', mbti: 'ESTP', bio: '隔街新开，粮油蛋奶低 8–15%，地推 3 天', traits: ['激进', '标品爆破'], preferences: ['低价', '地推'] },
      { id: 'fresh_supplier', name: '生鲜供应商', type: '供应商', persona: '接受协同降本，绝不接受被压账期', goal: '稳定大单与合理利润', age: 50, gender: '男', mbti: 'ISTJ', bio: '本地最大生鲜批发，已与本店数字化对账', traits: ['协同', '怕被挤压'], preferences: ['账期稳定'] },
      { id: 'kitchen_staff', name: '现制档口师傅', type: '员工', persona: '熟食是护城河，加班可以、质量不行', goal: '出餐品质与翻台', age: 41, gender: '男', mbti: 'ISTP', bio: '熟食烘焙占店销过半，硬折扣打不了这一层', traits: ['手艺', '护城河'], preferences: ['现制'] },
      { id: 'floor_staff', name: '基层导购', type: '员工', persona: '刚提薪分红，要尊严不要回到发传单', goal: '服务换复购', age: 26, gender: '女', mbti: 'ESFP', bio: '薪资 +30~50% 后离职率下降，最怕被重新当地推', traits: ['热情', '要被尊重'], preferences: ['提成', '到店服务'] },
      { id: 'platform', name: '美团闪购', type: '平台', persona: '抽佣 18%，用流量换毛利', goal: 'GMV 与抽佣', bio: '到家单爆了但几乎不赚钱', traits: ['强势', '抽佣'], preferences: ['高佣'] },
      { id: 'heatwave', name: '高温黄警', type: '环境', persona: '外部不可控，倒逼 36 小时出清', goal: '—', specs: '周末 37°C+', impact: '生鲜损耗预计 +40%', trend: '短期', lifecycle: '48-72小时' },
      { id: 'prepared_food', name: '现制熟食烘焙', type: '商品', persona: '硬折扣打不了的体验锚点', goal: '留住晚餐客与会员', specs: '现制占比>50%，毛利高于标品', impact: '到店理由', trend: '上升', lifecycle: '日清' },
      { id: 'kpi_margin', name: '毛利红线 19%', type: 'KPI', persona: '破线即失败，跟价就会碰到', goal: '守住 19% / 净利 1–4%', specs: '公开经营约束', impact: '决定能不能跟价', trend: '高压', lifecycle: '日/周' },
    ],
    edges: [
      ['hard_discount', 'price_sensitive', '开业截流', 0],
      ['price_sensitive', 'store_mgr', '比价流失', 0],
      ['family_fresh', 'prepared_food', '晚餐决策', 0],
      ['loyal_vip', 'floor_staff', '认人复购', 0],
      ['store_mgr', 'kpi_margin', '死守红线', 0],
      ['store_mgr', 'fresh_supplier', '不压账期', 0],
      ['kitchen_staff', 'prepared_food', '出餐品质', 0],
      ['heatwave', 'prepared_food', '损耗倒逼', 0],
      ['heatwave', 'fresh_supplier', '催促出清', 0],
      ['platform', 'store_mgr', '抽佣挤压', 0],
      ['hard_discount', 'prepared_food', '打不了现制', 0],
      ['floor_staff', 'family_fresh', '到店体验', 0],
    ],
    episodes: [
      { id: 'store_mgr', round: 1, text: '拒绝跟价：标品可让一层陈列，毛利红线不破', targetName: '毛利红线 19%', relation: '死守红线', effect: '避免毛利击穿' },
      { id: 'fresh_supplier', round: 1, text: '同意加密补货与日清协同，账期维持不变', targetName: '社区店店长', relation: '不压账期', effect: '损耗窗口前把货出掉' },
      { id: 'kitchen_staff', round: 2, text: '晚餐档口延时 2 小时，家庭客被现制留住', targetName: '现制熟食烘焙', relation: '出餐品质', effect: '客单价回升' },
    ],
    waves: [
      { round: 1, add: [{ id: 'street_promo', name: '开业地推小队', type: '竞品', persona: '门口发券截流', goal: '把比价客当场拉走', traits: ['地推'] }], rel: [['street_promo', 'price_sensitive', '当场截流']] },
      { round: 2, add: [{ id: 'clearance_ai', name: 'AI 出清引擎', type: '组织', persona: '按小时降价出清，不搞满减噱头', goal: '高温前把生鲜卖完', traits: ['控损'] }], rel: [['clearance_ai', 'kpi_margin', '守住红线'], ['heatwave', 'clearance_ai', '倒逼出清']] },
      { round: 3, add: [{ id: 'night_kitchen', name: '晚餐延时档口', type: '员工', persona: '用现制对冲标品流失', goal: '把家庭客留到 20:00', traits: ['加班', '护城河'] }], rel: [['night_kitchen', 'family_fresh', '晚餐留客'], ['loyal_vip', 'prepared_food', '熟客加单']] },
    ],
    causalChains: [
      { path: ['hard_discount', 'price_sensitive', 'store_mgr'], relations: ['开业截流', '比价流失'], effect: '刚需标品客流承压', confidence: 0.78 },
      { path: ['heatwave', 'fresh_supplier', 'kpi_margin'], relations: ['催促出清', '死守红线'], effect: '不跟价则必须 36h 出清', confidence: 0.72 },
      { path: ['kitchen_staff', 'prepared_food', 'family_fresh'], relations: ['出餐品质', '晚餐决策'], effect: '现制留住到店理由', confidence: 0.74 },
      { path: ['platform', 'store_mgr', 'kpi_margin'], relations: ['抽佣挤压', '死守红线'], effect: '到家不是解法', confidence: 0.7 },
    ],
    decisions: [
      { id: 'd1', action: '不跟价：标品陈列让一层，EDLP 价签不动', reasoning: '跟 8–15% 会直接撞 19% 毛利红线，且教会顾客只等开业', expected_gain: '毛利不破线', confidence: 0.82, status: 'proposed' },
      { id: 'd2', action: 'AI 按小时出清 + 供应商日清协同，账期不延长', reasoning: '高温是 36 小时窗口，控损比砸价更赚', expected_gain: '损耗少吞毛利', confidence: 0.76, status: 'proposed' },
      { id: 'd3', action: '晚餐档口延时，把现制成到店理由', reasoning: '硬折扣没有现制，家庭客和会员是可守的盘', expected_gain: '客单与复购托底', confidence: 0.8, status: 'proposed' },
      { id: 'd4', action: '禁止员工门口发传单，提薪叙事不能当场打脸', reasoning: '用员工换流量会把刚建立的体验闭环拆掉', expected_gain: '留人、留会员', confidence: 0.77, status: 'proposed' },
    ],
    reportOutline: {
      title: '72小时硬折扣冲击 · 决策推演报告',
      summary: '不跟价、不压供、不拿员工换流量。用 AI 出清扛损耗，用现制熟食留到店理由，守住 19% 毛利红线。',
      sections: [{ title: '72小时局势' }, { title: '谁会走、谁会留' }, { title: '三条红线' }, { title: '动作建议' }, { title: '若跟价会怎样' }],
    },
    reportSections: {
      0: { content: '三条冲击叠在 72 小时内：硬折扣开业截流、闪购抽佣 18%、高温倒逼出清。这是生存题，不是周末促销题。', status: 'done' },
      1: { content: '**价格敏感客群**：标品会流失一截，问他们「便宜一成还来吗」会得到诚实的分流。\n**家庭晚餐客 / 会员**：硬折扣没有现制档口，是可守的盘。\n**供应商**：接受协同，不接受延账期。', status: 'done' },
      2: { content: '红线一：毛利 19% 不能跟价去撞。\n红线二：零供不压账期。\n红线三：提薪后的员工不当地推。', status: 'done' },
      3: { content: '1. EDLP 价签不动，标品陈列让一层\n2. AI 按小时出清 + 供应商日清\n3. 晚餐档口延时，现制成到店理由\n4. 到家渠道收缩，不拿 18% 抽佣换 GMV', status: 'done' },
      4: { content: '若跟价：毛利击穿、供应商反水、员工寒心、顾客学会只等下一场开业。短期客流好看，72 小时后更难。', status: 'done' },
    },
    report: {
      verdict: '不跟价。用现制护城河 + AI 出清，把 72 小时活成一次效率验证，而不是一场价格战。',
      confidence: 0.42,
      confidence_note: '合成演示数据，现场请再跑一遍真 LLM 抽取与报告',
      fullContent: '',
    },
  },

  decisionLens: {
    stakeholder: '单店店长',
    concerns: [
      '识别客流、毛利、库存和服务体验之间的取舍',
      '把经营冲击拆成可验证的角色行为与传导关系',
      '给出可由店长审批的小范围行动建议',
    ],
    framing: '报告围绕当前经营问题给出可执行建议。动作应落到对象、岗位、观察指标和停止条件。',
  },
};
