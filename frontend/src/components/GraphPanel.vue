<template>
  <div class="graph-panel">
    <div class="graph-panel-header">
      <span class="panel-title">知识图谱</span>
      <div class="header-tools">
        <input class="graph-search" v-model="searchQuery" placeholder="搜索实体…" @input="applyEmphasis" />
        <button class="tool-btn" :class="{ 'path-on': pathMode }" title="点选两个节点高亮最短路径" @click="togglePathMode">路径</button>
        <button class="tool-btn" title="重新布局" @click="renderGraph"><span class="icon-spin">↻</span></button>
      </div>
    </div>

    <div class="graph-toolbar" v-if="layoutMode === 'timeline' || pathMode || pathSource">
      <template v-if="layoutMode === 'timeline'">
        <span class="tb-label">回放</span>
        <input class="tl-range" type="range" min="0" :max="maxRound" v-model.number="timelineRound" @input="renderGraph" />
        <span class="tl-val">R{{ timelineRound }} / {{ maxRound }}</span>
      </template>
      <template v-if="pathMode || pathSource">
        <span class="tb-label path-label">⌖ 路径</span>
        <span class="tb-hint" v-if="!pathSource">点击起点节点</span>
        <span class="tb-hint" v-else-if="!pathTarget">起点：{{ nameOf(pathSource) }} · 点击终点</span>
        <span class="tb-hint" v-else>{{ pathHighlight.length ? pathStr : '两节点间无连通路径' }}</span>
        <button class="tool-btn tb-clear" @click="clearPath">清除</button>
      </template>
    </div>

    <div class="graph-container" ref="containerRef">
      <svg ref="svgRef" class="graph-svg" v-show="store.entities.length"></svg>
      <div v-if="store.entities.length && (store.ui.b1 === 'processing' || store.ui.simRunning)" class="graph-building-hint">
        ⚡ 推演进行中，图谱实时自生长…
      </div>
      <div v-if="!store.entities.length" class="graph-state">
        <div class="empty-icon">❖</div>
        <p style="font-size:13px;color:#999">运行推演后，图谱将逐轮生长</p>
      </div>

      <!-- Node detail panel -->
      <div v-if="selectedNode" class="detail-panel">
        <div class="detail-panel-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="detail-type-badge" :style="{ background: typeColor(selectedNode.type) }">{{ selectedNode.type }}</span>
            <span class="detail-title">{{ selectedNode.name }}</span>
          </div>
          <button class="detail-close" @click="selectedNode = null">×</button>
        </div>
        <div class="detail-content">
          <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value" style="font-family:var(--font-mono);font-size:11px">{{ selectedNode.id }}</span></div>
          <div class="detail-row"><span class="detail-label">人格</span><span class="detail-value">{{ selectedNode.persona || '—' }}</span></div>
          <div class="detail-row"><span class="detail-label">目标</span><span class="detail-value">{{ selectedNode.goal || '—' }}</span></div>
          <template v-if="selectedNode.bio">
            <div class="detail-row"><span class="detail-label">背景</span><span class="detail-value">{{ selectedNode.bio }}</span></div>
            <div class="detail-row" v-if="selectedNode.mbti"><span class="detail-label">MBTI</span><span class="detail-value">{{ selectedNode.mbti }}</span></div>
            <div class="detail-row" v-if="selectedNode.age"><span class="detail-label">年龄</span><span class="detail-value">{{ selectedNode.age }}</span></div>
            <div class="detail-row" v-if="selectedNode.traits?.length"><span class="detail-label">特征</span><span class="detail-value">{{ selectedNode.traits.join('、') }}</span></div>
          </template>
          <template v-if="selectedNode.specs">
            <div class="detail-row"><span class="detail-label">规格</span><span class="detail-value">{{ selectedNode.specs }}</span></div>
            <div class="detail-row" v-if="selectedNode.impact"><span class="detail-label">影响力</span><span class="detail-value">{{ selectedNode.impact }}</span></div>
            <div class="detail-row" v-if="selectedNode.trend"><span class="detail-label">趋势</span><span class="detail-value">{{ selectedNode.trend }}</span></div>
          </template>
          <div class="detail-row"><span class="detail-label">重要性</span><span class="detail-value" style="font-family:var(--font-mono);font-weight:700;color:var(--orange)">{{ (selectedNode._imp || 0).toFixed(0) }}</span></div>
          <!-- Episodes -->
          <div class="detail-section" v-if="selectedNode._episodes?.length">
            <span class="section-label">行为记录 ({{ selectedNode._episodes.length }})</span>
            <div v-for="(ep, i) in selectedNode._episodes.slice(0, 6)" :key="i" class="detail-row">
              <span class="detail-value" style="font-size:11px">[R{{ ep.round }}] {{ ep.text }}</span>
            </div>
          </div>
          <!-- Neighbors -->
          <div class="detail-section" v-if="selectedNode._neighbors?.length">
            <span class="section-label">关联 ({{ selectedNode._neighbors.length }})</span>
            <div v-for="(n, i) in selectedNode._neighbors.slice(0, 8)" :key="i" class="detail-row">
              <span class="detail-value">→ {{ n.name }} <span style="color:#BBB;font-size:10px">{{ n.relation }}{{ n.round ? ' R'+n.round : '' }}</span></span>
            </div>
          </div>
          <!-- Chat button -->
          <div style="margin-top:10px">
            <button class="tool-btn" style="width:100%;justify-content:center" @click="$emit('chat', selectedNode)">💬 与此实体对话</button>
          </div>
        </div>
      </div>

      <!-- Legend (collapsible) -->
      <div v-if="store.entities.length" class="graph-legend" :class="{ collapsed: !legendOpen }">
        <div class="legend-header" @click="legendOpen = !legendOpen">
          <span class="legend-title">Entity Types ({{ entityTypes.length }})</span>
          <span class="legend-toggle">{{ legendOpen ? '−' : '+' }}</span>
        </div>
        <div class="legend-items" v-show="legendOpen">
          <div class="legend-item" v-for="t in entityTypes" :key="t.name">
            <span class="legend-dot" :style="{ background: t.color }"></span>
            <span>{{ t.name }} ({{ t.count }})</span>
          </div>
        </div>
      </div>

      <!-- Edge label toggle -->
      <div v-if="store.entities.length" class="edge-labels-toggle">
        <label class="toggle-switch">
          <input type="checkbox" v-model="showEdgeLabels" @change="renderGraph" />
          <span class="slider"></span>
        </label>
        <span class="toggle-label">Edge Labels</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import * as d3 from 'd3';
