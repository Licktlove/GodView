// #19 报告导出：把当前推演报告收集为 Markdown / 自包含 HTML，触发浏览器下载。
// 全部从 store 读取，不新建状态、不依赖后端。

import { store } from '../store/sim';
import { renderMarkdown } from './markdown';

// ---------- 数据收集 ----------
export function collectReport() {
  const s = store.scenario || {};
  const outline = store.reportOutline || null;
  const sections = store.reportSections || {};
  const report = store.report || null;

  // 图谱证据摘要（与 engine/simulate.js graphRetrieval 同思路，读 store 直接算）
  const deg = {};
  store.edges.forEach(x => { deg[x.source] = (deg[x.source] || 0) + 1; deg[x.target] = (deg[x.target] || 0) + 1; });
  const topInfluencers = Object.entries(deg).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([id, d]) => { const e = store.entities.find(x => x.id === id); return e ? `${e.name}(${e.type})·度${d}` : id; });
  const relCounts = {};
  store.edges.forEach(x => { relCounts[x.relation] = (relCounts[x.relation] || 0) + 1; });
  const topRelations = Object.entries(relCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([r, c]) => `${r}×${c}`);
  const growthTrend = store.growth.slice(-12).map(g => `R${g.round}:${g.nodes}N/${g.edges}E`).join(' → ');
  const bornAgents = store.entities.filter(e => e._bornRound).map(e => `${e.name}(${e.type})`).join('、');

  return {
    domain: s.domain || '推演',
    seed: store.seed || '（未填写）',
    assumptions: store.assumptions?.map(a => a.text) || [],
    entitiesCount: store.entities.length,
    edgesCount: store.edges.length,
    rounds: store.growth.length,
    simRound: store.simRound || 0,
    outline,
    sections,
    report,
    kpiCurves: store.kpiCurves || {},
    growth: store.growth || [],
    causalChains: store.causalChains || [],
    decisions: store.decisions || [],
    conflicts: store.conflicts || [],
    communities: store.communities || [],
    bridgeNodes: store.bridgeNodes || [],
    evidence: { topInfluencers, topRelations, growthTrend, bornAgents },
  };
}

// ---------- Markdown 构建 ----------
function tableRow(cells) { return '| ' + cells.join(' | ') + ' |'; }

export function reportMarkdown(data = collectReport()) {
  const L = [];
  L.push(`# ${data.report?.verdict || data.outline?.title || '推演报告'}`);
  L.push('');
  L.push(`> ${data.domain} · ${data.entitiesCount} 实体 / ${data.edgesCount} 关系 / ${data.rounds} 轮`);
  L.push('');
  if (data.outline?.summary) L.push(data.outline.summary);
  L.push('');

  const sections = data.outline?.sections || [];
  if (sections.length) {
    sections.forEach((s, i) => {
      const content = data.sections?.[i]?.content;
      if (!content) return;
      L.push(`## ${s.title}`);
      L.push('');
      L.push(content.trim());
      L.push('');
    });
  } else {
    L.push(data.report?.fullContent || '（暂无报告正文）');
    L.push('');
  }

  // KPI 摘要（取每项末值）
  const kpiNames = Object.keys(data.kpiCurves).filter(k => data.kpiCurves[k]?.length);
  if (kpiNames.length) {
    L.push('## 关键指标');
    L.push('');
    L.push(tableRow(['KPI', '末值', '置信度', '说明']));
    L.push(tableRow(['---', '---', '---', '---']));
    kpiNames.forEach(k => {
      const pts = data.kpiCurves[k];
      const last = pts[pts.length - 1];
      L.push(tableRow([k, String((last.value * 100).toFixed(0)) + '%', String((last.confidence * 100).toFixed(0)) + '%', last.reason || '']));
    });
    L.push('');
  }

  // 图谱证据
  L.push('## 图谱证据');
  L.push('');
  L.push('- 影响力中心：' + (data.evidence.topInfluencers.join('、') || '—'));
  L.push('- 高频关系：' + (data.evidence.topRelations.join('、') || '—'));
  L.push('- 演化趋势：' + (data.evidence.growthTrend || '—'));
  L.push('- 涌现新 agent：' + (data.evidence.bornAgents || '无新增'));
  if (data.communities?.length) {
    L.push('- 群体聚类：' + data.communities.map(c => c.label + '(' + c.members.length + ')').join('、'));
  }
  if (data.conflicts?.length) {
    L.push('- 冲突关系：' + data.conflicts.length + ' 对（' + data.conflicts.slice(0, 3).map(c => `${c.rel1}↔${c.rel2}`).join('、') + '）');
  }
  L.push('');

  if (data.causalChains?.length) {
    L.push('## 因果链');
    L.push('');
    data.causalChains.forEach(c => {
      const names = (c.path || []).map(id => store.entities.find(e => e.id === id)?.name || id).join(' → ');
      L.push(`- ${names} · ${Math.round((c.confidence || 0) * 100)}%：${c.effect}`);
    });
    L.push('');
  }

  if (data.decisions?.length) {
    L.push('## 决策建议');
    L.push('');
    data.decisions.forEach(d => {
      L.push(`- **${d.action}**（${Math.round((d.confidence || 0) * 100)}%）：${d.reasoning} 预期${d.expected_gain || '—'}`);
    });
    L.push('');
  }

  if (data.assumptions?.length) {
    L.push('## 假设事件');
    L.push('');
    data.assumptions.forEach(a => L.push(`- ${a}`));
    L.push('');
  }

  L.push('---');
  L.push('');
  L.push('*GodView 推演报告 · 推演 ≠ 预测，重大决策请结合实际数据校准*');
  return L.join('\n');
}

