<template>
  <div class="report-view" role="dialog" aria-modal="true" aria-label="报告全屏视图">
    <header class="rv-topbar">
      <div class="rv-topbar-left">
        <span class="rv-kicker">{{ store.scenario?.domain || '推演' }} · OBSERVE REPORT</span>
        <h1 class="rv-title">{{ store.report?.verdict || store.reportOutline?.title || '决策报告' }}</h1>
        <p class="rv-summary" v-if="store.reportOutline?.summary">{{ store.reportOutline.summary }}</p>
        <div class="rv-meta">
          <span>{{ store.growth.length || 0 }} 轮</span><i></i>
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
    </header>

    <div class="rv-scroll">
      <article class="rv-doc">
        <!-- 流式生成提示 -->
        <div class="rv-generating" v-if="store.ui.b3 === 'processing'">
          <span class="rv-spinner" aria-hidden="true"></span> 报告生成中，章节将陆续出现…
        </div>

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
        <p class="rv-empty" v-else>（暂无报告内容，请先在 OBSERVE 步骤生成报告）</p>

        <!-- KPI 曲线 -->
        <section class="rv-section rv-kpi" v-if="Object.keys(store.kpiCurves || {}).length">
          <div class="rv-section-head">
            <span class="rv-section-num">KPI</span>
            <h2>关键指标曲线</h2>
          </div>
          <div class="rv-kpi-chart"><GrowthPanel :mode="'kpi'" /></div>
        </section>

        <!-- 报告终态 -->
        <section class="rv-section" v-if="store.report">
          <div class="rv-section-head">
            <span class="rv-section-num">●</span>
            <h2>报告终态</h2>
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
import { store } from '../store/sim';
import { renderMarkdown } from '../utils/markdown';
import { exportReportMarkdown, exportReportHTML } from '../utils/export';
import GrowthPanel from './GrowthPanel.vue';

defineEmits(['close']);

function exportMarkdown() { exportReportMarkdown(); }
function exportHTML() { exportReportHTML(); }
function printReport() { window.print(); }
</script>

<style scoped>
.report-view {
  position: fixed; inset: 0; z-index: 100;
  display: flex; flex-direction: column;
  background: var(--surface-dark, #111827); color: var(--on-dark, #F9FAFB);
}
.rv-topbar {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 20px 28px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
}
.rv-kicker { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #38BDF8; text-transform: uppercase; }
.rv-title { font-size: 26px; font-weight: 800; margin-top: 6px; letter-spacing: -0.02em; color: #fff; }
.rv-summary { font-size: 13px; color: #9CA3AF; margin-top: 6px; max-width: 72ch; }
.rv-meta { display: flex; align-items: center; gap: 10px; margin-top: 10px; font-size: 12px; color: #9CA3AF; font-family: var(--font-mono, monospace); }
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
.rv-doc { max-width: 860px; margin: 0 auto; padding: 32px 28px 60px; }
.rv-generating {
  display: flex; align-items: center; gap: 10px; font-size: 13px; color: #9CA3AF;
  border: 1px dashed rgba(14,165,233,0.4); border-radius: 10px; padding: 12px 16px; margin-bottom: 18px;
}
.rv-spinner { width: 14px; height: 14px; border: 2px solid rgba(14,165,233,0.3); border-top-color: #38BDF8; border-radius: 50%; animation: rv-spin 0.8s linear infinite; }
@keyframes rv-spin { to { transform: rotate(360deg); } }
.rv-section { margin: 26px 0 0; }
.rv-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.rv-section-num { font-size: 11px; font-weight: 700; color: #38BDF8; font-family: var(--font-mono, monospace); }
.rv-section-head h2 { font-size: 19px; font-weight: 800; color: #fff; flex: 1; }
.rv-section-state { font-size: 12px; color: #38BDF8; }
.rv-section-state.done { color: #34D399; }
.rv-body { font-size: 14px; line-height: 1.8; color: #D1D5DB; }
.rv-body h3 { font-size: 15px; margin: 12px 0 6px; color: #fff; }
.rv-body p { margin: 8px 0; }
.rv-body ul { margin: 8px 0 8px 20px; }
.rv-body strong { color: #fff; }
.rv-body code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
.rv-loading { color: #6B7280; font-size: 13px; }
.rv-empty { color: #6B7280; font-size: 14px; padding: 24px 0; }
.rv-kpi-chart { background: #1F2937; border-radius: 12px; padding: 14px 16px; }
.rv-kpi-chart :deep(.panel-header-row) { margin-bottom: 8px; }
.rv-kpi-chart :deep(.panel-title) { color: #E5E7EB; }
.rv-verdict { background: #1F2937; border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
.rv-verdict-line { display: flex; gap: 12px; font-size: 14px; }
.rv-verdict-label { color: #9CA3AF; min-width: 60px; font-size: 12px; padding-top: 2px; }
.rv-verdict-value { color: #E5E7EB; }
.rv-footer { margin-top: 40px; font-size: 12px; color: #6B7280; text-align: center; }

@media print {
  .report-view { position: static; background: #fff; color: #1C1C1E; display: block; }
  .rv-topbar { border-bottom: none; padding: 0 0 12px; }
  .rv-topbar-actions { display: none; }
  .rv-title, .rv-section-head h2, .rv-body strong { color: #1C1C1E; }
  .rv-body, .rv-summary, .rv-meta { color: #374151; }
  .rv-kicker, .rv-section-num { color: #0369A1; }
  .rv-scroll { overflow: visible; }
  .rv-doc { max-width: none; padding: 8px 0; }
  .rv-section { page-break-inside: avoid; }
  .rv-kpi-chart, .rv-verdict { background: #fff; border: 1px solid rgba(0,0,0,0.1); }
}
</style>