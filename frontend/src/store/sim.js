import { reactive } from 'vue';

export const store = reactive({
  health: { ok: false, model: '', keyConfigured: false, baseURL: '' },

  entities: [],
  edges: [],
  growth: [],
  episodes: {},  // entityId -> [{round, text, targetName, relation, effect}]
  history: [],
  logs: [],

  // Report - multi-section
  reportOutline: null,   // {title, summary, sections: [{title}]}
  reportSections: {},    // index -> {content, status: 'pending'|'generating'|'done'}
  report: null,          // final assembled report (for backward compat / redline)

  // Chat / deep interaction
  chat: { target: null, messages: [], running: false },

  // Input
  seed: '',
  entN: 12,
  rounds: 6,
  perR: 6,

  nodeInfo: null,

  ui: {
    b1: 'pending', b2: 'pending', b3: 'pending', b4: 'pending',
    genRunning: false, simRunning: false, reportRunning: false,
    enrichRunning: false,
    step1Done: false,
  },
});

export function pushLog(msg, cls = '') {
  store.logs.push({ t: new Date().toLocaleTimeString('en-GB'), msg, cls });
  if (store.logs.length > 400) store.logs.splice(0, store.logs.length - 400);
}

export function resetWorld() {
  store.entities = [];
  store.edges = [];
  store.growth = [];
  store.episodes = {};
  store.reportOutline = null;
  store.reportSections = {};
  store.report = null;
  store.chat = { target: null, messages: [], running: false };
  store.nodeInfo = null;
  store.ui.b1 = 'pending';
  store.ui.b2 = 'pending';
  store.ui.b3 = 'pending';
  store.ui.b4 = 'pending';
  store.ui.step1Done = false;
}

export function addEpisode(entityId, ep) {
  if (!store.episodes[entityId]) store.episodes[entityId] = [];
  store.episodes[entityId].push(ep);
  if (store.episodes[entityId].length > 50) store.episodes[entityId].shift();
}