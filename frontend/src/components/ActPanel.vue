<template>
  <div class="act-board">
    <div class="observe-results-header">
      <div>
        <span class="observe-kicker">ACT OUTPUT</span>
        <strong>{{ store.ops.data?.store?.name || '学清路店' }} · 下周作战台</strong>
      </div>
      <span class="observe-status" :class="store.ui.b5">{{ store.ops.loaded ? 'POS READY' : 'PENDING' }}</span>
    </div>
    <p class="act-lead">
      口径：{{ store.ops.data?.store?.period }} 到店成交（POS / 自助购，不含企业团购）。
      决策只用 {{ trainSpan }}；{{ holdSpan }} 只在历史样本中用于验证闭环。报告始终输出，审批、持续监测或回放按场景能力启用。图谱只解释传导关系，不替代 POS 事实。
    </p>

    <div class="act-kpi">
      <div class="stat-card" v-for="k in kpis" :key="k.label">
        <span class="stat-value">{{ k.value }}</span>
        <span class="stat-label">{{ k.label }}</span>
        <span class="stat-context">{{ k.ctx }}</span>
      </div>
    </div>

    <section class="promo-control">
      <div class="promo-control-head">
        <div>
          <span class="observe-kicker">PROMO EXCEPTION CONTROL</span>
          <strong>促销策略沙盘</strong>
          <p>数据层先算证据，规则层先拦截，MiroFish 比较有限策略；报告始终生成，验证闭环按场景能力启用。</p>
        </div>
        <span class="promo-flow">证据 → 约束 → 推演 → 报告 → 验证</span>
      </div>

      <div class="promo-sources">
        <div v-for="source in promo.sources" :key="source.key" class="promo-source" :data-status="source.status">
          <span class="promo-source-dot"></span>
          <div><b>{{ source.label }}</b><small>{{ source.fields }}</small><em>{{ source.note }}</em></div>
        </div>
      </div>

      <div class="promo-metrics">
        <div class="promo-metric">
          <strong>{{ percent(promo.metrics.causeAccuracy) }}</strong>
          <span>原因判断准确率</span>
          <small>{{ promo.metrics.causeSample ? `促销状态回放 n=${promo.metrics.causeSample} · 代理指标` : '需先积累回放样本' }}</small>
        </div>
        <div class="promo-metric">
          <strong>{{ percent(promo.metrics.actionEffectiveness) }}</strong>
          <span>动作有效率</span>
          <small>{{ promo.metrics.actionSample ? `动作回放 n=${promo.metrics.actionSample}` : '暂无有效动作样本' }}</small>
        </div>
        <div class="promo-metric promo-metric--guardrail">
          <strong>{{ percent(promo.metrics.invalidRate) }}</strong>
          <span>无效建议率</span>
          <small>已拒绝 {{ promo.metrics.rejectedCandidates }}/{{ promo.metrics.totalCandidates }} 个候选</small>
        </div>
      </div>

      <div class="promo-diagnosis-list" v-if="promo.items.length">
        <article v-for="item in promo.items" :key="item.id" class="promo-diagnosis-card">
          <div class="promo-card-head">
            <div><span class="promo-type">亏本促销</span><h3>{{ item.event.sku }}</h3></div>
            <div class="promo-card-badges">
              <span class="promo-severity">风险 {{ item.event.severity }}</span>
              <span v-if="item.backtest" class="act-verdict" :data-v="item.backtest.verdict">{{ item.backtest.label }}</span>
            </div>
          </div>
          <p class="promo-diagnosis">{{ item.diagnosis }} <b v-if="!item.evidenceReady">证据不足，拒绝自动下结论。</b></p>
          <div class="promo-evidence-grid">
            <div v-for="e in item.evidence" :key="e.label"><span>{{ e.label }}</span><b>{{ formatMoney(e.value) }} {{ e.unit }}</b></div>
          </div>
          <div class="promo-candidate-label">规则候选池 · 不等于本轮推荐</div>
          <div class="promo-candidates">
            <div v-for="candidate in item.candidates" :key="candidate.id" class="promo-candidate" :data-allowed="candidateApprovalAllowed(item, candidate)">
              <div class="promo-candidate-main"><b>{{ candidate.label }}</b><span>{{ candidate.action }}</span><small>{{ candidate.rule }}</small><small v-if="selectedDecisionFor(item, candidate)">本轮推演已选择，可进入审批。</small><small v-else-if="candidate.allowed">未被本轮推演选择，不进入审批。</small><small v-if="isReplayBlocked(item, candidate)">历史回放打脸：该动作不进入直接审批。</small></div>
              <button v-if="candidateApprovalAllowed(item, candidate) && approvalFor(item)?.actionId !== candidate.id" type="button" class="promo-approve-btn" @click="approve(item, candidate)">人工审批</button>
              <span v-else-if="approvalFor(item)?.actionId === candidate.id" class="promo-approved">✓ 已批准试验</span>
              <span v-else class="promo-rejected">{{ isReplayBlocked(item, candidate) ? '回放后暂停' : candidate.allowed ? '未选择' : '已拒绝' }}</span>
            </div>
          </div>
          <div class="promo-feedback" v-if="item.backtest">
            <span>后来真实发生：{{ item.backtest.note }}</span>
            <button v-if="!store.ops.feedback[item.id]" type="button" class="promo-feedback-btn" @click="recordFeedback(item)">记录历史回放</button>
            <b v-else>✓ 已回流校验</b>
          </div>
          <div v-if="approvalFor(item)" class="promo-approved-note">责任链已建立：审批通过「{{ approvalFor(item).action }}」，等待未来运营结果回流；若场景没有回流能力，则进入持续监测或补齐证据。</div>
        </article>
      </div>
      <div v-else class="promo-empty">暂无亏本促销异常。系统不会让模型凭空生成促销结论。</div>
    </section>

    <div class="act-scroll" title="左右滑动查看完整作战台">
      <div class="act-grid">
        <section class="act-col">
          <div class="observe-subsection-label">门店事实 · FACTS</div>
          <div class="report-card">
            <h3>1–23 日到店</h3>
            <div class="act-row" v-for="r in factRows" :key="r.k"><span>{{ r.k }}</span><b>{{ r.v }}</b></div>
          </div>
          <div class="report-card" v-if="cats.length">
            <h3>品类毛利</h3>
            <div class="act-row" v-for="c in cats" :key="c.name"><span>{{ c.name }}</span><b>{{ money(c.profit) }} · {{ c.margin }}%</b></div>
          </div>
          <div class="report-card" v-if="hours.length">
            <h3>时段</h3>
            <div class="act-row" v-for="h in hours" :key="h.name"><span>{{ h.name }}</span><b>{{ money(h.gmv) }}</b></div>
          </div>
        </section>

        <section class="act-col act-col--main">
          <div class="observe-subsection-label">推演选择 · 待审批</div>
          <div class="report-card act-action" v-for="a in selectedDecisions" :key="a.id">
            <div class="decision-header">
              <span class="act-kind" data-kind="ops">待审批</span>
              <span class="decision-action">{{ a.action }}</span>
              <span class="act-verdict" data-v="insufficient">推演选择</span>
            </div>
            <div class="act-meta">
              {{ a.owner }}<template v-if="a.based_on?.length"> · {{ a.based_on.join('、') }}</template>
              <span class="act-graph">规则已放行</span>
            </div>
            <div class="decision-reasoning">{{ a.reasoning }}</div>
            <div class="decision-gain">观察：{{ a.metric }}</div>
            <div class="act-stop">停手：{{ a.stop_rule }}</div>
          </div>
          <p class="act-empty" v-if="!selectedDecisions.length">本轮推演尚未选择规则候选；不会自动生成动作单。</p>
        </section>

        <section class="act-col">
          <div class="observe-subsection-label">历史回放 · BACKTEST</div>
          <div class="report-card">
            <h3>24–30 日盲测</h3>
            <p class="act-method">{{ store.ops.data?.backtest?.method }}</p>
            <div class="act-score">
              <div><em>{{ fmtMape(bt.gmvMape) }}</em><span>销售 MAPE</span></div>
              <div><em>{{ fmtMape(bt.profitMape) }}</em><span>毛利 MAPE</span></div>
              <div><em>{{ bt.top20Overlap || 0 }}/{{ bt.top20Size || 20 }}</em><span>头部交叉</span></div>
            </div>
            <div class="act-tally" v-if="summary.hit != null">
              <span data-v="hit">坐实 {{ summary.hit }}</span>
              <span data-v="miss">打脸 {{ summary.miss }}</span>
              <span data-v="insufficient">不足 {{ summary.insufficient }}</span>
            </div>
            <p class="act-method" v-if="summary.note">{{ summary.note }}</p>
            <div class="act-row"><span>预测销售</span><b>{{ money(bt.gmvPred) }}</b></div>
            <div class="act-row"><span>实际销售</span><b>{{ money(bt.gmvActual) }}</b></div>
            <div class="act-row"><span>预测毛利</span><b>{{ money(bt.profitPred) }}</b></div>
            <div class="act-row"><span>实际毛利</span><b>{{ money(bt.profitActual) }}</b></div>
          </div>
          <div class="report-card" v-if="(bt.actualTop || []).length">
            <h3>盲测真实头部</h3>
            <div class="act-row" v-for="s in bt.actualTop.slice(0, 6)" :key="s.name">
              <span>{{ s.name }}</span><b>{{ money(s.actual) }}</b>
            </div>
          </div>
          <div class="report-card act-forecast">
            <h3>下一周如果做</h3>
            <p class="act-method">{{ nw.method }}</p>
            <div class="act-score">
              <div><em>{{ compact(nw.gmv) }}</em><span>预测销售</span></div>
              <div><em>{{ compact(nw.profit) }}</em><span>预测毛利</span></div>
              <div>
                <em :data-delta="deltaSign(nw.dProfit)">{{ signedMoney(nw.dProfit) }}</em>
                <span>相对底稿毛利</span>
              </div>
            </div>
            <div class="act-row"><span>1–23 日外推底稿 · 销售</span><b>{{ money(nw.baseGmv) }}</b></div>
            <div class="act-row"><span>动作 + 假设后 · 销售</span><b>{{ money(nw.gmv) }} <i :data-delta="deltaSign(nw.dGmv)">{{ signedMoney(nw.dGmv) }}</i></b></div>
            <div class="act-row"><span>1–23 日外推底稿 · 毛利</span><b>{{ money(nw.baseProfit) }}</b></div>
            <div class="act-row"><span>动作 + 假设后 · 毛利</span><b>{{ money(nw.profit) }} <i :data-delta="deltaSign(nw.dProfit)">{{ signedMoney(nw.dProfit) }}</i></b></div>
            <div class="act-shocks" v-if="shockChips.length">
              <span v-for="(s, i) in shockChips" :key="i" class="act-shock" :data-on="s.on">{{ s.label }}</span>
            </div>
            <p class="act-holdout" v-if="store.ops.forecastReason">{{ store.ops.forecastReason }}</p>
            <p class="act-method" v-else-if="store.ops.forecastBusy">正在写理由（数字已由公式算出）…</p>
            <details class="act-formula">
              <summary>公式明细</summary>
              <pre>{{ nw.formulaText }}</pre>
            </details>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onBeforeUnmount } from 'vue';
