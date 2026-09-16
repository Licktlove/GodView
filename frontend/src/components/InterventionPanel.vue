<template>
  <teleport to="body">
    <div v-if="open" class="iv-mask" @click.self="close">
      <div class="iv-card" role="dialog" aria-label="人工介入">
        <div class="iv-header">
          <div>
            <span class="iv-kicker">HUMAN INTERVENTION</span>
            <strong class="iv-title">⚡ 人工介入 · {{ agent?.name || '—' }}</strong>
          </div>
          <button class="iv-close" @click="close" aria-label="关闭">×</button>
        </div>

        <div class="iv-body" v-if="agent">
          <div class="iv-block">
            <span class="iv-label">当前目标</span>
            <p class="iv-text">{{ agent.goal || '—' }}</p>
          </div>
          <div class="iv-block" v-if="agent._memory">
            <span class="iv-label">演化记忆（截至 R{{ agent._memory.lastRound }}）</span>
            <p class="iv-text">{{ agent._memory.summary }}</p>
          </div>
          <div class="iv-block" v-if="agent._anomaly">
            <span class="iv-label">触发异常</span>
            <p class="iv-text iv-anomaly" :style="{ borderColor: agent._anomalyColor || '#FF3B30' }">
              [{{ agent._anomalyTypeName }}] {{ agent._anomalyEvidence }}
            </p>
          </div>

          <div class="iv-block">
            <span class="iv-label">补充情报（将写入该 Agent 记忆，影响其后续决策）</span>
            <div class="iv-chips">
              <button v-for="c in quickChips" :key="c" class="iv-chip" @click="applyChip(c)">{{ c }}</button>
            </div>
            <textarea
              v-model="text"
              class="iv-input"
              rows="3"
              :placeholder="`例：供应商刚确认，${agent.name.replace(/^.*·/, '')}周五恢复到货`"
            ></textarea>
          </div>

          <div class="iv-hint" v-if="store.ui.simRunning">推演进行中：提交后请点「⏸ 暂停」再「▶ 继续推演」，情报即从下一轮生效。</div>
          <div class="iv-foot">
            <button class="iv-btn ghost" @click="close">取消</button>
            <button class="iv-btn primary" :disabled="!text.trim()" @click="commit">✓ 注入情报</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed } from 'vue';
import { store, pushLog, pushActivity, addEpisode } from '../store/sim';

const props = defineProps({ open: Boolean, nodeId: String });
const emit = defineEmits(['close']);

const text = ref('');
const open = computed(() => props.open);
const agent = computed(() => store.entities.find(e => e.id === props.nodeId) || null);

const quickChips = computed(() => {
  const n = agent.value?.name?.replace(/^.*·/, '') || '该商品';
  const role = agent.value?._anomalyType;
  if (role === 'stockout') return [
    `供应商确认：${n}周五恢复到货 200 件`,
    `${n}在途物流延误 3 天，先上架替代品`,
    `已核实：${n}并非断货，是总部停售`,
  ];
  if (role === 'losing_promo') return [
    `${n}改会员专享价，取消全场让利`,
    `${n}促销再打 3 天观察毛利`,
    `供应商愿意分摊 ${n}的促销费用`,
  ];
  return [
    `补充情报：${n}本周到货正常`,
    `补充情报：竞品已跟进同类促销`,
  ];
});

function applyChip(c) { text.value = c; }

function commit() {
  const t = text.value.trim();
  if (!t || !agent.value) return;
  const round = store.simRound || 0;
  addEpisode(agent.value.id, { round, text: `[人工介入] ${t}`, source: 'human' });
  pushActivity(round, agent.value.name, `人工介入情报注入：${t}`, 'iv');
  pushLog(`⚡ 人工介入 → ${agent.value.name}：${t}`, 'ok');
  text.value = '';
  emit('close');
}

function close() { emit('close'); }
</script>

<style scoped>
.iv-mask { position: fixed; inset: 0; background: rgba(10, 12, 20, 0.45); backdrop-filter: blur(2px); z-index: 200; display: flex; align-items: center; justify-content: center; }
.iv-card { width: min(480px, 92vw); max-height: 84vh; overflow: auto; background: #fff; border-radius: 14px; box-shadow: 0 18px 60px rgba(0,0,0,0.25); }
.iv-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #eceef2; }
.iv-kicker { display: block; font-size: 10px; letter-spacing: 2px; color: #8a8f98; font-weight: 700; }
.iv-title { font-size: 15px; color: #14161a; }
.iv-close { border: 0; background: none; font-size: 20px; color: #8a8f98; cursor: pointer; }
.iv-body { padding: 14px 18px 18px; }
.iv-block { margin-bottom: 12px; }
.iv-label { display: block; font-size: 11px; font-weight: 700; color: #6b7078; margin-bottom: 4px; }
.iv-text { margin: 0; font-size: 12.5px; line-height: 1.6; color: #2a2d33; }
.iv-anomaly { border-left: 3px solid #FF3B30; padding: 6px 10px; background: #fff5f4; border-radius: 0 6px 6px 0; }
.iv-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.iv-chip { font-size: 11px; padding: 4px 10px; border-radius: 999px; border: 1px solid #d9dde3; background: #f6f7f9; color: #3a3f46; cursor: pointer; }
.iv-chip:hover { border-color: #0e65f0; color: #0e65f0; background: #eef4ff; }
.iv-input { width: 100%; box-sizing: border-box; font-size: 13px; padding: 9px 10px; border: 1px solid #d9dde3; border-radius: 8px; resize: vertical; font-family: inherit; }
.iv-input:focus { outline: none; border-color: #0e65f0; box-shadow: 0 0 0 3px rgba(14, 101, 240, 0.12); }
.iv-hint { font-size: 11px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 9px; margin-bottom: 10px; }
.iv-foot { display: flex; justify-content: flex-end; gap: 8px; }
.iv-btn { font-size: 13px; padding: 7px 16px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; }
.iv-btn.ghost { background: #f3f4f6; color: #3a3f46; }
.iv-btn.primary { background: #0e65f0; color: #fff; font-weight: 600; }
.iv-btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
