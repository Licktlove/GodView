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
      决策只用 {{ trainSpan }}，{{ holdSpan }} 留作盲测。主结论看盲测坐实 / 打脸；打脸的动作留在台上。图谱只解释因果，标对齐或未对齐。
    </p>

    <div class="act-kpi">
      <div class="stat-card" v-for="k in kpis" :key="k.label">
        <span class="stat-value">{{ k.value }}</span>
        <span class="stat-label">{{ k.label }}</span>
        <span class="stat-context">{{ k.ctx }}</span>
      </div>
    </div>

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
          <div class="observe-subsection-label">动作单 · PLAYBOOK</div>
          <div class="report-card act-action" v-for="a in playbook" :key="a.id">
            <div class="decision-header">
              <span class="act-kind" :data-kind="a.kind">{{ kindLabel(a.kind) }}</span>
              <span class="decision-action">{{ a.action }}</span>
              <span class="act-verdict" :data-v="a.backtestVerdict || 'insufficient'">{{ a.backtestLabel || '证据不足' }}</span>
            </div>
            <div class="act-meta">
              {{ a.who }} · {{ a.when }}<template v-if="a.sku"> · {{ a.sku }}</template>
              <span class="act-graph">图谱 {{ a.graphAlign || '未对齐' }}</span>
            </div>
            <div class="decision-reasoning">{{ a.evidence }}</div>
            <div class="decision-gain">预期：{{ a.expected }}</div>
            <div class="act-holdout">盲测：{{ a.holdoutEvidence || '尚未对照 24–30 日' }}</div>
            <div class="act-stop">停手：{{ a.stop }}</div>
          </div>
          <p class="act-empty" v-if="!playbook.length">尚未生成动作单。确认已运行 POS 聚合。</p>
        </section>

        <section class="act-col">
          <div class="observe-subsection-label">回测 · BACKTEST</div>
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
            <div class="act-row" v-if="bt.skuMapeMedian != null"><span>SKU 误差中位</span><b>{{ bt.skuMapeMedian }}% · n={{ bt.skuMapeN }}</b></div>
          </div>
          <div class="report-card" v-if="(bt.actualTop || []).length">
            <h3>盲测真实头部</h3>
            <div class="act-row" v-for="s in bt.actualTop.slice(0, 6)" :key="s.name">
              <span>{{ s.name }}</span><b>{{ money(s.actual) }}</b>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { store } from '../store/sim';
import { kindLabel } from '../engine/posOps';

const bt = computed(() => store.ops.data?.backtest || {});
const summary = computed(() => bt.value.actionSummary || {});
const playbook = computed(() => store.ops.data?.playbook || []);
const cats = computed(() => (store.ops.data?.facts?.categories || []).slice(0, 6));
const hours = computed(() => store.ops.data?.facts?.hours || []);
const train = computed(() => store.ops.data?.facts?.floorTrain || {});
const full = computed(() => store.ops.data?.facts?.train || {});
const trainSpan = computed(() => (store.ops.data?.split?.train || []).join('–') || '1–23 日');
const holdSpan = computed(() => (store.ops.data?.split?.holdout || []).join('–') || '24–30 日');

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
function fmtMape(v) {
  return v == null ? '—' : v + '%';
}
</script>
