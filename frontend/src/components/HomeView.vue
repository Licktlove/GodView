<template>
  <div class="home">
    <div class="bg">
      <div class="bg-grid"></div>
      <div class="bg-noise"></div>
      <div class="bg-horizon"></div>
      <div class="glow glow-a"></div>
      <div class="glow glow-b"></div>
    </div>

    <div class="screen entry-screen">
      <header class="entry-nav">
        <div class="entry-brand">
          <img class="brand-logo" src="/brand-logo.svg" alt="多点 DMALL" />
          <div class="entry-brand-sub">DECISION SIMULATION CONSOLE</div>
        </div>
        <div class="entry-status"><span class="status-led"></span>本地演示环境</div>
      </header>

      <!-- ============ HERO ============ -->
      <main class="entry-hero">
        <span class="hero-badge">MULTI-AGENT SIMULATION ENGINE · 多智能体推演引擎</span>
        <p class="entry-kicker">DECISIONS, BEFORE REALITY.</p>
        <h1 class="entry-title">让每一个经营决策，<br /><span>都先在未来发生一次。</span></h1>
        <p class="entry-desc">
          把门店、供应链、宏观经济或整个 AI 产业抽象成会自主行动的数字实体，
          在知识图谱中先看见决策如何传导，再进入真实世界。
        </p>
        <div class="entry-points">
          <span>因果链可追溯</span>
          <span>多智能体并行</span>
          <span>过程实时可见</span>
        </div>
        <div class="hero-cta">
          <button type="button" class="access-primary" @click="$emit('enter')">进入决策控制台 <span class="arr">→</span></button>
          <button type="button" class="access-secondary" @click="scrollToFlow">先看系统如何工作 <span>↓</span></button>
        </div>

        <div class="preview-frame" aria-label="推演世界预览">
          <div class="preview-topline"><span>LIVE WORLD PREVIEW</span><span><i></i> SIMULATION READY</span></div>
          <div class="mini-graph">
            <svg viewBox="0 0 560 170" preserveAspectRatio="none" aria-hidden="true">
              <path d="M46 116 C125 116 122 58 205 58 S286 128 350 92 S424 38 514 58" />
              <path d="M205 58 C248 38 258 33 302 44 S384 91 430 116" />
              <path d="M350 92 C378 130 400 143 456 140" />
            </svg>
            <span class="graph-node node-a"><b></b><em>门店</em></span>
            <span class="graph-node node-b"><b></b><em>客流</em></span>
            <span class="graph-node node-c"><b></b><em>供应链</em></span>
            <span class="graph-node node-d"><b></b><em>毛利率</em></span>
            <span class="graph-node node-e"><b></b><em>决策</em></span>
          </div>
          <div class="preview-bottomline"><span><b>社区团购低价截流</b> · 预测中</span><span>12N / 46E / R06</span></div>
        </div>
      </main>

      <!-- ============ 系统规格数字（全部真实可查） ============ -->
      <section class="entry-stats" aria-label="系统规格">
        <div class="entry-stats-head"><span>SYSTEM SPEC</span><b>以下数字均来自当前系统真实配置</b></div>
        <div class="entry-stats-grid">
          <div class="entry-stat" v-for="s in stats" :key="s.tag">
            <strong>{{ s.n }}</strong>
            <span><b>{{ s.tag }}</b>{{ s.l }}</span>
          </div>
        </div>
      </section>

      <!-- ============ 系统如何工作（原流程页合并） ============ -->
      <section class="flow" ref="flowRef" aria-label="系统如何工作">
        <div class="flow-head">
          <span class="flow-kicker">HOW IT WORKS / 01—04</span>
          <h2>系统如何工作</h2>
          <p>从一个经营假设开始，让数字世界自行生长，最后把推演结果转化为可解释的行动建议。</p>
        </div>

        <div class="flow-cards">
          <button type="button" class="flow-card" v-for="(p, i) in phases" :key="p.en" @click="$emit('enter')">
            <div class="flow-card-top">
              <span class="flow-number">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="flow-line"></span>
              <span class="flow-state">{{ p.state }}</span>
            </div>
            <div class="flow-card-title">
              <span class="flow-glyph" aria-hidden="true">{{ p.glyph }}</span>
              <div>
                <span>{{ p.en }}</span>
                <h3>{{ p.cn }}</h3>
              </div>
            </div>
            <p class="flow-desc">{{ p.desc }}</p>
            <div class="flow-output"><span>{{ p.outputLabel }}</span>{{ p.outcome }}</div>
            <div class="flow-card-action">进入这一步 <span>→</span></div>
          </button>
        </div>

        <div class="flow-loop" aria-label="完整流程摘要">
          <span class="flow-loop-label">CLOSED LOOP</span>
          <span>输入假设</span><i>→</i><span>世界生长</span><i>→</i><span>观察证据</span><i>→</i><span>追问节点</span>
        </div>
      </section>

      <!-- ============ 尾部 CTA ============ -->
      <section class="final-cta">
        <h2>准备好先在未来演练一次了吗？</h2>
        <p>无需账号 · 本地演示环境 · 四个场景包即选即推演</p>
        <div class="hero-cta">
          <button type="button" class="access-primary" @click="$emit('enter')">进入决策控制台 <span class="arr">→</span></button>
          <button type="button" class="access-secondary" @click="$emit('demo')">▶ 观看自动演示</button>
        </div>
      </section>

      <footer class="entry-footer">
        <div class="entry-system"><span class="status-led"></span><span>系统在线</span><span>本地演示环境</span><span>v1.2</span></div>
        <span>© 2026 Dmall Future Market · 多智能体涌现推演引擎</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineEmits(['enter', 'demo']);

