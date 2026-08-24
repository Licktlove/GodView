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
          <img class="brand-logo" src="/dmall-logo.png" alt="多点 DMALL" />
          <div class="entry-brand-sub">DECISION SIMULATION CONSOLE</div>
        </div>
        <div class="entry-status"><span class="status-led"></span>本地演示环境</div>
      </header>

      <main class="entry-main">
        <section class="entry-intro">
          <span class="hero-badge">RETAIL SIMULATION ENGINE · 零售经营推演引擎</span>
          <p class="entry-kicker">DECISIONS, BEFORE REALITY.</p>
          <h1 class="entry-title">让每一个经营决策，<br /><span>都先在未来发生一次。</span></h1>
          <p class="entry-desc">
            把门店、供应链与顾客抽象成会自主行动的数字实体，
            在知识图谱中先看见决策如何传导，再进入真实世界。
          </p>
          <div class="entry-points">
            <span>因果链可追溯</span>
            <span>多智能体并行</span>
            <span>过程实时可见</span>
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
        </section>

        <div class="entry-bridge" aria-hidden="true"><span></span><b>场景流入控制台</b><i>→</i></div>
        <aside class="access-card">
          <div class="access-code">ACCESS / 01</div>
          <h2>进入决策控制台</h2>
          <p>从一个经营场景开始，构建世界、启动推演，最后得到可解释的行动建议。</p>
          <button class="access-primary" @click="$emit('enter')">进入工作台 <span class="arr">→</span></button>
          <button class="access-secondary" @click="scrollToPhases">先看看系统如何工作 <span>↓</span></button>
          <div class="access-note"><span class="status-led"></span><div><strong>无需账号</strong><br />当前为本地演示环境，点击即可开始。</div></div>
          <div class="access-meta"><span>ENGINE STATUS</span><strong>READY</strong></div>
        </aside>
      </main>

      <section class="workflow-section" ref="phasesRef">
        <div class="section-line"><span>WORKFLOW / 01—04</span><h2>从假设到决策</h2><span>四步推演闭环</span></div>
        <div class="workflow-grid">
          <article v-for="(p, i) in phases" :key="p.en" class="entry-stage">
            <div class="stage-index">{{ String(i + 1).padStart(2, '0') }}</div>
            <div class="stage-copy"><span>{{ p.en }}</span><strong>{{ p.cn }}</strong></div>
            <p>{{ p.desc }}</p>
            <small>{{ p.outcome }}</small>
          </article>
        </div>
      </section>

      <section class="entry-stats">
        <div class="entry-stat" v-for="s in stats" :key="s.tag"><strong>{{ s.n }}</strong><span><b>{{ s.tag }}</b>{{ s.l }}</span></div>
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

defineEmits(['enter']);

const phasesRef = ref(null);

const stats = [
  { n: '12', tag: 'ENTITIES', l: '数字实体' },
  { n: '46', tag: 'RELATIONS', l: '关系路径' },
  { n: '06', tag: 'ROUNDS', l: '推演轮次' },
  { n: '03', tag: 'CHAINS', l: '因果链路' },
];

const phases = [
  { en: 'WHAT IF', cn: '构建世界', desc: '输入场景与假设事件，LLM 抽取实体与初始关系，搭建可推演的数字世界。', outcome: '场景 → 实体 → 关系' },
  { en: 'SIMULATE', cn: '自生长推演', desc: '多 agent 并行反应、涌现新实体与新关系，实时活动流呈现世界动态。', outcome: '动作 → 关系 → 生长' },
  { en: 'OBSERVE', cn: '决策报告', desc: 'ReACT 式图谱检索证据，生成多章节报告，并提取因果链与决策建议。', outcome: '证据 → 因果 → 建议' },
  { en: 'INTERVIEW', cn: '随时问节点', desc: '与任意实体深度对话，或问全局分析师「为什么客流掉了」。', outcome: '节点 → 对话 → 追问' },
];