import { store } from '../store/sim';
import { computeImportance, typeColorFor } from '../engine/simulate';
import { detectCommunities, detectBridgeNodes, detectConflicts, shortestPath } from '../engine/analytics';

defineEmits(['chat']);

const PALETTE = ['#2E90E6','#ff3b30','#ff9f0a','#0fa336','#0E62C4','#607D8B','#0066b1','#6FC2FF','#ff9f0a','#0653b6','#009688','#CDDC39','#1A7FE8','#FF5722','#03A9F4','#8BC34A'];
const NODE_R = 8; // 固定节点半径，不再按重要性缩放

const containerRef = ref(null);
const svgRef = ref(null);
const selectedNode = ref(null);
const showEdgeLabels = ref(true);
const legendOpen = ref(true);

// ---- New interaction state ----
const searchQuery = ref('');
const layoutMode = ref('force');        // 'force' | 'hierarchical' | 'timeline'
const timelineRound = ref(0);
const pathMode = ref(false);
const pathSource = ref(null);
const pathTarget = ref(null);
const pathHighlight = ref([]);          // array of node ids on shortest path

const maxRound = computed(() =>
  Math.max(0,
    ...store.edges.map(e => e.round || 0),
    ...store.entities.map(e => e._bornRound || 0)
  )
);

const pathStr = computed(() => pathHighlight.value.map(nameOf).join(' → '));

let simulation = null;
let svgSel = null, gSel = null, zoom = null;
let node = null, link = null, linkLabels = null;
let lastNodesData = [];

// analytics snapshots (computed on full graph)
let localConflicts = [];
let localCommunities = [];
let localBridges = [];

function typeColor(type) { return typeColorFor(type) || PALETTE[0]; }
function idOf(x) { return (x && typeof x === 'object') ? x.id : x; }
function nameOf(id) { return store.entities.find(e => e.id === id)?.name || id; }