const flowRef = ref(null);
function scrollToFlow() {
  flowRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 系统规格数字 —— 全部来自代码真实配置，可验证：
// 4 个推演阶段（App 四步流程）/ 4 个场景包（scenarios/index.js 注册）
// 12 个初始实体（retail defaultParams.entN）/ 5 项 KPI（retail kpiSchema）
const stats = [
  { n: '04', tag: 'STAGES', l: '推演阶段' },
  { n: '04', tag: 'SCENARIO PACKS', l: '场景包' },
  { n: '12', tag: 'SEED ENTITIES', l: '初始实体' },
  { n: '05', tag: 'LIVE KPIS', l: '实时预测指标' },
];

// 四步推演流程（与工作台四阶段一一对应）
const phases = [
  { en: 'WHAT IF', cn: '构建世界', state: 'DEFINE', glyph: '＋', desc: '输入场景与假设事件，LLM 抽取实体与初始关系，搭建可推演的数字世界。', outputLabel: 'INPUT', outcome: '场景 → 实体 → 关系' },
  { en: 'SIMULATE', cn: '自生长推演', state: 'GROW', glyph: '◌', desc: '多 agent 并行反应，涌现新实体与新关系，实时活动流呈现世界动态。', outputLabel: 'FLOW', outcome: '动作 → 关系 → 生长' },
  { en: 'OBSERVE', cn: '决策报告', state: 'REASON', glyph: '▤', desc: '通过图谱检索证据，生成多章节报告，并提取因果链与决策建议。', outputLabel: 'EVIDENCE', outcome: '证据 → 因果 → 建议' },
  { en: 'INTERVIEW', cn: '随时问节点', state: 'ASK', glyph: '⌁', desc: '与任意实体深度对话，或询问全局分析师，追问决策背后的传导路径。', outputLabel: 'DIALOGUE', outcome: '节点 → 对话 → 追问' },
];
</script>

<style scoped>
.home {
  --cyan: #0EA5E9;
  --cyan-deep: #075985;
  --border: rgba(56, 189, 248, 0.22);
  --border-hover: rgba(125, 211, 252, 0.34);
  --glass: rgba(255, 255, 255, 0.03);
  --ease: cubic-bezier(0.22, 0.9, 0.3, 1);
  --font-display: 'Inter', 'Geist', 'SF Pro Display', 'Noto Sans SC', sans-serif;
  --font-body: 'Inter', 'Geist', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --text-primary: #F4F7FB;
  --text-secondary: #8FB8D4;
  --text-muted: #64748B;

  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 50% 8%, rgba(56, 189, 248, 0.13), transparent 46%),
    radial-gradient(circle at 12% 12%, rgba(7, 89, 133, 0.22), transparent 36%),
    radial-gradient(circle at 88% 92%, rgba(14, 165, 233, 0.07), transparent 42%),
    linear-gradient(135deg, #0A1D30 0%, #071523 52%, #050E18 100%);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 16px;
  letter-spacing: 0.01em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

.bg { position: fixed; inset: 0; pointer-events: none; }
.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(14,165,233,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(14,165,233,0.035) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 95% 82% at 50% 28%, #000 62%, transparent 88%);
}
.bg-noise {
  position: absolute; inset: 0; opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.bg-horizon {
  position: absolute; left: 0; right: 0; top: 38%;
  height: 1px;
  background: linear-gradient(90deg, transparent 6%, rgba(14,165,233,0.13) 50%, transparent 94%);
}
.glow { position: absolute; border-radius: 50%; pointer-events: none; }
.glow-a { width: 52%; aspect-ratio: 1; left: -18%; top: -28%; background: radial-gradient(circle, rgba(14,165,233,0.12), transparent 66%); }
.glow-b { width: 38%; aspect-ratio: 1; right: -12%; top: 3%; background: radial-gradient(circle, rgba(14,165,233,0.05), transparent 66%); }

/* 滚动式 landing 容器 */
.screen {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(14px, 2vh, 22px) clamp(20px, 3vw, 40px) 26px;
  display: flex;
  flex-direction: column;
  gap: clamp(26px, 4.5vh, 48px);
  box-sizing: border-box;
}

/* Nav */
.entry-nav {
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
  padding-bottom: clamp(10px, 1.4vh, 16px);
  border-bottom: 1px solid rgba(56,189,248,0.08);
}
.entry-brand { display: flex; align-items: center; gap: 11px; }
.brand-logo {
  display: block;
  width: clamp(142px, 12vw, 174px);
  height: 28px;
  filter: drop-shadow(0 0 10px rgba(125, 211, 252, 0.2));
}
.entry-brand-sub {
  align-self: flex-end;
  margin-bottom: 3px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.13em;
  color: #7DD3FC;
}
.entry-status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-body);
  font-size: 14px;
  color: #8FB8D4;
}
.status-led {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #56d39a;
  box-shadow: 0 0 8px rgba(86, 211, 154, 0.8);
  animation: ledPulse 2.2s ease-in-out infinite;
}
@keyframes ledPulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

/* Hero — 居中式大厂风 */
.entry-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: clamp(20px, 4vh, 48px);
}
.hero-badge {
  padding: 6px 14px;
  border: 1px solid rgba(14,165,233,0.2);
  border-radius: 999px;
  background: rgba(14,165,233,0.05);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: #7DD3FC;
}
.entry-kicker {
  margin: clamp(14px, 2.2vh, 22px) 0 0;
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.15em;
  color: #7DD3FC;
}
.entry-title {
  margin: clamp(8px, 1.2vh, 14px) 0 0;
  font-family: var(--font-display);
  font-size: clamp(38px, 6.4vh, 78px);
  line-height: 1.18;
  letter-spacing: -0.055em;
  font-weight: 720;
  color: #f5f9fd;
}
.entry-title span {
  background: linear-gradient(118deg, #7DD3FC 0%, #0EA5E9 42%, #38BDF8 78%, #BAE6FD 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 24px rgba(14,165,233,0.32));
}
.entry-desc {
  max-width: 640px;
  margin: clamp(12px, 1.6vh, 18px) 0 0;
  font-family: var(--font-body);
  font-size: clamp(16px, 1.7vh, 18px);
  line-height: 1.6;
  color: #8FB8D4;
}
.entry-points {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: clamp(12px, 1.6vh, 18px);
}
.entry-points span {
  padding: 7px 13px;
  border: 1px solid rgba(14,165,233,0.16);
  border-radius: 999px;
  background: rgba(14,165,233,0.04);
  font-family: var(--font-body);
  font-size: 14px;
  color: #7DD3FC;
}
.hero-cta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: clamp(18px, 2.6vh, 28px);
}
.access-primary, .access-secondary {
  cursor: pointer;
  font-family: var(--font-body);
  border-radius: 10px;
  transition: transform 0.2s var(--ease), border-color 0.2s var(--ease), background 0.2s var(--ease), box-shadow 0.2s var(--ease);
}
.access-primary {
  padding: 13px 26px;
  border: 1px solid rgba(56,189,248,0.55);
  background: linear-gradient(135deg, #38BDF8 0%, #0EA5E9 52%, #0284C7 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 650;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -10px 18px rgba(2,132,199,0.26), 0 10px 30px rgba(14,165,233,0.38);
}
.access-primary:hover { transform: translateY(-1px); filter: brightness(1.08); box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -10px 18px rgba(2,132,199,0.26), 0 14px 38px rgba(14,165,233,0.52); }
.access-secondary {
  padding: 13px 22px;
  border: 1px solid rgba(56,189,248,0.24);
  background: rgba(14,165,233,0.03);
  color: #7DD3FC;
  font-size: 15px;
}
.access-secondary:hover { border-color: rgba(56,189,248,0.5); background: rgba(14,165,233,0.06); }
.access-secondary span { margin-left: 4px; }
.arr { display: inline-block; transition: transform 0.2s var(--ease); margin-left: 4px; }
.access-primary:hover .arr { transform: translateX(3px); }

/* 预览框 */
.preview-frame {
  position: relative;
  width: 100%;
  max-width: 880px;
  height: clamp(220px, 26vh, 300px);
  margin-top: clamp(24px, 3.4vh, 40px);
  padding: 14px 16px 12px;
  border: 1px solid rgba(14,165,233,0.16);
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(20,50,74,0.62), rgba(5,12,21,0.45));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 48px rgba(0,0,0,0.18);
  overflow: hidden;
}
.preview-frame::after {
  content: '';
  position: absolute;
  left: 0; right: 0; top: 50%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(14,165,233,0.12), transparent);
}
.preview-topline, .preview-bottomline {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.09em;
  color: #7DD3FC;
}
.preview-topline i {
  display: inline-block;
  width: 5px; height: 5px;
  margin-right: 4px;
  border-radius: 50%;
  background: #56d39a;
  box-shadow: 0 0 8px rgba(86,211,154,0.8);
}
.mini-graph { position: absolute; inset: 38px 18px 26px; }
.mini-graph svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.mini-graph path {
  fill: none;
  stroke: rgba(14,165,233,0.42);
  stroke-width: 2;
  stroke-dasharray: 4 5;
  filter: drop-shadow(0 0 3px rgba(14,165,233,0.32));
}
.graph-node { position: absolute; display: flex; align-items: center; gap: 5px; color: #8FB8D4; font-family: var(--font-body); font-size: 13px; white-space: nowrap; animation: nodeDrift 5.6s ease-in-out infinite; }
.graph-node b { position: relative; width: 9px; height: 9px; border-radius: 50%; background: #0EA5E9; box-shadow: 0 0 0 2px rgba(14,165,233,0.14), 0 0 13px rgba(14,165,233,0.9); animation: nodeGlow 3.4s ease-in-out infinite; }
.graph-node b::after { content: ''; position: absolute; inset: -4px; border: 1px solid rgba(14,165,233,0.28); border-radius: 50%; animation: nodeRing 3.4s ease-in-out infinite; }
.graph-node em { font-style: normal; }
.node-a { left: 5%; top: 63%; }
.node-b { left: 32%; top: 18%; animation-delay: -1.2s; }
.node-c { left: 52%; top: 63%; animation-delay: -2.1s; }
.node-d { left: 72%; top: 20%; animation-delay: -3.2s; }
.node-e { right: 2%; top: 78%; }
.node-e b { background: #e6c15d; box-shadow: 0 0 0 2px rgba(230,193,93,0.14), 0 0 13px rgba(230,193,93,0.86); }
@keyframes nodeDrift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes nodeGlow { 0%, 100% { opacity: 0.72; } 50% { opacity: 1; } }
@keyframes nodeRing { 0%, 100% { transform: scale(0.82); opacity: 0.25; } 50% { transform: scale(1.24); opacity: 0.8; } }
.preview-bottomline { position: absolute; left: 16px; right: 16px; bottom: 9px; letter-spacing: 0.03em; color: #64748B; }
.preview-bottomline b { color: #E0F2FE; font-weight: 500; }

/* 系统规格数字条 */
.entry-stats { display: flex; flex-direction: column; flex: 0 0 auto; border-top: 1px solid rgba(56,189,248,0.14); border-bottom: 1px solid rgba(56,189,248,0.1); }
.entry-stats-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px 8px; color: #64748B; font: 10px var(--font-mono); letter-spacing: 0.12em; }
.entry-stats-head b { color: #8FB8D4; font: 11px var(--font-body); letter-spacing: 0.02em; font-weight: 400; }
.entry-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
.entry-stat { display: flex; align-items: baseline; justify-content: center; gap: 14px; min-height: 72px; border-right: 1px solid rgba(56,189,248,0.12); }
.entry-stat:last-child { border-right: none; }
.entry-stat > strong { font-family: var(--font-display); font-size: 44px; line-height: 1; letter-spacing: -0.05em; background: linear-gradient(180deg, #f7fdff 0%, #38BDF8 100%); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 0 18px rgba(14,165,233,0.18); }
.entry-stat > span { display: flex; flex-direction: column; gap: 2px; font-family: var(--font-body); font-size: 14px; color: #8FB8D4; text-align: left; }
.entry-stat b { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.1em; color: #7DD3FC; font-weight: 550; }

/* ============ 系统如何工作 ============ */
.flow { display: flex; flex-direction: column; gap: clamp(20px, 3vh, 30px); scroll-margin-top: 20px; }
.flow-head { text-align: center; }
.flow-kicker { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.16em; color: #7DD3FC; }
.flow-head h2 {
  margin: 10px 0 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vh, 42px);
  letter-spacing: -0.04em;
  font-weight: 700;
  color: #f5f9fd;
}
.flow-head p { margin: 10px auto 0; max-width: 560px; font-size: 15px; line-height: 1.6; color: #8FB8D4; }

.flow-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.flow-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 18px 18px;
  text-align: left;
  border: 1px solid rgba(56,189,248,0.14);
  border-radius: 14px;
  background: linear-gradient(150deg, rgba(14,165,233,0.06), rgba(255,255,255,0.015) 55%);
  cursor: pointer;
  font-family: var(--font-body);
  color: var(--text-primary);
  transition: transform 0.22s var(--ease), border-color 0.22s var(--ease), box-shadow 0.22s var(--ease);
}
.flow-card:hover {
  transform: translateY(-3px);
  border-color: rgba(56,189,248,0.42);
  box-shadow: 0 16px 40px rgba(2, 12, 22, 0.4), inset 0 1px 0 rgba(125,211,252,0.12);
}
.flow-card-top { display: flex; align-items: center; gap: 10px; }
.flow-number { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: #7DD3FC; letter-spacing: 0.06em; }
.flow-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(56,189,248,0.4), transparent); }
.flow-state { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; color: #64748B; }
.flow-card-title { display: flex; align-items: center; gap: 12px; }
.flow-glyph {
  display: grid; place-items: center;
  width: 38px; height: 38px; flex: 0 0 auto;
  border: 1px solid rgba(56,189,248,0.28);
  border-radius: 10px;
  background: rgba(14,165,233,0.08);
  color: #7DD3FC;
  font-size: 17px;
}
.flow-card-title span { display: block; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; color: #7DD3FC; }
.flow-card-title h3 { margin: 2px 0 0; font-family: var(--font-display); font-size: 19px; font-weight: 680; letter-spacing: -0.02em; color: #f5f9fd; }
.flow-desc { margin: 0; font-size: 14px; line-height: 1.65; color: #8FB8D4; }
.flow-output {
  margin-top: auto;
  padding: 9px 11px;
  border: 1px dashed rgba(14,165,233,0.3);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: #E0F2FE;
}
.flow-output span { display: block; font-size: 9.5px; letter-spacing: 0.14em; color: #64748B; margin-bottom: 3px; }
.flow-card-action { font-size: 13px; font-weight: 550; color: #7DD3FC; }
.flow-card-action span { display: inline-block; transition: transform 0.2s var(--ease); }
.flow-card:hover .flow-card-action span { transform: translateX(3px); }

.flow-loop {
  display: flex; align-items: center; justify-content: center; gap: 13px;
  padding: 14px 16px;
  border-top: 1px solid rgba(56,189,248,0.12);
  border-bottom: 1px solid rgba(56,189,248,0.12);
  color: #8FB8D4;
  font-size: 13px;
}
.flow-loop-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.16em; color: #64748B; }
.flow-loop i { font-style: normal; color: #7DD3FC; }

/* ============ 尾部 CTA ============ */
.final-cta { text-align: center; padding: clamp(28px, 5vh, 56px) 0 clamp(10px, 2vh, 20px); }
.final-cta h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(26px, 4.2vh, 44px);
  font-weight: 700;
  letter-spacing: -0.04em;
  background: linear-gradient(118deg, #f5f9fd 30%, #7DD3FC 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.final-cta p { margin: 12px 0 0; font-size: 15px; color: #8FB8D4; }
.final-cta .hero-cta { margin-top: 22px; }

/* Footer */
.entry-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex: 0 0 auto; padding-top: 14px; font-family: var(--font-body); font-size: 12px; color: #64748B; border-top: 1px solid rgba(56,189,248,0.08); }
.entry-system { display: flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em; color: #8FB8D4; }
.entry-system .status-led { width: 5px; height: 5px; }
.entry-system span + span { padding-left: 10px; border-left: 1px solid rgba(56,189,248,0.12); }

/* 响应式 */
@media (max-width: 1000px) {
  .flow-cards { grid-template-columns: repeat(2, 1fr); }
  .entry-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .entry-stat { border-bottom: 1px solid rgba(56,189,248,0.09); }
}
@media (max-width: 560px) {
  .entry-status { font-size: 0; }
  .entry-title { font-size: 34px; }
  .flow-cards { grid-template-columns: 1fr; }
  .entry-stats-grid { grid-template-columns: 1fr; }
  .entry-stat { justify-content: flex-start; padding-left: 14px; border-right: none; }
  .entry-footer { align-items: flex-start; flex-direction: column; }
  .entry-system { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  .graph-node, .graph-node b, .graph-node b::after, .status-led { animation: none; }
  .access-primary:hover { transform: none; filter: none; }
}
</style>