const iconPaths = {
  chat: 'M8 10h8M8 14h5M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z',
  flow: 'M4 12h4l2-3 4 6 2-3h4M4 18h16',
  network: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8M12 8a4 4 0 100 8 4 4 0 000-8z',
  chain: 'M5 12h6m4 0h4M9 12l-2-2m2 2l-2 2m8-2l2-2m-2 2l2 2',
  inject: 'M12 3v3M12 18v3M3 12h3M18 12h3M7.05 7.05l2.12 2.12M14.83 14.83l2.12 2.12M16.95 7.05l-2.12 2.12M9.17 14.83l-2.12 2.12',
  module: 'M4 6h6v6H4V6zm10 0h6v6h-6V6zM4 16h6v6H4v-6zm10 0h6v6h-6v-6z',
};

const features = [
  { icon: 'chat', t: '可对话推演' },
  { icon: 'flow', t: '实时世界动态' },
  { icon: 'network', t: '社区与桥节点' },
  { icon: 'chain', t: '因果链与决策' },
  { icon: 'inject', t: '假设注入' },
  { icon: 'module', t: '场景包可扩展' },
];

const stack = ['Vue 3', 'D3.js', 'Express', 'LLM 多智能体', '力导向图谱'];

function scrollToPhases() {
  phasesRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  phasesRef.value?.classList.add('pulse');
  setTimeout(() => phasesRef.value?.classList.remove('pulse'), 600);
}
</script>

<style scoped>
.home {
  --cyan: #4ea6df;
  --cyan-deep: #124f82;
  --border: rgba(92, 139, 185, 0.22);
  --border-hover: rgba(124, 173, 214, 0.34);
  --glass: rgba(255, 255, 255, 0.03);
  --ease: cubic-bezier(0.22, 0.9, 0.3, 1);
  --font-display: 'Inter', 'Geist', 'SF Pro Display', 'Noto Sans SC', sans-serif;
  --font-body: 'Inter', 'Geist', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --text-primary: #F4F7FB;
  --text-secondary: #9BB0C8;
  --text-muted: #6D83A0;

  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 50% 20%, rgba(78, 166, 223, 0.08), transparent 42%),
    radial-gradient(circle at 12% 18%, rgba(23, 64, 128, 0.10), transparent 30%),
    #050910;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 16px;
  letter-spacing: 0.01em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'kern' 1, 'liga' 1;
}

.bg { position: absolute; inset: 0; pointer-events: none; }
.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(78,166,223,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(78,166,223,0.035) 1px, transparent 1px);
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
  background: linear-gradient(90deg, transparent 6%, rgba(78,166,223,0.13) 50%, transparent 94%);
}
.glow { position: absolute; border-radius: 50%; pointer-events: none; }
.glow-a { width: 52%; aspect-ratio: 1; left: -18%; top: -28%; background: radial-gradient(circle, rgba(78,166,223,0.12), transparent 66%); }
.glow-b { width: 38%; aspect-ratio: 1; right: -12%; top: 3%; background: radial-gradient(circle, rgba(78,166,223,0.05), transparent 66%); }

