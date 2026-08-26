<template>
  <div>
    <div class="panel-header-row">
      <span class="panel-title">{{ kpiMode ? 'KPI 预测曲线' : '图谱生长曲线' }}</span>
      <div class="panel-toggle" v-if="hasKpiData || store.growth.length > 1">
        <button class="toggle-btn" :class="{ active: !kpiMode }" @click="kpiMode = false">结构</button>
        <button class="toggle-btn" :class="{ active: kpiMode }" @click="kpiMode = true" :disabled="!hasKpiData">KPI</button>
      </div>
    </div>
    <div ref="containerRef" style="width:100%;height:200px"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as d3 from 'd3';
import { store } from '../store/sim';

const props = defineProps({
  // 'auto' 工作台内自切换；'kpi' 报告页强制 KPI 曲线；'count' 强制结构曲线
  mode: { type: String, default: 'auto' },
});

const containerRef = ref(null);
const kpiMode = ref(false);
let resizeObserver = null;

const KPI_COLORS = ['#0EA5E9', '#E5484D', '#30A46C', '#EF9F27', '#0090FF', '#12A594', '#FF7A59', '#64748B'];
const hasKpiData = computed(() => Object.keys(store.kpiCurves).some(k => store.kpiCurves[k]?.length));

function renderCount() {
  if (!containerRef.value || store.growth.length < 2) return;
  const el = containerRef.value;
  el.innerHTML = '';
  const width = el.clientWidth;
  const height = el.clientHeight;
  if (width < 10 || height < 10) return;

  const margin = { top: 12, right: 12, bottom: 24, left: 36 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const svg = d3.select(el).append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint().domain(store.growth.map(d => 'R' + d.round)).range([0, w]).padding(0.5);
  const yMax = Math.max(...store.growth.map(d => Math.max(d.nodes, d.edges)), 1);
  const y = d3.scaleLinear().domain([0, yMax * 1.15]).range([h, 0]);

  g.append('g').selectAll('line').data(y.ticks(4)).enter().append('line')
    .attr('x1', 0).attr('x2', w).attr('y1', d => y(d)).attr('y2', d => y(d))
    .attr('stroke', 'rgba(15,0,0,0.08)').attr('stroke-width', 1);

  g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0).tickPadding(6))
    .selectAll('text').style('font-size', '9px').style('font-family', 'JetBrains Mono').style('fill', '#201d1d');
  g.append('g').call(d3.axisLeft(y).ticks(4).tickSize(0).tickPadding(4))
    .selectAll('text').style('font-size', '9px').style('font-family', 'JetBrains Mono').style('fill', '#201d1d');
  g.selectAll('.domain').remove();

  const lineNodes = d3.line().x(d => x('R' + d.round)).y(d => y(d.nodes)).curve(d3.curveMonotoneX);
  const lineEdges = d3.line().x(d => x('R' + d.round)).y(d => y(d.edges)).curve(d3.curveMonotoneX);

  const area = d3.area().x(d => x('R' + d.round)).y0(h).y1(d => y(d.nodes)).curve(d3.curveMonotoneX);
  g.append('path').datum(store.growth).attr('d', area).attr('fill', '#f68d1f').attr('opacity', 0.06);

  g.append('path').datum(store.growth).attr('d', lineNodes).attr('fill', 'none')
    .attr('stroke', '#f68d1f').attr('stroke-width', 2);
  g.append('path').datum(store.growth).attr('d', lineEdges).attr('fill', 'none')
    .attr('stroke', '#201d1d').attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');

  g.selectAll('.pt-nodes').data(store.growth).enter().append('circle')
    .attr('cx', d => x('R' + d.round)).attr('cy', d => y(d.nodes)).attr('r', 3).attr('fill', '#f68d1f');
  g.selectAll('.pt-edges').data(store.growth).enter().append('circle')
    .attr('cx', d => x('R' + d.round)).attr('cy', d => y(d.edges)).attr('r', 2).attr('fill', '#201d1d');

  g.append('text').attr('x', w - 60).attr('y', 4).text('● 节点').style('font-size', '9px').style('fill', '#f68d1f').style('font-family', 'JetBrains Mono');
  g.append('text').attr('x', w - 20).attr('y', 4).text('● 关系').style('font-size', '9px').style('fill', '#201d1d').style('font-family', 'JetBrains Mono');
}

