// 轻量 Markdown → HTML 渲染器（原定义在 App.vue，抽离供报告页/导出共用）。
// 支持：### h3 / **加粗** / `行内代码` / - 列表项 / 段落。

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeSectionTitle(value) {
  return String(value || '')
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*(?:(?:第\s*)?\d+|[一二三四五六七八九十百千万]+)[\s、.．)）:：-]+/, '')
    .replace(/[\s、。；;，,：:!?！？]+$/g, '')
    .replace(/\s+/g, '')
    .toLocaleLowerCase();
}

// 去掉章节正文开头可能重复出现的标题（LLM 常把章节标题再写一遍）
function stripDuplicateSectionHeading(text, sectionTitle) {
  const content = String(text || '');
  const firstHeading = content.match(/^(?:[ \t]*\r?\n)*[ \t]*(#{1,6})[ \t]+([^\r\n]+)(?:\r?\n|$)/);
  if (!firstHeading || normalizeSectionTitle(firstHeading[2]) !== normalizeSectionTitle(sectionTitle)) return content;
  return content.slice(firstHeading[0].length).replace(/^(?:[ \t]*\r?\n)+/, '');
}

export function renderMarkdown(text, sectionTitle) {
  const content = stripDuplicateSectionHeading(text, sectionTitle);
  if (!content) return '';
  const inline = (value) => escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  const lines = content.split(/\r?\n/);
  const html = [];
  let inList = false;
  const closeList = () => {
    if (inList) { html.push('</ul>'); inList = false; }
  };
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) { closeList(); return; }
    const heading = trimmed.match(/^#{2,3}\s+(.+)$/);
    const item = trimmed.match(/^[-*]\s+(.+)$/);
    if (heading) { closeList(); html.push(`<h3>${inline(heading[1])}</h3>`); return; }
    if (item) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${inline(item[1])}</li>`);
      return;
    }
    closeList();
    html.push(`<p>${inline(trimmed)}</p>`);
  });
  closeList();
  return html.join('');
}