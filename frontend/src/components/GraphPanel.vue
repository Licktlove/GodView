<template>
  <div class="graph-panel">
    <div class="graph-panel-header">
      <span class="panel-title">知识图谱 · 节点大小=重要性</span>
      <div class="header-tools">
        <button class="tool-btn" @click="renderGraph">
          <span class="icon-spin">↻</span><span>Refresh</span>
        </button>
      </div>
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
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as d3 from 'd3';
import { store } from '../store/sim';
import { computeImportance } from '../engine/simulate';
import { detectCommunities, detectBridgeNodes, detectConflicts } from '../engine/analytics';

defineEmits(['chat']);

const TYPECOLOR = {
  '顾客分群': '#0088CC', '门店': '#E91E63', '竞品': '#FF5722', '供应商': '#4CAF50',
  '员工': '#9C27B0', '环境': '#607D8B', '商品': '#00BCD4', 'KPI': '#3F51B5', '组织': '#FF9800',
};
const PALETTE = ['#0088CC','#E91E63','#FF5722','#4CAF50','#9C27B0','#607D8B','#00BCD4','#3F51B5','#FF9800','#795548','#009688','#CDDC39','#673AB7','#F44336','#03A9F4','#8BC34A'];

const containerRef = ref(null);
const svgRef = ref(null);
const selectedNode = ref(null);
const showEdgeLabels = ref(true);
const legendOpen = ref(true);
const highlightChain = ref(null);  // causal chain path to highlight
const localCommunities = ref([]);
const localConflicts = ref([]);
const localBridges = ref([]);
let simulation = null;

function typeColor(type) { return TYPECOLOR[type] || PALETTE[0]; }

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