import { store } from '../store/sim';
import { computeNextWeek, fallbackReason } from '../engine/nextWeek';
import { buildPromoDiagnosis, formatMoney } from '../engine/promoDiagnosis';
import { replayCorrection } from '../engine/promoSandbox';
import { callChat } from '../services/llm';

const bt = computed(() => store.ops.data?.backtest || {});
const summary = computed(() => bt.value.actionSummary || {});
const selectedDecisions = computed(() => (store.decisions || []).filter((decision) => decision.selected_by === 'simulation'));
const cats = computed(() => (store.ops.data?.facts?.categories || []).slice(0, 6));
const hours = computed(() => store.ops.data?.facts?.hours || []);
const train = computed(() => store.ops.data?.facts?.floorTrain || {});
const full = computed(() => store.ops.data?.facts?.train || {});
const trainSpan = computed(() => (store.ops.data?.split?.train || []).join('–') || '1–23 日');
const holdSpan = computed(() => (store.ops.data?.split?.holdout || []).join('–') || '24–30 日');
const nw = computed(() => computeNextWeek(store.ops.data, store.assumptions));
const promo = computed(() => buildPromoDiagnosis(store.ops.data));
const shockChips = computed(() => {
  const shocks = nw.value.shocks || [];
  const chips = shocks.filter((s) => s.applied).map((s) => ({ on: '1', label: s.rule || s.label }));
  const unmatched = shocks.filter((s) => !s.applied && !s.note).length;
  const dup = shocks.filter((s) => s.note).length;
  if (unmatched) chips.push({ on: '0', label: unmatched + ' 条假设无关键词，数字不变' });
  if (dup) chips.push({ on: '0', label: dup + ' 条同类假设已计一次' });
  return chips;
});

