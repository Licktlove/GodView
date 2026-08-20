<template>
  <div class="home">
    <!-- 背景层：渐变 + 网格 + 光晕 + 星点 -->
    <div class="bg">
      <div class="bg-grid"></div>
      <div class="glow glow-a"></div>
      <div class="glow glow-b"></div>
      <span class="star s1"></span><span class="star s2"></span><span class="star s3"></span><span class="star s4"></span><span class="star s5"></span>
    </div>

    <!-- 顶部导航 -->
    <nav class="nav">
      <div class="nav-brand">
        <span class="logo-mark"></span>
        <div class="nav-brand-text">
          <span class="nav-title">Dmall Future Market</span>
          <span class="nav-sub">让每一个经营决策，都先在未来发生一次。</span>
        </div>
      </div>
      <button class="nav-enter" @click="$emit('enter')">进入工作台 <span class="arr">→</span></button>
    </nav>

    <!-- Hero -->
    <section class="hero">
      <span class="hero-badge rise d0">RETAIL SIMULATION ENGINE · 零售经营推演引擎</span>
      <h1 class="hero-title rise d1">Dmall <span class="gtext">Future</span> Market</h1>
      <p class="hero-sub rise d2">让每一个经营决策，都先在未来发生一次。</p>
      <p class="hero-desc rise d3">
        把你的门店、供应链与顾客，抽象成会自主行动的数字实体；
        在多智能体知识图谱上预演决策后果——在真正投入资源之前，先看见世界会如何演化。
      </p>
      <div class="hero-cta rise d4">
        <button class="cta-primary" @click="$emit('enter')">开始推演 <span class="arr">→</span></button>
        <button class="cta-ghost" @click="scrollToPhases">了解玩法</button>
      </div>
    </section>

    <!-- 能力数字条 -->
    <section class="stats rise d5" ref="statsRef">
      <div class="stat" v-for="s in stats" :key="s.n">
        <div class="stat-num">{{ s.n }}</div>
        <div class="stat-label">{{ s.l }}</div>
      </div>
    </section>

    <!-- 四步推演 -->
    <section class="phases">
      <h2 class="section-title">四步推演，<span class="gtext">让决策先发生一次</span></h2>
      <div class="phase-grid">
        <div class="phase-card" v-for="(p, i) in phases" :key="p.en">
          <div class="phase-idx">{{ String(i + 1).padStart(2, '0') }}</div>
          <div class="phase-en">{{ p.en }}</div>
          <div class="phase-cn">{{ p.cn }}</div>
          <p class="phase-desc">{{ p.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 核心能力 -->
    <section class="features">
      <h2 class="section-title">核心能力</h2>
      <div class="feature-grid">
        <div class="feature-card" v-for="f in features" :key="f.t">
          <div class="feature-ico">{{ f.ico }}</div>
          <div class="feature-t">{{ f.t }}</div>
          <p class="feature-d">{{ f.d }}</p>
        </div>
      </div>
    </section>

    <!-- 技术栈 -->
    <section class="stack">
      <span class="stack-label">TECH STACK</span>
      <span class="stack-item" v-for="s in stack" :key="s">{{ s }}</span>
    </section>

    <!-- 底部 CTA -->
    <section class="final-cta">
      <h2 class="final-title">准备好预演你的<br />下一个经营决策了吗？</h2>
      <button class="cta-primary cta-lg" @click="$emit('enter')">进入 Future Market <span class="arr">→</span></button>
    </section>

    <footer class="footer">
      <span>© 2026 Dmall Future Market</span>
      <span class="footer-dot">·</span>
      <span>多智能体涌现推演引擎</span>
    </footer>
  </div>
</template>

<script setup>
const stats = [
  { n: '3', l: '阶段推演闭环' },
  { n: '多', l: '智能体并行涌现' },
  { n: '2+', l: '内置场景包' },
  { n: '实时', l: '世界动态可见' },
];

const phases = [
  { en: 'WHAT IF', cn: '构建世界', desc: '输入场景与假设事件，LLM 抽取实体与初始关系，搭建可推演的数字世界。' },
  { en: 'SIMULATE', cn: '自生长推演', desc: '多 agent 并行反应、涌现新实体与新关系，实时活动流呈现世界动态。' },
  { en: 'OBSERVE', cn: '决策报告', desc: 'ReACT 式图谱检索证据，生成多章节报告，并提取因果链与决策建议。' },
  { en: 'INTERVIEW', cn: '随时问节点', desc: '与任意实体深度对话，或问全局分析师「为什么客流掉了」。' },
];

const features = [
  { ico: '◇', t: '可对话推演', d: '用自然语言设定假设、追问节点，推演全程可干预、可解释。' },
  { ico: '⇄', t: '实时世界动态', d: '每个 agent 的动作实时流入活动流，推演过程完全可见。' },
  { ico: '◎', t: '社区与桥节点', d: '自动发现利益群体与关键枢纽，定位风险传导与机会。' },
  { ico: '→', t: '因果链与决策', d: '提取关键因果路径，给出可执行的经营决策建议。' },
  { ico: '✦', t: '假设注入', d: '把「竞品大促」「阴雨一周」等前提注入抽取与全程推演。' },
  { ico: '▦', t: '场景包可扩展', d: '零售 / 供应链等领域知识外置，零代码切换场景。' },
];

const stack = ['Vue 3', 'D3.js', 'Express', 'LLM 多智能体', '力导向图谱'];

function scrollToPhases() {
  document.querySelector('.phases')?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<style scoped>
.home {
  position: relative; height: 100%; overflow-y: auto; overflow-x: hidden;
  background: radial-gradient(1200px 700px at 75% -10%, #0E2A4D 0%, #081527 45%, #060B14 100%);
  color: #EAF2FB; font-family: 'JetBrains Mono', 'Noto Sans SC', monospace;
}
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-thumb { background: rgba(90, 140, 200, 0.35); border-radius: 4px; }
::-webkit-scrollbar-track { background: transparent; }

/* ---------- 背景层 ---------- */
.bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(14, 165, 233, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(14, 165, 233, 0.06) 1px, transparent 1px);
  background-size: 46px 46px;
  -webkit-mask-image: radial-gradient(900px 560px at 50% 12%, #000 30%, transparent 78%);
  mask-image: radial-gradient(900px 560px at 50% 12%, #000 30%, transparent 78%);
}
.glow { position: absolute; border-radius: 50%; }
.glow-a { width: 560px; height: 560px; left: -160px; top: -180px; background: radial-gradient(circle, rgba(14, 165, 233, 0.30), transparent 65%); }
.glow-b { width: 480px; height: 480px; right: -140px; top: 240px; background: radial-gradient(circle, rgba(56, 189, 248, 0.16), transparent 65%); }
.star { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: rgba(150, 200, 255, 0.9); animation: twinkle 4s ease-in-out infinite; }
.s1 { left: 12%; top: 22%; } .s2 { left: 74%; top: 14%; animation-delay: 1s; } .s3 { left: 22%; top: 62%; animation-delay: 2s; }
.s4 { left: 84%; top: 58%; animation-delay: 0.6s; } .s5 { left: 56%; top: 84%; animation-delay: 1.6s; }
@keyframes twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }

/* ---------- 导航 ---------- */
.nav {
  position: relative; display: flex; align-items: center; justify-content: space-between;
  padding: 18px 40px; max-width: 1200px; margin: 0 auto;
}
.nav-brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.logo-mark {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  background: linear-gradient(135deg, #0EA5E9, #0369A1);
  box-shadow: 0 0 18px rgba(14, 165, 233, 0.55);
  position: relative;
}
.logo-mark::after {
  content: ''; position: absolute; inset: 7px; border-radius: 4px;
  border: 1.5px solid rgba(255, 255, 255, 0.75);
}
.nav-brand-text { display: flex; flex-direction: column; line-height: 1.25; }
.nav-title { font-size: 14px; font-weight: 700; letter-spacing: 0.4px; }
.nav-sub { font-size: 10.5px; color: #7E9BBF; }
.nav-enter {
  background: rgba(14, 165, 233, 0.12); color: #BFE0FF; border: 1px solid rgba(14, 165, 233, 0.4);
  padding: 8px 18px; font-size: 12.5px; font-weight: 500; border-radius: 999px; cursor: pointer;
  transition: all 0.2s;
}
.nav-enter:hover { background: rgba(14, 165, 233, 0.25); border-color: #0EA5E9; color: #fff; }
.arr { display: inline-block; transition: transform 0.2s; }
.nav-enter:hover .arr, .cta-primary:hover .arr, .cta-lg:hover .arr { transform: translateX(3px); }

/* ---------- Hero ---------- */
.hero { position: relative; text-align: center; padding: 88px 24px 40px; }
.hero-badge {
  display: inline-block; font-size: 11px; font-weight: 500; letter-spacing: 2px;
  color: #8FBCEB; border: 1px solid rgba(14, 165, 233, 0.35);
  background: rgba(14, 165, 233, 0.08); padding: 6px 16px; border-radius: 999px; margin-bottom: 26px;
}
.hero-title {
  margin: 0 0 18px; font-size: clamp(40px, 7vw, 74px); font-weight: 700; letter-spacing: 1px; line-height: 1.08;
  color: #F2F8FF; text-shadow: 0 0 60px rgba(14, 165, 233, 0.35);
}
.gtext {
  background: linear-gradient(100deg, #7DD3FC 0%, #38BDF8 45%, #0EA5E9 90%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: clamp(16px, 2.4vw, 21px); font-weight: 500; color: #7DD3FC; margin: 0 0 20px; letter-spacing: 0.5px; }
.hero-desc {
  font-size: 14.5px; line-height: 1.95; color: #A6BBD4; max-width: 640px; margin: 0 auto 36px;
}
.hero-cta { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
.cta-primary {
  background: linear-gradient(135deg, #0EA5E9, #0369A1); color: #fff; border: none;
  padding: 13px 30px; font-size: 15px; font-weight: 600; border-radius: 12px; cursor: pointer;
  box-shadow: 0 8px 30px rgba(14, 165, 233, 0.35); transition: all 0.2s;
}
.cta-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(14, 165, 233, 0.5); }
.cta-ghost {
  background: transparent; color: #BFE0FF; border: 1px solid rgba(56, 189, 248, 0.4);
  padding: 13px 30px; font-size: 15px; font-weight: 500; border-radius: 12px; cursor: pointer; transition: all 0.2s;
}
.cta-ghost:hover { border-color: #0EA5E9; background: rgba(14, 165, 233, 0.08); }

/* ---------- 能力数字条 ---------- */
.stats {
  position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
  max-width: 1000px; margin: 34px auto 0; padding: 0 24px;
}
.stat {
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(56, 189, 248, 0.16);
  border-radius: 14px; padding: 22px 16px; text-align: center;
}
.stat-num {
  font-size: 34px; font-weight: 700; line-height: 1;
  background: linear-gradient(180deg, #FFFFFF, #6FB6F5);
  -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 10px;
}
.stat-label { font-size: 12px; color: #8FA9C7; letter-spacing: 0.5px; }

/* ---------- 区块通用 ---------- */
section { position: relative; }
.section-title {
  text-align: center; font-size: clamp(20px, 3vw, 27px); font-weight: 700; margin: 0 0 38px; letter-spacing: 0.5px;
}
.phases { max-width: 1080px; margin: 0 auto; padding: 96px 24px 30px; }
.features { max-width: 1080px; margin: 0 auto; padding: 60px 24px; }

/* ---------- 四步推演 ---------- */
.phase-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.phase-card {
  position: relative; background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(56, 189, 248, 0.16); border-radius: 16px; padding: 24px 20px 20px;
  overflow: hidden; transition: all 0.25s; cursor: default;
}
.phase-card::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #0EA5E9, transparent); opacity: 0; transition: opacity 0.25s;
}
.phase-card:hover { transform: translateY(-5px); border-color: rgba(56, 189, 248, 0.45); background: rgba(14, 165, 233, 0.08); }
.phase-card:hover::after { opacity: 1; }
.phase-idx {
  font-size: 12px; font-weight: 700; letter-spacing: 2px; margin-bottom: 16px;
  background: linear-gradient(180deg, #38BDF8, #0369A1);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.phase-en { font-size: 17px; font-weight: 700; letter-spacing: 1px; margin-bottom: 6px; }
.phase-cn { font-size: 12.5px; font-weight: 500; color: #4FC3F7; margin-bottom: 14px; }
.phase-desc { font-size: 12.5px; line-height: 1.8; color: #93A9C4; margin: 0; }

/* ---------- 核心能力 ---------- */
.feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.feature-card {
  background: rgba(255, 255, 255, 0.035); border: 1px solid rgba(56, 189, 248, 0.14);
  border-radius: 14px; padding: 24px 22px; transition: all 0.25s;
}
.feature-card:hover { transform: translateY(-4px); border-color: rgba(56, 189, 248, 0.4); background: rgba(14, 165, 233, 0.07); }
.feature-ico { font-size: 20px; color: #38BDF8; margin-bottom: 14px; }
.feature-t { font-size: 15px; font-weight: 600; margin-bottom: 10px; }
.feature-d { font-size: 13px; line-height: 1.8; color: #8FA9C7; margin: 0; }

/* ---------- 技术栈 ---------- */
.stack {
  display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center;
  max-width: 880px; margin: 0 auto; padding: 20px 24px 40px;
}
.stack-label { font-size: 11px; font-weight: 700; color: #5F7691; letter-spacing: 2px; margin-right: 6px; }
.stack-item {
  font-size: 12px; color: #A9C6E8; border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 999px; padding: 6px 16px; background: rgba(14, 165, 233, 0.06);
}

/* ---------- 底部 CTA ---------- */
.final-cta {
  text-align: center; padding: 90px 24px 70px; position: relative;
}
.final-cta::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(600px 300px at 50% 50%, rgba(14, 165, 233, 0.14), transparent 70%);
}
.final-title { font-size: clamp(24px, 4vw, 38px); font-weight: 700; line-height: 1.4; margin: 0 0 34px; }
.cta-lg { padding: 16px 44px; font-size: 16px; }

.footer {
  position: relative; display: flex; justify-content: center; gap: 10px; align-items: center;
  padding: 22px 24px 30px; font-size: 11.5px; color: #54708F;
}
.footer-dot { opacity: 0.6; }

/* ---------- 入场动画 ---------- */
.rise { animation: rise 0.75s cubic-bezier(0.22, 0.9, 0.3, 1) both; }
.d0 { animation-delay: 0.05s; } .d1 { animation-delay: 0.12s; } .d2 { animation-delay: 0.2s; }
.d3 { animation-delay: 0.28s; } .d4 { animation-delay: 0.36s; } .d5 { animation-delay: 0.46s; }
@keyframes rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 960px) {
  .phase-grid { grid-template-columns: repeat(2, 1fr); }
  .stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .phase-grid, .feature-grid { grid-template-columns: 1fr; }
  .nav { padding: 14px 18px; }
  .nav-sub { display: none; }
  .hero { padding-top: 56px; }
}
</style>
