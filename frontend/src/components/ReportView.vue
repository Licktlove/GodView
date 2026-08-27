<template>
  <div class="report-view" role="dialog" aria-modal="true" aria-label="报告全屏视图">
    <header class="rv-topbar">
      <div class="rv-topbar-inner">
        <div class="rv-topbar-left">
          <span class="rv-kicker">{{ store.scenario?.domain || '推演' }} · OBSERVE REPORT</span>
          <h1 class="rv-title">{{ store.report?.verdict || store.reportOutline?.title || '决策报告' }}</h1>
          <p class="rv-summary" v-if="store.reportOutline?.summary">{{ store.reportOutline.summary }}</p>
          <div class="rv-proposition" v-if="store.report?.proposition || store.seed">
            <span class="rv-prop-label">推演命题</span>
            <p class="rv-prop-text">{{ (store.report?.proposition || store.seed).split('\n')[0] }}</p>
          </div>
          <div class="rv-meta">
            <span>{{ store.growth.length || 0 }} 轮推演</span><i></i>
            <span>{{ store.entities.length }} 实体</span><i></i>
            <span>{{ store.edges.length }} 关系</span>
            <span class="rv-confidence" v-if="store.report">置信度 {{ ((store.report.confidence || 0) * 100).toFixed(0) }}%</span>
          </div>
        </div>
        <div class="rv-topbar-actions">
          <button type="button" class="rv-action-btn" @click="exportMarkdown">导出 Markdown</button>
          <button type="button" class="rv-action-btn" @click="exportHTML">导出 HTML</button>
          <button type="button" class="rv-action-btn" @click="printReport">打印 / 存 PDF</button>
          <button type="button" class="rv-action-btn rv-close" @click="$emit('close')" aria-label="关闭报告">×</button>
        </div>
      </div>
    </header>

    <div class="rv-scroll">
      <article class="rv-doc">
        <!-- 流式生成提示 -->
        <div class="rv-generating" v-if="store.ui.b3 === 'processing' && !store.reportOutline?.sections?.length">
          <span class="rv-spinner" aria-hidden="true"></span> 报告生成中，章节将陆续出现…
        </div>

        <!-- 推演命题总览卡（图文并茂：命题 + 关键数字） -->
        <section class="rv-section rv-prologue" v-if="store.entities.length">
          <div class="rv-section-head">
            <span class="rv-section-num">00</span>
            <h2>推演概览</h2>
          </div>
          <div class="rv-overview">
            <div class="rv-overview-text">
              <p class="rv-lead">本报告基于 GodView 对「{{ store.scenario?.domain }}」世界的多智能体推演生成，先让世界自生长，再检索图谱证据、逐章撰写，所有结论均可回溯到具体实体与关系。</p>
              <ul class="rv-factlist">
                <li><b>{{ store.entities.length }}</b><span>个实体节点</span></li>
                <li><b>{{ store.edges.length }}</b><span>条相互作用关系</span></li>
                <li><b>{{ store.growth.length || 0 }}</b><span>轮演化</span></li>
                <li><b>{{ (store.scenario.kpiSchema || []).length }}</b><span>项实时 KPI</span></li>
              </ul>
            </div>
            <figure class="rv-figure">
              <div class="rv-figure-svg" v-html="graphSnapshot"></div>
              <figcaption>图 1 · 推演终态知识图谱（节点着色按类型，大小=连接度，共 {{ store.entities.length }} 实体 / {{ store.edges.length }} 关系）</figcaption>
            </figure>
          </div>
        </section>

        <!-- 章节 -->
        <template v-if="store.reportOutline?.sections?.length">
          <section v-for="(s, i) in store.reportOutline.sections" :key="i" class="rv-section">
            <div class="rv-section-head">
              <span class="rv-section-num">{{ String(i + 1).padStart(2, '0') }}</span>
              <h2>{{ s.title }}</h2>
              <span class="rv-section-state" :class="store.reportSections[i]?.status" v-if="store.reportSections[i]">
                {{ store.reportSections[i].status === 'done' ? '✓' : '…' }}
              </span>
            </div>
            <div class="rv-body" v-if="store.reportSections[i]?.content" v-html="renderMarkdown(store.reportSections[i].content, s.title)"></div>
            <div class="rv-body rv-loading" v-else><span>生成中…</span></div>
          </section>
        </template>
        <p class="rv-empty" v-else-if="!store.entities.length">（暂无推演数据，请先完成 OBSERVE 步骤生成报告）</p>

        <!-- 关键实体（图文并茂：影响力中心卡片） -->
        <section class="rv-section rv-entities" v-if="keyEntities.length">
          <div class="rv-section-head">
            <span class="rv-section-num">◎</span>
            <h2>关键实体 · 影响力中心</h2>
          </div>
          <div class="rv-entity-grid">
            <div class="rv-entity-card" v-for="e in keyEntities" :key="e.id">
              <span class="rv-dot" :style="{ background: e.color }"></span>
              <div class="rv-entity-main">
                <b>{{ e.name }}</b>
                <small>{{ e.type }}</small>
              </div>
              <span class="rv-entity-deg">度 {{ e.deg }}</span>
            </div>
          </div>
        </section>

        <!-- KPI 曲线 -->
        <section class="rv-section rv-kpi" v-if="Object.keys(store.kpiCurves || {}).length">
          <div class="rv-section-head">
            <span class="rv-section-num">KPI</span>
            <h2>关键指标曲线</h2>
          </div>
          <figure class="rv-figure">
            <div class="rv-kpi-chart"><GrowthPanel :mode="'kpi'" /></div>
            <figcaption>图 2 · 推演过程中 KPI 的演化轨迹，反映命题策略的量化影响</figcaption>
          </figure>
        </section>

        <!-- 报告终态 -->
        <section class="rv-section" v-if="store.report">
          <div class="rv-section-head">
            <span class="rv-section-num">●</span>
            <h2>报告终态 · 结论与建议</h2>
          </div>
          <div class="rv-verdict">
            <div class="rv-verdict-line"><span class="rv-verdict-label">结论</span><span class="rv-verdict-value">{{ store.report.verdict }}</span></div>
            <div class="rv-verdict-line"><span class="rv-verdict-label">置信度</span><span class="rv-verdict-value">{{ ((store.report.confidence || 0) * 100).toFixed(0) }}%</span></div>
            <div class="rv-verdict-line" v-if="store.report.confidence_note"><span class="rv-verdict-label">说明</span><span class="rv-verdict-value">{{ store.report.confidence_note }}</span></div>
          </div>
        </section>

        <footer class="rv-footer">GodView 推演报告 · 推演 ≠ 预测，重大决策请结合实际数据校准</footer>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { store } from '../store/sim';
