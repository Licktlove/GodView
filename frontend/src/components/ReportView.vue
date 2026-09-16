<template>
  <div class="report-view" role="dialog" aria-modal="true" aria-label="报告全屏视图">
    <header class="rv-topbar">
      <div class="rv-topbar-inner">
        <div class="rv-topbar-left">
          <span class="rv-kicker">GODVIEW</span>
          <h1 class="rv-title">经营决策建议</h1>
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

        <section class="rv-section rv-quick-decisions" v-if="topDecisions.length">
          <div class="rv-section-head">
            <span class="rv-section-num">01</span>
            <h2>先做这三件事</h2>
          </div>
          <ol class="rv-quick-list">
            <li v-for="d in topDecisions" :key="d.id">{{ shortText(d.action, 42) }}</li>
          </ol>
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

        <section class="rv-section rv-hypotheses" v-if="isPromotionSandbox && store.ops.hypotheses?.length">
          <div class="rv-section-head">
          <span class="rv-section-num">E</span>
            <h2>决策依据</h2>
          </div>
          <p class="rv-action-note">以下关系用于支持本次建议；每项均附带可推翻条件。</p>
          <article v-for="h in decisionEvidence" :key="h.id" class="rv-hypothesis-card">
            <b>{{ h.actor }} · {{ h.relation }}</b>
            <p>{{ shortText(h.hypothesis, 34) }}</p>
            <small>依据：{{ shortText(h.evidence_refs?.join('、') || '经营证据', 34) }}</small>
            <small>停止：{{ shortText(h.falsifier, 34) }}</small>
          </article>
        </section>

        <!-- 关键实体（图文并茂：影响力中心卡片） -->
        <section class="rv-section rv-entities" v-if="!isPromotionSandbox && keyEntities.length">
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

        <!-- 报告终态 -->
        <section class="rv-section" v-if="store.report && !topDecisions.length">
          <div class="rv-section-head">
            <span class="rv-section-num">●</span>
            <h2>建议结论</h2>
          </div>
          <div class="rv-verdict">
            <div class="rv-verdict-line"><span class="rv-verdict-label">结论</span><span class="rv-verdict-value">{{ store.report.verdict }}</span></div>
          </div>
        </section>

        <section class="rv-section" v-if="store.decisions?.length">
          <div class="rv-section-head">
            <span class="rv-section-num">→</span>
            <h2>执行依据与条件</h2>
          </div>
          <p class="rv-action-note">对应上方建议，执行前确认责任、观察项和停止条件。</p>
          <article v-for="(d, i) in store.decisions" :key="d.id" class="rv-decision-card">
            <div class="rv-decision-title"><h3>建议 {{ i + 1 }} 的落实条件</h3></div>
            <dl>
              <dt>责任角色</dt><dd>{{ d.owner || '业务负责人' }}</dd>
              <dt>为什么</dt><dd>{{ shortText(d.reasoning, 46) }}</dd>
              <dt>观察什么</dt><dd>{{ shortText(d.metric || '销售、毛利和顾客反馈', 46) }}</dd>
              <dt>什么情况停</dt><dd>{{ shortText(d.stop_rule || '证据不足或核心指标恶化时停止。', 46) }}</dd>
            </dl>
          </article>
        </section>

        <footer class="rv-footer">GodView · 经营决策建议</footer>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { store } from '../store/sim';
import { renderMarkdown } from '../utils/markdown';
import { exportReportMarkdown, exportReportHTML } from '../utils/export';

defineEmits(['close']);