const kpis = computed(() => {
  const t = train.value;
  const b = bt.value;
  const s = summary.value;
  const tally = (s.hit != null) ? `坐实${s.hit} 打脸${s.miss}` : '销售 · 盲测周';
  return [
    { value: compact(t.gmv), label: '到店销售', ctx: '1–23 日' },
    { value: (t.margin ?? '—') + '%', label: '毛利率', ctx: compact(t.profit) + ' 毛利' },
    { value: fmtMape(b.gmvMape), label: '回测 MAPE', ctx: '销售 · 盲测周' },
    { value: s.hit != null ? `${s.hit}/${s.miss}` : '—', label: '坐实 / 打脸', ctx: tally },
  ];
});

const factRows = computed(() => {
  const t = train.value;
  const f = full.value;
  return [
    { k: '到店毛利', v: money(t.profit) },
    { k: '让利折扣', v: money(f.discount) },
    { k: '促销销售占比', v: (f.promo_share ?? '—') + '%' },
    { k: '会员订单占比', v: (f.member_share ?? '—') + '%' },
    { k: '全渠道训练期销售', v: money(f.gmv) + '（含团购）' },
  ];
});

let reasonTimer = 0;
let reasonGen = 0;
watch(
  () => [store.ops.data, store.assumptions.map((a) => a.text).join('\n'), nw.value.formulaText],
  () => {
    const snap = nw.value;
    store.ops.forecastReason = fallbackReason(snap);
    window.clearTimeout(reasonTimer);
    reasonTimer = window.setTimeout(() => explainNextWeek(snap), 700);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  window.clearTimeout(reasonTimer);
  reasonGen += 1;
});

