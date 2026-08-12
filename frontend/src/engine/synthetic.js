import { store, pushLog, addEpisode } from '../store/sim';
import { detectCommunities, detectBridgeNodes, detectConflicts } from './analytics';

const POOL = [
  { id: 'price_sensitive', name: '价格敏感客群', type: '顾客分群', persona: '只认折扣，决策快', goal: '最低到手价',
    age: 35, gender: '未知', mbti: 'ESTP', bio: '精打细算，活跃于社区团购群', traits: ['价格敏感','决策快'], preferences: ['比价','囤货'] },
  { id: 'loyal_vip', name: '高忠诚会员', type: '顾客分群', persona: '认品牌与服务', goal: '稳定复购',
    age: 42, gender: '女', mbti: 'ISFJ', bio: '注重品质，复购率超60%', traits: ['品质导向','高忠诚'], preferences: ['预售','尊享'] },
  { id: 'store_mgr', name: '本店店长', type: '门店', persona: '扛指标、怕库存', goal: '坪效与毛利',
    age: 38, gender: '男', mbti: 'ENTJ', bio: '零售老兵10年，背负GMV考核', traits: ['结果导向','抗压'], preferences: ['数据驱动'] },
  { id: 'competitor', name: '街角竞品', type: '竞品', persona: 'aggressive 促销', goal: '抢客流',
    age: null, gender: '未知', mbti: 'ESTP', bio: '新开业3个月，烧钱补贴', traits: ['激进','烧钱'], preferences: ['低价爆破'] },
  { id: 'supplier', name: '生鲜供应商', type: '供应商', persona: '控交货与账期', goal: '稳定大单',
    age: 50, gender: '男', mbti: 'ISTJ', bio: '本地最大生鲜批发商', traits: ['保守','控盘'], preferences: ['大客户优先'] },
  { id: 'staff', name: '导购员', type: '员工', persona: '靠提成', goal: '高客单',
    age: 26, gender: '女', mbti: 'ESFP', bio: '亲和力强，擅长关联推荐', traits: ['热情','灵活'], preferences: ['提成激励'] },
  { id: 'weather', name: '连续阴雨', type: '环境', persona: '外部不可控', goal: '—',
    specs: '7天降雨50mm+', impact: '到店客流-20-30%', trend: '短期', lifecycle: '7-10天' },
  { id: 'fresh_tea', name: '明前新茶', type: '商品', persona: '高毛利引流', goal: '带动关联购买',
    specs: '龙井250g，毛利45%', impact: '关联购买率35%', trend: '上升', lifecycle: '2个月' },
  { id: 'kpi_gmv', name: 'GMV锚点', type: 'KPI', persona: '总部考核', goal: '同比增长',
    specs: '月度GMV同比+15%', impact: '决定评级奖金', trend: '压力上升', lifecycle: '月度' },
  { id: 'region', name: '区域督导', type: '组织', persona: '盯排名', goal: '区域标杆',
    age: 45, gender: '男', mbti: 'INTJ', bio: '管理20家门店', traits: ['严谨','考核导向'], preferences: ['排名驱动'] },
];

const REL = [
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
];