// ---------- 自包含 HTML 构建 ----------
function reportHTML(data = collectReport()) {
  const sections = data.outline?.sections || [];
  const sectionsHtml = sections.map((s, i) => {
    const content = data.sections?.[i]?.content;
    if (!content) return '';
    return `<section class="rv-section"><h2>${escapeHtmlBody(s.title)}</h2><div class="rv-body">${renderMarkdown(content, s.title)}</div></section>`;
  }).join('');

  const kpiNames = Object.keys(data.kpiCurves).filter(k => data.kpiCurves[k]?.length);
  const kpiRows = kpiNames.map(k => {
    const pts = data.kpiCurves[k];
    const last = pts[pts.length - 1];
    return `<tr><td>${escapeHtmlBody(k)}</td><td>${(last.value * 100).toFixed(0)}%</td><td>${(last.confidence * 100).toFixed(0)}%</td><td>${escapeHtmlBody(last.reason || '')}</td></tr>`;
  }).join('');

  const evidenceText = [
    '影响力中心：' + (data.evidence.topInfluencers.join('、') || '—'),
    '高频关系：' + (data.evidence.topRelations.join('、') || '—'),
    '演化趋势：' + (data.evidence.growthTrend || '—'),
    '涌现新 agent：' + (data.evidence.bornAgents || '无新增'),
    ...(data.communities?.length ? ['群体聚类：' + data.communities.map(c => `${c.label}(${c.members.length})`).join('、')] : []),
    ...(data.conflicts?.length ? ['冲突关系：' + data.conflicts.length + ' 对（' + data.conflicts.slice(0, 3).map(c => `${c.rel1}↔${c.rel2}`).join('、') + '）'] : []),
  ].map(t => `<li>${escapeHtmlBody(t)}</li>`).join('');

  const chainsText = data.causalChains?.length
    ? data.causalChains.map(c => {
      const names = (c.path || []).map(id => store.entities.find(e => e.id === id)?.name || id).join(' → ');
      return `<li>${escapeHtmlBody(names)} · ${Math.round((c.confidence || 0) * 100)}%：${escapeHtmlBody(c.effect || '')}</li>`;
    }).join('')
    : '';

  const decisionsText = data.decisions?.length
    ? data.decisions.map(d => `<li><strong>${escapeHtmlBody(d.action)}</strong>（${Math.round((d.confidence || 0) * 100)}%）：${escapeHtmlBody(d.reasoning || '')} 预期 ${escapeHtmlBody(d.expected_gain || '—')}</li>`).join('')
    : '';

  const assumptionsText = data.assumptions?.length
    ? data.assumptions.map(a => `<li>${escapeHtmlBody(a)}</li>`).join('')
    : '';

  const css = `
:root{--ink:#4F46E5;--body:#374151;--mute:#6B7280;--canvas:#FAFAF9;--card:#fff;--hairline:rgba(0,0,0,0.08);--accent:#6366F1}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;background:var(--canvas);color:var(--ink);line-height:1.7;padding:32px 20px}
.rv-header{max-width:860px;margin:0 auto 8px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.rv-title{flex:1;min-width:260px}
.rv-title h1{font-size:26px;font-weight:800;color:#1C1C1E;letter-spacing:-0.02em}
.rv-title .rv-kicker{font-size:11px;font-weight:700;letter-spacing:1.5px;color:var(--accent);text-transform:uppercase}
.rv-title .rv-meta{font-size:12px;color:var(--mute);margin-top:4px}
.rv-actions{display:flex;gap:8px;flex-wrap:wrap}
.rv-actions button{font-family:inherit;font-size:12px;font-weight:600;border:1px solid var(--hairline);background:#fff;color:var(--ink);padding:7px 14px;border-radius:8px;cursor:pointer}
.rv-actions button:hover{border-color:var(--accent);color:var(--accent)}
.rv-ring{max-width:860px;margin:18px auto 0;border-top:3px solid var(--accent);padding-top:16px}
.rv-summary{max-width:860px;margin:0 auto;font-size:15px;color:var(--body)}
.rv-section{max-width:860px;margin:28px auto 0}
.rv-section h2{font-size:19px;font-weight:800;color:#1C1C1E;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--hairline)}
.rv-body h3{font-size:15px;margin:12px 0 6px;color:#1C1C1E}
.rv-body p{margin:8px 0;color:var(--body)}
.rv-body ul{margin:8px 0 8px 20px;color:var(--body)}
.rv-body strong{color:#1C1C1E}
.rv-body code{background:#EDECEA;padding:1px 5px;border-radius:4px;font-size:0.9em}
.rv-table{width:100%;max-width:860px;margin:12px auto 0;border-collapse:collapse;font-size:13px}
.rv-table th,.rv-table td{border:1px solid var(--hairline);padding:7px 10px;text-align:left}
.rv-table th{background:#F5F4F2;font-weight:700;color:#1C1C1E}
.rv-table td{color:var(--body)}
.rv-evidence,.rv-chains,.rv-decisions,.rv-assumptions{max-width:860px;margin:20px auto 0;background:#fff;border:1px solid var(--hairline);border-radius:12px;padding:16px 20px}
.rv-card-label{font-size:11px;font-weight:700;letter-spacing:1.5px;color:var(--accent);text-transform:uppercase;margin-bottom:8px}
.rv-card-label + ul{margin-left:18px;color:var(--body);font-size:13.5px}
.rv-card-label + ul li{margin:4px 0}
.rv-footer{max-width:860px;margin:32px auto 0;font-size:12px;color:var(--mute);text-align:center}
@media print{
  body{background:#fff;padding:0}
  .rv-actions,.rv-no-print{display:none!important}
  .rv-ring{border-top-color:transparent}
  .rv-section{page-break-inside:avoid}
}`;

  const actionsHtml = `<div class="rv-actions rv-no-print"><button onclick="window.print()">🖨 打印 / 存为 PDF</button></div>`;

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${escapeHtmlBody(data.report?.verdict || data.outline?.title || '推演报告')}</title><style>${css}</style></head><body>
${actionsHtml}
<header class="rv-header rv-no-print">
  <div class="rv-title">
    <div class="rv-kicker">${escapeHtmlBody(data.domain)} · 推演报告</div>
    <h1>${escapeHtmlBody(data.report?.verdict || data.outline?.title || '推演报告')}</h1>
    <div class="rv-meta">${data.entitiesCount} 实体 / ${data.edgesCount} 关系 / ${data.rounds} 轮 · ${escapeHtmlBody(data.seed || '')}</div>
  </div>
</header>
${data.outline?.summary ? `<p class="rv-summary">${escapeHtmlBody(data.outline.summary)}</p>` : ''}
<div class="rv-ring"></div>
${sectionsHtml || `<p class="rv-summary">（暂无报告正文）</p>`}
${kpiNames.length ? `<table class="rv-table"><thead><tr><th>KPI</th><th>末值</th><th>置信度</th><th>说明</th></tr></thead><tbody>${kpiRows}</tbody></table>` : ''}
<div class="rv-evidence rv-no-print"><div class="rv-card-label">图谱证据</div><ul>${evidenceText || '<li>—</li>'}</ul></div>
${chainsText ? `<div class="rv-chains rv-no-print"><div class="rv-card-label">因果链</div><ul>${chainsText}</ul></div>` : ''}
${decisionsText ? `<div class="rv-decisions rv-no-print"><div class="rv-card-label">决策建议</div><ul>${decisionsText}</ul></div>` : ''}
${assumptionsText ? `<div class="rv-assumptions rv-no-print"><div class="rv-card-label">假设事件</div><ul>${assumptionsText}</ul></div>` : ''}
<footer class="rv-footer">GodView 推演报告 · 推演 ≠ 预测，重大决策请结合实际数据校准</footer>
</body></html>`;
}

function escapeHtmlBody(value) {
  return String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- 下载 ----------
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportReportMarkdown() {
  const data = collectReport();
  const name = (data.outline?.title || '推演报告').replace(/[\\/:*?"<>|\s]+/g, '_');
  downloadFile(`${name}.md`, reportMarkdown(data), 'text/markdown;charset=utf-8');
}

export function exportReportHTML() {
  const data = collectReport();
  const name = (data.outline?.title || '推演报告').replace(/[\\/:*?"<>|\s]+/g, '_');
  downloadFile(`${name}.html`, reportHTML(data), 'text/html;charset=utf-8');
}