import { renderMarkdown } from '../utils/markdown';
import { exportReportMarkdown, exportReportHTML } from '../utils/export';
import GrowthPanel from './GrowthPanel.vue';

defineEmits(['close']);

function exportMarkdown() { exportReportMarkdown(); }
function exportHTML() { exportReportHTML(); }
function printReport() { window.print(); }

function escapeXml(s) {
  return String(s == null ? '' : s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// 影响力中心（按连接度排序），用于图谱快照与关键实体卡片
const degreeMap = computed(() => {
  const deg = {};
  store.edges.forEach(e => { deg[e.source] = (deg[e.source] || 0) + 1; deg[e.target] = (deg[e.target] || 0) + 1; });
  return deg;
});

const keyEntities = computed(() => {
  return [...store.entities]
    .sort((a, b) => (degreeMap.value[b.id] || 0) - (degreeMap.value[a.id] || 0))
    .slice(0, 6)
    .map(e => ({ id: e.id, name: e.name, type: e.type, deg: degreeMap.value[e.id] || 0, color: store.scenario?.typeColor?.[e.type] || '#7DD3FC' }));
});

// 推演终态图谱快照：确定性径向布局，节点着色按类型、大小按连接度
const graphSnapshot = computed(() => {
  const nodes = store.entities;
  const edges = store.edges;
  if (!nodes.length) return '';
  const W = 920, H = 540, cx = W / 2, cy = H / 2;
  const deg = degreeMap.value;
  const sorted = [...nodes].sort((a, b) => (deg[b.id] || 0) - (deg[a.id] || 0));
  const total = sorted.length;
  const positions = {};
  if (total) {
    positions[sorted[0].id] = { x: cx, y: cy };
    const rest = sorted.slice(1);
    const ringCount = Math.min(rest.length, 8);
    const innerR = Math.min(W, H) * 0.23;
    rest.slice(0, ringCount).forEach((n, i) => {
      const ang = (i / ringCount) * Math.PI * 2 - Math.PI / 2;
      positions[n.id] = { x: cx + Math.cos(ang) * innerR, y: cy + Math.sin(ang) * innerR };
    });
    const outer = rest.slice(ringCount);
    const outerR = Math.min(W, H) * 0.42;
    outer.forEach((n, i) => {
      const ang = (i / Math.max(outer.length, 1)) * Math.PI * 2 - Math.PI / 2 + 0.35;
      positions[n.id] = { x: cx + Math.cos(ang) * outerR, y: cy + Math.sin(ang) * outerR };
    });
  }
  const colorOf = (t) => store.scenario?.typeColor?.[t] || '#7DD3FC';
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, ui-monospace, monospace">`;
  svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="#0C2231"/>`;
  edges.slice(0, 140).forEach(e => {
    const s = positions[e.source], t = positions[e.target];
    if (!s || !t) return;
    svg += `<line x1="${s.x.toFixed(1)}" y1="${s.y.toFixed(1)}" x2="${t.x.toFixed(1)}" y2="${t.y.toFixed(1)}" stroke="rgba(125,211,252,0.26)" stroke-width="1"/>`;
  });
  nodes.forEach(n => {
    const p = positions[n.id]; if (!p) return;
    const d = deg[n.id] || 0;
    const r = 6 + Math.min(d, 11) * 0.9;
    const c = colorOf(n.type);
    svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" fill-opacity="0.88" stroke="#0b1a2b" stroke-width="1.5"/>`;
    const fs = n.id === sorted[0]?.id ? 13 : 11;
    svg += `<text x="${p.x.toFixed(1)}" y="${(p.y + r + 13).toFixed(1)}" fill="#E5E7EB" font-size="${fs}" text-anchor="middle">${escapeXml(n.name)}</text>`;
  });
  svg += `</svg>`;
  return svg;
});
</script>

