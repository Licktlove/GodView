import { store, pushLog, pushActivity } from '../store/sim';

// 异常拦截 → 触发链：把 POS 检出的真实异常事件变成"被唤起的 Agent"。
// Agent 画像/目标由异常事件内容现场生成（数据喊人，而非人点名），并以
// _anomaly 标记进图谱（GraphPanel 红色脉冲），与异常 SKU 节点/相关枢纽自动连边。

const TYPE_COLOR = { stockout: '#FF3B30', losing_promo: '#FF9500', category_drop: '#AF52DE' };

export function anomalyAgents() {
  const list = store.ops?.data?.anomalies;
  return Array.isArray(list) ? list : [];
}

// 在 genEntities 完成后调用：把异常事件注入世界，生成对应 Agent 并连边
export function spawnAgentsFromAnomalies() {
  const events = anomalyAgents();
  if (!events.length) return 0;

  const born = [];
  for (const ev of events.slice(0, 5)) {
    if (store.entities.some(e => e._anomalyType === ev.type && e.name === ev.agentName)) continue;
    const agent = {
      id: 'anomaly_' + ev.type + '_' + (ev.skuId || ev.cat || born.length),
      name: ev.agentName,
      type: ev.agentRole === '补货' ? '补货员' : ev.agentRole === '促销' ? '促销员' : '分析师',
      persona: ev.agentPersona,
      goal: ev.agentGoal,
      _new: true,
      _bornRound: 0,
      _anomaly: true,
      _anomalyType: ev.type,
      _anomalyColor: TYPE_COLOR[ev.type] || '#FF3B30',
      _anomalyEvidence: ev.evidence,
      _anomalyTypeName: ev.typeName,
    };
    store.entities.push(agent);

    // 连边：优先挂到名字能对上的节点（异常 SKU / 品类），否则挂最高枢纽
    const token = (ev.sku || ev.cat || '').replace(/\s+/g, '').slice(0, 6);
    let anchor = null;
    if (token.length >= 2) {
      anchor = store.entities.find(e => e.id !== agent.id && (e.name.replace(/\s+/g, '').includes(token) || token.includes(e.name.replace(/\s+/g, ''))));
    }
    if (!anchor) anchor = hubEntity(agent.id);
    if (anchor) {
      store.edges.push({
        source: agent.id, target: anchor.id,
        relation: ev.type === 'stockout' ? '拦截·断货' : ev.type === 'losing_promo' ? '拦截·亏促' : '拦截·异动',
        _new: true, round: 0, status: 'active',
        created_by: agent.id, reason: ev.evidence, effect: '', _anomalyEdge: true,
      });
      agent._anomalyAnchor = anchor.name;
    }
    born.push(agent);
  }

  if (born.length) {
    pushLog(`异常拦截：${born.length} 条真实异常触发 Agent 上场（${born.map(b => b.name).join('、')}）`, 'ok');
    born.forEach((b, i) => pushActivity(0, b.name, `被「${b._anomalyTypeName}」异常唤起：${b._anomalyEvidence}`, 'born'));
    store.growth = [{ round: 0, nodes: store.entities.length, edges: store.edges.length }];
  }
  return born.length;
}

function hubEntity(excludeId) {
  const deg = {};
  store.edges.forEach(x => { deg[x.source] = (deg[x.source] || 0) + 1; deg[x.target] = (deg[x.target] || 0) + 1; });
  let hub = null, best = -1;
  for (const e of store.entities) {
    if (e.id === excludeId) continue;
    const d = deg[e.id] || 0;
    if (d > best) { best = d; hub = e; }
  }
  return hub;
}
