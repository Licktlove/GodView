<template>
  <div class="workflow-page">
    <div class="workflow-bg" aria-hidden="true">
      <div class="workflow-grid-lines"></div>
      <div class="workflow-glow workflow-glow--left"></div>
      <div class="workflow-glow workflow-glow--right"></div>
    </div>

    <header class="workflow-nav">
      <button type="button" class="workflow-brand" @click="$emit('back')">
        <img src="/brand-logo.svg" alt="公司 Logo" />
        <span>DECISION SIMULATION CONSOLE</span>
      </button>
      <div class="workflow-nav-actions">
        <button type="button" class="workflow-back" @click="$emit('back')">← 返回首页</button>
        <button type="button" class="workflow-enter" @click="$emit('enter')">进入工作台 <span>→</span></button>
      </div>
    </header>

    <main class="workflow-content">
      <section class="workflow-hero">
        <div>
          <span class="workflow-kicker">SYSTEM OVERVIEW / 01—04</span>
          <h1>系统如何工作</h1>
          <p>从一个经营假设开始，让数字世界自行生长，最后把推演结果转化为可解释的行动建议。</p>
        </div>
        <div class="workflow-hero-status"><i></i> SIMULATION PIPELINE READY</div>
      </section>

      <section class="workflow-cards" aria-label="四步推演流程">
        <article v-for="(phase, index) in phases" :key="phase.en" class="workflow-card" :class="{ featured: index === 0 }">
          <div class="workflow-card-top">
            <span class="workflow-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="workflow-line"></span>
            <span class="workflow-state">{{ phase.state }}</span>
          </div>
          <div class="workflow-card-title">
            <span>{{ phase.en }}</span>
            <h2>{{ phase.cn }}</h2>
          </div>
          <p>{{ phase.desc }}</p>
          <div class="workflow-output"><span>OUTPUT</span>{{ phase.outcome }}</div>
        </article>
      </section>

      <footer class="workflow-footer">
        <span><i></i> 系统在线 · 本地演示环境</span>
        <span>四步闭环：假设 → 推演 → 观察 → 追问</span>
      </footer>
    </main>
  </div>
</template>

<script setup>
defineEmits(['back', 'enter']);

const phases = [
  { en: 'WHAT IF', cn: '构建世界', state: 'DEFINE', desc: '输入场景与假设事件，LLM 抽取实体与初始关系，搭建可推演的数字世界。', outcome: '场景 → 实体 → 关系' },
  { en: 'SIMULATE', cn: '自生长推演', state: 'GROW', desc: '多 agent 并行反应，涌现新实体与新关系，实时活动流呈现世界动态。', outcome: '动作 → 关系 → 生长' },
  { en: 'OBSERVE', cn: '决策报告', state: 'REASON', desc: '通过图谱检索证据，生成多章节报告，并提取因果链与决策建议。', outcome: '证据 → 因果 → 建议' },
  { en: 'INTERVIEW', cn: '随时问节点', state: 'ASK', desc: '与任意实体深度对话，或询问全局分析师，追问决策背后的传导路径。', outcome: '节点 → 对话 → 追问' },
];
</script>