export function loadDemo() {
  pushLog('加载示例推演（非实时 LLM）', 'ac');
  store.entities = POOL.map(e => ({ ...e }));
  store.edges = REL.map(([s, t, r, round]) => ({ source: s, target: t, relation: r, _new: false, round, status: 'active', created_by: s, reason: '', effect: '' }));
  store.episodes = {};
  store.growth = [{ round: 0, nodes: store.entities.length, edges: store.edges.length }];
  store.ui.b1 = 'success';
  store.ui.step1Done = true;

  addEpisode('store_mgr', { round: 1, text: '与供应商缺货协商：3天缓冲期', targetName: '生鲜供应商', relation: '缺货协商', effect: '降低缺货风险' });
  addEpisode('staff', { round: 1, text: '关联推荐新茶：客单价+15%', targetName: '明前新茶', relation: '关联推荐', effect: '客单价+15%' });

  const waves = [
    { round: 1, add: [{ id: 'group_buy', name: '社区团购', type: '竞品', persona: '低价截流', goal: '囤货客' }], rel: [['group_buy', 'price_sensitive', '截流']] },
    { round: 2, add: [{ id: 'heatwave', name: '高温预警', type: '环境', persona: '外部', goal: '—', specs: '38°C+', impact: '需求激增', trend: '短期', lifecycle: '3-5天' }], rel: [['heatwave', 'fresh_tea', '需求激增']] },
    { round: 3, add: [{ id: 'new_sk', name: '直播达人', type: '组织', persona: '带货', goal: '曝光', age: 28, gender: '女', mbti: 'ENFP', bio: '粉丝5万+', traits: ['影响力强'], preferences: ['直播'] }], rel: [['new_sk', 'fresh_tea', '爆款'], ['new_sk', 'loyal_vip', '私域转化']] },
  ];
  waves.forEach((w) => {
    w.add.forEach((ne) => { if (!store.entities.some(x => x.id === ne.id)) store.entities.push({ ...ne, _new: true, _bornRound: w.round }); });
    w.rel.forEach(([s, t, r]) => {
      if (!store.edges.some(x => x.source === s && x.target === t && x.relation === r))
        store.edges.push({ source: s, target: t, relation: r, _new: true, round: w.round, status: 'active', created_by: s, reason: '', effect: '' });
    });
    store.growth.push({ round: w.round, nodes: store.entities.length, edges: store.edges.length });
  });

  store.ui.b2 = 'success';

  // Feature 1+5: Analytics
  store.conflicts = detectConflicts(store.edges);
  store.communities = detectCommunities(store.entities, store.edges);
  store.bridgeNodes = detectBridgeNodes(store.entities, store.edges, store.communities);

  // Feature 3: Causal chains
  store.causalChains = [
    { path: ['staff', 'fresh_tea', 'kpi_gmv'], relations: ['关联推荐', '贡献增长'], effect: '+15% GMV', confidence: 0.75 },
    { path: ['competitor', 'price_sensitive'], relations: ['比价流失'], effect: '-12% 客流', confidence: 0.65 },
    { path: ['new_sk', 'fresh_tea', 'loyal_vip'], relations: ['爆款', '私域转化'], effect: '私域+8%', confidence: 0.6 },
  ];

  // Feature 2: Decisions
  store.decisions = [
    { id: 'd1', action: '会员专享新茶预售', reasoning: '高忠诚会员复购稳定，新茶毛利45%', expected_gain: '+8%复购', confidence: 0.8, status: 'proposed' },
    { id: 'd2', action: '竞品到店即送券', reasoning: '价格敏感客群流失12%', expected_gain: '挽留15%', confidence: 0.6, status: 'proposed' },
    { id: 'd3', action: '直播达人合作', reasoning: '已带动新茶爆款，单场200份', expected_gain: '曝光5万+', confidence: 0.7, status: 'proposed' },
  ];

  // Report
  store.reportOutline = {
    title: '社区团购截流应对推演报告',
    summary: '竞品+环境扰动下，新茶与私域是稳增长主线',
    sections: [{ title: '推演概述' }, { title: '关键实体' }, { title: '因果链' }, { title: '改进建议' }, { title: '风险' }],
  };
  store.reportSections = {
    0: { content: '3轮推演，10→13实体，10→15关系。涌现社区团购、高温预警、直播达人。', status: 'done' },
    1: { content: '**价格敏感客群**：流失12-30%\n**高忠诚会员**：复购稳定\n**明前新茶**：日销翻倍\n**店长**：承压最大', status: 'done' },
    2: { content: '导购推荐→新茶动销→GMV增长；竞品促销→客群流失。', status: 'done' },
    3: { content: '1. 新茶预售+8%复购\n2. 到店即送券挽留15%\n3. 直播合作曝光5万+', status: 'done' },
    4: { content: '- 团购截流（高）\n- 高温缺货（中）', status: 'done' },
  };
  store.report = { verdict: '新茶与私域是稳增长主线', confidence: 0.35, confidence_note: '合成演示数据', fullContent: '' };
  store.ui.b3 = 'success';
  store.ui.b4 = 'pending';
  pushLog('示例推演完成：节点 ' + store.entities.length + '，关系 ' + store.edges.length, 'ok');
}