const entityTypes = ref([]);
function computeTypes() {
  const map = {};
  store.entities.forEach(e => {
    const t = e.type || '其他';
    if (!map[t]) map[t] = { name: t, count: 0, color: typeColor(t) };
    map[t].count++;
  });
  entityTypes.value = Object.values(map);
}

// ---------- Highlight (search / causal-chain / path) ----------
function computeEmphasisSet() {
  const set = new Set();
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    store.entities.forEach(e => {
      if ((e.name || '').toLowerCase().includes(q) || (e.type || '').toLowerCase().includes(q)) set.add(e.id);
    });
    return set;
  }
  const chain = new Set();
  store.causalChains.forEach(c => {
    if (c._highlight && Array.isArray(c.path)) c.path.forEach(id => chain.add(id));
  });
  if (chain.size) return chain;
  if (pathHighlight.value.length) return new Set(pathHighlight.value);
  return set; // empty
}

function applyEmphasis() {
  if (!node || !link) return;
  const set = computeEmphasisSet();
  const empty = set.size === 0;
  const conflictEdgeSet = new Set();
  localConflicts.forEach(c => { conflictEdgeSet.add(c.edge1Idx); conflictEdgeSet.add(c.edge2Idx); });

  node.selectAll('circle:not(.bridge-ring)')
    .attr('opacity', n => empty ? 1 : (set.has(n.id) ? 1 : 0.12))
    .attr('stroke-width', n => empty ? (n._new ? 3 : 1.5) : (set.has(n.id) ? 3 : 1.5))
    .attr('stroke', n => empty
      ? (n._new ? '#FF4500' : '#FFF')
      : (set.has(n.id) ? 'var(--ink)' : (n._new ? '#FF4500' : '#FFF')));

  node.selectAll('text')
    .attr('opacity', n => empty ? 1 : (set.has(n.id) ? 1 : 0.1));

  link
    .attr('opacity', l => {
      if (empty) return l._new ? 0.6 : 0.35;
      return (set.has(idOf(l.source)) && set.has(idOf(l.target))) ? 1 : 0.05;
    })
    .attr('stroke-width', l => {
      if (empty) return l._new ? 1.5 : 1;
      return (set.has(idOf(l.source)) && set.has(idOf(l.target))) ? 2.5 : 1;
    })
    .attr('stroke', l => {
      if (conflictEdgeSet.has(l.__idx)) return '#ff3b30';
      if (empty) return 'rgba(15,0,0,0.12)';
      return (set.has(idOf(l.source)) && set.has(idOf(l.target))) ? 'var(--ink)' : 'rgba(15,0,0,0.12)';
    })
    .attr('stroke-dasharray', l => conflictEdgeSet.has(l.__idx) ? '5 3' : null);

  if (linkLabels) {
    linkLabels.attr('opacity', l => {
      if (empty) return 1;
      return (set.has(idOf(l.source)) && set.has(idOf(l.target))) ? 1 : 0;
    });
  }
}

// ---------- Layout positioning ----------
function hierarchicalPositions(nodesArr, width, height) {
  const comms = localCommunities || [];
  const bandOf = {};
  comms.forEach((c, i) => (c.members || []).forEach(id => { bandOf[id] = i; }));
  const hasUnassigned = nodesArr.some(n => !(n.id in bandOf));
  const nBands = Math.max(comms.length, 1) + (hasUnassigned ? 1 : 0);
  const bands = Array.from({ length: nBands }, () => []);
  nodesArr.forEach(n => { const b = (n.id in bandOf) ? bandOf[n.id] : nBands - 1; bands[b].push(n); });
  const pos = {};
  bands.forEach((list, bi) => {
    const x = width * (bi + 1) / (nBands + 1);
    const gap = Math.min(70, (height - 100) / Math.max(list.length, 1));
    list.forEach((n, i) => {
      pos[n.id] = { x, y: height / 2 + (i - (list.length - 1) / 2) * gap };
    });
  });
  return pos;
}