async function explainNextWeek(snap) {
  const id = ++reasonGen;
  if (!store.ops.data) return;
  store.ops.forecastBusy = true;
  try {
    const content = await callChat(
      [
        { role: 'system', content: '你是超市店长顾问。数字已经由固定公式算好，禁止改销售额/毛利、禁止编造新百分比、禁止用图谱轮数当原因。用不超过 80 字解释公式结果。' },
        { role: 'user', content: `公式明细：\n${snap.formulaText}\n\n下一周预测销售 ${snap.gmv} 元、毛利 ${snap.profit} 元（相对底稿 ${snap.dGmv} / ${snap.dProfit}）。请写理由。` },
      ],
      { json: false, temperature: 0.2, max_tokens: 180 },
    );
    if (id !== reasonGen) return;
    const text = String(content || '').trim();
    store.ops.forecastReason = text || fallbackReason(snap);
  } catch (_) {
    if (id !== reasonGen) return;
    store.ops.forecastReason = fallbackReason(snap);
  } finally {
    if (id === reasonGen) store.ops.forecastBusy = false;
  }
}

function money(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) + ' 元';
}
function compact(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}
function signedMoney(v) {
  const n = Math.round(Number(v) || 0);
  const s = n.toLocaleString('zh-CN') + ' 元';
  return n > 0 ? '+' + s : s;
}
function deltaSign(v) {
  const n = Number(v) || 0;
  if (n > 0) return 'up';
  if (n < 0) return 'down';
  return 'flat';
}
function fmtMape(v) {
  return v == null ? '—' : v + '%';
}
function percent(v) {
  return v == null ? '—' : Math.round(Number(v) * 100) + '%';
}
function approvalFor(item) {
  return store.ops.approvals?.[item.id] || null;
}
function isReplayBlocked(item, candidate) {
  return item.backtest?.verdict === 'miss' && candidate.id === 'stop';
}
function selectedDecisionFor(item, candidate) {
  return selectedDecisions.value.find((decision) => (
    decision.sourceItemId === item.id && decision.candidateId === candidate.id
  ));
}
function candidateApprovalAllowed(item, candidate) {
  return candidate.allowed && Boolean(selectedDecisionFor(item, candidate)) && !isReplayBlocked(item, candidate);
}
function approve(item, candidate) {
  if (!candidateApprovalAllowed(item, candidate)) return;
  store.ops.approvals[item.id] = {
    actionId: candidate.id,
    action: candidate.action,
    approvedAt: new Date().toISOString(),
  };
}
function recordFeedback(item) {
  if (!item.backtest) return;
  store.ops.feedback[item.id] = {
    verdict: item.backtest.verdict,
    label: item.backtest.label,
    recordedAt: new Date().toISOString(),
  };
  const correction = replayCorrection(item);
  if (correction && !store.ops.worldMemory.some((memory) => memory.itemId === item.id)) {
    store.ops.worldMemory.push({ itemId: item.id, text: correction, recordedAt: new Date().toISOString() });
  }
}
</script>

