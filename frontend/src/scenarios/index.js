// 场景包（Scenario Pack）= GodView 的「领域知识配置」
// 推理引擎（自生长图谱 + 涌现 + 可解释报告）与领域无关；
// 不同零售/系统场景只是换一套「本体 + 颜色 + 人/物关键词 + 示例 + KPI 口径 + prompt 语境」。
// 新增一个场景 = 再写一个包，引擎一行都不用改。

// 所有包共享的基础 prompt 模板（带 {domain} 占位符，运行时被替换为场景 domain）
const BASE_PROMPTS = {
  sysGen: '你是{domain}推演引擎。根据用户给出的场景，实例化一批在该场景中会相互作用的实体（每个实体即一个 agent，带鲜明人格/目标），并给出它们之间已有的初始关系。',
  sysRound: '你是{domain}世界模拟器。让焦点 agent 基于其人格、目标，以及当前世界局势（它的邻居与其他 agent 的近期行为）做出反应。它可能调整与邻居的关系，也可能催生新的关系或新的 agent。输出严格JSON。',
  sysOutline: '你是{domain}决策参谋。基于推演终态，规划结构化预测报告的大纲。输出JSON。',
  sysSection: '你是{domain}决策分析师。撰写指定章节的详细内容。Markdown格式，80-150字，简洁精炼。',
  sysChatPerson: '你现在是「{name}」，一个{type} agent，处于{domain}推演世界中行动。\n人格：{persona}\n目标：{goal}{bio}{traits}\n\n你在推演中的经历：\n{episodes}\n\n请以该角色身份回答用户问题，保持角色一致。',
  sysChatObject: '你现在是「{name}」，一个{type}实体，处于{domain}世界。以拟人化方式描述你的状态和影响。\n描述：{persona}\n作用：{goal}{specs}\n\n在推演中的变化：\n{episodes}\n\n请以该实体视角回答用户问题。',
  sysCausal: '你是{domain}因果分析专家。从推演数据中提取关键因果链。输出JSON。',
  sysDecision: '你是{domain}决策顾问。基于推演结果生成结构化决策建议。输出JSON。',
};

function mergePrompts(scenario) {
  return { ...BASE_PROMPTS, ...(scenario.prompts || {}) };
}

const SCENARIOS = [];
function register(s) {
  SCENARIOS.push({ ...s, prompts: mergePrompts(s) });
}

// 延迟导入具体场景，避免循环依赖问题
import retail from './retail';
import supplyChain from './supplyChain';
import macro from './macro';
import ai from './ai';
register(retail);
register(supplyChain);
register(macro);
register(ai);

export const DEFAULT_SCENARIO_ID = 'retail';

export function getScenario(id) {
  return SCENARIOS.find(s => s.id === id) || SCENARIOS[0];
}

export function listScenarios() {
  return SCENARIOS.map(s => ({ id: s.id, label: s.label, domain: s.domain }));
}

export { SCENARIOS };