// ---------- Zoom presets ----------
function zoomIn() { if (svgSel) svgSel.transition().duration(200).call(zoom.scaleBy, 1.4); }
function zoomOut() { if (svgSel) svgSel.transition().duration(200).call(zoom.scaleBy, 1 / 1.4); }
function zoomReset() { if (svgSel) svgSel.transition().duration(200).call(zoom.transform, d3.zoomIdentity); }
function zoomFit() {
  if (!svgSel || !lastNodesData.length) return;
  const ns = lastNodesData.filter(d => d.x != null);
  if (!ns.length) return;
  const xs = ns.map(d => d.x), ys = ns.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = containerRef.value.clientWidth, height = containerRef.value.clientHeight;
  const w = (maxX - minX) || 1, h = (maxY - minY) || 1, pad = 50;
  const scale = Math.max(0.2, Math.min((width - pad * 2) / w, (height - pad * 2) / h, 2));
  const tx = (width - scale * (minX + maxX)) / 2;
  const ty = (height - scale * (minY + maxY)) / 2;
  svgSel.transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

// ---------- Path mode ----------
function togglePathMode() {
  pathMode.value = !pathMode.value;
  if (pathMode.value) { pathSource.value = null; pathTarget.value = null; pathHighlight.value = []; applyEmphasis(); }
}
function clearPath() {
  pathSource.value = null; pathTarget.value = null; pathHighlight.value = []; pathMode.value = false;
  applyEmphasis();
}
function computePath() {
  const p = shortestPath(store.entities, store.edges, pathSource.value, pathTarget.value);
  pathHighlight.value = p || [];
  pathMode.value = false;
  applyEmphasis();
}

// ---------- Layout switch ----------
function setLayout(m) {
  layoutMode.value = m;
  if (m === 'timeline' && timelineRound.value < maxRound.value) timelineRound.value = maxRound.value;
  renderGraph();
}

// ---------- Main render ----------
function renderGraph() {
  if (!svgRef.value || !store.entities.length) return;
  computeTypes();
  const container = containerRef.value;
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width < 10 || height < 10) return;

  if (simulation) { simulation.stop(); simulation = null; }

  // Feature 1+5: compute analytics on the FULL graph (stable colors)
  localConflicts = detectConflicts(store.edges);
  localCommunities = detectCommunities(store.entities, store.edges);
  localBridges = detectBridgeNodes(store.entities, store.edges, localCommunities);

  svgSel = d3.select(svgRef.value).attr('width', width).attr('height', height);
  svgSel.selectAll('*').remove();
  svgSel.on('click', null);

  const imp = computeImportance(store.entities, store.edges);

  let nodes = store.entities.map(e => ({
    ...e, _imp: imp[e.id] || 10,
    _neighbors: store.edges.filter(x => x.source === e.id || x.target === e.id).map(x => {
      const o = store.entities.find(y => y.id === (x.source === e.id ? x.target : x.source));
      return o ? { name: o.name, relation: x.relation, round: x.round } : null;
    }).filter(Boolean),
    _episodes: store.episodes[e.id] || [],
  }));

  const nodeIds = new Set(nodes.map(n => n.id));
  let links = store.edges
    .map((e, oi) => ({ e, oi }))
    .filter(({ e }) => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target)
    .map(({ e, oi }) => ({ source: e.source, target: e.target, relation: e.relation, _new: e._new, round: e.round, status: e.status, __idx: oi }));

  // ---- Timeline filtering ----
  if (layoutMode.value === 'timeline') {
    const r = timelineRound.value;
    nodes = nodes.filter(n => (n._bornRound || 0) <= r);
    const ids = new Set(nodes.map(n => n.id));
    links = links.filter(l => ids.has(l.source) && ids.has(l.target) && (l.round || 0) <= r);
  }
  if (!nodes.length) return;
  lastNodesData = nodes;

  gSel = svgSel.append('g');
  zoom = d3.zoom().extent([[0, 0], [width, height]]).scaleExtent([0.1, 4]).on('zoom', e => gSel.attr('transform', e.transform));
  svgSel.call(zoom);

  // Links
  const linkGroup = gSel.append('g').attr('class', 'links');
  link = linkGroup.selectAll('line')
    .data(links).enter().append('line')
    .attr('stroke', l => localConflicts.some(c => c.edge1Idx === l.__idx || c.edge2Idx === l.__idx) ? '#ff3b30' : 'rgba(15,0,0,0.12)')
    .attr('stroke-width', l => l._new ? 1.5 : 1)
    .attr('stroke-dasharray', l => localConflicts.some(c => c.edge1Idx === l.__idx || c.edge2Idx === l.__idx) ? '5 3' : null)
    .attr('opacity', l => l._new ? 0.6 : 0.35)
    .style('cursor', 'pointer')
    .on('click', (event) => { event.stopPropagation(); });

  // Edge labels
  if (showEdgeLabels.value) {
    const labelGroup = gSel.append('g').attr('class', 'edge-labels');
    linkLabels = labelGroup.selectAll('text')
      .data(links).enter().append('text')
      .text(d => d.relation || '')
      .attr('font-size', 9).attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#646262').attr('text-anchor', 'middle')
      .attr('pointer-events', 'none');
  } else {
    linkLabels = null;
  }

  // Nodes
  const nodeGroup = gSel.append('g').attr('class', 'nodes');
  node = nodeGroup.selectAll('g')
    .data(nodes).enter().append('g')
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation();
      if (pathMode.value) {
        if (!pathSource.value) pathSource.value = d.id;
        else if (d.id !== pathSource.value) { pathTarget.value = d.id; computePath(); }
        return;
      }
      selectedNode.value = d;
    })
    .on('mouseover', (event, d) => {
      const connectedIds = new Set([d.id]);
      const connectedEdgeIdx = new Set();
      links.forEach((l, i) => {
        const s = idOf(l.source), t = idOf(l.target);
        if (s === d.id || t === d.id) { connectedEdgeIdx.add(i); connectedIds.add(s); connectedIds.add(t); }
      });
      node.selectAll('circle:not(.bridge-ring)')
        .attr('opacity', n => connectedIds.has(n.id) ? 1 : 0.12)
        .attr('stroke-width', n => n.id === d.id ? 4 : (connectedIds.has(n.id) ? 2.5 : 1.5))
        .attr('stroke', n => n.id === d.id ? 'var(--ink)' : (connectedIds.has(n.id) ? 'var(--ink)' : '#FFF'));
      node.selectAll('text')
        .attr('opacity', n => connectedIds.has(n.id) ? 1 : 0.1)
        .attr('font-weight', n => n.id === d.id ? '700' : '400');
      link.attr('opacity', (l, i) => connectedEdgeIdx.has(i) ? 1 : 0.05)
        .attr('stroke-width', (l, i) => connectedEdgeIdx.has(i) ? 2.5 : 1)
        .attr('stroke', (l, i) => {
          if (localConflicts.some(c => c.edge1Idx === l.__idx || c.edge2Idx === l.__idx)) return '#ff3b30';
          return connectedEdgeIdx.has(i) ? 'var(--ink)' : '#D0D0D0';
        });
      if (linkLabels) {
        linkLabels.attr('opacity', (l, i) => connectedEdgeIdx.has(i) ? 1 : 0)
          .attr('fill', (l, i) => connectedEdgeIdx.has(i) ? 'var(--ink)' : '#999')
          .attr('font-weight', (l, i) => connectedEdgeIdx.has(i) ? '700' : '400');
      }
    })
    .on('mouseout', () => { applyEmphasis(); });

  node.append('circle')
    .attr('r', NODE_R)
    .attr('fill', d => typeColor(d.type))
    .attr('stroke', d => d._new ? '#FF4500' : '#FFF')
    .attr('stroke-width', d => d._new ? 3 : 1.5);

  node.append('text')
    .text(d => d.name)
    .attr('font-size', 11).attr('font-family', 'Noto Sans SC, sans-serif')
    .attr('fill', 'var(--ink)')
    .attr('dx', NODE_R + 4)
    .attr('dy', 4)
    .attr('pointer-events', 'none');

  // Feature 5: Community background circles (skip in timeline to avoid clutter)
  if (layoutMode.value !== 'timeline') {
    const commColors = ['rgba(0,122,255,0.06)','rgba(255,59,48,0.06)','rgba(255,159,10,0.06)','rgba(48,209,88,0.06)','rgba(110,110,115,0.06)','rgba(154,152,152,0.06)'];
    const commGroup = gSel.append('g').attr('class', 'communities').lower();
    localCommunities.forEach((comm, ci) => {
      commGroup.append('circle')
        .attr('class', 'community-bg')
        .attr('fill', commColors[ci % commColors.length])
        .attr('stroke', commColors[ci % commColors.length].replace('0.06','0.15'))
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 4')
        .attr('r', 0);
    });
  }

  // Feature 5: Bridge node markers (outer ring)
  node.selectAll('circle.bridge-ring').remove();
  node.filter(d => localBridges.includes(d.id))
    .insert('circle', ':first-child')
    .attr('class', 'bridge-ring')
    .attr('r', NODE_R + 6)
    .attr('fill', 'none')
    .attr('stroke', '#ff9f0a')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3 2');

  // Background click clears selection (and cancels mid-pick)
  svgSel.on('click', () => {
    selectedNode.value = null;
    if (pathMode.value && pathSource.value && !pathTarget.value) { pathSource.value = null; applyEmphasis(); }
  });

  // Drag
  const drag = d3.drag()
    .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
    .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; });
  node.call(drag);

  // ---- Forces per layout ----
  if (layoutMode.value === 'hierarchical') {
    const pos = hierarchicalPositions(nodes, width, height);
    nodes.forEach(n => { const p = pos[n.id]; if (p) { n.x = p.x; n.y = p.y; n._tx = p.x; n._ty = p.y; } });
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(160).strength(0)) // resolves source/target refs
      .force('x', d3.forceX(d => d._tx).strength(1))
      .force('y', d3.forceY(d => d._ty).strength(1))
      .force('charge', d3.forceManyBody().strength(-30))
      .force('collide', d3.forceCollide().radius(d => NODE_R + 8))
      .alphaDecay(0.08).alpha(0.7);
  } else {
    // force (and timeline)
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(160).strength(0.1))
      .force('charge', d3.forceManyBody().strength(-550))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => NODE_R + 30))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));
  }

  simulation.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    if (linkLabels) {
      linkLabels.attr('x', d => (d.source.x + d.target.x) / 2).attr('y', d => (d.source.y + d.target.y) / 2);
    }
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  applyEmphasis();
}

