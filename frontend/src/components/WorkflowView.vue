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
        <div class="workflow-hero-meta">
          <div class="workflow-hero-status"><i></i> SIMULATION PIPELINE READY</div>
          <div class="workflow-next">
            <span>NEXT ACTION</span>
            <strong>{{ recommendedPhase.cn }}</strong>
            <small>{{ recommendedStatus.action }}</small>
          </div>
        </div>
      </section>

      <section class="workflow-progress" aria-label="推演进度">
        <div class="workflow-progress-head">
          <span>SIMULATION PIPELINE</span>
          <b>{{ completedCount }}/4 COMPLETE</b>
        </div>
        <div class="workflow-progress-track">
          <template v-for="(phase, index) in phases" :key="phase.key">
            <button
              type="button"
              class="workflow-progress-step"
              :class="{ current: phase.key === recommendedKey(), complete: phaseStatus(phase.key).tone === 'complete' }"
              :aria-label="`${phase.cn}，${phaseStatus(phase.key).label}`"
              @click="$emit('phase', phase.key)"
            >
              <span class="workflow-progress-dot">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="workflow-progress-copy">
                <b>{{ phase.cn }}</b>
                <small>{{ phase.en }}</small>
              </span>
            </button>
            <span v-if="index < phases.length - 1" class="workflow-progress-connector" :class="{ complete: phaseStatus(phase.key).tone === 'complete' }"></span>
          </template>
        </div>
      </section>

      <section class="workflow-cards" aria-label="四步推演流程">
        <button
          v-for="(phase, index) in phases"
          :key="phase.en"
          type="button"
          class="workflow-card"
          :class="[phase.className, { recommended: phase.key === recommendedKey(), [`is-${phaseStatus(phase.key).tone}`]: true }]"
          :aria-label="`进入${phase.cn}步骤，${phaseStatus(phase.key).action}`"
          :aria-disabled="phaseStatus(phase.key).tone === 'locked' ? 'true' : undefined"
          @click="$emit('phase', phase.key)"
        >
          <div class="workflow-card-top">
            <span class="workflow-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="workflow-line"></span>
            <span class="workflow-state">{{ phase.state }}</span>
            <span v-if="phase.key === recommendedKey()" class="workflow-recommendation">NEXT</span>
          </div>
          <div class="workflow-card-title">
            <span class="workflow-glyph" aria-hidden="true">{{ phase.glyph }}</span>
            <div>
              <span>{{ phase.en }}</span>
              <h2>{{ phase.cn }}</h2>
            </div>
          </div>
          <p>{{ phase.desc }}</p>
          <div class="workflow-card-preview">
            <span>{{ phase.previewLabel }}</span>{{ phase.preview }}
          </div>
          <div class="workflow-output"><span>{{ phase.outputLabel }}</span>{{ phase.outcome }}</div>
          <div class="workflow-card-bottom">
            <div class="workflow-card-status" :class="`is-${phaseStatus(phase.key).tone}`"><i></i>{{ phaseStatus(phase.key).label }}</div>
            <div class="workflow-card-action">{{ phaseStatus(phase.key).action }} <span>→</span></div>
          </div>
        </button>
      </section>

      <div class="workflow-summary" aria-label="完整流程摘要">
        <span class="workflow-summary-label">CLOSED LOOP</span>
        <span>输入假设</span><i>→</i><span>世界生长</span><i>→</i><span>观察证据</span><i>→</i><span>追问节点</span>
      </div>

      <footer class="workflow-footer">
        <span><i></i> 系统在线 · 本地演示环境</span>
        <span>四步闭环：假设 → 推演 → 观察 → 追问</span>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { store } from '../store/sim';

defineEmits(['back', 'enter', 'phase']);