function exportMarkdown() { exportReportMarkdown(); }
function exportHTML() { exportReportHTML(); }
function printReport() { window.print(); }
function shortText(value, max) {
  const text = String(value || '—').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

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

const decisionEvidence = computed(() => [...(store.ops.hypotheses || [])]
  .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
  .slice(0, 3));

const topDecisions = computed(() => (store.decisions || []).slice(0, 3));

const isPromotionSandbox = computed(() => (
  store.scenario?.id === 'xueqing'
  && Boolean(store.scenario?.promotionSandbox)
  && /促销|折扣|优惠|让利|会员券|停促|打几折|价格/.test(String(store.seed || ''))
));

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
.rv-topbar-inner { max-width: 980px; margin: 0 auto; padding: 9px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.rv-topbar-left { min-width: 0; }
.rv-kicker { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #38BDF8; text-transform: uppercase; }
.rv-title { display: inline; margin-left: 8px; font-size: 15px; font-weight: 800; letter-spacing: -0.01em; color: #fff; line-height: 1.3; }
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
.rv-hypotheses { background: rgba(255,255,255,0.025); }
.rv-hypothesis-card { margin: 8px 0; padding: 10px 12px; border: 1px solid rgba(125,211,252,0.2); border-radius: 8px; background: rgba(14,165,233,0.06); }
.rv-hypothesis-card b { color: #7DD3FC; font-size: 12px; }.rv-hypothesis-card p { margin: 5px 0; color: #E5E7EB; line-height: 1.55; font-size: 13px; }.rv-hypothesis-card small { display: block; margin-top: 3px; color: #9CA3AF; line-height: 1.4; font-size: 11px; }
.rv-topbar-actions { display: flex; gap: 8px; flex-shrink: 0; }
.rv-action-btn {
  font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: #E5E7EB;
  padding: 5px 8px; border-radius: 6px; transition: all 0.15s;
}
.rv-action-btn:hover { border-color: #38BDF8; color: #fff; }
.rv-close { font-size: 16px; padding: 4px 10px; line-height: 1.4; }
.rv-scroll { flex: 1; overflow-y: auto; }
.rv-doc { max-width: 900px; margin: 0 auto; padding: 8px 20px 44px; }
.rv-generating {
  display: flex; align-items: center; gap: 10px; font-size: 13px; color: #9CA3AF;
  border: 1px dashed rgba(14,165,233,0.4); border-radius: 10px; padding: 12px 16px; margin-bottom: 18px;
}
.rv-spinner { width: 14px; height: 14px; border: 2px solid rgba(14,165,233,0.3); border-top-color: #38BDF8; border-radius: 50%; animation: rv-spin 0.8s linear infinite; }
@keyframes rv-spin { to { transform: rotate(360deg); } }

.rv-section { margin: 30px 0 0; }
.rv-quick-decisions { margin-top: 10px; }
.rv-quick-list { display: grid; gap: 9px; margin: 0; padding: 0; list-style: none; counter-reset: quick; }
.rv-quick-list li { counter-increment: quick; display: flex; align-items: center; gap: 11px; padding: 13px 15px; border: 1px solid rgba(251,191,36,0.38); border-radius: 10px; background: linear-gradient(90deg, rgba(251,191,36,0.13), rgba(251,191,36,0.035)); color: #F8FAFC; font-size: 15px; font-weight: 750; line-height: 1.45; }
.rv-quick-list li::before { content: counter(quick); display: grid; place-items: center; width: 21px; height: 21px; flex: 0 0 auto; border-radius: 50%; background: #FBBF24; color: #1F2937; font-size: 12px; font-weight: 900; }
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
.rv-figure-svg {
  width: 100%; border-radius: 12px; overflow: hidden;
  background: #0C2231; border: 1px solid rgba(125,211,252,0.16);
}
.rv-figure-svg :deep(svg) { display: block; width: 100%; height: auto; }
.rv-figure figcaption { display: block; margin-top: 8px; font-size: 11.5px; color: #94A3B8; text-align: center; }

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
.rv-action-note { margin: 0 0 12px; color: #FCD34D; font-size: 13px; line-height: 1.7; }
.rv-decision-card { margin: 8px 0; padding: 12px 14px; border: 1px solid rgba(251,191,36,0.32); border-radius: 10px; background: rgba(251,191,36,0.055); }
.rv-decision-title { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.rv-decision-title h3 { margin: 0 0 8px; color: #F8FAFC; font-size: 15px; line-height: 1.5; }
.rv-decision-title span { flex: 0 0 auto; padding: 3px 7px; border-radius: 999px; color: #FCD34D; background: rgba(251,191,36,0.12); font-size: 10px; }
.rv-decision-card dl { display: grid; grid-template-columns: 64px 1fr; gap: 5px 9px; margin: 0; font-size: 12.5px; line-height: 1.55; }
.rv-decision-card dt { color: #94A3B8; }.rv-decision-card dd { margin: 0; color: #D1D5DB; }
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
  .rv-figure-svg { background: #fff; border: 1px solid rgba(0,0,0,0.12); }
  .rv-factlist li, .rv-entity-card { background: #fff; border: 1px solid rgba(0,0,0,0.12); }
  .rv-verdict { background: #fff; border: 1px solid rgba(0,0,0,0.12); }
  .rv-decision-card { background: #fff; border-color: rgba(146,64,14,0.24); }.rv-decision-title h3 { color: #1C1C1E; }.rv-decision-card dd { color: #374151; }
}
</style>
