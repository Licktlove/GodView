// 节点重要性 = 多中心性融合（PageRank + 接近中心性 + 中介中心性），对应 PRD §7.1
export function computeImportance(entities, edges) {
  const ids = entities.map((e) => e.id);
  const n = ids.length;
  if (n === 0) return {};
  const idx = {};
  ids.forEach((id, i) => (idx[id] = i));
  const adj = {};
  ids.forEach((id) => (adj[id] = []));
  edges.forEach((e) => {
    if (e.source !== e.target && idx[e.source] !== undefined && idx[e.target] !== undefined) {
      adj[e.source].push(e.target);
      adj[e.target].push(e.source);
    }
  });
  const deg = ids.map((id) => adj[id].length);

  // PageRank
  let pr = ids.map(() => 1 / n);
  for (let it = 0; it < 30; it++) {
    const nx = ids.map(() => 0.15 / n);
    ids.forEach((id, i) => {
      adj[id].forEach((j) => {
        nx[i] += 0.85 * (pr[idx[j]] / (deg[idx[j]] || 1));
      });
    });
    pr = nx;
  }

  // BFS 距离（用于接近 / 中介）
  function bfs(s) {
    const d = { [s]: 0 };
    const q = [s];
    while (q.length) {
      const u = q.shift();
      adj[u].forEach((v) => {
        if (d[v] === undefined) {
          d[v] = d[u] + 1;
          q.push(v);
        }
      });
    }
    return d;
  }
  const clo = ids.map((id) => {
    const dd = bfs(id);
    let s = 0,
      c = 0;
    ids.forEach((x) => {
      if (x !== id && dd[x] !== undefined) {
        s += dd[x];
        c++;
      }
    });
    return c ? s / c : 0;
  });

  // 中介中心性（Brandes 简化版，图规模小足够）
  const bet = ids.map(() => 0);
  ids.forEach((s) => {
    const dd = bfs(s);
    const P = {};
    ids.forEach((x) => (P[x] = { c: 0, pred: [] }));
    P[s].c = 1;
    const ord = ids.slice().sort((a, b) => (dd[a] || 1e9) - (dd[b] || 1e9));
    ord.forEach((u) => {
      if (dd[u] === undefined) return;
      adj[u].forEach((v) => {
        if (dd[v] === dd[u] + 1) {
          P[v].c += P[u].c;
          P[v].pred.push(u);
        }
      });
    });
    ids.forEach((x) => {
      if (x !== s && P[x].c > 0) {
        P[x].pred.forEach((u) => {
          if (u !== s) bet[idx[u]] += P[x].c / P[u].c;
        });
      }
    });
  });

  const norm = (a) => {
    const mn = Math.min(...a),
      mx = Math.max(...a);
    return a.map((v) => (mx > mn ? (v - mn) / (mx - mn) : 0));
  };
  const N = { pr: norm(pr), clo: norm(clo), bet: norm(bet) };
  const imp = {};
  ids.forEach((id, i) => {
    imp[id] = (0.4 * N.pr[i] + 0.25 * N.clo[i] + 0.35 * N.bet[i]) * 100;
  });
  return imp;
}