function renderKPI() {
  if (!containerRef.value) return;
  const kpiNames = Object.keys(store.kpiCurves).filter(k => store.kpiCurves[k]?.length);
  if (!kpiNames.length) { renderCount(); return; }

  const el = containerRef.value;
  el.innerHTML = '';
  const width = el.clientWidth;
  const height = el.clientHeight;
  if (width < 10 || height < 10) return;

  const margin = { top: 12, right: 60, bottom: 24, left: 42 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const svg = d3.select(el).append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const allRounds = [...new Set(kpiNames.flatMap(k => store.kpiCurves[k].map(p => p.round)))].sort((a, b) => a - b);

  const allValues = kpiNames.flatMap(k => store.kpiCurves[k].map(p => p.value));
  const yMin = Math.max(0, Math.min(...allValues) - 0.1);
  const yMax = Math.min(1, Math.max(...allValues) + 0.1);

  const x = d3.scalePoint().domain(allRounds.map(r => 'R' + r)).range([0, w]).padding(0.5);
  const y = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

  // Grid
  g.append('g').selectAll('line').data(y.ticks(4)).enter().append('line')
    .attr('x1', 0).attr('x2', w).attr('y1', d => y(d)).attr('y2', d => y(d))
    .attr('stroke', 'rgba(15,0,0,0.08)').attr('stroke-width', 1);

  // Threshold line at 0.5
  g.append('line').attr('x1', 0).attr('x2', w).attr('y1', y(0.5)).attr('y2', y(0.5))
    .attr('stroke', 'rgba(15,0,0,0.2)').attr('stroke-width', 1).attr('stroke-dasharray', '2 4');

  g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0).tickPadding(6))
    .selectAll('text').style('font-size', '9px').style('font-family', 'JetBrains Mono').style('fill', '#201d1d');
  g.append('g').call(d3.axisLeft(y).ticks(4).tickSize(0).tickPadding(4).tickFormat(d3.format('.0%')))
    .selectAll('text').style('font-size', '9px').style('font-family', 'JetBrains Mono').style('fill', '#201d1d');
  g.selectAll('.domain').remove();

  // Lines + confidence bands
  kpiNames.forEach((kpi, i) => {
    const curve = store.kpiCurves[kpi];
    const color = KPI_COLORS[i % KPI_COLORS.length];

    // Confidence band
    const bandArea = d3.area()
      .x(d => x('R' + d.round))
      .y0(d => y(Math.max(0, d.value - (1 - d.confidence) * 0.15)))
      .y1(d => y(Math.min(1, d.value + (1 - d.confidence) * 0.15)))
      .curve(d3.curveMonotoneX);
    g.append('path').datum(curve).attr('d', bandArea).attr('fill', color).attr('opacity', 0.08);

    // Line
    const line = d3.line().x(d => x('R' + d.round)).y(d => y(d.value)).curve(d3.curveMonotoneX);
    g.append('path').datum(curve).attr('d', line).attr('fill', 'none')
      .attr('stroke', color).attr('stroke-width', 2);

    // Points
    g.selectAll(`.pt-${i}`).data(curve).enter().append('circle')
      .attr('cx', d => x('R' + d.round)).attr('cy', d => y(d.value)).attr('r', 3).attr('fill', color);
  });

  // Legend
  const legendG = g.append('g').attr('transform', `translate(${w + 8}, 0)`);
  kpiNames.forEach((kpi, i) => {
    legendG.append('text').attr('y', i * 15 + 4).attr('x', 0)
      .text(`● ${kpi}`).style('font-size', '9px').style('fill', KPI_COLORS[i % KPI_COLORS.length])
      .style('font-family', 'Noto Sans SC, sans-serif');
  });
}

function render() {
  const forcedKpi = props.mode === 'kpi';
  const forcedCount = props.mode === 'count';
  const showKpi = (props.mode === 'auto' && kpiMode.value && hasKpiData.value) || forcedKpi;
  const showCount = (props.mode === 'auto' && !kpiMode.value) || forcedCount;
  if (showKpi && hasKpiData.value) renderKPI();
  else if (showCount || store.growth.length >= 2) renderCount();
}

onMounted(() => {
  nextTick(() => {
    render();
    resizeObserver = new ResizeObserver(() => render());
    if (containerRef.value) resizeObserver.observe(containerRef.value);
  });
});
onBeforeUnmount(() => { if (resizeObserver) resizeObserver.disconnect(); });
watch(() => store.growth.length, () => nextTick(render));
watch(() => store.kpiCurves, () => { nextTick(render); }, { deep: true });
watch(() => props.mode, () => nextTick(render));
</script>

<style scoped>
.panel-header-row {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;
}
.panel-toggle {
  display: flex; border: 1px solid var(--hairline); border-radius: var(--radius-sm); overflow: hidden;
}
.toggle-btn {
  border: none; background: var(--canvas); padding: 2px 10px; font-size: 11px; font-weight: 500;
  color: var(--mute); transition: all 0.15s; cursor: pointer; font-family: var(--font-mono);
}
.toggle-btn.active { background: var(--ink); color: var(--on-dark); }
.toggle-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.toggle-btn:not(:last-child) { border-right: 1px solid var(--hairline); }
</style>