function renderGraph() {
  if (!svgRef.value || !store.entities.length) return;
  computeTypes();
  const container = containerRef.value;
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width < 10 || height < 10) return;

  if (simulation) { simulation.stop(); simulation = null; }
  // Feature 1+5: compute analytics
  localConflicts.value = detectConflicts(store.edges);
  localCommunities.value = detectCommunities(store.entities, store.edges);
  localBridges.value = detectBridgeNodes(store.entities, store.edges, localCommunities.value);

  const svg = d3.select(svgRef.value).attr('width', width).attr('height', height);
  svg.selectAll('*').remove();
  svg.on('click', null);

  const imp = computeImportance(store.entities, store.edges);

  const nodes = store.entities.map(e => ({
    ...e, _imp: imp[e.id] || 10,
    _neighbors: store.edges.filter(x => x.source === e.id || x.target === e.id).map(x => {
      const o = store.entities.find(y => y.id === (x.source === e.id ? x.target : x.source));
      return o ? { name: o.name, relation: x.relation, round: x.round } : null;
    }).filter(Boolean),
    _episodes: store.episodes[e.id] || [],
  }));

  const nodeIds = new Set(nodes.map(n => n.id));
  const links = store.edges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target)
    .map(e => ({ source: e.source, target: e.target, relation: e.relation, _new: e._new, round: e.round, status: e.status }));

  const g = svg.append('g');
  const zoom = d3.zoom().extent([[0,0],[width,height]]).scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform));
  svg.call(zoom);

  // Links group (rendered first, below nodes)
  const linkGroup = g.append('g').attr('class', 'links');
  const link = linkGroup.selectAll('line')
    .data(links).enter().append('line')
    .attr('stroke', '#CCCCCC')
    .attr('stroke-width', d => d._new ? 1.5 : 1)
    .attr('opacity', d => d._new ? 0.6 : 0.35)
    .style('cursor', 'pointer')
    .on('click', (event, d) => { event.stopPropagation(); });

  // Edge labels group (separate from node labels to avoid selection conflict)
  let linkLabels = null;
  if (showEdgeLabels.value) {
    const labelGroup = g.append('g').attr('class', 'edge-labels');
    linkLabels = labelGroup.selectAll('text')
      .data(links).enter().append('text')
      .text(d => d.relation || '')
      .attr('font-size', 9).attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#999').attr('text-anchor', 'middle')
      .attr('pointer-events', 'none');
  }

  // Nodes group
  const nodeGroup = g.append('g').attr('class', 'nodes');
  const node = nodeGroup.selectAll('g')
    .data(nodes).enter().append('g')
    .style('cursor', 'pointer')
    .on('click', (event, d) => { event.stopPropagation(); selectedNode.value = d; })
    .on('mouseover', (event, d) => {
      // Find connected node ids and edge indices
      const connectedIds = new Set([d.id]);
      const connectedEdgeIdx = new Set();
      links.forEach((l, i) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (s === d.id || t === d.id) { connectedEdgeIdx.add(i); connectedIds.add(s); connectedIds.add(t); }
      });
      // Dim all nodes, highlight connected
      node.selectAll('circle')
        .attr('opacity', n => connectedIds.has(n.id) ? 1 : 0.12)
        .attr('stroke-width', n => n.id === d.id ? 4 : (connectedIds.has(n.id) ? 2.5 : 1.5))
        .attr('stroke', n => n.id === d.id ? '#00C8FF' : (connectedIds.has(n.id) ? '#00C8FF' : '#FFF'));
      node.selectAll('text')
        .attr('opacity', n => connectedIds.has(n.id) ? 1 : 0.1)
        .attr('font-weight', n => n.id === d.id ? '700' : '400');
      // Dim all links, highlight connected
      link.attr('opacity', (l, i) => connectedEdgeIdx.has(i) ? 1 : 0.05)
          .attr('stroke-width', (l, i) => connectedEdgeIdx.has(i) ? 2.5 : 1)
          .attr('stroke', (l, i) => connectedEdgeIdx.has(i) ? '#00C8FF' : '#D0D0D0');
      if (linkLabels) {
        linkLabels.attr('opacity', (l, i) => connectedEdgeIdx.has(i) ? 1 : 0)
                  .attr('fill', (l, i) => connectedEdgeIdx.has(i) ? '#00C8FF' : '#999')
                  .attr('font-weight', (l, i) => connectedEdgeIdx.has(i) ? '700' : '400');
      }
    })
    .on('mouseout', () => {
      // Restore all
      node.selectAll('circle')
        .attr('opacity', 1)
        .attr('stroke-width', n => n._new ? 2 : 1.5)
        .attr('stroke', n => n._new ? '#999' : '#FFF');
      node.selectAll('text').attr('opacity', 1).attr('font-weight', '400');
      link.attr('opacity', l => l._new ? 0.6 : 0.35)
          .attr('stroke-width', l => l._new ? 1.5 : 1)
          .attr('stroke', '#CCCCCC');
      if (linkLabels) {
        linkLabels.attr('opacity', 1).attr('fill', '#999').attr('font-weight', '400');
      }
    });

  node.append('circle')
    .attr('r', d => 6 + Math.sqrt(d._imp || 10) * 1.5)
    .attr('fill', d => typeColor(d.type))
    .attr('stroke', d => d._new ? '#FF4500' : '#FFF')
    .attr('stroke-width', d => d._new ? 3 : 1.5);

  node.append('text')
    .text(d => d.name)
    .attr('font-size', 11).attr('font-family', 'Noto Sans SC, sans-serif')
    .attr('fill', '#222')
    .attr('dx', d => 6 + Math.sqrt(d._imp || 10) * 1.5 + 4)
    .attr('dy', 4)
    .attr('pointer-events', 'none');

  // Feature 5: Community background circles
  const commColors = ['rgba(0,136,204,0.06)','rgba(233,30,99,0.06)','rgba(255,87,34,0.06)','rgba(76,175,80,0.06)','rgba(156,39,176,0.06)','rgba(255,152,0,0.06)'];
  const commGroup = g.append('g').attr('class', 'communities').lower();
  localCommunities.value.forEach((comm, ci) => {
    commGroup.append('circle')
      .attr('class', 'community-bg')
      .attr('fill', commColors[ci % commColors.length])
      .attr('stroke', commColors[ci % commColors.length].replace('0.06','0.15'))
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')
      .attr('r', 0);
  });

  // Feature 1: Mark conflict edges with red dashed
  const conflictEdgeSet = new Set();
  localConflicts.value.forEach(c => { conflictEdgeSet.add(c.edge1Idx); conflictEdgeSet.add(c.edge2Idx); });
  link.attr('stroke-dasharray', (d, i) => conflictEdgeSet.has(i) ? '5 3' : null)
      .attr('stroke', (d, i) => conflictEdgeSet.has(i) ? '#F44336' : '#CCCCCC');

  // Feature 5: Bridge node markers (outer ring)
  node.selectAll('circle.bridge-ring').remove();
  node.filter(d => localBridges.value.includes(d.id))
    .insert('circle', ':first-child')
    .attr('class', 'bridge-ring')
    .attr('r', d => 6 + Math.sqrt(d._imp || 10) * 1.5 + 6)
    .attr('fill', 'none')
    .attr('stroke', '#FF9800')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3 2');

  // Background click clears selection
  svg.on('click', () => { selectedNode.value = null; });

  // Drag behavior
  const drag = d3.drag()
    .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
    .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; });
  node.call(drag);

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(160).strength(0.1))
    .force('charge', d3.forceManyBody().strength(-550))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius(d => 6 + Math.sqrt(d._imp || 10) * 1.5 + 30))
    .force('x', d3.forceX(width / 2).strength(0.05))
    .force('y', d3.forceY(height / 2).strength(0.05));

  simulation.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    if (linkLabels) {
      linkLabels.attr('x', d => (d.source.x + d.target.x) / 2).attr('y', d => (d.source.y + d.target.y) / 2);
    }
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
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
watch(() => store.episodes, () => { /* trigger re-render for episode display */ }, { deep: true });
</script>