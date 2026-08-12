// Feature 5: Graph analytics — community detection (Louvain simplified) + bridge nodes + path analysis

// ---------- Community detection (simplified Louvain) ----------
export function detectCommunities(entities, edges) {
  const ids = entities.map(e => e.id);
  if (ids.length < 2) return [];
  const adj = {};
  ids.forEach(id => { adj[id] = new Set(); });
  edges.forEach(e => {
    if (e.source !== e.target && adj[e.source] && adj[e.target]) {
      adj[e.source].add(e.target);
      adj[e.target].add(e.source);
    }
  });

  // Initialize: each node is its own community
  let comm = {};
  ids.forEach((id, i) => { comm[id] = i; });

  // Iteratively merge communities to maximize modularity (simplified)
  let improved = true;
  let iterations = 0;
  while (improved && iterations < 10) {
    improved = false;
    iterations++;
    for (const id of ids) {
      const myComm = comm[id];
      const neighborComms = {};
      adj[id].forEach(n => {
        const c = comm[n];
        neighborComms[c] = (neighborComms[c] || 0) + 1;
      });
      let bestComm = myComm;
      let bestScore = 0;
      for (const [c, count] of Object.entries(neighborComms)) {
        if (Number(c) !== myComm && count > bestScore) {
          bestScore = count;
          bestComm = Number(c);
        }
      }
      if (bestComm !== myComm) {
        comm[id] = bestComm;
        improved = true;
      }
    }
  }

  // Group by community
  const groups = {};
  ids.forEach(id => {
    const c = comm[id];
    if (!groups[c]) groups[c] = [];
    groups[c].push(id);
  });

  // Only return communities with 2+ members
  return Object.entries(groups)
    .filter(([, members]) => members.length >= 2)
    .map(([id, members], i) => ({
      id: Number(id),
      members,
      label: `群体${i + 1}`,
    }));
}

// ---------- Bridge node detection ----------
// A bridge node is one whose removal would disconnect the graph or split a community
export function detectBridgeNodes(entities, edges, communities) {
  const ids = entities.map(e => e.id);
  const adj = {};
  ids.forEach(id => { adj[id] = new Set(); });
  edges.forEach(e => {
    if (e.source !== e.target && adj[e.source] && adj[e.target]) {
      adj[e.source].add(e.target);
      adj[e.target].add(e.source);
    }
  });

  const bridges = [];
  for (const id of ids) {
    // Count connections to different communities
    const myComm = communities.find(c => c.members.includes(id));
    const crossCommLinks = new Set();
    adj[id].forEach(n => {
      const nComm = communities.find(c => c.members.includes(n));
      if (!myComm || !nComm || myComm.id !== nComm.id) {
        crossCommLinks.add(n);
      }
    });
    // Bridge if it connects 2+ different communities, or has high betweenness
    if (crossCommLinks.size >= 2) {
      bridges.push(id);
    }
  }
  return bridges;
}

// ---------- Shortest path (BFS) ----------
export function shortestPath(entities, edges, sourceId, targetId) {
  const adj = {};
  entities.forEach(e => { adj[e.id] = []; });
  edges.forEach(e => {
    if (e.source !== e.target) {
      adj[e.source]?.push(e.target);
      adj[e.target]?.push(e.source);
    }
  });
  const visited = { [sourceId]: null };
  const queue = [sourceId];
  while (queue.length) {
    const u = queue.shift();
    if (u === targetId) {
      const path = [];
      let cur = targetId;
      while (cur !== null) { path.unshift(cur); cur = visited[cur]; }
      return path;
    }
    for (const v of (adj[u] || [])) {
      if (!(v in visited)) { visited[v] = u; queue.push(v); }
    }
  }
  return null;
}

// ---------- Conflict detection (feature 1) ----------
// Opposite relation keywords
const OPPOSITE_PAIRS = [
  ['竞争', '合作'], ['流失', '复购'], ['下降', '增长'], ['减少', '增加'],
  ['压制', '支持'], ['截流', '引流'], ['负面', '正面'], ['冲突', '联盟'],
];

export function detectConflicts(edges) {
  const conflicts = [];
  const edgeMap = {}; // "src|tgt" -> [{idx, relation, round}]
  edges.forEach((e, i) => {
    const key = [e.source, e.target].sort().join('|');
    if (!edgeMap[key]) edgeMap[key] = [];
    edgeMap[key].push({ idx: i, relation: e.relation || '', round: e.round || 0 });
  });
  for (const [key, list] of Object.entries(edgeMap)) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const r1 = list[i].relation, r2 = list[j].relation;
        const isOpposite = OPPOSITE_PAIRS.some(([a, b]) =>
          (r1.includes(a) && r2.includes(b)) || (r1.includes(b) && r2.includes(a))
        );
        if (isOpposite) {
          conflicts.push({
            edge1Idx: list[i].idx, edge2Idx: list[j].idx,
            rel1: r1, rel2: r2, round1: list[i].round, round2: list[j].round,
          });
        }
      }
    }
  }
  return conflicts;
}