/* 16:9 画布 — flex 均分，无 1fr 空洞 */
.screen {
  position: relative;
  z-index: 1;
  width: min(100vw, calc(100vh * 16 / 9));
  height: min(100vh, calc(100vw * 9 / 16));
  padding: clamp(12px, 1.5vh, 18px) clamp(20px, 2.4vw, 34px) clamp(10px, 1.1vh, 14px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: clamp(8px, 1vh, 12px);
  box-sizing: border-box;
}

.card {
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
}

/* Nav */
.nav {
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
  padding-bottom: clamp(8px, 1vh, 14px);
  border-bottom: 1px solid rgba(88,183,247,0.08);
}
.nav-brand { display: flex; align-items: center; gap: 10px; }
.logo-mark {
  width: 30px; height: 30px; border-radius: 9px;
  background: linear-gradient(135deg, #58b7f7, #0b4e86);
  box-shadow: 0 0 20px rgba(88,183,247,0.35);
}
.nav-title {
  font-family: var(--font-display);
  font-size: clamp(13px, 1.35vh, 16px);
  font-weight: 650;
  letter-spacing: -0.02em;
}
.nav-enter {
  font-family: var(--font-body);
  background: transparent; color: #9ec5e5;
  border: 1px solid rgba(88,183,247,0.2);
  padding: 7px 14px; font-size: 11px; font-weight: 500;
  letter-spacing: 0.03em;
  border-radius: 999px; cursor: pointer;
}
.nav-enter:hover { background: rgba(88,183,247,0.14); border-color: rgba(88,183,247,0.48); color: #e8f6ff; }
.arr { display: inline-block; transition: transform 0.2s var(--ease); }
.nav-enter:hover .arr, .cta-primary:hover .arr { transform: translateX(3px); }

/* Hero — 横向紧凑带 */
.hero-band {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: minmax(320px, 1.06fr) minmax(360px, 1fr) auto;
  grid-template-rows: auto auto;
  gap: clamp(8px, 0.95vh, 12px) clamp(18px, 2vw, 30px);
  align-items: center;
  transform: translateY(-2px);
}

.hero-copy { grid-column: 1; grid-row: 1 / 3; }
.hero-badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 9px; font-weight: 500; letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8BBFEC; border: 1px solid rgba(88,183,247,0.26);
  background: rgba(88,183,247,0.06);
  padding: 5px 11px; border-radius: 999px; margin-bottom: 10px;
}
.hero-title {
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-size: clamp(28px, 4.2vh, 52px);
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 1.02;
  color: var(--text-primary);
}
.gtext {
  font-weight: 750;
  background: linear-gradient(100deg, #d9f0ff, #8dd1fb 50%, #58b7f7);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub {
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(12px, 1.45vh, 15px);
  font-weight: 450;
  letter-spacing: 0.03em;
  color: #9dc8eb;
}

.hero-desc {
  grid-column: 2; grid-row: 1 / 3;
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(11.5px, 1.3vh, 14px);
  font-weight: 400;
  line-height: 1.76;
  letter-spacing: 0.02em;
  color: #96aac1;
  align-self: center;
  max-width: 62ch;
}
.hero-desc .hl { color: #d9e9f8; font-weight: 550; }

.hero-cta {
  grid-column: 3; grid-row: 1 / 3;
  display: flex; flex-direction: column; gap: 8px;
  align-self: center;
  min-width: 118px;
}

.cta-primary {
  font-family: var(--font-body);
  background: linear-gradient(135deg, #5fbdf9, #1c79c7);
  color: #fff; border: none;
  padding: 12px 24px; font-size: 13px; font-weight: 650;
  letter-spacing: 0.04em;
  border-radius: 12px; cursor: pointer; white-space: nowrap;
  box-shadow: 0 0 0 1px rgba(88,183,247,0.22), 0 10px 28px rgba(26, 111, 185, 0.28);
}
.cta-primary:hover { transform: translateY(-1px); }

.cta-ghost {
  font-family: var(--font-body);
  background: transparent; color: #b7d2ea;
  border: 1px solid rgba(88,183,247,0.24);
  padding: 9px 18px; font-size: 12px; font-weight: 500;
  letter-spacing: 0.03em;
  border-radius: 12px; cursor: pointer; white-space: nowrap;
}
.cta-ghost:hover { border-color: rgba(88,183,247,0.5); background: rgba(88,183,247,0.06); }

/* Pipeline — 四卡保持紧凑高度，把呼吸空间留给整页层级 */
.pipeline {
  flex: 0 0 clamp(220px, 30vh, 420px);
  min-height: clamp(220px, 30vh, 420px);
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.75vh, 10px);
  transition: box-shadow 0.3s var(--ease);
  border-radius: 16px;
}
.pipeline.pulse { box-shadow: 0 0 0 2px rgba(88,183,247,0.22); }

.pipeline-label {
  font-family: var(--font-mono);
  font-size: 9px; font-weight: 500; letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #79b8ec;
  flex-shrink: 0;
}

.pipeline-track {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.08fr 0.98fr 0.98fr 0.98fr;
  gap: clamp(10px, 1vw, 14px);
  align-items: stretch;
}

.pipe-card {
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: clamp(14px, 1.6vh, 18px) clamp(14px, 1vw, 16px);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  transition: border-color 0.2s var(--ease), transform 0.2s var(--ease);
  overflow: hidden;
  min-height: 0;
}
.pipe-card:hover { border-color: var(--border-hover); transform: translateY(-2px); }
.pipe-card--featured {
  background:
    linear-gradient(180deg, rgba(88,183,247,0.07), transparent 36%),
    rgba(255,255,255,0.04);
  border-color: rgba(116, 181, 225, 0.34);
}

.pipe-top {
  display: flex;
  align-items: center;
  margin-bottom: clamp(8px, 0.9vh, 12px);
}
.pipe-num {
  font-family: var(--font-mono);
  font-size: 10px; font-weight: 650;
  letter-spacing: 0.02em;
  padding: 4px 8px; border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #63bef6, #256fbd);
  box-shadow: 0 2px 12px rgba(88,183,247,0.22);
}
.pipe-link {
  flex: 1;
  height: 1px;
  margin-left: 8px;
  background: linear-gradient(90deg, rgba(88,183,247,0.42), rgba(88,183,247,0.06));
}

.pipe-en {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(138, 193, 235, 0.72);
  margin-bottom: 5px;
}
.pipe-cn {
  font-family: var(--font-body);
  font-size: clamp(14px, 1.55vh, 17px);
  font-weight: 650;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  margin-bottom: clamp(7px, 0.8vh, 10px);
}
.pipe-desc {
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(11px, 1.12vh, 12.5px);
  font-weight: 400;
  line-height: 1.7;
  letter-spacing: 0.015em;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pipe-outcome {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 14px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
  color: #81b9e3;
  white-space: nowrap;
}
.outcome-dot {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #58b7f7;
  box-shadow: 0 0 10px rgba(88,183,247,0.7);
}
.outcome-arrow { margin-left: auto; color: #4e87b4; transition: transform 0.2s var(--ease); }
.pipe-card:hover .outcome-arrow { transform: translateX(3px); color: #b7e1ff; }

/* Metrics */
.metrics {
  flex-shrink: 0;
  display: flex;
  height: clamp(58px, 7.5vh, 76px);
  padding: 0;
  overflow: hidden;
}
.metric {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 10px;
}
.metric-sep {
  position: absolute; right: 0; top: 20%; height: 60%; width: 1px;
  background: linear-gradient(180deg, transparent, rgba(88,183,247,0.15), transparent);
}
.metric-num {
  font-family: var(--font-display);
  font-size: clamp(21px, 2.7vh, 29px);
  font-weight: 700;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg, #fbfdff, #a5c9ef);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.metric-tag {
  font-family: var(--font-mono);
  font-size: 8px; font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #83b6e0;
}
.metric-label {
  font-family: var(--font-body);
  font-size: clamp(11px, 1.15vh, 13px);
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
}

/* Capabilities — 单行图标 */
.caps {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(12px, 1.2vw, 18px);
}
.caps-kicker {
  font-family: var(--font-mono);
  font-size: 9px; font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6d95bb; white-space: nowrap;
}
.caps-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: clamp(8px, 0.9vw, 10px);
}
.cap-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: clamp(10px, 1.2vh, 13px) 10px;
  transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
  border-radius: 999px;
}
.cap-item:hover { border-color: var(--border-hover); background: rgba(88,183,247,0.04); }
.cap-ico { width: 14px; height: 14px; color: #66c0f7; flex-shrink: 0; }
.cap-t {
  font-family: var(--font-body);
  font-size: clamp(10px, 1.08vh, 12px);
  font-weight: 550;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Footer */
.foot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: clamp(5px, 0.6vh, 8px);
  border-top: 1px solid rgba(88,183,247,0.08);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.04em;
  color: #456280;
}
.stack { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.stack-label {
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5F7691;
  margin-right: 4px;
}
.stack-item {
  font-family: var(--font-body);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: #b3d0ea;
  border: 1px solid rgba(88,183,247,0.18);
  border-radius: 999px;
  padding: 2px 8px;
  background: rgba(88,183,247,0.045);
}
.foot-copy {
  font-family: var(--font-body);
  font-size: 9px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

@media (max-height: 768px) {
  .screen:not(.entry-screen) { transform: scale(0.94); transform-origin: center center; }
}

@media (max-width: 1000px) {
  .home { overflow-y: auto; align-items: flex-start; }
  .screen {
    width: 100%; height: auto; min-height: 100%;
    transform: none !important;
    justify-content: flex-start;
    gap: 16px;
    padding: 16px;
  }
  .hero-band { grid-template-columns: 1fr; grid-template-rows: auto; }
  .hero-copy, .hero-desc, .hero-cta { grid-column: 1; grid-row: auto; }
  .hero-cta { flex-direction: row; }
  .pipeline { flex: 0 0 auto; min-height: 0; }
  .pipeline-track { grid-template-columns: repeat(2, 1fr); }
  .caps { flex-direction: column; align-items: flex-start; }
  .caps-grid { grid-template-columns: repeat(3, 1fr); width: 100%; }
  .foot { flex-direction: column; align-items: flex-start; }
}

@media (max-width: 560px) {
  .pipeline-track { grid-template-columns: 1fr; }
  .caps-grid { grid-template-columns: repeat(2, 1fr); }
  .metrics { flex-wrap: wrap; height: auto; }
  .metric { flex: 1 1 45%; padding: 8px 0; }
  .metric-sep { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .pipe-card:hover, .cta-primary:hover { transform: none; }
}

/* Entry page — 登录前入口的聚焦布局 */
.entry-screen {
  width: min(100vw, calc(100vh * 16 / 9));
  height: min(100vh, calc(100vw * 9 / 16));
  padding: clamp(16px, 2vh, 24px) clamp(26px, 3.2vw, 48px) clamp(12px, 1.4vh, 18px);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: clamp(8px, 1.1vh, 13px);
  overflow: hidden;
}
.entry-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  padding-bottom: clamp(10px, 1.25vh, 15px);
  border-bottom: 1px solid rgba(88,183,247,0.12);
}
.entry-brand { display: flex; align-items: center; gap: 11px; }
.brand-logo {
  display: block;
  width: clamp(142px, 12vw, 174px);
  height: auto;
  border-radius: 6px;
  padding: 2px 4px;
  background: rgba(8, 18, 34, 0.92);
  box-shadow: 0 6px 18px rgba(0,53,148,0.14);
  filter: saturate(0.88) brightness(0.92);
}
.entry-brand-sub {
  align-self: flex-end;
  margin-bottom: 3px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.13em;
  color: #7b97b1;
}
.entry-status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-body);
  font-size: 14px;
  color: #8aa4bb;
}
.status-led {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #56d39a;
  box-shadow: 0 0 12px rgba(86,211,154,0.8);
  animation: statusPulse 2.4s ease-in-out infinite;
}
@keyframes statusPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(86,211,154,0.04), 0 0 8px rgba(86,211,154,0.62); }
  50% { box-shadow: 0 0 0 4px rgba(86,211,154,0.1), 0 0 16px rgba(86,211,154,0.92); }
}
.entry-main {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.84fr) minmax(330px, 0.84fr);
  align-items: start;
  gap: clamp(10px, 1.2vw, 18px);
  padding: 0;
}
.entry-main::after {
  content: '';
  position: absolute;
  top: 4%;
  right: 20%;
  bottom: 4%;
  left: 50%;
  z-index: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, rgba(109,190,232,0.2) 1px, transparent 1px);
  background-size: 18px 18px;
  mask-image: linear-gradient(90deg, transparent, #000 24%, #000 76%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 24%, #000 76%, transparent);
  opacity: 0.2;
}
.entry-intro {
  position: relative;
  min-width: 0;
  z-index: 1;
  padding-top: 2px;
  padding-right: clamp(12px, 1.6vw, 24px);
  border-right: 1px solid rgba(88,183,247,0.1);
}
.entry-kicker {
  margin: clamp(5px, 0.75vh, 8px) 0 5px;
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.15em;
  color: #7ab7e2;
}
.entry-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(38px, 5.9vh, 76px);
  line-height: 1.2;
  letter-spacing: -0.055em;
  font-weight: 720;
  color: #f5f9fd;
}
.entry-title span {
  color: #b7def4;
  text-shadow: 0 0 20px rgba(78,166,223,0.12);
}
.entry-desc {
  max-width: 570px;
  margin: clamp(6px, 0.85vh, 9px) 0 0;
  font-family: var(--font-body);
  font-size: clamp(16px, 1.65vh, 18px);
  line-height: 1.55;
  color: #aab9c6;
}
.entry-points {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: clamp(7px, 0.9vh, 10px);
}
.entry-points span {
  padding: 7px 12px;
  border: 1px solid rgba(78,166,223,0.14);
  border-radius: 999px;
  background: rgba(78,166,223,0.04);
  font-family: var(--font-body);
  font-size: 14px;
  color: #94b8d0;
}
.preview-frame {
  position: relative;
  width: 100%;
  max-width: 740px;
  height: clamp(132px, 17vh, 190px);
  margin-top: clamp(7px, 1vh, 11px);
  padding: 14px 16px 12px;
  border: 1px solid rgba(78,166,223,0.16);
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(18,44,70,0.62), rgba(5,12,21,0.45));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 48px rgba(0,0,0,0.18);
  overflow: hidden;
}
.preview-frame::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(78,166,223,0.12), transparent);
}
.preview-topline, .preview-bottomline {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.09em;
  color: #849eb3;
}
.preview-topline i {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 4px;
  border-radius: 50%;
  background: #56d39a;
  box-shadow: 0 0 8px rgba(86,211,154,0.8);
}
.mini-graph { position: absolute; inset: 38px 18px 26px; }
.mini-graph svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.mini-graph path {
  fill: none;
  stroke: rgba(78,166,223,0.42);
  stroke-width: 1.5;
  stroke-dasharray: 4 5;
  filter: drop-shadow(0 0 3px rgba(78,166,223,0.32));
}
.graph-node { position: absolute; display: flex; align-items: center; gap: 5px; color: #a7bac8; font-family: var(--font-body); font-size: 13px; white-space: nowrap; }
.graph-node b { width: 9px; height: 9px; border-radius: 50%; background: #4ea6df; box-shadow: 0 0 0 2px rgba(78,166,223,0.14), 0 0 13px rgba(78,166,223,0.9); }
.graph-node em { font-style: normal; }
.node-a { left: 5%; top: 63%; }
.node-b { left: 32%; top: 18%; }
.node-c { left: 52%; top: 63%; }
.node-d { left: 72%; top: 20%; }
.node-e { right: 2%; top: 78%; }
.node-e b { background: #e6c15d; box-shadow: 0 0 0 2px rgba(230,193,93,0.14), 0 0 13px rgba(230,193,93,0.86); }
.preview-bottomline { position: absolute; left: 16px; right: 16px; bottom: 9px; letter-spacing: 0.03em; color: #6b8398; }
.preview-bottomline b { color: #dce9f2; font-weight: 500; }

.entry-bridge {
  position: absolute;
  left: 52%;
  right: 22%;
  top: 67%;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6785a0;
  pointer-events: none;
  z-index: 2;
}
.entry-bridge span {
  position: relative;
  display: block;
  flex: 1;
  height: 1px;
  background:
    repeating-linear-gradient(90deg, rgba(115,205,247,0.62) 0 7px, transparent 7px 15px),
    linear-gradient(90deg, rgba(78,166,223,0.04), rgba(78,166,223,0.34), rgba(230,193,93,0.45));
  background-size: 24px 100%, 100% 100%;
  animation: bridgeFlow 1.8s linear infinite;
}
.entry-bridge span::after {
  content: '';
  position: absolute;
  top: -2px;
  left: 22%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ffd45c;
  box-shadow: 0 0 12px rgba(255,212,92,0.8);
  animation: bridgePulse 2.8s ease-in-out infinite;
}
.entry-bridge b { position: absolute; top: -17px; left: 42%; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em; font-weight: 400; white-space: nowrap; color: #839aac; }
.entry-bridge i { font-family: var(--font-body); font-size: 16px; font-style: normal; color: #ffd45c; }
@keyframes bridgePulse { 0%, 100% { transform: translateX(0); opacity: 0.45; } 50% { transform: translateX(230%); opacity: 1; } }
@keyframes bridgeFlow { to { background-position: 24px 0, 0 0; } }

.access-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  justify-self: end;
  padding: clamp(22px, 2.4vh, 30px);
  border: 1px solid rgba(98,141,181,0.28);
  border-radius: 20px;
  background:
    linear-gradient(145deg, rgba(78,166,223,0.075), rgba(255,255,255,0.025)),
    linear-gradient(145deg, rgba(16,34,52,0.92), rgba(8,15,26,0.96));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), inset 0 18px 24px rgba(78,166,223,0.045), 0 8px 22px rgba(19,85,132,0.16);
  overflow: hidden;
}
.access-card::before,
.entry-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(121,205,250,0.56), rgba(88,148,193,0.18) 46%, transparent 84%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}
.access-card > * { position: relative; z-index: 1; }
.access-code {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.15em;
  color: #86a7c0;
}
.access-card h2 {
  margin: 12px 0 6px;
  font-family: var(--font-display);
  font-size: clamp(28px, 3.45vh, 40px);
  line-height: 1.16;
  letter-spacing: -0.04em;
  color: #f2f7fb;
  font-weight: 720;
}
.access-card > p {
  margin: 0 0 14px;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.55;
  color: #acb9c6;
}
.access-primary, .access-secondary {
  width: 100%;
  cursor: pointer;
  font-family: var(--font-body);
  border-radius: 10px;
  transition: transform 0.2s var(--ease), border-color 0.2s var(--ease), background 0.2s var(--ease);
}
.access-primary {
  padding: 12px 18px;
  border: 1px solid rgba(88,148,193,0.48);
  background: linear-gradient(135deg, #5ca3d6, #1f5d92);
  color: #fff;
  font-size: 16px;
  font-weight: 650;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -10px 18px rgba(20,70,110,0.16), 0 10px 26px rgba(31,120,193,0.27);
}
.access-primary:hover { transform: translateY(-1px); filter: brightness(1.08); }
.access-secondary {
  margin-top: 8px;
  padding: 10px 18px;
  border: 1px solid rgba(88,148,193,0.2);
  background: rgba(78,166,223,0.03);
  color: #aec4d8;
  font-size: 14px;
}
.access-secondary:hover { border-color: rgba(88,148,193,0.42); background: rgba(78,166,223,0.06); }
.access-secondary span { float: right; color: #85b4d4; }
.access-note {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(88,148,193,0.11);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  color: #879bae;
}
.access-note .status-led { margin-top: 5px; }
.access-note strong { color: #dde7ee; font-weight: 550; }
.access-meta { display: flex; justify-content: space-between; margin-top: 12px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.1em; color: #70889d; }
.access-meta strong { color: #56d39a; font-weight: 500; }

.workflow-section { flex: 0 0 auto; }
.section-line { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.1em; color: #7690a8; }
.section-line h2 { margin: 0; font-family: var(--font-body); font-size: 18px; letter-spacing: 0.02em; color: #c8d4df; font-weight: 650; }
.section-line span:last-child { margin-left: auto; color: #496c87; }
.workflow-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.entry-stage { position: relative; display: flex; flex-direction: column; justify-content: center; min-width: 0; min-height: 128px; padding: 16px 18px 15px; border: 1px solid rgba(88,148,193,0.24); border-radius: 12px; background: rgba(255,255,255,0.022); box-shadow: inset 0 1px 0 rgba(255,255,255,0.035); }
.entry-stage:first-child { border-color: rgba(88,148,193,0.32); background: rgba(78,166,223,0.05); }
.entry-stage > .stage-copy,
.entry-stage > p,
.entry-stage > small,
.stage-index { position: relative; z-index: 1; }
.stage-index { position: absolute; top: 11px; right: 12px; font-family: var(--font-mono); font-size: 12px; color: #7493ad; }
.stage-copy { display: flex; flex-direction: column; gap: 2px; padding-right: 26px; }
.stage-copy span { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.11em; color: #88a5bc; }
.stage-copy strong { font-family: var(--font-body); font-size: 18px; line-height: 1.25; font-weight: 650; color: #edf3f7; }
.entry-stage p { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 42px; margin: 9px 0 8px; font-family: var(--font-body); font-size: 14px; line-height: 1.5; color: #a6b7c7; }
.entry-stage small { font-family: var(--font-mono); font-size: 12px; color: #84abca; letter-spacing: 0.03em; }

.entry-stats { display: grid; grid-template-columns: repeat(4, 1fr); flex: 0 0 auto; border-top: 1px solid rgba(88,148,193,0.1); border-bottom: 1px solid rgba(88,148,193,0.1); }
.entry-stat { display: flex; align-items: baseline; justify-content: center; gap: 14px; min-height: 72px; border-right: 1px solid rgba(88,148,193,0.14); }
.entry-stat:last-child { border-right: none; }
.entry-stat > strong { font-family: var(--font-display); font-size: 44px; line-height: 1; letter-spacing: -0.05em; background: linear-gradient(180deg, #f7fdff 0%, #6bd3ff 100%); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 0 18px rgba(78,166,223,0.18); }
.entry-stat > span { display: flex; flex-direction: column; gap: 2px; font-family: var(--font-body); font-size: 14px; color: #aab9c6; }
.entry-stat b { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.1em; color: #8fc0e3; font-weight: 550; }
.entry-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex: 0 0 auto; padding-top: 2px; font-family: var(--font-body); font-size: 12px; color: #6e879b; }
.entry-footer { position: relative; }
.entry-footer::after { content: ''; position: absolute; right: 0; top: -8px; width: 84px; height: 1px; background: linear-gradient(90deg, transparent, rgba(105,191,233,0.34)); }
.entry-system { display: flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em; color: #7e97aa; }
.entry-system .status-led { width: 5px; height: 5px; }
.entry-system span + span { padding-left: 10px; border-left: 1px solid rgba(88,183,247,0.12); }
.home .bg-grid { opacity: 0.58; }

@media (max-width: 1000px) {
  .home { overflow-y: auto; align-items: flex-start; }
  .entry-screen { width: 100%; height: auto; min-height: 100%; overflow: visible; }
  .entry-main { grid-template-columns: 1fr; flex: 0 0 auto; min-height: max-content; gap: 16px; padding: 6px 0; }
  .entry-intro { padding-right: 0; border-right: none; }
  .entry-bridge { display: none; }
  .entry-main::after { display: none; }
  .access-card { justify-self: start; max-width: none; }
  .preview-frame { max-width: none; }
  .workflow-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1001px) and (max-width: 1199px) {
  .workflow-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .entry-screen { padding: 16px; }
  .entry-nav { align-items: flex-start; }
  .entry-status { font-size: 0; }
  .entry-title { font-size: 34px; }
  .workflow-grid, .entry-stats { grid-template-columns: 1fr; }
  .entry-stat { justify-content: flex-start; padding-left: 14px; border-right: none; border-bottom: 1px solid rgba(88,183,247,0.09); }
  .entry-stat:last-child { border-bottom: none; }
  .entry-footer { align-items: flex-start; flex-direction: column; }
  .entry-system { flex-wrap: wrap; }
}
@media (min-width: 1001px) and (max-height: 960px) {
  .home { overflow-y: auto; align-items: flex-start; }
  .entry-screen {
    width: min(100vw, calc(100dvh * 16 / 9));
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }
  .entry-main { flex: 0 0 auto; min-height: max-content; }
}
@media (max-height: 768px) and (min-width: 1001px) {
  .entry-screen { padding-top: 8px; padding-bottom: 8px; gap: 6px; }
  .entry-nav { padding-bottom: 8px; }
  .entry-main { gap: 12px; padding: 0; }
  .entry-kicker { margin-top: 6px; margin-bottom: 4px; }
  .entry-title { font-size: clamp(34px, 5vh, 48px); }
  .entry-desc { margin-top: 6px; font-size: 14px; line-height: 1.5; }
  .entry-points { margin-top: 8px; }
  .entry-points span { padding: 5px 9px; font-size: 13px; }
  .preview-frame { height: 112px; margin-top: 7px; }
  .access-card { padding: 20px 22px; }
  .access-card h2 { margin-top: 9px; margin-bottom: 6px; }
  .access-card > p { margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
  .access-note { margin-top: 10px; padding-top: 9px; font-size: 13px; }
  .access-meta { margin-top: 8px; }
  .entry-stage { min-height: 112px; padding: 13px 14px 12px; }
  .entry-stage p { min-height: 42px; margin: 7px 0 6px; -webkit-line-clamp: 2; font-size: 14px; }
  .entry-stat { min-height: 62px; }
  .entry-stat > strong { font-size: 38px; }
  .entry-footer { font-size: 12px; }
  .entry-bridge { display: none; }
}
</style>