let resizeObserver = null;
onMounted(() => {
  nextTick(() => {
    if (store.entities.length) renderGraph();
    resizeObserver = new ResizeObserver(() => { if (store.entities.length) renderGraph(); });
    if (containerRef.value) resizeObserver.observe(containerRef.value);
  });
});
onBeforeUnmount(() => { if (simulation) simulation.stop(); if (resizeObserver) resizeObserver.disconnect(); });

watch(() => [store.entities.length, store.edges.length], () => nextTick(renderGraph), { deep: true });
watch(() => store.episodes, () => { /* re-render for episode display */ }, { deep: true });
watch(() => store.causalChains, () => { if (node) applyEmphasis(); }, { deep: true });
watch(searchQuery, () => { if (node) applyEmphasis(); });
</script>

<style scoped>
.graph-search {
  border: 1px solid var(--hairline); background: var(--canvas); padding: 3px 10px;
  font-size: 12px; color: var(--ink); outline: none; width: 130px; border-radius: var(--radius-sm);
}
.graph-search:focus { border-color: var(--ink); }
.seg { display: flex; border: 1px solid var(--hairline); border-radius: var(--radius-sm); overflow: hidden; }
.seg-btn {
  border: none; background: var(--canvas); padding: 3px 9px; font-size: 12px; font-weight: 500;
  color: var(--mute); transition: all 0.1s;
}
.seg-btn.active { background: var(--ink); color: var(--on-dark); }
.seg-btn:not(:last-child) { border-right: 1px solid var(--hairline); }
.tool-btn.path-on { background: var(--ink); color: var(--on-dark); border-color: var(--ink); }
.graph-toolbar {
  display: flex; align-items: center; gap: 10px; padding: 6px 14px;
  border-bottom: 1px solid var(--hairline); background: var(--canvas); flex-shrink: 0; flex-wrap: wrap;
}
.tb-label { font-size: 11px; font-weight: 700; color: var(--mute); }
.path-label { color: var(--accent); }
.tb-hint { font-size: 11px; color: var(--body); }
.tl-range { flex: 1; min-width: 140px; accent-color: var(--ink); }
.tl-val { font-size: 11px; color: var(--mute); min-width: 64px; text-align: right; font-family: var(--font-mono); }
.tb-clear { padding: 2px 8px; }
</style>