<style scoped>
.workflow-page {
  --blue: #4ea6df;
  --blue-bright: #8dd1fb;
  --line: rgba(111, 184, 226, 0.24);
  --text: #f4f7fb;
  --muted: #a9bfd0;
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: clamp(18px, 3vh, 34px) clamp(24px, 5vw, 76px) 24px;
  background: linear-gradient(135deg, #0d2235 0%, #081827 52%, #07121f 100%);
  color: var(--text);
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.workflow-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.workflow-grid-lines {
  position: absolute; inset: 0; opacity: 0.5;
  background-image: linear-gradient(rgba(78,166,223,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(78,166,223,0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 90% 80% at 50% 42%, #000 50%, transparent 92%);
}
.workflow-glow { position: absolute; border-radius: 50%; filter: blur(2px); }
.workflow-glow--left { width: 46vw; height: 46vw; left: -25vw; top: -18vw; background: radial-gradient(circle, rgba(78,166,223,0.18), transparent 68%); }
.workflow-glow--right { width: 36vw; height: 36vw; right: -16vw; bottom: -18vw; background: radial-gradient(circle, rgba(55,130,190,0.14), transparent 68%); }
.workflow-nav, .workflow-content { position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; }
.workflow-nav { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid rgba(141,209,251,0.28); }
.workflow-brand { display: flex; align-items: center; gap: 14px; padding: 0; border: 0; background: none; color: var(--muted); cursor: pointer; }
.workflow-brand img { width: 158px; height: 30px; object-fit: contain; object-position: left center; filter: brightness(0) invert(1) drop-shadow(0 0 8px rgba(141,209,251,0.16)); }
.workflow-brand span, .workflow-kicker, .workflow-state, .workflow-output span { font-family: 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.14em; }
.workflow-brand span { font-size: 11px; color: #9bb6ca; }
.workflow-nav-actions { display: flex; align-items: center; gap: 10px; }
.workflow-back, .workflow-enter { padding: 9px 14px; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px; transition: 0.2s ease; }
.workflow-back { border: 1px solid var(--line); background: rgba(255,255,255,0.025); color: var(--muted); }
.workflow-back:hover { border-color: rgba(141,209,251,0.54); color: var(--text); background: rgba(78,166,223,0.08); }
.workflow-enter { border: 1px solid rgba(88,148,193,0.5); background: linear-gradient(135deg, #5ca3d6, #1f5d92); color: #fff; font-weight: 650; box-shadow: 0 8px 22px rgba(31,120,193,0.2); }
.workflow-enter:hover { transform: translateY(-1px); filter: brightness(1.08); }
.workflow-content { display: flex; flex-direction: column; min-height: calc(100% - 68px); padding-top: clamp(34px, 8vh, 86px); }
.workflow-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; margin-bottom: clamp(28px, 5vh, 54px); }
.workflow-kicker { display: block; margin-bottom: 12px; font-size: 12px; color: var(--blue-bright); }
.workflow-hero h1 { margin: 0; font-size: clamp(32px, 4vw, 56px); letter-spacing: -0.04em; line-height: 1.1; }
.workflow-hero p { max-width: 660px; margin: 16px 0 0; color: var(--muted); font-size: 16px; line-height: 1.7; }
.workflow-hero-status { display: flex; align-items: center; gap: 8px; padding-bottom: 5px; color: #91abc0; font: 11px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.1em; white-space: nowrap; }
.workflow-hero-status i, .workflow-footer i { width: 7px; height: 7px; border-radius: 50%; background: #56d39a; box-shadow: 0 0 12px rgba(86,211,154,0.8); }
.workflow-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.workflow-card { min-height: 230px; padding: 24px 26px; border: 1px solid rgba(88,148,193,0.28); border-radius: 16px; background: linear-gradient(145deg, rgba(20,48,72,0.72), rgba(7,18,31,0.72)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 30px rgba(2,12,22,0.16); transition: 0.25s ease; }
.workflow-card:hover { transform: translateY(-3px); border-color: rgba(116,203,250,0.66); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 18px 34px rgba(2,12,22,0.22), 0 0 24px rgba(78,166,223,0.1); }
.workflow-card.featured { border-color: rgba(116,203,250,0.5); background: linear-gradient(145deg, rgba(35,91,130,0.58), rgba(7,18,31,0.8)); }
.workflow-card-top { display: flex; align-items: center; gap: 12px; }
.workflow-number { color: var(--blue-bright); font: 13px 'JetBrains Mono', ui-monospace, monospace; }
.workflow-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(116,203,250,0.48), transparent); }
.workflow-state { color: #7596ad; font-size: 10px; }
.workflow-card-title { margin-top: 28px; }
.workflow-card-title > span { color: var(--blue-bright); font: 13px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.16em; }
.workflow-card-title h2 { margin: 8px 0 0; font-size: clamp(24px, 2.4vw, 34px); line-height: 1.2; letter-spacing: -0.03em; }
.workflow-card > p { max-width: 580px; margin: 18px 0 20px; color: #b4c7d6; font-size: 15px; line-height: 1.7; }
.workflow-output { color: #8eb7d4; font: 12px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.05em; }
.workflow-output span { margin-right: 12px; color: #698da8; font-size: 10px; }
.workflow-footer { display: flex; justify-content: space-between; gap: 20px; margin-top: auto; padding-top: 34px; color: #7894a9; font-size: 12px; }
.workflow-footer span { display: flex; align-items: center; gap: 8px; }
@media (max-width: 760px) {
  .workflow-page { padding: 16px 18px 22px; }
  .workflow-nav { align-items: flex-start; }
  .workflow-brand { align-items: flex-start; flex-direction: column; gap: 6px; }
  .workflow-brand img { width: 142px; }
  .workflow-brand span { font-size: 9px; }
  .workflow-nav-actions { flex-direction: column-reverse; align-items: stretch; }
  .workflow-hero { align-items: flex-start; flex-direction: column; margin-bottom: 28px; }
  .workflow-hero h1 { font-size: 36px; }
  .workflow-hero p { font-size: 14px; }
  .workflow-cards { grid-template-columns: 1fr; }
  .workflow-card { min-height: 0; padding: 22px; }
  .workflow-footer { align-items: flex-start; flex-direction: column; padding-top: 28px; }
}
</style>
