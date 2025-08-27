/* script.js — fungsi utama aplikasi */
const STORAGE_KEY = 'hydration-state-v1';

/* ---------- util: tanggal lokal YYYY-MM-DD ---------- */
function getTodayKey() {
  const d = new Date();
  // gunakan toLocaleDateString agar sesuai timezone lokal; format ke ISO-like YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/* ---------- state management ---------- */
function defaultState() {
  return {
    settings: {
      dailyTargetMl: 2000,
      cupSizeMl: 250,
      reminderMinutes: null,
    },
    history: {} // { "YYYY-MM-DD": { totalMl: number, cups: number } }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // basic shape validation
    if (!parsed.settings) parsed.settings = defaultState().settings;
    if (!parsed.history) parsed.history = {};
    return parsed;
  } catch (e) {
    console.warn('Gagal baca state, gunakan default.', e);
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Gagal simpan state', e);
  }
}

/* ---------- DOM helpers ---------- */
const $ = id => document.getElementById(id);
function showToast(msg, timeout = 3500) {
  const container = $('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  // force reflow -> add show
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, timeout);
}

/* ---------- global runtime state ---------- */
let state = loadState();
let reminderIntervalId = null;

/* ---------- ensure today entry exists ---------- */
function ensureToday() {
  const today = getTodayKey();
  if (!state.history[today]) {
    state.history[today] = { totalMl: 0, cups: 0 };
    // keep history recent (prune older than 30 days)
    const keys = Object.keys(state.history).sort().reverse(); // newest first
    const keep = keys.slice(0, 30);
    const newHist = {};
    keep.forEach(k => newHist[k] = state.history[k]);
    state.history = newHist;
    saveState(state);
  }
}

/* ---------- render progress ---------- */
function renderProgress() {
  ensureToday();
  const today = getTodayKey();
  const todayData = state.history[today] || { totalMl: 0, cups: 0 };
  const dailyTarget = Number(state.settings.dailyTargetMl) || 2000;
  const percent = Math.min(100, Math.round((todayData.totalMl / dailyTarget) * 100));
  $('progress-percentage').textContent = `${percent}%`;
  $('remaining-ml').textContent = `${Math.max(0, dailyTarget - todayData.totalMl)} ml`;
  $('cups-count').textContent = `${todayData.cups} gelas`;
  // update progress fill width
  const fill = $('progress-fill');
  if (fill) fill.style.width = `${percent}%`;
}

/* ---------- add / subtract ---------- */
function addGlass() {
  ensureToday();
  const today = getTodayKey();
  const cup = Number(state.settings.cupSizeMl) || 250;
  if (!state.history[today]) state.history[today] = { totalMl: 0, cups: 0 };
  state.history[today].totalMl += cup;
  state.history[today].cups += 1;
  // soft bounds
  if (state.history[today].totalMl > 10000) {
    showToast('Peringatan: nilai melebihi 10 L. Periksa input ukuran gelas/target.', 4000);
  }
  saveState(state);
  renderProgress();
  renderHistoryChart();
}

function subtractGlass() {
  ensureToday();
  const today = getTodayKey();
  const cup = Number(state.settings.cupSizeMl) || 250;
  if (!state.history[today]) state.history[today] = { totalMl: 0, cups: 0 };
  state.history[today].totalMl = Math.max(0, state.history[today].totalMl - cup);
  state.history[today].cups = Math.max(0, state.history[today].cups - 1);
  saveState(state);
  renderProgress();
  renderHistoryChart();
}

/* ---------- settings form ---------- */
function readSettingsFromForm() {
  const daily = Number($('daily-target').value) || 2000;
  const cup = Number($('cup-size').value) || 250;
  const rem = Number($('reminder-minutes').value);
  state.settings.dailyTargetMl = daily;
  state.settings.cupSizeMl = cup;
  state.settings.reminderMinutes = Number.isFinite(rem) && rem > 0 ? rem : null;
  saveState(state);
  renderProgress();
  setupReminder(); // reconfigure reminder if changed
}

function writeSettingsToForm() {
  $('daily-target').value = state.settings.dailyTargetMl;
  $('cup-size').value = state.settings.cupSizeMl;
  $('reminder-minutes').value = state.settings.reminderMinutes || '';
  $('theme-select').value = state.settings.theme || 'system';
}

/* ---------- history chart (canvas) ---------- */
const chartCanvas = $('history-chart');
let chartCtx = null;
if (chartCanvas) chartCtx = chartCanvas.getContext('2d');

function getLastNDays(n = 7) {
  const keys = Object.keys(state.history).sort(); // ascending
  const last = keys.slice(-n);
  // ensure contiguous last n days (fill missing with 0)
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const val = state.history[key] || { totalMl: 0, cups: 0 };
    result.push({ date: key, ml: val.totalMl });
  }
  return result;
}

