// 图谱节点颜色的唯一来源。
// 之前每个调用方各自维护 PALETTE，且新类型（LLM 可自定义）未命中场景包预设色时
// 全部回落到 PALETTE[0]，导致"新出现的节点都是同一个颜色"。
// 这里做动态稳定分配：预设色优先 → 新类型按首次出现顺序从扩展调色板领色并缓存（同一类型恒同色）。
import { store } from '../store/sim';

// 扩展调色板（给"场景包未预设"的新类型用）：
// - 无紫系、无重复
// - 与 retail/supplyChain 预设 10 色错开
// - 前 8 个区分度高（红/橙/绿/蓝/teal/珊瑚/slate/黄绿…），后 8 个备用
const EXT = [
  '#0EA5E9', '#E5484D', '#EF9F27', '#30A46C',
  '#0090FF', '#12A594', '#FF7A59', '#64748B',
  '#F97316', '#84CC16', '#0891B2', '#B45309',
  '#38BDF8', '#E05C8B', '#14B8A6', '#5BA8A0',
];

// 新类型 → 颜色 的稳定缓存（模块级，跨轮次/跨渲染保持）
const typeCache = new Map();
let nextIdx = 0;

export function typeColorFor(type) {
  if (!type) return EXT[0];
  // 1) 场景包预设色优先
  const preset = store.scenario?.typeColor?.[type];
  if (preset) return preset;
  // 2) 新类型：按首次出现顺序领色，缓存保证同类型恒同色
  if (typeCache.has(type)) return typeCache.get(type);
  const c = EXT[nextIdx % EXT.length];
  nextIdx++;
  typeCache.set(type, c);
  return c;
}