<style scoped>
.report-view {
  position: fixed; inset: 0; z-index: 100;
  display: flex; flex-direction: column;
  background: var(--surface-dark, #0C2231); color: #F1F5F9;
}
/* 顶栏与正文统一居中容器，避免「标题过宽、内容过窄」的失衡 */
.rv-topbar {
  border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
  background: linear-gradient(180deg, rgba(14,165,233,0.06), transparent);
}
.rv-topbar-inner {
  max-width: 980px; margin: 0 auto; padding: 22px 28px 18px;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 18px;
}
.rv-topbar-left { min-width: 0; }
.rv-kicker { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #38BDF8; text-transform: uppercase; }
.rv-title { font-size: 23px; font-weight: 800; margin-top: 6px; letter-spacing: -0.01em; color: #fff; line-height: 1.3; }
.rv-summary { font-size: 13.5px; color: #9CA3AF; margin-top: 6px; max-width: 64ch; }
.rv-proposition {
  margin-top: 12px; padding: 10px 14px; border-left: 3px solid #38BDF8;
  background: rgba(14,165,233,0.08); border-radius: 0 10px 10px 0; max-width: 70ch;
}
.rv-prop-label { font-size: 10.5px; font-weight: 700; letter-spacing: 1px; color: #7DD3FC; text-transform: uppercase; }
.rv-prop-text { font-size: 13.5px; color: #E5E7EB; margin: 3px 0 0; line-height: 1.6; }
.rv-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 12px; font-size: 12px; color: #9CA3AF; font-family: var(--font-mono, monospace); }
.rv-meta i { width: 3px; height: 3px; border-radius: 50%; background: #6B7280; }
.rv-confidence { color: #F59E0B; font-weight: 700; }
.rv-topbar-actions { display: flex; gap: 8px; flex-shrink: 0; }
.rv-action-btn {
  font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: #E5E7EB;
  padding: 7px 14px; border-radius: 8px; transition: all 0.15s;
}
.rv-action-btn:hover { border-color: #38BDF8; color: #fff; }
.rv-close { font-size: 16px; padding: 4px 10px; line-height: 1.4; }
.rv-scroll { flex: 1; overflow-y: auto; }
.rv-doc { max-width: 980px; margin: 0 auto; padding: 26px 28px 60px; }
.rv-generating {
  display: flex; align-items: center; gap: 10px; font-size: 13px; color: #9CA3AF;
  border: 1px dashed rgba(14,165,233,0.4); border-radius: 10px; padding: 12px 16px; margin-bottom: 18px;
}
.rv-spinner { width: 14px; height: 14px; border: 2px solid rgba(14,165,233,0.3); border-top-color: #38BDF8; border-radius: 50%; animation: rv-spin 0.8s linear infinite; }
@keyframes rv-spin { to { transform: rotate(360deg); } }

.rv-section { margin: 30px 0 0; }
.rv-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.rv-section-num { font-size: 11px; font-weight: 700; color: #38BDF8; font-family: var(--font-mono, monospace); }
.rv-section-head h2 { font-size: 18px; font-weight: 800; color: #fff; flex: 1; }
.rv-section-state { font-size: 12px; color: #38BDF8; }
.rv-section-state.done { color: #34D399; }

/* 图文并茂：概览卡 = 文字 + 图谱快照 */
.rv-overview { display: grid; grid-template-columns: 1fr 1.1fr; gap: 22px; align-items: center; }
.rv-lead { font-size: 13.5px; line-height: 1.8; color: #CBD5E1; margin: 0 0 14px; }
.rv-factlist { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rv-factlist li { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; }
.rv-factlist b { font-size: 22px; font-weight: 800; color: #38BDF8; font-family: var(--font-mono, monospace); }
.rv-factlist span { font-size: 11.5px; color: #94A3B8; }

.rv-figure { margin: 0; }
.rv-figure-svg, .rv-kpi-chart {
  width: 100%; border-radius: 12px; overflow: hidden;
  background: #0C2231; border: 1px solid rgba(125,211,252,0.16);
}
.rv-figure-svg :deep(svg) { display: block; width: 100%; height: auto; }
.rv-figure figcaption, .rv-kpi-chart + figcaption { display: block; margin-top: 8px; font-size: 11.5px; color: #94A3B8; text-align: center; }
.rv-kpi-chart { padding: 14px 16px; }
.rv-kpi-chart :deep(.panel-header-row) { margin-bottom: 8px; }
.rv-kpi-chart :deep(.panel-title) { color: #E5E7EB; }

.rv-body { font-size: 14px; line-height: 1.85; color: #D1D5DB; }
.rv-body h3 { font-size: 15px; margin: 12px 0 6px; color: #fff; }
.rv-body p { margin: 9px 0; }
.rv-body ul { margin: 9px 0 9px 20px; }
.rv-body li { margin: 4px 0; }
.rv-body strong { color: #fff; }
.rv-body code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
.rv-loading { color: #6B7280; font-size: 13px; }

/* 关键实体卡片 */
.rv-entity-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.rv-entity-card { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; }
.rv-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px currentColor; }
.rv-entity-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.rv-entity-main b { font-size: 13.5px; color: #F1F5F9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rv-entity-main small { font-size: 11px; color: #94A3B8; }
.rv-entity-deg { font-size: 12px; color: #38BDF8; font-family: var(--font-mono, monospace); font-weight: 700; flex-shrink: 0; }

.rv-verdict { background: #1F2937; border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
.rv-verdict-line { display: flex; gap: 12px; font-size: 14px; }
.rv-verdict-label { color: #9CA3AF; min-width: 60px; font-size: 12px; padding-top: 2px; }
.rv-verdict-value { color: #E5E7EB; }
.rv-empty { color: #6B7280; font-size: 14px; padding: 24px 0; }
.rv-footer { margin-top: 42px; font-size: 12px; color: #64748B; text-align: center; }

@media (max-width: 760px) {
  .rv-overview { grid-template-columns: 1fr; }
  .rv-entity-grid { grid-template-columns: 1fr 1fr; }
  .rv-topbar-inner { flex-direction: column; }
}

@media print {
  .report-view { position: static; background: #fff; color: #1C1C1E; display: block; }
  .rv-topbar { border-bottom: none; background: none; }
  .rv-topbar-inner { padding: 0 0 12px; }
  .rv-topbar-actions { display: none; }
  .rv-title, .rv-section-head h2, .rv-body strong, .rv-entity-main b { color: #1C1C1E; }
  .rv-body, .rv-summary, .rv-lead, .rv-meta, .rv-prop-text { color: #374151; }
  .rv-kicker, .rv-section-num, .rv-entity-deg { color: #0369A1; }
  .rv-scroll { overflow: visible; }
  .rv-doc { max-width: none; padding: 8px 0; }
  .rv-section, .rv-overview, .rv-entity-grid, .rv-figure { page-break-inside: avoid; }
  .rv-figure-svg, .rv-kpi-chart { background: #fff; border: 1px solid rgba(0,0,0,0.12); }
  .rv-factlist li, .rv-entity-card { background: #fff; border: 1px solid rgba(0,0,0,0.12); }
  .rv-verdict { background: #fff; border: 1px solid rgba(0,0,0,0.12); }
}
</style>
