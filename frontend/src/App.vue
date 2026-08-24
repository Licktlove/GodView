<template>
  <div class="app">
    <header class="app-header" v-if="viewMode!=='home'">
      <div class="header-left">
        <div class="brand-block" @click="viewMode='home'">
          <img class="brand-logo" src="/brand-logo.svg" alt="公司 Logo" />
          <div class="brand-sub">让每一个经营决策，都先在未来发生一次。</div>
        </div>
      </div>
      <div class="header-center">
        <div class="view-switcher">
          <button v-for="m in ['graph','split','workbench']" :key="m" class="switch-btn" :class="{active: viewMode===m}" @click="viewMode=m">
            {{ {graph:'图谱', split:'分屏', workbench:'工作台'}[m] }}
          </button>
        </div>
      </div>
      <div class="header-right" v-if="viewMode!=='home'">
        <span class="status-indicator" :class="statusClass"><span class="dot"></span>{{ statusText }}</span>
        <button class="comparison-btn" v-if="store.comparison.baseline && store.comparison.withAssumptions" :class="{ active: comparisonMode }" @click="comparisonMode = !comparisonMode" title="对比模式：基线 vs 干预">
          ⚖ 对比
        </button>
        <div class="step-divider"></div>
        <div class="workflow-step">
          <span class="step-num-h">Step {{ currentStep }}/4</span>
          <span class="step-name-h">{{ stepName }}</span>
        </div>
      </div>
    </header>

    <main class="content-area">
      <HomeView v-if="viewMode==='home'" @enter="viewMode='split'" @demo="runDemoSequence" />
      <template v-else>
      <div class="panel-wrapper left" :style="leftStyle">
        <GraphPanel @chat="onChatFromGraph" />
      </div>
      <div class="panel-wrapper right" :style="rightStyle">
        <div class="workbench-panel">
          <div class="scroll-container">

            <div class="stats-grid" v-if="store.entities.length">
              <div class="stat-card"><span class="stat-value">{{ store.entities.length }}</span><span class="stat-label">实体</span></div>
              <div class="stat-card"><span class="stat-value">{{ store.edges.length }}</span><span class="stat-label">关系</span></div>
              <div class="stat-card"><span class="stat-value">{{ store.growth.length - 1 }}</span><span class="stat-label">轮次</span></div>
            </div>

            <!-- Phase: WHAT IF -->
            <div class="phase-title"><span class="phase-en">WHAT IF</span><span class="phase-cn">构建世界</span></div>
            <!-- Step 1 -->
            <div class="step-card" :class="{ active: store.ui.b1 === 'processing', completed: store.ui.b1 === 'success' }">
              <div class="card-header" @click="toggleStep(1)">
                <span class="step-collapse-icon">{{ collapsedSteps.has(1) ? "▸" : "▾" }}</span>
                <span class="badge" :class="store.ui.b1" @click.stop="toggleStep(1)">{{ badgeText(store.ui.b1) }}</span>
              </div>
              <div v-show="!collapsedSteps.has(1)">
                <div class="input-wrapper"><textarea class="code-input" v-model="store.seed" :placeholder="'例：' + (store.scenario.seedExamples?.[0] || '描述你的场景…')"></textarea></div>
                <div class="preset-row">
                  <button v-for="p in store.scenario.seedExamples" :key="p" class="preset-btn" @click="store.seed = p">{{ p.slice(0,10) }}…</button>
                </div>
                <div class="assumption-box">
                  <div class="assumption-label">假设事件 <span class="assumption-hint">世界设定的前提，会注入抽取与整个推演</span></div>
                  <div class="assumption-input-row">
                    <input class="assumption-input" v-model="assumptionInput" placeholder="如：竞品新店开业大促 / 阴雨一周" @keyup.enter="addAssumption" />
                    <button class="btn-secondary" @click="addAssumption" :disabled="!assumptionInput.trim()">添加</button>
                  </div>
                  <div class="assumption-tags" v-if="store.assumptions.length">
                    <span class="assumption-tag" v-for="a in store.assumptions" :key="a.id">
                      {{ a.text }}<span class="assumption-del" @click="removeAssumption(a.id)">×</span>
                    </span>
                  </div>
                </div>
                <div class="slider-row"><span class="lab">实体数量</span><input type="range" min="4" max="999" v-model.number="store.entN" /><span class="val">{{ store.entN }}</span></div>
                <button class="start-engine-btn" @click="genEntities" :disabled="store.ui.genRunning">
                  <span>{{ store.ui.genRunning ? '生成中…' : '生成实体' }}</span><span>→</span>
                </button>
                <div style="text-align:center;margin-top:8px">
                  <button class="btn-secondary" @click="loadDemo">加载示例</button>
                  <button v-if="store.ui.step1Done" class="btn-secondary" style="margin-left:6px" @click="enrichProfiles" :disabled="store.ui.enrichRunning">
                    {{ store.ui.enrichRunning ? '丰富中…' : '✨ 画像丰富' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- WHAT IF 输出：实体标签紧随世界构建 -->
            <div class="tags-container tags-container--phase" v-if="store.entities.length">
              <span class="tag-label">GENERATED ENTITIES ({{ store.entities.length }}) <span class="tag-hint" v-if="store.lockedIds.length">已锁定 {{ store.lockedIds.length }} 个主角常驻</span></span>
              <div class="tags-list">
                <span class="entity-tag" :class="{ locked: store.lockedIds.includes(e.id) }" v-for="e in store.entities" :key="e.id" @click="showNode(e)">{{ e.name }}<span class="t">{{ e.type }}</span><span class="lock-toggle" :class="{ on: store.lockedIds.includes(e.id) }" @click.stop="toggleLock(e.id)" :title="store.lockedIds.includes(e.id) ? '取消锁定' : '锁定为常驻主角'">{{ store.lockedIds.includes(e.id) ? '🔒' : '◌' }}</span></span>
              </div>
            </div>

            <!-- Phase: SIMULATE -->
            <div class="phase-title"><span class="phase-en">SIMULATE</span><span class="phase-cn">自生长推演</span></div>
            <!-- Step 2 -->
            <div class="step-card" :class="{ active: store.ui.b2 === 'processing', completed: store.ui.b2 === 'success' }">
              <div class="card-header" @click="toggleStep(2)">
                <span class="step-collapse-icon">{{ collapsedSteps.has(2) ? "▸" : "▾" }}</span>
                <span class="badge" :class="store.ui.b2" @click.stop="toggleStep(2)">{{ badgeText(store.ui.b2) }}</span>
              </div>
              <div v-show="!collapsedSteps.has(2)">
                <div class="slider-row"><span class="lab">推演轮数</span><input type="range" min="1" max="200" v-model.number="store.rounds" /><span class="val">{{ store.rounds }}</span></div>
                <div class="slider-row"><span class="lab">每轮焦点数</span><input type="range" min="1" max="200" v-model.number="store.perR" /><span class="val">{{ store.perR }}</span></div>
                <button class="start-engine-btn" @click="runSim" :disabled="store.ui.simRunning || !store.ui.step1Done">
                  <span>{{ store.ui.simRunning ? '推演中…' : '启动推演' }}</span><span>→</span>
                </button>
                <button v-if="store.assumptions.length && store.ui.step1Done" class="btn-secondary" style="display:block;margin:8px auto 0" @click="runComparison" :disabled="store.ui.simRunning">
                  ⚖ 对比推演（基线 vs 假设）
                </button>
                <div class="activity-feed" v-if="store.activityFeed.length || store.ui.simRunning">
                  <div class="activity-header">
                    <span>世界动态 · 实时</span>
                    <span class="activity-progress" v-if="store.ui.simRunning || store.simRound > 0">R{{ store.simRound || 0 }}/{{ store.rounds }}</span>
                  </div>
                  <div class="activity-list" ref="activityRef">
                    <div v-if="!store.activityFeed.length" class="activity-empty">推演启动后，每个 agent 的动作会实时出现在这里…</div>
                    <div v-for="(a, i) in store.activityFeed" :key="i" class="activity-item" :class="a.kind">
                      <span class="activity-round">R{{ a.round }}</span>
                      <span class="activity-dot"></span>
                      <span class="activity-text">{{ a.text }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SIMULATE 输出：增长曲线紧随推演 -->
            <div class="growth-panel growth-panel--phase" v-if="store.growth.length > 1"><GrowthPanel /></div>

            <!-- Phase: OBSERVE -->
            <div class="phase-title"><span class="phase-en">OBSERVE</span><span class="phase-cn">决策报告</span></div>
            <!-- Step 3 -->
            <div class="step-card" :class="{ active: store.ui.b3 === 'processing', completed: store.ui.b3 === 'success' }">
              <div class="card-header" @click="toggleStep(3)">
                <span class="step-collapse-icon">{{ collapsedSteps.has(3) ? "▸" : "▾" }}</span>
                <span class="badge" :class="store.ui.b3" @click.stop="toggleStep(3)">{{ badgeText(store.ui.b3) }}</span>
              </div>
              <div v-show="!collapsedSteps.has(3)">
                <button class="start-engine-btn" @click="genReportStream" :disabled="store.ui.reportRunning || !store.entities.length">
                  <span>{{ store.ui.reportRunning ? '生成中…' : '生成报告' }}</span><span>→</span>
                </button>
              </div>
            </div>

            <!-- OBSERVE 输出层：主报告 + 证据 + 追问 -->
            <div class="observe-results" v-if="store.reportOutline || store.report || store.analysis.messages.length || store.causalChains.length || store.decisions.length || store.conflicts.length || store.communities.length">
              <div class="observe-results-header">
                <div>
                  <span class="observe-kicker">OBSERVE OUTPUT</span>
                  <strong>报告与决策证据</strong>
                </div>
                <span class="observe-status" :class="store.ui.b3">{{ store.ui.b3 === 'success' ? 'READY' : store.ui.b3 === 'processing' ? 'BUILDING' : 'PENDING' }}</span>
              </div>

              <!-- Report (streaming sections) -->
              <div class="report-card report-card--primary" v-if="store.reportOutline">
              <h3>{{ store.reportOutline.title }}</h3>
              <p style="font-size:12px;color:#999;margin-bottom:12px">{{ store.reportOutline.summary }}</p>
              <div v-for="(s, i) in store.reportOutline.sections || []" :key="i" class="report-section-item">
                <div class="section-header-row" @click="toggleSection(i)">
                  <span class="section-number">{{ String(i+1).padStart(2,'0') }}</span>
                  <span class="section-title-text">{{ s.title }}</span>
                  <span class="badge" :class="store.reportSections[i]?.status === 'done' ? 'success' : 'processing'" v-if="store.reportSections[i]">
                    {{ store.reportSections[i]?.status === 'done' ? '✓' : '…' }}
                  </span>
                </div>
                <div class="section-body" v-show="!collapsedSections.has(i)">
                  <div v-if="store.reportSections[i]?.content" class="section-content" v-html="renderMarkdown(store.reportSections[i].content)"></div>
                  <div v-else class="loading-state"><span>生成中…</span></div>
                </div>
              </div>

            </div>

            <!-- 全局解读：报告完成后可继续追问 -->
            <div class="observe-subsection-label">全局解读 · ASK THE ANALYST</div>
            <div class="report-card analysis-card" v-if="store.report || store.analysis.messages.length">
              <h3>追问全局分析师 <span class="analysis-hint">问整体局势，而非单个角色</span></h3>
              <div class="analysis-messages" ref="analysisRef">
                <div v-if="!store.analysis.messages.length" class="analysis-empty">报告已就绪。问它整体局势，如「为什么客流掉了？」「竞品降价会传导到哪里？」</div>
                <div v-for="(m, i) in store.analysis.messages" :key="i" class="analysis-msg" :class="m.role">
                  <span class="analysis-role">{{ m.role === 'user' ? '我' : '分析师' }}</span>
                  <span class="analysis-text">{{ m.content }}</span>
                </div>
                <div v-if="store.analysis.running" class="analysis-msg assistant"><span class="analysis-role">分析师</span><span class="analysis-text">分析中…</span></div>
              </div>
              <div class="analysis-input-row">
                <input class="chat-input" v-model="analysisInput" placeholder="追问整体局势…" @keyup.enter="sendAnalysis" :disabled="store.analysis.running" />
                <button class="btn-secondary" @click="sendAnalysis" :disabled="store.analysis.running || !analysisInput.trim()">追问</button>
              </div>
            </div>

            <div class="observe-evidence-label">证据与行动 · EVIDENCE & ACTION</div>
            <div class="observe-evidence-grid">

                        <!-- Feature 3: Causal Chains -->
            <div class="report-card" v-if="store.causalChains.length">
              <h3>因果链分析</h3>
              <div v-for="(chain, i) in store.causalChains" :key="i" class="causal-chain-item" @click="highlightCausalChain(i)">
                <div class="causal-chain-path">
                  <span v-for="(id, j) in chain.path" :key="j" class="chain-node">
                    {{ entityName(id) }}
                    <span v-if="j < chain.path.length - 1" class="chain-arrow">→</span>
                  </span>
                </div>
                <div class="causal-chain-effect">
                  <span class="badge" :class="chain.confidence >= 0.7 ? 'success' : 'processing'">{{ Math.round(chain.confidence * 100) }}%</span>
                  {{ chain.effect }}
                </div>
              </div>
            </div>

            <!-- Feature 2: Decisions -->
            <div class="report-card" v-if="store.decisions.length">
              <h3>决策建议</h3>
              <div v-for="(d, i) in store.decisions" :key="i" class="decision-item">
                <div class="decision-header">
                  <span class="decision-id">{{ d.id }}</span>
                  <span class="decision-action">{{ d.action }}</span>
                  <span class="badge" :class="d.confidence >= 0.7 ? 'success' : 'processing'">{{ Math.round(d.confidence * 100) }}%</span>
                </div>
                <div class="decision-reasoning">{{ d.reasoning }}</div>
                <div class="decision-gain">预期：{{ d.expected_gain }}</div>
              </div>
            </div>

            <!-- Feature 1: Conflicts -->
            <div class="report-card" v-if="store.conflicts.length">
              <h3 style="color:#F44336">⚠ 冲突关系 ({{ store.conflicts.length }})</h3>
              <div v-for="(c, i) in store.conflicts" :key="i" class="conflict-item">
                <span class="conflict-rel">{{ c.rel1 }}</span>
                <span class="conflict-arrow">↔</span>
                <span class="conflict-rel">{{ c.rel2 }}</span>
                <span class="conflict-round">R{{ c.round1 }} vs R{{ c.round2 }}</span>
              </div>
            </div>

            <!-- Feature 5: Graph Analytics -->
            <div class="report-card" v-if="store.communities.length">
              <h3>图谱分析</h3>
              <div class="analytics-row">
                <span class="analytics-label">群体聚类</span>
                <span class="analytics-val">{{ store.communities.length }} 个</span>
              </div>
              <div v-for="(comm, i) in store.communities" :key="i" class="community-item">
                <span class="community-label">{{ comm.label }}</span>
                <span class="community-members">{{ comm.members.map(id => entityName(id)).join('、') }}</span>
              </div>
              <div class="analytics-row" v-if="store.bridgeNodes.length">
                <span class="analytics-label">桥节点</span>
                <span class="analytics-val">{{ store.bridgeNodes.map(id => entityName(id)).join('、') }}</span>
              </div>
            </div>
            </div>
            </div>
            <!-- Phase: INTERVIEW（常驻） -->
            <div class="phase-title phase-title--muted" v-if="store.ui.b2 === 'success'"><span class="phase-en">INTERVIEW</span><span class="phase-cn">随时问节点</span></div>
            <!-- Step 4: Interview 节点（与任意 agent 对话） -->
            <div class="step-card" :class="{ active: store.chat.running, completed: store.chat.messages.length > 0 }" v-if="store.ui.b2 === 'success'">
              <div class="card-header" @click="toggleStep(4)">
                <span class="step-collapse-icon">{{ collapsedSteps.has(4) ? "▸" : "▾" }}</span>
                <span class="badge" :class="store.chat.messages.length > 0 ? 'success' : 'pending'" @click.stop="toggleStep(4)">{{ store.chat.messages.length > 0 ? 'Active' : 'Pending' }}</span>
              </div>
              <div v-show="!collapsedSteps.has(4)">
                <div v-if="!store.chat.target" class="entity-chat-select">
                  <span class="tag-label">选择对话实体</span>
                  <div class="tags-list">
                    <span class="entity-tag" v-for="e in store.entities" :key="e.id" @click="startChat(e.id)" style="cursor:pointer">
                      {{ e.name }}<span class="t">{{ e.type }}</span>
                    </span>
                  </div>
                </div>
                <div v-else class="chat-panel">
                  <div class="chat-header">
                    <span>💬 与「{{ chatTargetName }}」对话</span>
                    <button class="detail-close" @click="endChat">×</button>
                  </div>
                  <div class="chat-messages" ref="chatRef">
                    <div v-for="(m, i) in store.chat.messages" :key="i" class="chat-msg" :class="m.role">
                      <span class="chat-role">{{ m.role === 'user' ? '我' : chatTargetName }}</span>
                      <span class="chat-text">{{ m.content }}</span>
                    </div>
                    <div v-if="store.chat.running" class="chat-msg assistant"><span class="chat-role">{{ chatTargetName }}</span><span class="chat-text">思考中…</span></div>
                  </div>
                  <div class="chat-input-row">
                    <input class="chat-input" v-model="chatInput" placeholder="输入问题…" @keyup.enter="sendChat" :disabled="store.chat.running" />
                    <button class="btn-secondary" @click="sendChat" :disabled="store.chat.running || !chatInput.trim()">发送</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="section-divider"><span class="section-divider-label">SYSTEM / PERSISTENCE</span></div>

            <!-- 对比摘要 -->
            <div class="report-card comparison-summary" v-if="comparisonMode && store.comparison.baseline && store.comparison.withAssumptions">
              <h3>⚖ 对比推演结果</h3>
              <div class="comparison-grid">
                <div class="comparison-col">
                  <span class="comparison-label">基线（无假设）</span>
                  <span class="comparison-stat">{{ store.comparison.baseline.entities.length }} 实体 / {{ store.comparison.baseline.edges.length }} 关系</span>
                </div>
                <div class="comparison-col">
                  <span class="comparison-label">干预（带假设）</span>
                  <span class="comparison-stat">{{ store.comparison.withAssumptions.entities.length }} 实体 / {{ store.comparison.withAssumptions.edges.length }} 关系</span>
                </div>
              </div>
              <div class="comparison-kpi-diff" v-if="store.comparison.baseline.kpiCurves && store.comparison.withAssumptions.kpiCurves">
                <span class="kpi-diff-title">KPI 差异：</span>
                <span v-for="kpi in Object.keys(store.comparison.withAssumptions.kpiCurves)" :key="kpi" class="kpi-diff-item">
                  {{ kpi }}：
                  {{ lastKpiVal(store.comparison.baseline.kpiCurves[kpi])?.toFixed(2) || '?' }}
                  →
                  <span :class="kpiDiffClass(kpi)">{{ lastKpiVal(store.comparison.withAssumptions.kpiCurves[kpi])?.toFixed(2) || '?' }}</span>
                </span>
              </div>
            </div>

            <!-- Terminal -->
            <div class="terminal-section">
              <div class="terminal-header"><span>◆ SYSTEM LOG</span></div>
              <div class="terminal" ref="termRef">
                <div class="ln" v-for="(l,i) in store.logs" :key="i"><span class="ts">{{ l.t }}</span><span class="msg" :class="l.cls">{{ l.msg }}</span></div>
                <div class="ln" v-if="!store.logs.length"><span class="msg" style="color:#555">等待操作…</span></div>
              </div>
            </div>

            <div class="hist-card" v-if="history.length">
              <h3>已保存推演</h3>
              <div class="hist-list">
                <div class="hist-item" v-for="h in history" :key="h.id" @click="loadExperiment(h.id)">
                  <span class="nm">{{ h.name }}</span>
                  <span class="meta">{{ h.createdAt?.slice(0,16).replace('T',' ') }}</span>
                  <span class="meta">{{ h.nodes }}N/{{ h.edges }}E</span>
                </div>
              </div>
            </div>

            <div style="margin-top:16px;text-align:center" v-if="store.entities.length">
              <button class="btn-secondary" @click="saveExperiment">保存推演</button>
            </div>

          </div>
        </div>
      </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { store, pushLog, resetWorld, toggleLock } from './store/sim';
import { genEntities, runSim, enrichProfiles, interactWith, startChat, endChat, genOutline, genSection, retrievalText, analystSystemPrompt } from './engine/simulate';
import { loadDemo } from './engine/synthetic';
import { fetchHealth, streamChat } from './services/llm';
import { api } from './api/client';
import HomeView from './components/HomeView.vue';
import GraphPanel from './components/GraphPanel.vue';
import GrowthPanel from './components/GrowthPanel.vue';

const viewMode = ref('home');
const health = reactive({ ok: false, model: '', keyConfigured: false, baseURL: '' });
const history = reactive([]);
const termRef = ref(null);
const chatRef = ref(null);
const chatInput = ref('');
const assumptionInput = ref('');
const analysisInput = ref('');
const analysisRef = ref(null);
const activityRef = ref(null);
const collapsedSections = ref(new Set());
const collapsedSteps = ref(new Set());
const comparisonMode = ref(false);

const leftStyle = computed(() => viewMode.value === 'graph' ? { width: '100%', opacity: 1 } : viewMode.value === 'workbench' ? { width: '0%', opacity: 0 } : { width: '50%', opacity: 1 });
const rightStyle = computed(() => viewMode.value === 'workbench' ? { width: '100%', opacity: 1 } : viewMode.value === 'graph' ? { width: '0%', opacity: 0 } : { width: '50%', opacity: 1 });

const currentStep = computed(() => {
  if (store.ui.b3 === 'success' || store.ui.b3 === 'processing') return 4;
  if (store.ui.b2 === 'success' || store.ui.b2 === 'processing') return 3;
  if (store.ui.b1 === 'success' || store.ui.b1 === 'processing') return 2;
  return 1;
});
const stepName = computed(() => ({ 1: '构建世界', 2: '自生长推演', 3: '决策报告', 4: '深度互动' }[currentStep.value] || ''));
const statusClass = computed(() => (store.ui.genRunning || store.ui.simRunning || store.ui.reportRunning || store.chat.running) ? 'processing' : 'ready');
const statusText = computed(() => (store.ui.genRunning || store.ui.simRunning || store.ui.reportRunning || store.chat.running) ? 'Processing' : 'Ready');
const chatTargetName = computed(() => store.entities.find(e => e.id === store.chat.target)?.name || '');

function graphSummary() {
  return '实体：' + store.entities.map(e => e.name + '(' + e.type + ')').join('、') +
    '\n关系：' + store.edges.slice(0, 80).map(x => {
      const s = store.entities.find(y => y.id === x.source); const t = store.entities.find(y => y.id === x.target);
      return (s ? s.name : x.source) + '→' + (t ? t.name : x.target) + ':' + (x.relation || '') + (x.round ? '(R' + x.round + ')' : '');
    }).join('；');
}

// 真流式报告：大纲一次性取，章节逐个用 SSE 逐 token 渲染
async function genReportStream() {
  if (!store.entities.length) { pushLog('请先推演', 'err'); return; }
  store.ui.reportRunning = true;
  store.ui.b3 = 'processing';
  store.reportOutline = null; store.reportSections = {}; store.report = null;
  store.causalChains = []; store.decisions = [];
  const summary = graphSummary();
  const evidence = retrievalText();
  try {
    pushLog('报告规划中…（先检索图谱证据）', 'ac');
    const outline = await genOutline(evidence);
    store.reportOutline = outline;
    pushLog(`报告大纲：${outline.sections?.length || 0} 章节`, 'ac');
    const sections = outline.sections || [];
    const doneContents = [];
    for (let i = 0; i < sections.length; i++) {
      store.reportSections[i] = { content: '', status: 'generating' };
      pushLog(`流式生成章节 ${i + 1}/${sections.length}：${sections[i].title}…`, 'ac');
      const sectionSummary = summary + '\n\n' + evidence + '\n\n已有章节：' + doneContents.map(s => s.slice(0, 100)).join('；');
      const content = await streamChat(
        [{ role: 'system', content: '你是' + store.scenario.domain + '决策分析师。撰写指定章节，Markdown，80-150字。' },
         { role: 'user', content: `报告标题：${outline.title || ''}\n当前章节：${sections[i].title}\n推演数据：\n${sectionSummary}\n\n请撰写本章节内容。` }],
        { temperature: 0.6, max_tokens: 1500, onToken: (delta, acc) => { store.reportSections[i] = { content: acc, status: 'generating' }; } }
      );
      doneContents.push(content || '（生成失败）');
      store.reportSections[i] = { content: content || '（生成失败）', status: 'done' };
      pushLog(`✓ 章节 ${i + 1} 完成`, 'ok');
    }
    store.causalChains = await extractCausalChains(summary);
    store.decisions = await extractDecisions(summary);
    const allContent = sections.map((s, i) => `## ${s.title}\n${store.reportSections[i]?.content || ''}`).join('\n\n');
    store.report = { verdict: outline.summary || outline.title, confidence: 0.5, confidence_note: '多章节 ReACT 报告（流式）', fullContent: allContent };
    store.ui.b3 = 'success'; store.ui.b4 = 'pending';
    pushLog('✓ 决策报告已生成（流式）', 'ok');
  } catch (err) {
    store.ui.b3 = 'pending'; pushLog('报告生成失败：' + err.message, 'err');
  } finally {
    store.ui.reportRunning = false;
  }
}

async function extractCausalChains(summary) {
  try {
    const { data } = await api.post('/api/chat', { messages: [{ role: 'system', content: '你是' + store.scenario.domain + '因果分析专家。输出JSON。' }, { role: 'user', content: '推演终态：\n' + summary + '\n\n提取3-5条因果链。输出JSON：{"chains":[{"path":["实体名1","实体名2"],"relations":["关系1"],"effect":"最终影响","confidence":0.0-1.0}]}' }], json: true, temperature: 0.4, max_tokens: 1000 });
    return (data.chains || []).map(c => ({ ...c, path: (c.path || []).map(name => { const e = store.entities.find(x => x.name === name); return e ? e.id : null; }).filter(Boolean) }));
  } catch (e) { pushLog('因果链提取失败：' + e.message, 'err'); return []; }
}
async function extractDecisions(summary) {
  try {
    const { data } = await api.post('/api/chat', { messages: [{ role: 'system', content: '你是' + store.scenario.domain + '决策顾问。输出JSON。' }, { role: 'user', content: '推演终态：\n' + summary + '\n\n生成3-5条决策建议。输出JSON：{"decisions":[{"id":"d1","action":"具体行动","reasoning":"理由","expected_gain":"预期增益","confidence":0.0-1.0}]}' }], json: true, temperature: 0.5, max_tokens: 1000 });
    return (data.decisions || []).map((d, i) => ({ ...d, id: d.id || 'd' + (i + 1), status: 'proposed' }));
  } catch (e) { pushLog('决策提取失败：' + e.message, 'err'); return []; }
}

function badgeText(s) { return s === 'processing' ? 'Running' : s === 'success' ? 'Done' : 'Pending'; }

// WHAT IF：假设事件管理
function addAssumption() {
  const t = assumptionInput.value.trim();
  if (!t) return;
  store.assumptions.push({ id: 'asm' + Date.now(), text: t });
  assumptionInput.value = '';
}
function removeAssumption(id) {
  store.assumptions = store.assumptions.filter(a => a.id !== id);
}

function toggleStep(num) {
  const s = new Set(collapsedSteps.value);
  if (s.has(num)) s.delete(num); else s.add(num);
  collapsedSteps.value = s;
}
function toggleSection(i) {
  const s = new Set(collapsedSections.value);
  if (s.has(i)) s.delete(i); else s.add(i);
  collapsedSections.value = s;
}

function renderMarkdown(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

function showNode(e) {
  const neighbors = store.edges.filter(x => x.source === e.id || x.target === e.id).map(x => {
    const o = store.entities.find(y => y.id === (x.source === e.id ? x.target : x.source));
    return o ? { name: o.name, relation: x.relation } : null;
  }).filter(Boolean);
  store.nodeInfo = `<b>${e.name}</b> [${e.type}]<br>人格：${e.persona||'—'}<br>目标：${e.goal||'—'}<br>关联(${neighbors.length})`;
}

function onChatFromGraph(node) { startChat(node.id); }
function entityName(id) { return store.entities.find(e => e.id === id)?.name || id; }
function highlightCausalChain(idx) {
  store.causalChains.forEach((c, i) => { c._highlight = (i === idx) ? !c._highlight : false; });
}

// 对比模式辅助函数
function lastKpiVal(curve) {
  if (!curve || !curve.length) return null;
  return curve[curve.length - 1].value;
}
function kpiDiffClass(kpi) {
  const b = lastKpiVal(store.comparison.baseline?.kpiCurves?.[kpi]);
  const w = lastKpiVal(store.comparison.withAssumptions?.kpiCurves?.[kpi]);
  if (b == null || w == null) return '';
  return w > b ? 'kpi-up' : w < b ? 'kpi-down' : '';
}

async function sendChat() {
  if (!chatInput.value.trim() || store.chat.running) return;
  const msg = chatInput.value.trim();
  chatInput.value = '';
  await interactWithStream(store.chat.target, msg);
  await nextTick();
  if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight;
}

// Interview 真流式：以 agent 身份逐 token 回复
async function interactWithStream(entityId, userMessage) {
  const e = store.entities.find(x => x.id === entityId);
  if (!e) { pushLog('未找到实体', 'err'); return; }
  store.chat.running = true;
  store.chat.target = entityId;
  store.chat.messages.push({ role: 'user', content: userMessage });
  const eps = (store.episodes[entityId] || []).map(ep => '[R' + ep.round + '] ' + ep.text).join('\n');
  const isPerson = !store.scenario.objectTypes?.includes(e.type) && (store.scenario.personKeywords || []).some(k => e.type.includes(k));
  const sysContent = isPerson
    ? `你现在是「${e.name}」，一个${e.type} agent，处于${store.scenario.domain}推演世界中行动。\n人格：${e.persona || '—'}\n目标：${e.goal || '—'}${e.bio ? '\n背景：' + e.bio : ''}${e.traits ? '\n特征：' + e.traits.join('、') : ''}\n\n经历：\n${eps}\n\n请以该角色身份回答，保持角色一致。`
    : `你现在是「${e.name}」，一个${e.type}实体，处于${store.scenario.domain}世界。\n描述：${e.persona || '—'}\n作用：${e.goal || '—'}${e.specs ? '\n规格：' + e.specs : ''}\n\n变化：\n${eps}\n\n请以该实体视角回答。`;
  try {
    // 先 push 一个空的 assistant 占位，逐 token 填充
    store.chat.messages.push({ role: 'assistant', content: '' });
    const acc = await streamChat([{ role: 'system', content: sysContent }, ...store.chat.messages.slice(-9).map(m => ({ role: m.role, content: m.content }))], {
      temperature: 0.8, max_tokens: 800,
      onToken: (delta, full) => { store.chat.messages[store.chat.messages.length - 1].content = full; },
    });
    if (!acc) store.chat.messages[store.chat.messages.length - 1].content = '（无回复）';
    pushLog('Interview「' + e.name + '」完成', 'ac');
  } catch (err) {
    store.chat.messages.push({ role: 'assistant', content: '交互失败：' + err.message });
    pushLog('交互失败：' + err.message, 'err');
  } finally {
    store.chat.running = false;
  }
}

// Interview 元层：追问全局分析师（真流式）
async function sendAnalysis() {
  if (!analysisInput.value.trim() || store.analysis.running) return;
  const msg = analysisInput.value.trim();
  analysisInput.value = '';
  await interactWithAnalyst(msg);
  await nextTick();
  if (analysisRef.value) analysisRef.value.scrollTop = analysisRef.value.scrollHeight;
}

async function interactWithAnalyst(userMessage) {
  store.analysis.running = true;
  store.analysis.messages.push({ role: 'user', content: userMessage });
  const sysContent = analystSystemPrompt();
  try {
    store.analysis.messages.push({ role: 'assistant', content: '' });
    const acc = await streamChat([{ role: 'system', content: sysContent }, ...store.analysis.messages.slice(-9).map(m => ({ role: m.role, content: m.content }))], {
      temperature: 0.6, max_tokens: 900,
      onToken: (delta, full) => { store.analysis.messages[store.analysis.messages.length - 1].content = full; },
    });
    if (!acc) store.analysis.messages[store.analysis.messages.length - 1].content = '（无回复）';
    pushLog('分析师回答完成', 'ac');
  } catch (err) {
    store.analysis.messages.push({ role: 'assistant', content: '分析失败：' + err.message });
    pushLog('分析失败：' + err.message, 'err');
  } finally {
    store.analysis.running = false;
  }
}

async function refreshHealth() { try { Object.assign(health, await fetchHealth()); } catch (e) { pushLog('后端未连接：' + e.message, 'err'); } }
async function refreshHistory() { try { const { data } = await api.get('/api/experiments'); history.splice(0, history.length, ...data); } catch (e) {} }

// 对比模拟：同时运行基线（无假设）和干预（带假设）
async function runComparison() {
  if (!store.ui.step1Done) { pushLog('请先生成实体', 'err'); return; }
  store.comparison.active = true;
  pushLog('▶ 对比模式：先跑基线（无假设），再跑干预（带假设）', 'ac');

  // 保存当前状态
  const savedAssumptions = [...store.assumptions];
  const savedEntities = store.entities.map(e => ({ ...e }));
  const savedEdges = store.edges.map(e => ({ ...e }));
  const savedEpisodes = JSON.parse(JSON.stringify(store.episodes));

  // 基线：无假设
  store.assumptions = [];
  store.entities = savedEntities.map(e => ({ ...e }));
  store.edges = savedEdges.map(e => ({ ...e }));
  store.episodes = JSON.parse(JSON.stringify(savedEpisodes));
  store.activityFeed = [];
  store.kpiCurves = {};
  store.growth = [{ round: 0, nodes: store.entities.length, edges: store.edges.length }];
  await runSim();
  store.comparison.baseline = {
    entities: store.entities.map(e => ({ ...e })),
    edges: store.edges.map(e => ({ ...e })),
    growth: [...store.growth],
    kpiCurves: JSON.parse(JSON.stringify(store.kpiCurves)),
    report: store.report ? { ...store.report } : null,
  };

  // 干预：带假设
  store.assumptions = [...savedAssumptions];
  store.entities = savedEntities.map(e => ({ ...e }));
  store.edges = savedEdges.map(e => ({ ...e }));
  store.episodes = JSON.parse(JSON.stringify(savedEpisodes));
  store.activityFeed = [];
  store.kpiCurves = {};
  store.growth = [{ round: 0, nodes: store.entities.length, edges: store.edges.length }];
  store.ui.b2 = 'pending';
  await runSim();
  store.comparison.withAssumptions = {
    entities: store.entities.map(e => ({ ...e })),
    edges: store.edges.map(e => ({ ...e })),
    growth: [...store.growth],
    kpiCurves: JSON.parse(JSON.stringify(store.kpiCurves)),
    report: store.report ? { ...store.report } : null,
  };

  comparisonMode.value = true;
  pushLog('✓ 对比模拟完成：切换到对比视图查看差异', 'ok');
}

// 一键演示流程
async function runDemoSequence() {
  viewMode.value = 'split';
  await nextTick();
  loadDemo();
  pushLog('🎬 演示模式：自动展示推演全流程', 'ac');
  // 延迟让各阶段UI逐步展示
  await new Promise(r => setTimeout(r, 1200));
  // 展开各阶段
  collapsedSteps.value = new Set();
  await new Promise(r => setTimeout(r, 800));
  // 展示报告区
  if (store.report) {
    collapsedSections.value = new Set();
    pushLog('📊 报告已就绪，可以追问全局分析师', 'ac');
  }
  await new Promise(r => setTimeout(r, 600));
  // 自动打开与价格敏感客群的对话
  const demoNode = store.entities.find(e => e.id === 'price_sensitive');
  if (demoNode) {
    startChat(demoNode.id);
    pushLog('💬 已自动打开与「价格敏感客群」的访谈对话', 'ac');
  }
}

async function saveExperiment() {
  if (!store.entities.length) return;
  try {
    const { data } = await api.post('/api/experiment', { name: store.seed.slice(0,20) || '未命名', state: { entities: store.entities, edges: store.edges, growth: store.growth, report: store.report, episodes: store.episodes, reportOutline: store.reportOutline, reportSections: store.reportSections } });
    pushLog('已保存推演：' + data.id, 'ok'); refreshHistory();
  } catch (e) { pushLog('保存失败：' + e.message, 'err'); }
}
async function loadExperiment(id) {
  try {
    const { data } = await api.get('/api/experiment/' + id);
    if (data.state) {
      store.entities = data.state.entities || []; store.edges = data.state.edges || [];
      store.growth = data.state.growth || []; store.report = data.state.report || null;
      store.episodes = data.state.episodes || {}; store.reportOutline = data.state.reportOutline || null;
      store.reportSections = data.state.reportSections || {};
      store.ui.b1 = 'success'; store.ui.b2 = 'success'; store.ui.b3 = store.report ? 'success' : 'pending'; store.ui.step1Done = true;
      pushLog('回看推演：' + data.name, 'ac');
    }
  } catch (e) { pushLog('加载失败：' + e.message, 'err'); }
}

watch(() => store.logs.length, async () => { await nextTick(); if (termRef.value) termRef.value.scrollTop = termRef.value.scrollHeight; });
watch(() => store.chat.messages.length, async () => { await nextTick(); if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight; });
watch(() => store.analysis.messages.length, async () => { await nextTick(); if (analysisRef.value) analysisRef.value.scrollTop = analysisRef.value.scrollHeight; });
watch(() => store.activityFeed.length, async () => { await nextTick(); if (activityRef.value) activityRef.value.scrollTop = activityRef.value.scrollHeight; });
onMounted(() => { refreshHealth(); refreshHistory(); });
</script>