const phases = [
  { key: 'whatIf', className: 'phase-what-if', glyph: '＋', en: 'WHAT IF', cn: '构建世界', state: 'DEFINE', desc: '输入场景与假设事件，LLM 抽取实体与初始关系，搭建可推演的数字世界。', previewLabel: 'START WITH', preview: '把经营问题翻译成一组可计算的世界条件。', outputLabel: 'INPUT', outcome: '场景 → 实体 → 关系' },
  { key: 'simulate', className: 'phase-simulate', glyph: '◌', en: 'SIMULATE', cn: '自生长推演', state: 'GROW', desc: '多 agent 并行反应，涌现新实体与新关系，实时活动流呈现世界动态。', previewLabel: 'WATCH', preview: '让实体按规则互动，观察系统如何自行演化。', outputLabel: 'FLOW', outcome: '动作 → 关系 → 生长' },
  { key: 'observe', className: 'phase-observe', glyph: '▤', en: 'OBSERVE', cn: '决策报告', state: 'REASON', desc: '通过图谱检索证据，生成多章节报告，并提取因果链与决策建议。', previewLabel: 'READ', preview: '从演化轨迹中筛出证据，沉淀为可解释建议。', outputLabel: 'EVIDENCE', outcome: '证据 → 因果 → 建议' },
  { key: 'interview', className: 'phase-interview', glyph: '⌁', en: 'INTERVIEW', cn: '随时问节点', state: 'ASK', desc: '与任意实体深度对话，或询问全局分析师，追问决策背后的传导路径。', previewLabel: 'ASK', preview: '沿着因果链继续追问，定位影响决策的关键节点。', outputLabel: 'DIALOGUE', outcome: '节点 → 对话 → 追问' },
];

const completedCount = computed(() => phases.filter((phase) => phaseStatus(phase.key).tone === 'complete').length);

function recommendedKey() {
  if (!store.ui.step1Done) return 'whatIf';
  if (store.ui.b2 !== 'success') return 'simulate';
  if (store.ui.b3 !== 'success') return 'observe';
  return 'interview';
}

const recommendedPhase = computed(() => phases.find((phase) => phase.key === recommendedKey()) || phases[0]);
const recommendedStatus = computed(() => phaseStatus(recommendedPhase.value.key));