<style scoped>
.promo-control { margin: 16px 0 20px; padding: 16px; background: linear-gradient(180deg, #fffdfa, #fff); border: 1px solid #f0d7b5; border-radius: 12px; box-shadow: 0 8px 24px rgba(138, 82, 20, 0.06); }
.promo-control-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.promo-control-head strong { display: block; margin: 2px 0 5px; color: #22252a; font-size: 17px; }
.promo-control-head p { margin: 0; color: #70757e; font-size: 12px; line-height: 1.55; }
.promo-flow { flex: 0 0 auto; padding: 7px 10px; border-radius: 999px; color: #9a5a16; background: #fff2df; font-size: 11px; white-space: nowrap; }
.promo-sources { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0; }
.promo-source { display: flex; gap: 8px; padding: 9px; border: 1px solid #ece6dd; border-radius: 8px; background: #fff; }
.promo-source-dot { width: 7px; height: 7px; margin-top: 4px; flex: 0 0 auto; border-radius: 50%; background: #f59e0b; }
.promo-source[data-status="ready"] .promo-source-dot { background: #22a06b; }.promo-source[data-status="missing"] .promo-source-dot { background: #ef4444; }
.promo-source b, .promo-source small, .promo-source em { display: block; }.promo-source b { color: #363a40; font-size: 11px; }.promo-source small { margin-top: 2px; color: #8c9199; font-size: 9px; }.promo-source em { margin-top: 5px; color: #9a5a16; font-size: 10px; font-style: normal; line-height: 1.35; }
.promo-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }.promo-metric { padding: 10px 12px; border-radius: 8px; background: #f7faf8; border: 1px solid #dfeee5; }.promo-metric--guardrail { background: #fff8ed; border-color: #f6dfbc; }.promo-metric strong, .promo-metric span, .promo-metric small { display: block; }.promo-metric strong { color: #18794e; font-size: 20px; }.promo-metric--guardrail strong { color: #b45309; }.promo-metric span { margin-top: 2px; color: #444a52; font-size: 11px; font-weight: 700; }.promo-metric small { margin-top: 3px; color: #8a9098; font-size: 10px; }
.promo-diagnosis-list { display: grid; gap: 10px; }.promo-diagnosis-card { padding: 12px; border: 1px solid #eadfd2; border-radius: 9px; background: #fff; }.promo-card-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }.promo-type { color: #b45309; font-size: 10px; font-weight: 800; letter-spacing: .08em; }.promo-card-head h3 { margin: 4px 0 0; color: #292d33; font-size: 14px; }.promo-card-badges { display: flex; gap: 6px; align-items: center; }.promo-severity { color: #a33c25; background: #fff0ed; border-radius: 999px; padding: 3px 7px; font-size: 10px; }.promo-diagnosis { margin: 9px 0; color: #555b63; font-size: 12px; line-height: 1.5; }.promo-diagnosis b { color: #b45309; }.promo-evidence-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }.promo-evidence-grid div { padding: 7px 8px; background: #fafafa; border-radius: 6px; }.promo-evidence-grid span, .promo-evidence-grid b { display: block; }.promo-evidence-grid span { color: #8a9098; font-size: 10px; }.promo-evidence-grid b { margin-top: 2px; color: #3e434b; font-size: 12px; }
.promo-candidate-label { margin: 12px 0 6px; color: #7c838c; font-size: 10px; font-weight: 800; letter-spacing: .08em; }.promo-candidates { display: grid; gap: 6px; }.promo-candidate { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 8px; border: 1px solid #dcebe2; border-radius: 7px; background: #f8fcf9; }.promo-candidate[data-allowed="false"] { border-color: #ececec; background: #fafafa; }.promo-candidate-main { min-width: 0; }.promo-candidate-main b, .promo-candidate-main span, .promo-candidate-main small { display: block; }.promo-candidate-main b { color: #246b49; font-size: 11px; }.promo-candidate[data-allowed="false"] .promo-candidate-main b { color: #777d85; }.promo-candidate-main span { margin-top: 2px; color: #464c54; font-size: 11px; }.promo-candidate-main small { margin-top: 3px; color: #7e858d; font-size: 10px; line-height: 1.35; }.promo-approve-btn, .promo-feedback-btn { flex: 0 0 auto; padding: 5px 9px; border: 1px solid #16865a; border-radius: 6px; color: #147148; background: #fff; cursor: pointer; font-size: 10px; font-weight: 700; }.promo-approve-btn:hover, .promo-feedback-btn:hover { background: #eaf8f0; }.promo-approved, .promo-rejected { flex: 0 0 auto; font-size: 10px; font-weight: 700; }.promo-approved { color: #16865a; }.promo-rejected { color: #9b9da1; }.promo-feedback { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 9px; padding-top: 9px; border-top: 1px dashed #e2e2e2; color: #6d737b; font-size: 10px; line-height: 1.4; }.promo-feedback b { color: #16865a; }.promo-approved-note { margin-top: 8px; padding: 7px 9px; color: #17603f; background: #edf9f2; border-radius: 6px; font-size: 10px; line-height: 1.4; }.promo-empty { padding: 16px; color: #777d85; background: #fafafa; border-radius: 7px; font-size: 12px; }
.promo-sim-label { margin: 12px 0 6px; color: #7c838c; font-size: 10px; font-weight: 800; letter-spacing: .08em; }.promo-sim-table { border: 1px solid #ece8e2; border-radius: 7px; overflow: hidden; }.promo-sim-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; padding: 7px 8px; color: #555b63; background: #fff; border-top: 1px solid #f0eeeb; font-size: 10px; align-items: center; }.promo-sim-row:first-child { border-top: 0; }.promo-sim-row--head { color: #8a9098; background: #faf9f7; font-weight: 700; }.promo-sim-row[data-allowed="false"] { color: #a0a3a8; background: #fafafa; }.promo-sim-row span:first-child b, .promo-sim-row span:first-child small { display: block; }.promo-sim-row span:first-child b { color: #3d6f55; font-size: 10px; }.promo-sim-row[data-allowed="false"] span:first-child b { color: #85888e; }.promo-sim-row span:first-child small { margin-top: 2px; color: #a0a3a8; font-size: 9px; }.promo-sim-note { margin: 6px 0 0; color: #8c9199; font-size: 10px; line-height: 1.4; }
@media (max-width: 820px) { .promo-sources { grid-template-columns: repeat(2, 1fr); } .promo-control-head { flex-direction: column; }.promo-flow { white-space: normal; } }
@media (max-width: 520px) { .promo-sources, .promo-metrics, .promo-evidence-grid { grid-template-columns: 1fr; } .promo-card-head { flex-direction: column; } .promo-candidate { align-items: flex-start; flex-direction: column; } }
</style>
