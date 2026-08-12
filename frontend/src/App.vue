<template>
  <div class="app">
    <header class="app-header">
      <div class="header-left"><div class="brand">GOD-VIEW<span class="dot"> · </span>SANDBOX</div></div>
      <div class="header-center">
        <div class="view-switcher">
          <button v-for="m in ['graph','split','workbench']" :key="m" class="switch-btn" :class="{active: viewMode===m}" @click="viewMode=m">
            {{ {graph:'图谱', split:'分屏', workbench:'工作台'}[m] }}
          </button>
        </div>
      </div>
      <div class="header-right">
        <span class="status-indicator" :class="statusClass"><span class="dot"></span>{{ statusText }}</span>
        <div class="step-divider"></div>
        <div class="workflow-step">
          <span class="step-num-h">Step {{ currentStep }}/4</span>
          <span class="step-name-h">{{ stepName }}</span>
        </div>
      </div>
    </header>

    <main class="content-area">
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

            <!-- Step 1 -->
            <div class="step-card" :class="{ active: store.ui.b1 === 'processing', completed: store.ui.b1 === 'success' }">
              <div class="card-header">
                <div class="step-info" @click="toggleStep(1)"><span class="step-num">01</span><span class="step-title">构建世界</span><span class="step-collapse-icon">{{ collapsedSteps.has(1) ? "▸" : "▾" }}</span></div>
                <span class="badge" :class="store.ui.b1" @click="toggleStep(1)">{{ badgeText(store.ui.b1) }}</span>
              </div>
              <div v-show="!collapsedSteps.has(1)">
                <p class="api-note">POST /api/chat → LLM 生成实体 + 自动推荐参数</p>
                <p class="description">输入经营场景，LLM 自动实例化实体并推荐推演参数。</p>
                <div class="input-wrapper"><textarea class="code-input" v-model="store.seed" placeholder="例：社区团购低价截流，本店客流下滑，如何应对？"></textarea></div>
                <div class="preset-row">
                  <button v-for="p in presets" :key="p" class="preset-btn" @click="store.seed = p">{{ p.slice(0,10) }}…</button>
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

            <!-- Step 2 -->
            <div class="step-card" :class="{ active: store.ui.b2 === 'processing', completed: store.ui.b2 === 'success' }">
              <div class="card-header">
                <div class="step-info" @click="toggleStep(2)"><span class="step-num">02</span><span class="step-title">自生长推演</span><span class="step-collapse-icon">{{ collapsedSteps.has(2) ? "▸" : "▾" }}</span></div>
                <span class="badge" :class="store.ui.b2" @click="toggleStep(2)">{{ badgeText(store.ui.b2) }}</span>
              </div>
              <div v-show="!collapsedSteps.has(2)">
                <p class="api-note">POST /api/chat → 多轮 LLM 交互 + 时序记忆 + 剧集记录</p>
                <p class="description">每轮选取焦点实体，基于人格行动，催生新关系/新实体。</p>
                <div class="slider-row"><span class="lab">推演轮数</span><input type="range" min="1" max="200" v-model.number="store.rounds" /><span class="val">{{ store.rounds }}</span></div>
                <div class="slider-row"><span class="lab">每轮焦点数</span><input type="range" min="1" max="200" v-model.number="store.perR" /><span class="val">{{ store.perR }}</span></div>
                <button class="start-engine-btn" @click="runSim" :disabled="store.ui.simRunning || !store.ui.step1Done">
                  <span>{{ store.ui.simRunning ? '推演中…' : '启动推演' }}</span><span>→</span>
                </button>
              </div>
            </div>

            <!-- Step 3 -->
            <div class="step-card" :class="{ active: store.ui.b3 === 'processing', completed: store.ui.b3 === 'success' }">
              <div class="card-header">
                <div class="step-info" @click="toggleStep(3)"><span class="step-num">03</span><span class="step-title">决策报告</span><span class="step-collapse-icon">{{ collapsedSteps.has(3) ? "▸" : "▾" }}</span></div>
                <span class="badge" :class="store.ui.b3" @click="toggleStep(3)">{{ badgeText(store.ui.b3) }}</span>
              </div>
              <div v-show="!collapsedSteps.has(3)">
                <p class="api-note">POST /api/chat → ReACT 多章节流式生成</p>
                <p class="description">先规划大纲，再逐章节生成，每章基于已有内容迭代。</p>
                <button class="start-engine-btn" @click="genReport" :disabled="store.ui.reportRunning || !store.entities.length">
                  <span>{{ store.ui.reportRunning ? '生成中…' : '生成报告' }}</span><span>→</span>
                </button>
              </div>
            </div>

            <!-- Report (streaming sections) -->
            <div class="report-card" v-if="store.reportOutline">
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

                        <!-- Feature 3: Causal Chains -->
            <div class="report-card" v-if="store.causalChains.length">
              <h3>因果链分析</h3>
              <p class="description" style="margin-bottom:10px">点击因果链在图谱中高亮路径</p>
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
<!-- Step 4: Deep Interaction -->
            <div class="step-card" :class="{ active: store.chat.running, completed: store.chat.messages.length > 0 }" v-if="store.ui.b2 === 'success'">
              <div class="card-header">
                <div class="step-info" @click="toggleStep(4)"><span class="step-num">04</span><span class="step-title">深度互动</span><span class="step-collapse-icon">{{ collapsedSteps.has(4) ? "▸" : "▾" }}</span></div>
                <span class="badge" :class="store.chat.messages.length > 0 ? 'success' : 'pending'" @click="toggleStep(4)">{{ store.chat.messages.length > 0 ? 'Active' : 'Pending' }}</span>
              </div>
              <div v-show="!collapsedSteps.has(4)">
                <p class="api-note">POST /api/chat → 角色扮演 LLM 对话</p>
                <p class="description">与推演世界中的任意实体对话。回答基于实体画像与推演中的行为记忆。</p>
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

            <!-- Entity tags -->
            <div class="tags-container" v-if="store.entities.length">
              <span class="tag-label">GENERATED ENTITIES ({{ store.entities.length }})</span>
              <div class="tags-list">
                <span class="entity-tag" v-for="e in store.entities" :key="e.id" @click="showNode(e)">{{ e.name }}<span class="t">{{ e.type }}</span></span>
              </div>
            </div>

            <div class="growth-panel" v-if="store.growth.length > 1"><GrowthPanel /></div>

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
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { store, pushLog, resetWorld } from './store/sim';
import { genEntities, runSim, genReport, enrichProfiles, interactWith, startChat, endChat } from './engine/simulate';
import { loadDemo } from './engine/synthetic';
import { fetchHealth } from './services/llm';
import { api } from './api/client';
import GraphPanel from './components/GraphPanel.vue';
import GrowthPanel from './components/GrowthPanel.vue';