function phaseStatus(key) {
  if (key === 'whatIf') return store.ui.step1Done
    ? { tone: 'complete', label: 'DONE · 世界已构建', action: '继续完善' }
    : { tone: 'ready', label: 'READY · 可开始', action: '开始构建' };
  if (key === 'simulate') return store.ui.b2 === 'success'
    ? { tone: 'complete', label: 'DONE · 推演已完成', action: '查看推演' }
    : store.ui.step1Done
      ? { tone: 'ready', label: 'READY · 等待启动', action: '启动推演' }
      : { tone: 'locked', label: 'LOCKED · 需先构建', action: '先完成构建' };
  if (key === 'observe') return store.ui.b3 === 'success'
    ? { tone: 'complete', label: 'DONE · 报告已生成', action: '查看报告' }
    : store.entities.length
      ? { tone: 'ready', label: 'READY · 可生成', action: '生成报告' }
      : { tone: 'locked', label: 'LOCKED · 需先构建', action: '先完成构建' };
  return store.chat.messages.length
    ? { tone: 'active', label: 'ACTIVE · 对话进行中', action: '继续追问' }
    : store.ui.b2 === 'success'
      ? { tone: 'ready', label: 'READY · 可开始', action: '选择节点' }
      : { tone: 'locked', label: 'LOCKED · 需先推演', action: '先完成推演' };
}
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
.workflow-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; margin-bottom: clamp(24px, 4vh, 42px); }
.workflow-kicker { display: block; margin-bottom: 12px; font-size: 12px; color: var(--blue-bright); }
.workflow-hero h1 { margin: 0; font-size: clamp(32px, 4vw, 56px); letter-spacing: -0.04em; line-height: 1.1; }
.workflow-hero p { max-width: 660px; margin: 16px 0 0; color: var(--muted); font-size: 16px; line-height: 1.7; }
.workflow-hero-meta { display: flex; align-items: flex-end; flex-direction: column; gap: 18px; }
.workflow-hero-status { display: flex; align-items: center; gap: 8px; padding-bottom: 5px; color: #91abc0; font: 11px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.1em; white-space: nowrap; }
.workflow-hero-status i, .workflow-footer i { width: 7px; height: 7px; border-radius: 50%; background: #56d39a; box-shadow: 0 0 12px rgba(86,211,154,0.8); }
.workflow-next { min-width: 188px; padding: 13px 16px; border: 1px solid rgba(141,209,251,0.24); border-radius: 10px; background: rgba(9,31,49,0.66); text-align: right; }
.workflow-next span, .workflow-next small { display: block; color: #7897ad; font: 10px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.12em; }
.workflow-next strong { display: block; margin: 5px 0 3px; color: var(--blue-bright); font-size: 17px; }
.workflow-next small { color: #a9bfd0; font-family: inherit; letter-spacing: 0; }
.workflow-progress { margin-bottom: 22px; padding: 13px 18px 16px; border: 1px solid rgba(111,184,226,0.18); border-radius: 12px; background: rgba(7,22,36,0.54); }
.workflow-progress-head { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 13px; color: #7897ad; font: 10px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.12em; }
.workflow-progress-head b { color: var(--blue-bright); font-weight: 500; }
.workflow-progress-track { display: flex; align-items: center; gap: 10px; }
.workflow-progress-step { display: flex; align-items: center; gap: 9px; min-width: 0; padding: 0; border: 0; background: none; color: #7897ad; cursor: pointer; font: inherit; text-align: left; }
.workflow-progress-dot { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 auto; border: 1px solid rgba(111,184,226,0.3); border-radius: 50%; color: #7997ab; font: 10px 'JetBrains Mono', ui-monospace, monospace; transition: 0.2s ease; }
.workflow-progress-copy { display: flex; flex-direction: column; gap: 2px; white-space: nowrap; }
.workflow-progress-copy b { color: #a9bfd0; font-size: 12px; font-weight: 600; }
.workflow-progress-copy small { color: #67859b; font: 9px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.08em; }
.workflow-progress-step:hover .workflow-progress-dot, .workflow-progress-step:focus-visible .workflow-progress-dot { border-color: var(--blue-bright); color: var(--blue-bright); }
.workflow-progress-step:focus-visible { outline: 2px solid var(--blue-bright); outline-offset: 4px; border-radius: 4px; }
.workflow-progress-step.current .workflow-progress-dot { border-color: var(--blue-bright); background: rgba(78,166,223,0.16); color: var(--blue-bright); box-shadow: 0 0 16px rgba(78,166,223,0.24); }
.workflow-progress-step.current .workflow-progress-copy b { color: var(--text); }
.workflow-progress-step.complete .workflow-progress-dot { border-color: #56d39a; background: rgba(86,211,154,0.12); color: #56d39a; }
.workflow-progress-step.complete .workflow-progress-copy b { color: #b9dfcf; }
.workflow-progress-connector { flex: 1; min-width: 18px; height: 1px; background: linear-gradient(90deg, rgba(111,184,226,0.22), rgba(111,184,226,0.08)); }
.workflow-progress-connector.complete { background: linear-gradient(90deg, rgba(86,211,154,0.62), rgba(86,211,154,0.16)); }
.workflow-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.workflow-card { --phase-accent: #4ea6df; --phase-border: rgba(78,166,223,0.34); --phase-wash: rgba(78,166,223,0.08); position: relative; width: 100%; min-height: 230px; padding: 24px 26px; overflow: hidden; border: 1px solid var(--phase-border); border-radius: 16px; background: linear-gradient(145deg, rgba(20,48,72,0.72), rgba(7,18,31,0.72)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 30px rgba(2,12,22,0.16); color: inherit; cursor: pointer; font: inherit; text-align: left; transition: 0.25s ease; }
.workflow-card.phase-what-if { --phase-accent: #4ea6df; --phase-border: rgba(78,166,223,0.5); --phase-wash: rgba(78,166,223,0.1); }
.workflow-card.phase-simulate { --phase-accent: #56d39a; --phase-border: rgba(86,211,154,0.36); --phase-wash: rgba(86,211,154,0.07); }
.workflow-card.phase-observe { --phase-accent: #e6c15d; --phase-border: rgba(230,193,93,0.38); --phase-wash: rgba(230,193,93,0.07); }
.workflow-card.phase-interview { --phase-accent: #8dd1fb; --phase-border: rgba(141,209,251,0.38); --phase-wash: rgba(141,209,251,0.07); }
.workflow-card:hover { transform: translateY(-3px); border-color: var(--phase-accent); background: linear-gradient(145deg, var(--phase-wash), rgba(7,18,31,0.82)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 18px 34px rgba(2,12,22,0.22), 0 0 24px var(--phase-wash); }
.workflow-card:focus-visible { outline: 2px solid var(--blue-bright); outline-offset: 4px; }
.workflow-card.recommended { border-color: var(--phase-accent); background: linear-gradient(145deg, var(--phase-wash), rgba(7,18,31,0.8)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 16px 34px rgba(2,12,22,0.2), 0 0 24px var(--phase-wash); }
.workflow-card-top { display: flex; align-items: center; gap: 12px; }
.workflow-number { color: var(--phase-accent); font: 13px 'JetBrains Mono', ui-monospace, monospace; }
.workflow-line { flex: 1; height: 1px; background: linear-gradient(90deg, color-mix(in srgb, var(--phase-accent) 60%, transparent), transparent); }
.workflow-state { color: #7596ad; font-size: 10px; }
.workflow-recommendation { padding: 4px 7px; border: 1px solid color-mix(in srgb, var(--phase-accent) 56%, transparent); border-radius: 999px; color: var(--phase-accent); font: 9px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.1em; }
.workflow-card-title { display: flex; align-items: flex-start; gap: 14px; margin-top: 28px; }
.workflow-glyph { display: grid; place-items: center; width: 38px; height: 38px; flex: 0 0 auto; border: 1px solid var(--phase-border); border-radius: 10px; background: var(--phase-wash); color: var(--phase-accent); font-size: 24px; line-height: 1; }
.workflow-card-title > div > span { color: var(--phase-accent); font: 13px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.16em; }
.workflow-card-title h2 { margin: 8px 0 0; font-size: clamp(24px, 2.4vw, 34px); line-height: 1.2; letter-spacing: -0.03em; }
.workflow-card > p { max-width: 580px; margin: 18px 0 20px; color: #b4c7d6; font-size: 15px; line-height: 1.7; }
.workflow-card-preview { max-height: 0; margin: 0; overflow: hidden; color: #d3e4ee; font-size: 13px; line-height: 1.5; opacity: 0; transition: max-height 0.25s ease, margin 0.25s ease, opacity 0.25s ease; }
.workflow-card-preview span { margin-right: 10px; color: var(--phase-accent); font: 9px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.1em; }
.workflow-card:hover .workflow-card-preview, .workflow-card:focus-visible .workflow-card-preview { max-height: 44px; margin: -4px 0 14px; opacity: 1; }
.workflow-output { color: #8eb7d4; font: 12px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.05em; }
.workflow-output span { margin-right: 12px; color: #698da8; font-size: 10px; }
.workflow-card-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 22px; }
.workflow-card-status { display: flex; align-items: center; gap: 6px; color: #8faabd; font: 10px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.04em; }
.workflow-card-status i { width: 6px; height: 6px; border-radius: 50%; background: #7b91a2; }
.workflow-card-status.is-ready i { background: var(--phase-accent); box-shadow: 0 0 10px var(--phase-accent); }
.workflow-card-status.is-complete i, .workflow-card-status.is-active i { background: #56d39a; box-shadow: 0 0 10px rgba(86,211,154,0.72); }
.workflow-card-status.is-locked { color: #708496; }
.workflow-card-action { display: flex; justify-content: space-between; gap: 8px; color: var(--phase-accent); font: 12px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.08em; opacity: 0.9; }
.workflow-card-action span { font-size: 16px; line-height: 0.8; transition: transform 0.2s ease; }
.workflow-card:hover .workflow-card-action span { transform: translateX(4px); }
.workflow-summary { display: flex; align-items: center; justify-content: center; gap: 13px; margin-top: 25px; padding: 12px 16px; border-top: 1px solid rgba(111,184,226,0.14); border-bottom: 1px solid rgba(111,184,226,0.14); color: #9db9cc; font-size: 13px; }
.workflow-summary-label { margin-right: 8px; color: #6e93ad; font: 10px 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.14em; }
.workflow-summary i { color: var(--blue); font-style: normal; }
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
  .workflow-hero-meta { align-items: flex-start; gap: 14px; }
  .workflow-next { text-align: left; }
  .workflow-progress { overflow: hidden; }
  .workflow-progress-track { width: max-content; min-width: 100%; overflow-x: auto; padding: 2px 2px 5px; }
  .workflow-progress-step { min-width: 116px; }
  .workflow-progress-connector { flex: 0 0 24px; }
  .workflow-cards { grid-template-columns: 1fr; }
  .workflow-card { min-height: 0; padding: 22px; }
  .workflow-card-preview { max-height: 50px; margin: -4px 0 14px; opacity: 1; }
  .workflow-summary { flex-wrap: wrap; gap: 8px; font-size: 12px; }
  .workflow-summary-label { width: 100%; margin-right: 0; text-align: center; }
  .workflow-footer { align-items: flex-start; flex-direction: column; padding-top: 28px; }
}
@media (prefers-reduced-motion: reduce) {
  .workflow-card, .workflow-card-preview, .workflow-progress-dot { transition: none; }
}
</style>
