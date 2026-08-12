<template>
  <div>
    <span class="panel-title">图谱生长曲线</span>
    <div ref="containerRef" style="width:100%;height:160px"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as d3 from 'd3';
import { store } from '../store/sim';

const containerRef = ref(null);
let resizeObserver = null;

function render() {
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

  // Grid lines
  g.append('g').selectAll('line').data(y.ticks(4)).enter().append('line')
    .attr('x1', 0).attr('x2', w).attr('y1', d => y(d)).attr('y2', d => y(d))
    .attr('stroke', 'rgba(15,0,0,0.08)').attr('stroke-width', 1);

  // Axes
  g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0).tickPadding(6))
    .selectAll('text').style('font-size', '9px').style('font-family', 'JetBrains Mono').style('fill', '#201d1d');
  g.append('g').call(d3.axisLeft(y).ticks(4).tickSize(0).tickPadding(4))
    .selectAll('text').style('font-size', '9px').style('font-family', 'JetBrains Mono').style('fill', '#201d1d');
  g.selectAll('.domain').remove();

  const lineNodes = d3.line().x(d => x('R' + d.round)).y(d => y(d.nodes)).curve(d3.curveMonotoneX);
  const lineEdges = d3.line().x(d => x('R' + d.round)).y(d => y(d.edges)).curve(d3.curveMonotoneX);

  // Area for nodes
  const area = d3.area().x(d => x('R' + d.round)).y0(h).y1(d => y(d.nodes)).curve(d3.curveMonotoneX);
  g.append('path').datum(store.growth).attr('d', area).attr('fill', '#f68d1f').attr('opacity', 0.06);

  // Lines
  g.append('path').datum(store.growth).attr('d', lineNodes).attr('fill', 'none')
    .attr('stroke', '#f68d1f').attr('stroke-width', 2);
  g.append('path').datum(store.growth).attr('d', lineEdges).attr('fill', 'none')
    .attr('stroke', '#201d1d').attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');

  // Points
  g.selectAll('.pt-nodes').data(store.growth).enter().append('circle')
    .attr('cx', d => x('R' + d.round)).attr('cy', d => y(d.nodes)).attr('r', 3).attr('fill', '#f68d1f');
  g.selectAll('.pt-edges').data(store.growth).enter().append('circle')
    .attr('cx', d => x('R' + d.round)).attr('cy', d => y(d.edges)).attr('r', 2).attr('fill', '#201d1d');

  // Legend
  g.append('text').attr('x', w - 60).attr('y', 4).text('● 节点').style('font-size', '9px').style('fill', '#f68d1f').style('font-family', 'JetBrains Mono');
  g.append('text').attr('x', w - 20).attr('y', 4).text('● 关系').style('font-size', '9px').style('fill', '#201d1d').style('font-family', 'JetBrains Mono');
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
</script>