const viewMode = ref('split');
const health = reactive({ ok: false, model: '', keyConfigured: false, baseURL: '' });
const history = reactive([]);
const termRef = ref(null);
const chatRef = ref(null);
const chatInput = ref('');
const collapsedSections = ref(new Set());
const collapsedSteps = ref(new Set());

const presets = [
  '社区团购低价截流，本店客流下滑，如何应对？',
  '连续阴雨一周，生鲜损耗加剧，怎样稳毛利？',
  '街角竞品开业大促，会员流失风险高',
  '总部下达GMV同比增长20%的硬指标',
];

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

function badgeText(s) { return s === 'processing' ? 'Running' : s === 'success' ? 'Done' : 'Pending'; }

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

async function sendChat() {
  if (!chatInput.value.trim() || store.chat.running) return;
  const msg = chatInput.value.trim();
  chatInput.value = '';
  await interactWith(store.chat.target, msg);
  await nextTick();
  if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight;
}

async function refreshHealth() { try { Object.assign(health, await fetchHealth()); } catch (e) { pushLog('后端未连接：' + e.message, 'err'); } }
async function refreshHistory() { try { const { data } = await api.get('/api/experiments'); history.splice(0, history.length, ...data); } catch (e) {} }
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
onMounted(() => { refreshHealth(); refreshHistory(); });
</script>