function renderHistoryChart() {
  if (!chartCtx || !chartCanvas) return;
  const data = getLastNDays(7);
  const w = chartCanvas.clientWidth;
  const h = chartCanvas.clientHeight;
  chartCanvas.width = w * devicePixelRatio;
  chartCanvas.height = h * devicePixelRatio;
  chartCtx.scale(devicePixelRatio, devicePixelRatio);
  chartCtx.clearRect(0, 0, w, h);

  // layout
  const padding = 12;
  const barGap = 8;
  const barWidth = (w - padding * 2 - (data.length - 1) * barGap) / data.length;
  const maxMl = Math.max(...data.map(d => d.ml), 250); // avoid zero max

  // draw bars
  data.forEach((d, i) => {
    const x = padding + i * (barWidth + barGap);
    const barH = (d.ml / maxMl) * (h - padding * 2);
    const y = h - padding - barH;
    // bar background
    chartCtx.fillStyle = 'rgba(11,116,255,0.12)';
    chartCtx.fillRect(x, padding, barWidth, h - padding * 2);
    // bar fill
    chartCtx.fillStyle = 'rgba(11,116,255,0.9)';
    chartCtx.fillRect(x, y, barWidth, barH);
    // label
    chartCtx.fillStyle = '#333';
    chartCtx.font = '12px system-ui';
    chartCtx.textAlign = 'center';
    const label = d.date.slice(5); // MM-DD
    chartCtx.fillText(label, x + barWidth / 2, h - 4);
  });
}

/* ---------- reminders ---------- */
function setupReminder() {
  // clear old
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }
  const mins = state.settings.reminderMinutes;
  if (!mins || mins <= 0) return;
  // run only while tab visible; function triggers toast and optional Notification
  reminderIntervalId = setInterval(() => {
    if (document.hidden) return;
    showToast('Waktunya minum! Ayo ambil gelas :)', 4000);
    if (Notification && Notification.permission === 'granted') {
      try { new Notification('Pengingat Minum', { body: 'Waktunya minum air — tetap hidrasi!' }); } catch (e) { /* ignore */ }
    }
  }, mins * 60 * 1000);
}

function requestNotificationPermissionIfNeeded() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') showToast('Notifikasi diaktifkan');
    });
  }
}

/* ---------- export / import ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hydration-data.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Data berhasil diekspor');
}

function importDataFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.settings || !parsed.history) throw new Error('Format tidak valid');
      state = parsed;
      saveState(state);
      writeSettingsToForm();
      renderProgress();
      renderHistoryChart();
      setupReminder();
      showToast('Data berhasil diimpor');
    } catch (err) {
      showToast('Gagal impor: format salah', 3000);
      console.error(err);
    }
  };
  reader.readAsText(file);
}

/* ---------- theme handling ---------- */
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('theme-dark');
  if (theme === 'dark') root.classList.add('theme-dark');
  state.settings.theme = theme;
  saveState(state);
  $('theme-select').value = theme;
  $('theme-toggle').setAttribute('aria-pressed', theme === 'dark');
}

function resolveSystemTheme() {
  if (state.settings.theme === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  } else {
    applyTheme(state.settings.theme);
  }
}

/* ---------- day rollover detection ---------- */
let lastDayKey = getTodayKey();
function checkDayRollover() {
  const key = getTodayKey();
  if (key !== lastDayKey) {
    lastDayKey = key;
    ensureToday();
    renderProgress();
    renderHistoryChart();
  }
}

/* ---------- events wiring ---------- */
function setupEventHandlers() {
  // add/subtract
  $('add-glass').addEventListener('click', addGlass);
  $('subtract-glass').addEventListener('click', subtractGlass);

  // settings form (auto save)
  ['daily-target', 'cup-size', 'reminder-minutes'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => {
      // update state.settings using current form values
      state.settings.dailyTargetMl = Number($('daily-target').value) || state.settings.dailyTargetMl;
      state.settings.cupSizeMl = Number($('cup-size').value) || state.settings.cupSizeMl;
      const rm = Number($('reminder-minutes').value);
      state.settings.reminderMinutes = Number.isFinite(rm) && rm > 0 ? rm : null;
      saveState(state);
      renderProgress();
      setupReminder();
    });
  });

  // export/import
  $('export-btn').addEventListener('click', exportData);
  $('import-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importDataFile(f);
    e.target.value = '';
  });

  // theme controls
  $('theme-select').addEventListener('change', e => {
    state.settings.theme = e.target.value;
    saveState(state);
    resolveSystemTheme();
  });
  $('theme-toggle').addEventListener('click', () => {
    const newTheme = (state.settings.theme === 'dark') ? 'light' : 'dark';
    state.settings.theme = newTheme;
    saveState(state);
    applyTheme(newTheme);
  });

  // resize -> redraw chart (throttle)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderHistoryChart, 150);
  });

  // periodic checks
  setInterval(checkDayRollover, 60 * 1000);
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Normalize element IDs used in this file vs original HTML
  // If your HTML used other ID names, please rename accordingly.
  // Ensure default values in form
  if (!$('daily-target')) {
    // try to support older naming variants
    const altDaily = $('target-ml') || $('daily-target');
    if (altDaily) altDaily.id = 'daily-target';
  }

  if (!$('cup-size')) {
    const altCup = $('cup-ml') || $('cup-size');
    if (altCup) altCup.id = 'cup-size';
  }

  // initialize state and UI
  ensureToday();
  writeSettingsToForm();
  renderProgress();
  renderHistoryChart();
  setupEventHandlers();

  // theme resolve
  if (!state.settings.theme) state.settings.theme = 'system';
  resolveSystemTheme();

  // request notification permission only when user enables reminders (not automatically)
  // but we can set up reminder interval now:
  setupReminder();

  // small friendly hint
  console.log('Hydration app ready.');
});
