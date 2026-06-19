import { appState, saveTasks, saveHistory, saveSession, getActiveTask, saveLang, updateHistoryReflection, claimLegacyDataForCurrentUser, reloadForCurrentUser } from './state.js';
import { getTodayStr, getTodayDisplay } from './utils/dateTime.js';
import { initSyncService } from './services/sync.service.js';
import { processQueue } from './services/offlineQueue.service.js';
import { generateArchiveInsight } from './services/archiveInsight.service.js';
import { queryArchive } from './services/archiveQuery.service.js';
import { recoverSession } from './services/sessionRecovery.service.js';
import { formatTime, startFocus, pauseSession, resumeSession, completeFocus, startBreak, skipBreak, resetSession } from './timer.js';
// three-scene.js (and its heavy deps three + gsap) are loaded lazily after first
// paint so they stay out of the initial bundle. Calls before load are safe no-ops.
let threeScene = null;
let three3DRequested = false;
function load3DScene() {
  if (three3DRequested) return;
  three3DRequested = true;
  import('./three-scene.js').then(mod => {
    threeScene = mod;
    try { mod.init3DScene(); mod.set3DMode(currentView); } catch (e) { console.error('3D scene failed:', e); }
  }).catch(e => console.error('3D import failed:', e));
}
function set3DMode(name) { try { threeScene && threeScene.set3DMode(name); } catch (e) {} }
function triggerRitualManeuver() { try { threeScene && threeScene.triggerRitualManeuver(); } catch (e) {} }
import { dict } from './i18n.js';
import { signUpWithEmail, signInWithEmail, signOut } from './supabase/auth.service.js';
import { getNextFocusCandidate } from './services/focusFlow.service.js';
import { syncWidgetState } from './services/widgetSync.service.js';
import { exportData, importData } from './services/exportImport.service.js';
import { isPipSupported } from './utils/runtime.js';
// widget/pip.js is only needed once the floating widget is opened — load on demand.
let widgetMod = null;
function isWidgetOpen() { return !!(widgetMod && widgetMod.isWidgetOpen()); }
function updateWidget(snap) { try { widgetMod && widgetMod.updateWidget(snap); } catch (e) {} }
import { generateSubdivisionBlocks } from './services/subdivide.service.js';
import {
  getTotalFocusMinutes,
  getCurrentStreak,
  getLongestFocusSession,
  getLeastInterruptedSession,
  getBestFocusDay,
  getLast7DaysFocusMinutes
} from './services/historyInsight.service.js';

// ==========================================
// I18N
// ==========================================
function t(key) {
  const lang = appState.prefs.lang || 'en';
  return (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || key;
}

function updateI18nDOM() {
  document.documentElement.lang = appState.prefs.lang === 'ko' ? 'ko' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.type === 'button') {
      el.value = t(key);
    } else {
      el.innerHTML = t(key);
    }
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });
  const langBtn = document.getElementById('btn-lang-toggle');
  if (langBtn) {
    langBtn.textContent = appState.prefs.lang === 'ko' ? '[ EN / KR* ]' : '[ EN* / KR ]';
  }
  const authLangBtn = document.getElementById('btn-auth-lang-toggle');
  if (authLangBtn) {
    authLangBtn.textContent = appState.prefs.lang === 'ko' ? '[ EN / KR* ]' : '[ EN* / KR ]';
  }
}

// ==========================================
// DOM SHORTCUTS
// ==========================================
const $ = (id) => document.getElementById(id);
const show = (el, visible) => { if (el) el.style.display = visible ? '' : 'none'; };

const views = {
  home: $('view-home'),
  focus: $('view-focus'),
  break: $('view-break'),
  calendar: $('view-calendar'),
  archive: $('view-archive')
};
const navItems = {
  home: $('nav-home'),
  calendar: $('nav-calendar'),
  archive: $('nav-archive')
};
const tabItems = {
  home: $('tab-home'),
  calendar: $('tab-calendar'),
  focus: $('tab-focus'),
  archive: $('tab-archive'),
  new: $('tab-new')
};
const SECTOR_KEY = {
  home: 'metaSectorHome',
  calendar: 'metaSectorPlanner',
  focus: 'metaSectorFocus',
  break: 'metaSectorBreak',
  archive: 'metaSectorArchive'
};

let currentView = 'home';
let selectedTaskId = null;
let currentModalDate = getTodayStr();
let currentArchiveFilter = 'all';
let currentArchiveSearch = '';
let currentArchiveSort = 'newest';
let authMode = 'signin';

// ==========================================
// NOTIFICATIONS
// ==========================================
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
function sendNotification(titleKey, bodyKey, extraText = '') {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(t(titleKey), { body: `${t(bodyKey)} ${extraText}`, icon: '🍅' });
  }
}

// ==========================================
// INIT
// ==========================================

window.addEventListener('tomato:auth-ready', (e) => {
  updateAuthUI();
  if (appState.auth.user) {
    recoverSession();
    renderAll();
    updateFocusHUD();
  }
});

window.addEventListener('tomato:cloud-loaded', () => {
  updateAuthUI();
  recoverSession();
  renderAll();
  updateFocusHUD();
});

window.addEventListener('tomato:userchange', () => {
  updateAuthUI();
  recoverSession();
  renderAll();
  updateFocusHUD();
});

function init() {
  // Defer the 3D atmosphere until the UI has painted — keeps three/gsap off the
  // critical path so first interaction isn't blocked on WebGL init.
  if ('requestIdleCallback' in window) requestIdleCallback(() => load3DScene(), { timeout: 2500 });
  else setTimeout(load3DScene, 1500);
  initSyncService();
  processQueue();
  requestNotificationPermission();
  if (!appState.auth.user) authMode = 'signin';
  bindAuth();
  bindNav();
  bindTabBar();
  bindHome();
  bindFocusLauncher();
  bindFocusControls();
  bindBreakControls();
  bindModal();
  bindTimerEvents();
  bindArchive();
  initPlannerNav();
  bindSheet();
  bindWidgetControls();

  updateI18nDOM();
  updateAuthUI();
  renderAll();

  // Resume ticking if a session was already running (page reload).
  if (appState.auth.user) recoverSession();
  updateFocusHUD();

  showView('home');
}

function bindWidgetControls() {
  const toggleBtn = $('btn-widget-toggle');
  if (toggleBtn) toggleBtn.onclick = requestWidgetOpen;
}

// Snapshot of the timer state the widget needs to render itself.
function getWidgetSnapshot() {
  const task = getActiveTask();
  const mode = appState.session.mode;
  const total = mode === 'break'
    ? (task ? (task.breakMinutes || 5) * 60 : 5 * 60)
    : (task ? task.focusMinutes * 60 : 25 * 60);
  return {
    mode,
    remaining: appState.session.remainingSeconds,
    running: appState.session.isRunning,
    title: task ? task.title : '',
    total
  };
}

async function requestWidgetOpen() {
  if (!widgetMod) {
    try { widgetMod = await import('./widget/pip.js'); }
    catch (e) { console.error('Widget import failed:', e); return; }
  }
  widgetMod.openWidget({
    t,
    getSnapshot: getWidgetSnapshot,
    onPrimary: () => {
      const mode = appState.session.mode;
      if (mode === 'idle' || appState.session.remainingSeconds <= 0) {
        const task = getActiveTask() || pickHomeTask();
        if (task) startTaskRitual(task);
        else startQuickRitual();
      } else if (appState.session.isRunning) {
        pauseSession();
      } else {
        resumeSession();
      }
    },
    onComplete: () => {
      if (appState.session.mode === 'focus') completeFocus({ completionType: 'manual_complete' });
      else if (appState.session.mode === 'break') endBreakManually();
    },
    onClosed: () => updateFocusHUD()
  });
}

// ==========================================
// AUTH
// ==========================================
function bindAuth() {
  const form = $('auth-form');
  const switchBtn = $('btn-auth-switch');
  const logoutBtn = $('btn-auth-logout');
  const langBtn = $('btn-auth-lang-toggle');
  const emailInput = $('auth-email');
  const passwordInput = $('auth-password');

  if (form) {
    form.addEventListener('submit', handleAuthSubmit);
  }
  if (emailInput) emailInput.addEventListener('input', updateAuthRules);
  if (passwordInput) passwordInput.addEventListener('input', updateAuthRules);
  if (switchBtn) {
    switchBtn.onclick = () => {
      authMode = authMode === 'signin' ? 'signup' : 'signin';
      updateAuthUI();
    };
  }
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      resetSession();
      signOut();
      reloadForCurrentUser();
      updateAuthUI();
      renderAll();
      showView('home');
    };
  }
  if (langBtn) {
    langBtn.onclick = () => toggleLanguage();
  }
}

function toggleLanguage() {
  appState.prefs.lang = appState.prefs.lang === 'ko' ? 'en' : 'ko';
  saveLang();
  renderAll();
  updateAuthUI();
  const sectorEl = $('mb-sector');
  if (sectorEl) sectorEl.textContent = t(SECTOR_KEY[currentView] || 'metaSectorHome');
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const message = $('auth-message');
  const submitBtn = $('btn-auth-submit');
  const email = ($('auth-email')?.value || '').trim();
  const displayName = ($('auth-display')?.value || '').trim();
  const password = $('auth-password')?.value || '';

  if (message) {
    message.textContent = '';
    message.classList.remove('error', 'ok');
  }
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = authMode === 'signup' ? t('authCreating') : t('authChecking');
  }

  try {
    const validation = validateAuthInput(email, password);
    if (authMode === 'signup' && !validation.ok) {
      throw new Error(validation.messageKey);
    }
    
    if (authMode === 'signup') {
      await signUpWithEmail(email, password, displayName);
    } else {
      await signInWithEmail(email, password);
    }
    claimLegacyDataForCurrentUser();
    reloadForCurrentUser();
    updateAuthUI();
    updateI18nDOM();
    renderAll();
    recoverSession();
    showView('home');
  } catch (err) {
    if (message) {
      message.textContent = t(err.code || err.message) || t('authErrorGeneric');
      message.classList.add('error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = authMode === 'signup' ? t('authCreateButton') : t('authSignInButton');
    }
  }
}

function updateAuthUI() {
  const user = appState.auth.user;
  const gate = $('auth-gate');
  const badge = $('auth-user-badge');
  const logoutBtn = $('btn-auth-logout');
  const title = $('auth-title');
  const subtitle = $('auth-subtitle');
  const displayField = $('auth-display-field');
  const submitBtn = $('btn-auth-submit');
  const switchBtn = $('btn-auth-switch');
  const message = $('auth-message');
  const passwordInput = $('auth-password');

  // If user is logged in but cloud state isn't loaded yet, show loading
  if (user && !appState.isCloudLoaded) {
    document.body.classList.add('auth-locked');
    if (gate) gate.classList.remove('hidden');
    if (title) title.textContent = "SYNCING...";
    if (subtitle) subtitle.textContent = "Loading cloud workspace...";
    if (displayField) displayField.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'none';
    if (switchBtn) switchBtn.style.display = 'none';
    if (passwordInput) passwordInput.parentElement.style.display = 'none';
    const emailInput = $('auth-email');
    if (emailInput) emailInput.parentElement.style.display = 'none';
    const authRules = $('auth-rules');
    if (authRules) authRules.style.display = 'none';
    const authMessage = $('auth-message');
    if (authMessage) authMessage.style.display = 'none';
    return;
  }

  // Normal logic
  document.body.classList.toggle('auth-locked', !user);
  if (gate) gate.classList.toggle('hidden', !!user);
  if (badge) {
    badge.textContent = user ? `[ ${user.displayName || user.email.split('@')[0]} // CLOUD ]` : t('authNoUser');
    badge.style.display = user ? '' : 'none';
  }
  if (logoutBtn) logoutBtn.style.display = user ? '' : 'none';

  if (!user) {
    if (displayField) displayField.style.display = authMode === 'signup' ? '' : 'none';
    if (title) title.textContent = authMode === 'signup' ? t('authCreateTitle') : t('authSignInTitle');
    if (subtitle) {
      subtitle.textContent = authMode === 'signup'
        ? t('authCreateSubtitle')
        : t('authSignInSubtitle');
    }
    if (submitBtn) {
      submitBtn.style.display = '';
      submitBtn.textContent = authMode === 'signup' ? t('authCreateButton') : t('authSignInButton');
    }
    if (switchBtn) {
      switchBtn.style.display = '';
      switchBtn.textContent = authMode === 'signup'
        ? t('authSwitchToSignIn')
        : t('authSwitchToCreate');
    }
    if (passwordInput) {
      passwordInput.parentElement.style.display = '';
      passwordInput.setAttribute('autocomplete', authMode === 'signup' ? 'new-password' : 'current-password');
    }
    const emailInput = $('auth-email');
    if (emailInput) emailInput.parentElement.style.display = '';
  }
}


function validateAuthInput(email, password) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return {
    handleOk: emailRegex.test(email),
    lengthOk: password.length >= 8,
    mixOk: hasLetter && hasNumber,
    ok: emailRegex.test(email) && password.length >= 8 && hasLetter && hasNumber,
    messageKey: !emailRegex.test(email) ? 'authErrorHandleRule' :
                password.length < 8 ? 'authErrorPasswordLength' :
                !(hasLetter && hasNumber) ? 'authErrorPasswordMix' : null
  };
}

function updateAuthRules() {
  const email = $('auth-email')?.value || '';
  const password = $('auth-password')?.value || '';
  const validation = validateAuthInput(email, password);
    const map = {
    handle: validation.handleOk,
    'password-length': validation.lengthOk,
    'password-mix': validation.mixOk
  };
  document.querySelectorAll('#auth-rules [data-rule]').forEach(item => {
    const checked = !!map[item.dataset.rule];
    item.classList.toggle('ok', checked);
    item.classList.toggle('pending', !checked);
  });
}

// ==========================================
// SYNC LISTENER
// ==========================================
window.addEventListener('tomato-synced', (e) => {
  updateAuthUI();
  if (e.detail && e.detail.type === 'session') {
    const mode = appState.session.mode;
    if (mode === 'idle') showView(pickHomeTask() ? 'home' : 'focus');
    else showView(mode);
  }
  renderAll();
});

// ==========================================
// VIEW SWITCH
// ==========================================
function showView(name) {
  currentView = name;
  Object.entries(views).forEach(([, el]) => {
    if (!el) return;
    el.style.display = 'none';
    el.classList.remove('active');
    el.classList.add('hidden');
  });
  Object.values(navItems).forEach(n => { if (n) n.classList.remove('active-nav'); });
  Object.values(tabItems).forEach(n => { if (n) n.classList.remove('active'); });

  const target = views[name];
  if (target) {
    target.style.display = (name === 'focus' || name === 'break') ? '' : 'block';
    target.classList.remove('hidden');
    target.classList.add('active');
  }
  if (navItems[name]) navItems[name].classList.add('active-nav');
  // Sync tab active state (break view keeps focus tab active)
  const tabKey = name === 'break' ? 'focus' : name;
  if (tabItems[tabKey]) tabItems[tabKey].classList.add('active');

  // V11: Per-view atmosphere via body[data-view] attribute
  document.body.dataset.view = name;

  // V11: Update meta bar sector label
  const sectorEl = $('mb-sector');
  if (sectorEl) sectorEl.textContent = t(SECTOR_KEY[name] || 'metaSectorHome');

  // Refresh the view we're entering if data changed while it was off-screen.
  if (viewDirty[name]) renderViewData(name);

  try { set3DMode(name); } catch (e) {}
  if (name === 'focus') renderFocusLauncher();
}

// ==========================================
// RENDER ALL (lazy per-view)
// ==========================================
// Data-bearing views (home/calendar/archive). We render only the on-screen view
// eagerly and mark the others dirty so they refresh when navigated to — this keeps
// Archive/Planner off the hot path on every data change (matters as history grows).
const viewDirty = { home: false, calendar: false, archive: false };

function renderViewData(name) {
  if (name === 'home') renderHome();
  else if (name === 'calendar') renderPlanner();
  else if (name === 'archive') renderArchive();
  if (name in viewDirty) viewDirty[name] = false;
}

function renderAll() {
  renderViewData(currentView);
  for (const v in viewDirty) { if (v !== currentView) viewDirty[v] = true; }
  updateI18nDOM();
}

// ==========================================
// HOME
// ==========================================
function pickHomeTask() {
  return appState.tasks.find(t => t.status === 'active')
      || appState.tasks.find(t => t.status === 'open' && t.targetDate === getTodayStr())
      || appState.tasks.find(t => t.status === 'open')
      || null;
}

function pickNextTask(current) {
  return getNextFocusCandidate(appState.tasks, getTodayStr(), current ? current.id : null);
}

function renderHome() {
  const heroCard = document.querySelector('.hero-card');
  if (!heroCard) return;

  // Header kicker / id.
  // While a session is live (focus/break), the running session owns the active
  // task — reflect it, never override it. Only when idle do we preview a pick.
  const sessionActive = appState.session.mode !== 'idle';
  const task = sessionActive ? (getActiveTask() || pickHomeTask()) : pickHomeTask();
  const heroId = $('hero-id');
  if (heroId) heroId.textContent = task ? `// #F_${task.id}` : '// STANDBY';

  // Signal bar (# pomodoro segments out of goal)
  const bar = $('hero-signal-bar');
  const count = appState.session.pomodoroCount || 0;
  const goal = appState.session.pomodoroGoal || 4;
  if (bar) {
    let html = '';
    for (let i = 0; i < goal; i++) {
      html += `<div class="seg ${i < count ? 'on' : ''}"></div>`;
    }
    html += `<div class="sb-meta">${count}/${goal} ${t('blocks')}</div>`;
    bar.innerHTML = html;
  }

  // Hero clock
  const clockVal = $('hero-clock-value');
  const clockLabel = $('hero-clock-label');
  const mode = appState.session.mode;
  const running = appState.session.isRunning;
  if (clockVal) {
    const seconds = (mode === 'focus' || mode === 'break')
      ? appState.session.remainingSeconds
      : (task ? task.focusMinutes * 60 : 25 * 60);
    const [mm, ss] = formatTime(seconds).split(':');
    clockVal.innerHTML = `${mm}<span class="col">:</span>${ss}`;

    clockVal.classList.remove('clean', 'heavy', 'echo');
    clockVal.classList.add(running ? 'heavy' : 'echo');
  }
  if (clockLabel) {
    if (running && mode === 'focus') clockLabel.textContent = t('heroRunning');
    else if (mode === 'focus' && !running) clockLabel.textContent = t('heroPaused');
    else clockLabel.textContent = t('heroStandby');
  }
  heroCard.classList.toggle('running', running && mode === 'focus');

  // Hero task
  const htTitle = $('ht-title');
  const htMeta = $('ht-meta');
  const htKicker = $('ht-kicker');
  const htRight = $('ht-next');
  const heroTaskEl = document.querySelector('.hero-task');

  if (task) {
    if (htTitle) htTitle.textContent = task.title;
    if (htMeta) htMeta.textContent = `${task.focusMinutes} ${t('minFocusLabel')} / ${task.breakMinutes || 5} ${t('minRestLabel')} · ${task.timeLabel || '--:--'}`;
    if (htKicker) htKicker.textContent = t('heroNowKicker');
    // Only an idle home may set the active task / preview duration. A running or
    // paused session must keep ownership of activeTaskId + remainingSeconds.
    if (!sessionActive) {
      appState.session.activeTaskId = task.id;
      appState.session.remainingSeconds = task.focusMinutes * 60;
    }

    const next = pickNextTask(task);
    if (next && htRight) {
      htRight.style.display = '';
      $('ht-next-title').textContent = next.title;
      $('ht-next-time').textContent = next.timeLabel || '--:--';
      heroTaskEl.classList.remove('empty');
    } else if (htRight) {
      htRight.style.display = 'none';
      heroTaskEl.classList.add('empty');
    }
  } else {
    if (htTitle) htTitle.textContent = t('syncState');
    // syncMeta carries markup (&nbsp; + <span>) — render as HTML, not literal text.
    if (htMeta) htMeta.innerHTML = t('syncMeta');
    if (htRight) htRight.style.display = 'none';
    if (heroTaskEl) heroTaskEl.classList.add('empty');
  }

  // CTA disabled when no task
  // Always allow starting — with no task it begins a generic 25-minute block.
  const btnBegin = $('btn-hero-begin');
  if (btnBegin) btnBegin.disabled = false;

  // Right-col panels
  renderTodayList();
  renderStatGrid();
  renderStreakDots();
  renderRecentStrip();
}

function renderTodayList() {
  const el = $('today-list');
  const summary = $('slots-summary');
  if (!el) return;
  const today = getTodayStr();
  const todayTasks = appState.tasks
    .filter(t => t.targetDate === today)
    .sort((a, b) => (a.timeLabel || '99:99').localeCompare(b.timeLabel || '99:99'));

  if (summary) {
    const done = todayTasks.filter(t => t.status === 'done').length;
    summary.textContent = `${done} / ${todayTasks.length}`;
  }

  if (todayTasks.length === 0) {
    el.innerHTML = `<div class="today-row empty" data-action="plan"><span>${t('emptySlot')}</span></div>`;
    el.querySelector('.today-row.empty').onclick = () => { showView('calendar'); };
    return;
  }

  el.innerHTML = todayTasks.map(task => `
    <div class="today-row ${task.status || 'open'}" data-id="${task.id}">
      <span class="time">${task.timeLabel || '--:--'}</span>
      <span class="glyph"></span>
      <span class="label">${task.title}</span>
      <span class="tag">${task.focusMinutes}M</span>
    </div>
  `).join('');

  el.querySelectorAll('.today-row[data-id]').forEach(row => {
    row.onclick = () => {
      const taskId = row.dataset.id;
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;
      // Don't reassign the task out from under a live session.
      if (appState.session.mode !== 'idle') return;
      appState.session.activeTaskId = task.id;
      if (task.status === 'open' || task.status === 'active') {
        appState.session.remainingSeconds = task.focusMinutes * 60;
      }
      renderHome();
    };
  });
}

function renderStatGrid() {
  const el = $('stat-grid');
  if (!el) return;
  const today = getTodayStr();
  const todayHist = appState.history.filter(h => h.date === today);
  // Honest, actual elapsed focus time (falls back to planned for legacy records) —
  // single source of truth shared with the Archive stats.
  const todayMin = getTotalFocusMinutes(todayHist);
  const weekMin = getLast7DaysFocusMinutes(appState.history, today);
  const totalMin = getTotalFocusMinutes(appState.history);

  // Streak: consecutive days ending today/yesterday
  const streak = computeStreak();

  el.innerHTML = `
    <div class="stat accent">
      <div class="sk">${t('statToday')}</div>
      <div class="sv">${todayMin}</div>
      <div class="ss">${t('min')}</div>
    </div>
    <div class="stat">
      <div class="sk">${t('statWeek')}</div>
      <div class="sv">${weekMin}</div>
      <div class="ss">${t('min')}</div>
    </div>
    <div class="stat ${streak > 0 ? 'accent' : ''}">
      <div class="sk">${t('statStreak')}</div>
      <div class="sv">${streak}</div>
      <div class="ss">${t('dayUnit')}</div>
    </div>
    <div class="stat">
      <div class="sk">${t('statTotal')}</div>
      <div class="sv">${totalMin}</div>
      <div class="ss">${t('min')}</div>
    </div>
  `;
}

function computeStreak() {
  const datesWithHistory = new Set(appState.history.map(h => h.date));
  let streak = 0;
  const d = new Date();
  // Allow streak to start today or yesterday
  if (!datesWithHistory.has(fmtDate(d))) {
    d.setDate(d.getDate() - 1);
    if (!datesWithHistory.has(fmtDate(d))) return 0;
  }
  while (datesWithHistory.has(fmtDate(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderStreakDots() {
  const el = $('streak-dots');
  if (!el) return;
  const datesWithHistory = new Set(appState.history.map(h => h.date));
  let html = '';
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = fmtDate(d);
    const lit = datesWithHistory.has(key) ? 'lit' : '';
    html += `<span class="${lit}" title="${key}"></span>`;
  }
  el.innerHTML = html;
}

const MINI_SYMS = ['■', '▲', '●', '◆', '▼', '◐', '□'];
function symbolFor(title) {
  if (!title) return '●';
  const code = title.charCodeAt(0) || 0;
  return MINI_SYMS[code % MINI_SYMS.length];
}
function colorFor(dur) {
  if (dur >= 50) return 'white';
  if (dur >= 40) return 'red';
  return 'dark';
}

function renderRecentStrip() {
  const el = $('recent-strip');
  const summary = $('recent-summary');
  if (!el) return;
  const recent = [...appState.history].reverse().slice(0, 4);
  if (summary) summary.textContent = `${appState.history.length} ${t('rituals')}`;

  if (recent.length === 0) {
    el.innerHTML = `
      <div class="mini-ritual empty">
        <div class="sym">+</div>
        <div class="t">${t('awaitNext')}</div>
      </div>
    `;
    return;
  }
  el.innerHTML = recent.map((h) => {
    const color = colorFor(h.focusMinutes || 25);
    const sym = symbolFor(h.title);
    return `
      <div class="mini-ritual ${color}" data-hid="${h.id || ''}">
        <div class="id">R-${String(h.id || '').slice(-3).padStart(3, '0')}</div>
        <div class="sym">${sym}</div>
        <div class="t">${(h.title || 'RITUAL').split(' ').slice(0, 2).join(' ')}</div>
        <div class="d">${h.focusMinutes || 25}M</div>
      </div>
    `;
  }).join('');
  el.querySelectorAll('.mini-ritual[data-hid]').forEach(card => {
    card.onclick = () => {
      const hid = card.dataset.hid;
      const record = appState.history.find(h => h.id === hid);
      if (record) openRitualSheet(record);
    };
  });
}

// ==========================================
// PLANNER
// ==========================================
const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

function selectDate(dateStr) {
  appState.session.selectedDate = dateStr;
  saveSession();
  renderRightPane();
  document.querySelectorAll('.cal-cell').forEach(el => {
    el.classList.toggle('selected-cell', el.dataset.date === dateStr);
  });
}

function renderPlanner() {
  const calGrid = $('calendar-grid');
  const calTitle = $('cal-month-title');
  if (!calGrid || !calTitle) return;

  calGrid.querySelectorAll('.cal-cell').forEach(el => el.remove());

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + appState.session.calendarOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  calTitle.textContent = `${year}. ${monthNames[month]}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const selected = appState.session.selectedDate || getTodayStr();

  const cells = [];
  for (let i = 0; i < 42; i++) {
    let cy, cm, cd, other = false;
    if (i < firstDay) {
      cy = month === 0 ? year - 1 : year;
      cm = month === 0 ? 11 : month - 1;
      cd = daysInPrev - firstDay + i + 1;
      other = true;
    } else if (i >= firstDay + daysInMonth) {
      cy = month === 11 ? year + 1 : year;
      cm = month === 11 ? 0 : month + 1;
      cd = i - firstDay - daysInMonth + 1;
      other = true;
    } else {
      cy = year; cm = month; cd = i - firstDay + 1;
    }
    const dateStr = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(cd).padStart(2, '0')}`;
    const isToday = dateStr === getTodayStr();
    const isSelected = dateStr === selected;
    const all = [
      ...appState.tasks.filter(t => t.targetDate === dateStr),
      ...appState.aiTasks.filter(t => t.targetDate === dateStr).map(t => ({ ...t, isTentative: true }))
    ].sort((a, b) => (a.timeLabel || '').localeCompare(b.timeLabel || ''));

    let tasksHTML = '';
    all.slice(0, 4).forEach(task => {
      let cls = task.isTentative ? 'tentative' : '';
      if (!task.isTentative) {
        if (task.status === 'active') cls = 'active';
        if (task.status === 'done') cls = 'done';
        if (task.status === 'missed') cls = 'missed';
      }
      tasksHTML += `<div class="cal-task-item ${cls}" data-id="${task.id}" title="${task.title}">${task.timeLabel || '--:--'} ${task.title}</div>`;
    });
    if (all.length > 4) {
      tasksHTML += `<div class="cal-task-item" style="opacity:0.5">+${all.length - 4}</div>`;
    }

    cells.push(`
      <div class="cal-cell ${other ? 'other-month' : ''} ${isToday ? 'today-cell' : ''} ${isSelected ? 'selected-cell' : ''} ${all.length > 0 ? 'has-tasks' : ''}" data-date="${dateStr}">
        <span class="cal-date-label">${cd}</span>
        ${all.length > 0 ? `<span class="cal-task-count">${all.length}</span>` : ''}
        <div class="cal-tasks">${tasksHTML}</div>
      </div>
    `);
  }
  calGrid.insertAdjacentHTML('beforeend', cells.join(''));

  renderRightPane();
  bindPlannerEvents();
}

function renderRightPane() {
  const selected = appState.session.selectedDate || getTodayStr();

  const dateDisplay = $('selected-date-display');
  if (dateDisplay) {
    const d = new Date(selected + 'T00:00:00');
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    dateDisplay.textContent = `${selected} // ${days[d.getDay()]}`;
    dateDisplay.classList.toggle('is-today', selected === getTodayStr());
  }

  // Scheduled
  const scheduledList = $('scheduled-task-list');
  if (scheduledList) {
    const sched = appState.tasks
      .filter(t => t.targetDate === selected)
      .sort((a, b) => (a.timeLabel || '').localeCompare(b.timeLabel || ''));
    if (sched.length === 0) {
      scheduledList.innerHTML = `<div class="empty-queue-msg">${t('noScheduled')}</div>`;
    } else {
      scheduledList.innerHTML = sched.map(task => {
        let cls = '';
        if (task.status === 'active') cls = 'active';
        if (task.status === 'done') cls = 'done';
        if (task.status === 'missed') cls = 'missed';
        return `
          <div class="console-task-item ${cls} interactable" data-id="${task.id}">
            <span class="console-task-time">${task.timeLabel || '--:--'}</span>
            <span class="console-task-title">${task.title}</span>
            <span class="console-task-dur">${task.focusMinutes}m</span>
          </div>
        `;
      }).join('');
      scheduledList.querySelectorAll('.console-task-item').forEach(el => {
        el.addEventListener('click', () => showTaskDetail(el.dataset.id));
      });
    }
  }

  // Unscheduled
  const queueList = $('ai-queue-list');
  if (queueList) {
    const unsched = appState.tasks.filter(t => !t.targetDate && t.status !== 'done');
    if (unsched.length === 0) {
      queueList.innerHTML = `<div class="empty-queue-msg">${t('noUnscheduled')}</div>`;
    } else {
      queueList.innerHTML = unsched.map(task => `
        <div class="console-task-item interactable" data-id="${task.id}">
          <span class="console-task-title">${task.title}</span>
          <span class="console-task-dur">${task.focusMinutes}m</span>
        </div>
      `).join('');
      queueList.querySelectorAll('.console-task-item').forEach(el => {
        el.addEventListener('click', () => showTaskDetail(el.dataset.id));
      });
    }
  }

  // AI output
  const aiSection = $('ai-output-section');
  const aiOutputList = $('ai-output-list');
  if (aiSection && aiOutputList) {
    if (appState.aiTasks.length === 0) {
      aiSection.classList.add('hidden');
    } else {
      aiSection.classList.remove('hidden');
      aiOutputList.innerHTML = appState.aiTasks.map(task => `
        <div class="ai-task-card">
          <span class="task-duration">${task.focusMinutes}m</span>
          <div>${task.title}</div>
          <div style="font-size:0.7rem;color:var(--text-dim);margin-top:0.4rem;letter-spacing:0.1em;">${task.targetDate} / ${task.timeLabel}</div>
        </div>
      `).join('');
    }
  }

  // Refresh task detail card if it's showing a stale task
  if (selectedTaskId) {
    const still = appState.tasks.find(t => t.id === selectedTaskId);
    if (still && still.targetDate === selected) showTaskDetail(selectedTaskId);
    else {
      $('task-detail-section')?.classList.add('hidden');
      selectedTaskId = null;
    }
  }
}

function showTaskDetail(taskId) {
  const section = $('task-detail-section');
  const card = $('task-detail-card');
  const btnBegin = $('btn-task-begin');
  const btnEdit = $('btn-task-edit');
  if (!section || !card) return;

  const task = appState.tasks.find(t => t.id === taskId);
  if (!task) { section.classList.add('hidden'); selectedTaskId = null; return; }
  selectedTaskId = taskId;

  card.innerHTML = `
    <div class="detail-id">#F_${task.id} // ${task.focusMinutes}${t('min')} RITUAL</div>
    <div class="detail-title">${task.title}</div>
    <div class="detail-meta">
      <span>${task.focusMinutes} ${t('minFocusLabel')} / ${task.breakMinutes || 5} ${t('minRestLabel')}</span>
      <span class="detail-status status-${task.status || 'open'}">${(task.status || 'open').toUpperCase()}</span>
    </div>
    ${task.timeLabel ? `<div class="detail-slot">SLOT: ${task.timeLabel}</div>` : ''}
  `;
  section.classList.remove('hidden');

  if (btnBegin) {
    const canStart = task.status === 'open' || task.status === 'active';
    btnBegin.style.display = canStart ? '' : 'none';
    btnBegin.onclick = () => startTaskRitual(task);
  }
  if (btnEdit) btnEdit.onclick = () => openEditModal(taskId);

  document.querySelectorAll('.cal-task-item').forEach(el => {
    el.classList.toggle('highlighted', el.dataset.id === taskId);
  });
}

// ==========================================
// FOCUS BUILDER
// ==========================================
function setDefaultFocusDraftTime() {
  const el = $('focus-draft-time');
  if (!el || el.value) return;
  const now = new Date();
  el.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getFocusDraft() {
  const title = ($('focus-draft-title')?.value || '').trim();
  const focusMinutes = Math.max(5, Math.min(120, parseInt($('focus-draft-minutes')?.value, 10) || 25));
  const breakMinutes = Math.max(1, Math.min(30, parseInt($('focus-draft-break')?.value, 10) || 5));
  const now = new Date();
  const fallbackTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const timeLabel = ($('focus-draft-time')?.value || fallbackTime).trim();
  return { title, focusMinutes, breakMinutes, timeLabel };
}

function showFocusDraftStatus(messageKey, tone = '') {
  const el = $('focus-setup-status');
  if (!el) return;
  el.textContent = t(messageKey);
  el.classList.remove('ok', 'error');
  if (tone) el.classList.add(tone);
}

function createTaskFromFocusDraft({ startNow = false } = {}) {
  const draft = getFocusDraft();
  if (!draft.title) {
    showFocusDraftStatus('focusDraftRequired', 'error');
    $('focus-draft-title')?.focus();
    return null;
  }

  const task = {
    id: 't_' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(2, 4),
    title: draft.title.toUpperCase(),
    focusMinutes: draft.focusMinutes,
    breakMinutes: draft.breakMinutes,
    status: startNow ? 'active' : 'open',
    timeLabel: draft.timeLabel,
    targetDate: getTodayStr(),
    createdAt: Date.now(),
    order: appState.tasks.length
  };
  appState.tasks.push(task);
  saveTasks();

  if (startNow) {
    showFocusDraftStatus('focusStarting', 'ok');
    startTaskRitual(task);
  } else {
    showFocusDraftStatus('focusSavedToday', 'ok');
    $('focus-draft-title').value = '';
    renderAll();
    renderFocusLauncher();
  }
  return task;
}

function renderFocusLauncher() {
  const setup = $('focus-setup');
  if (!setup) return;
  const timerActive = appState.session.mode === 'focus' && appState.session.remainingSeconds > 0;
  const breakActive = appState.session.mode === 'break' && appState.session.remainingSeconds > 0;
  const showSetup = !timerActive && !breakActive;
  const view = $('view-focus');

  if (view) {
    view.classList.toggle('setup-mode', showSetup);
    view.classList.toggle('timer-mode', !showSetup);
  }
  document.body.dataset.view = showSetup ? 'focus-setup' : (breakActive ? 'break' : 'focus');
  setup.style.display = showSetup ? '' : 'none';
  show($('fs-poly-svg'), !showSetup);
  show($('time-left')?.closest('.fs-inner'), !showSetup);
  show($('focus-controls'), !showSetup);
  show(document.querySelector('#view-focus .fs-timeline'), !showSetup);

  if (!showSetup) return;

  setDefaultFocusDraftTime();
  const status = $('focus-setup-status');
  if (status && !status.classList.contains('ok') && !status.classList.contains('error')) {
    status.textContent = appState.auth.user ? `${appState.auth.user.displayName || appState.auth.user.handle}` : t('focusPrivateSpace');
  }
  const today = getTodayStr();
  const queue = appState.tasks
    .filter(task => task.targetDate === today && task.status !== 'done' && task.status !== 'missed')
    .sort((a, b) => (a.timeLabel || '99:99').localeCompare(b.timeLabel || '99:99'));
  const list = $('focus-launch-list');
  const summary = $('focus-queue-summary');
  if (summary) summary.textContent = `${queue.length}`;
  if (list) {
    if (queue.length === 0) {
      list.innerHTML = `<div class="empty-queue-msg">${t('focusNoQueue')}</div>`;
    } else {
      list.innerHTML = queue.map(task => `
        <button class="focus-launch-row ${task.status || 'open'}" data-id="${task.id}" type="button">
          <span class="time">${task.timeLabel || '--:--'}</span>
          <span class="title">${task.title}</span>
          <span class="dur">${task.focusMinutes}${t('min')}</span>
        </button>
      `).join('');
      list.querySelectorAll('[data-id]').forEach(row => {
        row.onclick = () => {
          const task = appState.tasks.find(item => item.id === row.dataset.id);
          if (task) startTaskRitual(task);
        };
      });
    }
  }

  const recent = [...appState.history].reverse().slice(0, 3);
  const recentList = $('focus-recent-list');
  const recentSummary = $('focus-recent-summary');
  if (recentSummary) recentSummary.textContent = `${appState.history.length}`;
  if (recentList) {
    recentList.innerHTML = recent.length
      ? recent.map(item => `
          <div class="focus-recent-row">
            <span>${item.title || t('untitled')}</span>
            <b>${item.focusMinutes || 25}${t('min')}</b>
          </div>
        `).join('')
      : `<div class="empty-queue-msg">${t('noRitualsYet')}</div>`;
  }
}

function bindFocusLauncher() {
  const form = $('focus-draft-form');
  const saveBtn = $('btn-focus-save-today');
  const minutesInput = $('focus-draft-minutes');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      createTaskFromFocusDraft({ startNow: true });
    });
  }
  if (saveBtn) {
    saveBtn.onclick = () => createTaskFromFocusDraft({ startNow: false });
  }
  document.querySelectorAll('.focus-preset').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.focus-preset').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      if (minutesInput) minutesInput.value = btn.dataset.focusMin;
    };
  });
  if (minutesInput) {
    minutesInput.addEventListener('input', () => {
      document.querySelectorAll('.focus-preset').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.focusMin === minutesInput.value);
      });
    });
  }
}

function startTaskRitual(task) {
  task.status = 'active';
  saveTasks();
  try { triggerRitualManeuver(); } catch (e) {}

  setTimeout(() => {
    // timer.js is the single engine: startFocus sets mode, completionKey,
    // endTime and begins ticking (and logs history exactly once on expiry).
    startFocus(task);
    showView('focus');
    try { set3DMode('focus'); } catch (e) {}
    syncWidgetState();
    updateFocusHUD();
  }, 300);
}

// Begin a focus session when no task is selected — a plain 25-minute block.
function startQuickRitual() {
  showView('focus');
  renderFocusLauncher();
}

function initPlannerNav() {
  const btnPrev = $('cal-prev');
  const btnNext = $('cal-next');
  const btnToday = $('cal-today');
  const btnAdd = $('btn-add-task');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      appState.session.calendarOffset--;
      saveSession();
      renderPlanner();
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      appState.session.calendarOffset++;
      saveSession();
      renderPlanner();
    });
  }
  if (btnToday) {
    btnToday.addEventListener('click', () => {
      appState.session.calendarOffset = 0;
      appState.session.selectedDate = getTodayStr();
      saveSession();
      renderPlanner();
    });
  }
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      const date = appState.session.selectedDate || getTodayStr();
      openEditModal(null, date);
    });
  }

  // AI apply / regen (delegated)
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-ai-apply') {
      appState.aiTasks.forEach(t => {
        appState.tasks.push({
          id: t.id, title: t.title, focusMinutes: t.focusMinutes, breakMinutes: t.breakMinutes,
          status: 'open', timeLabel: t.timeLabel, targetDate: t.targetDate,
          order: appState.tasks.length
        });
      });
      appState.aiTasks = [];
      saveTasks();
      renderAll();
    }
    if (e.target.id === 'btn-ai-regen') {
      appState.aiTasks = [];
      renderAll();
    }
  });
}

function bindPlannerEvents() {
  const calGrid = $('calendar-grid');
  if (!calGrid) return;
  calGrid.querySelectorAll('.cal-task-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      showTaskDetail(el.dataset.id);
    });
  });
  calGrid.querySelectorAll('.cal-cell').forEach(el => {
    el.addEventListener('click', () => selectDate(el.dataset.date));
    el.addEventListener('dblclick', () => openEditModal(null, el.dataset.date));
  });
}

// ==========================================
// ARCHIVE
// ==========================================
function renderArchive() {
  renderArchiveStats();
  renderArchiveReview();
  renderArchiveGrid();
  bindArchiveFilters();
}

// Wire the filter chips, search box and sort control. Idempotent — re-running
// just refreshes the bound handlers and reflects current state in the DOM.
function bindArchiveFilters() {
  document.querySelectorAll('#filter-chips .filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === currentArchiveFilter);
    chip.onclick = () => {
      currentArchiveFilter = chip.dataset.filter || 'all';
      document.querySelectorAll('#filter-chips .filter-chip')
        .forEach(c => c.classList.toggle('active', c === chip));
      renderArchiveGrid();
    };
  });

  const searchInput = $('archive-search');
  if (searchInput) {
    if (searchInput.value !== currentArchiveSearch) searchInput.value = currentArchiveSearch;
    searchInput.oninput = () => {
      currentArchiveSearch = searchInput.value;
      renderArchiveGrid();
    };
  }

  const sortSelect = $('archive-sort');
  if (sortSelect) {
    if (sortSelect.value !== currentArchiveSort) sortSelect.value = currentArchiveSort;
    sortSelect.onchange = () => {
      currentArchiveSort = sortSelect.value || 'newest';
      renderArchiveGrid();
    };
  }
}

function renderArchiveStats() {
  const el = $('arch-stats');
  if (!el) return;
  const today = getTodayStr();
  const history = appState.history;
  // historyInsight.service: actualSeconds-accurate analytics (single source of truth).
  const todayHist = history.filter(h => h.date === today);
  const totalMin = getTotalFocusMinutes(history);
  const streak = getCurrentStreak(history, today);

  el.innerHTML = `
    <div class="arch-stat accent">
      <span class="lbl">${t('statTotal')}</span>
      <span class="val">${history.length}</span>
    </div>
    <div class="arch-stat">
      <span class="lbl">${t('statToday')}</span>
      <span class="val">${todayHist.length}</span>
    </div>
    <div class="arch-stat">
      <span class="lbl">${t('statStreak')}</span>
      <span class="val">${streak}${t('dayUnit')}</span>
    </div>
    <div class="arch-stat">
      <span class="lbl">${t('totalFocus')}</span>
      <span class="val">${totalMin}</span>
    </div>
  `;
}

async function renderArchiveReview() {
  const el = $('archive-review');
  if (!el) return;
  const history = appState.history;
  if (history.length === 0) {
    el.innerHTML = `
      <div class="archive-review-empty">
        <div class="console-section-label">${t('archiveReviewTitle')}</div>
        <div>${t('archiveReviewEmpty')}</div>
      </div>
    `;
    return;
  }

  const today = getTodayStr();
  const best = getBestFocusDay(history);
  const longest = getLongestFocusSession(history);
  const calmest = getLeastInterruptedSession(history);
  const weekMin = getLast7DaysFocusMinutes(history, today);
  const avgMin = Math.round(getTotalFocusMinutes(history) / history.length);
  const longestMin = longest ? Math.round((longest.actualSeconds || longest.focusMinutes * 60) / 60) : 0;

  el.innerHTML = `
    <div class="archive-review-main">
      <div class="console-section-label">${t('archiveReviewTitle')}</div>
      <div class="archive-review-title">${t('archiveReviewHeadline')}</div>
      <div class="archive-review-meta">
        <span>${t('archiveThisWeek')}: <b>${weekMin}${t('min')}</b></span>
        <span>${t('archiveAverage')}: <b>${avgMin}${t('min')}</b></span>
      </div>
      <div id="ai-insight-container" style="margin-top: 16px; padding: 12px; border: 1px dashed var(--accent); color: var(--fg); font-family: 'JetBrains Mono', monospace; font-size: 0.85em; white-space: pre-wrap;">[ ANALYZING SIGNAL... ]</div>
    </div>
    <div class="archive-review-cards">
      <div class="archive-review-card">
        <span>${t('archiveBestDay')}</span>
        <b>${best && best.date ? best.date.slice(5).replace('-', '.') : '--'}</b>
      </div>
      <div class="archive-review-card">
        <span>${t('archiveLongestSession')}</span>
        <b>${longestMin}${t('min')}</b>
      </div>
      <div class="archive-review-card">
        <span>${t('archiveCalmest')}</span>
        <b>${calmest ? calmest.title : '--'}</b>
      </div>
    </div>
  `;

  if (appState.prefs && appState.prefs.archiveInsightEnabled) {
    const insight = await generateArchiveInsight();
    const insightEl = $('ai-insight-container');
    if (insightEl) {
      insightEl.textContent = insight;
    }
  } else {
    const insightEl = $('ai-insight-container');
    if (insightEl) insightEl.style.display = 'none';
  }
}

function renderArchiveGrid() {
  const el = $('archive-gallery');
  if (!el) return;
  const history = appState.history || [];

  // Backfill ids once (legacy records) so cards stay clickable.
  let assignedIds = false;
  history.forEach(h => {
    if (!h.id) {
      h.id = `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      assignedIds = true;
    }
  });
  if (assignedIds) saveHistory();

  // No records at all → first-run empty state.
  if (history.length === 0) {
    el.innerHTML = `
      <div class="archive-grid">
        <div class="rcard empty">
          <div class="sym">+</div>
          <div class="title">${t('awaitNext')}</div>
        </div>
      </div>
      <div class="empty-queue-msg">${t('noRitualsYet')}</div>
    `;
    return;
  }

  const groups = queryArchive(history, {
    filter: currentArchiveFilter,
    search: currentArchiveSearch,
    sort: currentArchiveSort,
    today: getTodayStr()
  });

  // Records exist but the current filter/search hides them all.
  if (groups.length === 0) {
    el.innerHTML = `<div class="empty-queue-msg">${t('archiveNoMatch')}</div>`;
    return;
  }

  let html = '';
  groups.forEach(({ date, items, count, totalMin }) => {
    html += `
      <div class="archive-date-group">
        <div class="archive-date-header">
          <span>${date}</span>
          <span>${count} ${t('rituals')} // ${totalMin} ${t('min')}</span>
        </div>
        <div class="archive-grid">
          ${items.map(h => rcardHTML(h)).join('')}
        </div>
      </div>
    `;
  });
  // Append "next" empty card (only on the default, unfiltered view).
  if (currentArchiveFilter === 'all' && !currentArchiveSearch) {
    html += `
      <div class="archive-grid">
        <div class="rcard empty" data-action="next">
          <div class="sym">+</div>
          <div class="title">${t('awaitNext')}</div>
        </div>
      </div>
    `;
  }
  el.innerHTML = html;

  el.querySelectorAll('.rcard[data-hid]').forEach(card => {
    card.onclick = () => {
      const record = appState.history.find(h => h.id === card.dataset.hid);
      if (record) openRitualSheet(record);
    };
  });
  el.querySelectorAll('.rcard[data-action="next"]').forEach(card => {
    card.onclick = () => showView('home');
  });
}

function fmtDur(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) return `${s} SEC`;
  return `${Math.round(s / 60)} MIN`;
}

function rcardHTML(h) {
  const color = colorFor(h.focusMinutes || 25);
  const sym = symbolFor(h.title);
  const shortId = `R-${String(h.id || '').slice(-3).padStart(3, '0')}`;
  const dateStamp = (h.date || '').slice(5).replace('-', '.');
  // Show real elapsed time; legacy records fall back to the planned block.
  const actual = h.actualSeconds != null ? h.actualSeconds : (h.focusMinutes || 25) * 60;
  const partial = h.completionType === 'manual_complete' && h.plannedSeconds && actual < h.plannedSeconds * 0.95;
  const reflectSnippet = h.reflection ? `<div class="reflect-snippet">"${escapeAttr(h.reflection)}"</div>` : '';
  return `
    <div class="rcard ${color}" data-hid="${h.id}">
      <div class="rc-top">
        <span class="id">${shortId}</span>
        <span class="stamp">${dateStamp}</span>
      </div>
      <div class="sym">${sym}</div>
      <div class="rc-btm">
        <div class="title">${h.title || 'RITUAL'}</div>
        <div class="dur${partial ? ' partial' : ''}">${fmtDur(actual)}</div>
      </div>
      ${reflectSnippet}
    </div>
  `;
}

// ==========================================
// RITUAL SHEET (Archive detail)
// ==========================================
function openRitualSheet(record) {
  const backdrop = $('sheet-backdrop');
  const sheetId = $('sheet-id');
  const sheetTitle = $('sheet-title');
  const sheetDl = $('sheet-dl');
  const sheetRef = $('sheet-ref');
  const siFill = $('si-fill');
  const siValue = $('si-value');

  if (!backdrop) return;

  const cDate = new Date(record.completedAt || Date.now());
  const dateStr = `${cDate.getFullYear()}.${String(cDate.getMonth()+1).padStart(2,'0')}.${String(cDate.getDate()).padStart(2,'0')} / ${String(cDate.getHours()).padStart(2,'0')}:${String(cDate.getMinutes()).padStart(2,'0')}`;

  // Real elapsed vs planned — fall back to planned for legacy (pre-V11) records.
  const plannedSeconds = record.plannedSeconds || (record.focusMinutes || 25) * 60;
  const actualSeconds = record.actualSeconds != null ? record.actualSeconds : plannedSeconds;
  const plannedMin = Math.round(plannedSeconds / 60);
  const pct = plannedSeconds > 0 ? Math.min(100, Math.round((actualSeconds / plannedSeconds) * 100)) : 100;
  const statusKey = {
    manual_complete: 'ritualStatusManual',
    recovered_complete: 'ritualStatusRecovered',
    widget_complete: 'ritualStatusWidget'
  }[record.completionType] || 'ritualComplete';

  if (sheetId) sheetId.textContent = `RITUAL // ${String(record.id || '').slice(-5)}`;
  if (sheetTitle) sheetTitle.textContent = record.title || t('untitled');
  if (sheetDl) {
    const plannerSlot = record.targetDate && record.timeLabel ? `${record.targetDate} / ${record.timeLabel}` : '—';
    sheetDl.innerHTML = `
      <dt>${t('ritualDate')}</dt><dd>${dateStr}</dd>
      <dt>${t('ritualDuration')}</dt><dd class="red">${formatTime(actualSeconds)} <span class="dd-sub">/ ${t('ritualPlanned')} ${plannedMin} MIN</span></dd>
      <dt>${t('linkedTask')}</dt><dd>${record.title || '--'}</dd>
      <dt>${t('sequence')}</dt><dd>${record.sequence || 1}${ordinalSuffix(record.sequence || 1)} RITUAL</dd>
      <dt>${t('ritualPlannerSlot')}</dt><dd class="link" data-planner="${record.targetDate || ''}">${plannerSlot}</dd>
      <dt>${t('ritualStatus')}</dt><dd class="red">${t(statusKey)}</dd>
    `;
    sheetDl.querySelectorAll('[data-planner]').forEach(el => {
      el.onclick = () => {
        const date = el.dataset.planner;
        if (!date) return;
        navigateToPlannerDate(date);
      };
    });
  }
  // Signal intensity — honest ratio of actual focus time vs the planned block.
  if (siFill && siValue) {
    siFill.style.width = '0%';
    requestAnimationFrame(() => { siFill.style.width = `${pct}%`; });
    siValue.textContent = `${pct}% ${pct >= 95 ? t('signalSteady') : t('signalPartial')}`;
  }
  
  const noteText = record.reflection ? record.reflection : (record.systemNote || t('ritualReflection'));
  if (sheetRef) sheetRef.textContent = `"${noteText}"`;

  // Action handlers
  $('btn-sheet-plan').onclick = () => navigateToPlannerDate(record.targetDate || record.date);
  $('btn-sheet-reexec').onclick = () => reExecuteRitual(record);

  backdrop.classList.remove('hidden');
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function closeRitualSheet() {
  $('sheet-backdrop')?.classList.add('hidden');
}

function navigateToPlannerDate(date) {
  closeRitualSheet();
  if (!date) { showView('calendar'); return; }
  // Compute calendarOffset to land on target month
  const target = new Date(date + 'T00:00:00');
  const now = new Date();
  const diffMonths = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  appState.session.calendarOffset = diffMonths;
  appState.session.selectedDate = date;
  saveSession();
  showView('calendar');
  renderPlanner();
}

function reExecuteRitual(record) {
  const now = new Date();
  const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const newTask = {
    id: 't_' + Date.now().toString().slice(-6),
    title: record.title || 'RITUAL',
    focusMinutes: record.focusMinutes || 25,
    breakMinutes: record.breakMinutes || 5,
    status: 'active',
    timeLabel,
    targetDate: getTodayStr(),
    order: appState.tasks.length
  };
  appState.tasks.push(newTask);
  saveTasks();
  closeRitualSheet();
  startTaskRitual(newTask);
}

function bindSheet() {
  const backdrop = $('sheet-backdrop');
  const btnClose = $('btn-sheet-close');
  const btnClose2 = $('btn-sheet-close-2');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeRitualSheet();
    });
  }
  if (btnClose) btnClose.onclick = closeRitualSheet;
  if (btnClose2) btnClose2.onclick = closeRitualSheet;
}

function bindArchive() {
  // Archive gallery clicks are bound in renderArchiveGrid
  bindVault();
}

// ==========================================
// DATA VAULT — Export / Import (exportImport.service)
// ==========================================
function setVaultStatus(key, tone = '') {
  const el = $('vault-status');
  if (!el) return;
  el.textContent = key ? t(key) : '';
  el.classList.remove('ok', 'error');
  if (tone) el.classList.add(tone);
}

function bindVault() {
  const btnExport = $('btn-export');
  const btnImport = $('btn-import');
  const fileInput = $('import-file');
  if (!btnExport || !btnImport || !fileInput) return;

  btnExport.onclick = () => {
    if (!appState.auth.user) return;
    if (appState.tasks.length === 0 && appState.history.length === 0) {
      setVaultStatus('vaultNoData', 'error');
      return;
    }
    const ok = exportData();
    setVaultStatus(ok ? 'vaultExported' : 'vaultImportError', ok ? 'ok' : 'error');
  };

  btnImport.onclick = () => {
    if (!appState.auth.user) return;
    fileInput.value = '';
    fileInput.click();
  };

  fileInput.onchange = () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    setVaultStatus('vaultImporting');
    const reader = new FileReader();
    reader.onload = () => {
      const applyImport = (opts) => {
        const result = importData(String(reader.result || ''), opts);
        if (result.requiresConfirmation) {
          if (window.confirm(t('vaultImportMismatch'))) {
            applyImport({ merge: false, forceDifferentUser: true });
          } else {
            setVaultStatus('', '');
          }
          return;
        }
        if (result.success) {
          updateI18nDOM();
          renderAll();
          setVaultStatus('vaultImportSuccess', 'ok');
        } else {
          setVaultStatus('vaultImportError', 'error');
        }
      };
      applyImport({ merge: false });
    };
    reader.onerror = () => setVaultStatus('vaultImportError', 'error');
    reader.readAsText(file);
  };
}

// ==========================================
// EDIT MODAL
// ==========================================
function openEditModal(taskId, targetDate = getTodayStr()) {
  const modal = $('edit-modal');
  if (!modal) return;
  currentModalDate = targetDate;

  const elTitle = $('edit-title');
  const elFocus = $('edit-focus');
  const elBreak = $('edit-break');
  const elTime = $('edit-time');
  const elTaskId = $('edit-task-id');
  const btnDelete = $('btn-modal-delete');

  if (taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;
    elTitle.value = task.title;
    elFocus.value = task.focusMinutes;
    elBreak.value = task.breakMinutes || 5;
    elTime.value = task.timeLabel || '';
    elTaskId.value = task.id;
    if (btnDelete) btnDelete.style.display = '';
  } else {
    elTitle.value = '';
    elFocus.value = 25;
    elBreak.value = 5;
    if (targetDate === getTodayStr()) {
      const now = new Date();
      elTime.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    } else {
      elTime.value = '12:00';
    }
    elTaskId.value = '';
    if (btnDelete) btnDelete.style.display = 'none';
  }

  // Reset AI section
  $('ai-subdivide-section')?.classList.add('hidden');
  modal.classList.remove('hidden');
  elTitle.focus();
}

function closeEditModal() {
  $('edit-modal')?.classList.add('hidden');
  $('ai-subdivide-section')?.classList.add('hidden');
}

function bindModal() {
  const btnSave = $('btn-modal-save');
  const btnCancel = $('btn-modal-cancel');
  const btnDelete = $('btn-modal-delete');
  const btnAI = $('btn-modal-ai-subdivide');

  if (btnSave) btnSave.onclick = () => {
    const elTitle = $('edit-title');
    const elFocus = $('edit-focus');
    const elBreak = $('edit-break');
    const elTime = $('edit-time');
    const elTaskId = $('edit-task-id');

    const id = elTaskId.value;
    const title = (elTitle.value || t('untitled')).toUpperCase().trim();
    const focusMin = Math.max(1, Math.min(120, parseInt(elFocus.value) || 25));
    const breakMin = Math.max(1, Math.min(30, parseInt(elBreak.value) || 5));
    const timeLabel = elTime.value.trim() || '--:--';

    if (id) {
      const task = appState.tasks.find(t => t.id === id);
      if (task) {
        task.title = title;
        task.focusMinutes = focusMin;
        task.breakMinutes = breakMin;
        task.timeLabel = timeLabel;
      }
    } else {
      appState.tasks.push({
        id: 't_' + Date.now().toString().slice(-6),
        title, focusMinutes: focusMin, breakMinutes: breakMin,
        status: 'open', timeLabel, targetDate: currentModalDate,
        order: appState.tasks.length
      });
    }
    saveTasks();
    closeEditModal();
    renderAll();
  };

  if (btnCancel) btnCancel.onclick = closeEditModal;

  if (btnDelete) btnDelete.onclick = () => {
    const id = $('edit-task-id').value;
    if (!id) return;
    if (!confirm(t('confirmDelete'))) return;
    appState.tasks = appState.tasks.filter(t => t.id !== id);
    saveTasks();
    closeEditModal();
    renderAll();
  };

  if (btnAI) btnAI.onclick = () => runAISubdivide(btnAI);
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function runAISubdivide(btnAI) {
  const title = ($('edit-title').value || '').trim();
  const section = $('ai-subdivide-section');
  const output = $('ai-subdivide-output');
  if (!section || !output) return;
  if (!title) {
    section.classList.remove('hidden');
    output.innerHTML = `<div class="ai-sub-hint">${t('aiNeedTitle')}</div>`;
    return;
  }
  const focusMin = parseInt($('edit-focus').value) || 25;

  const originalText = btnAI.textContent;
  btnAI.textContent = t('aiCurating');
  btnAI.style.pointerEvents = 'none';

  setTimeout(() => {
    const blocks = generateSubdivisionBlocks(title, focusMin);

    output.innerHTML = blocks.map((b, i) => `
      <div class="ai-sub-block" data-sub-row>
        <span class="ai-sub-idx">${i + 1}</span>
        <input class="ai-sub-title-input" type="text" maxlength="80" value="${escapeAttr(b.title)}" />
        <span class="ai-sub-dur-field">
          <input class="ai-sub-dur-input" type="number" min="5" max="120" step="5" value="${b.dur}" />
          <span class="ai-sub-dur-unit">m</span>
        </span>
      </div>
    `).join('') + `
      <div class="ai-sub-hint">${t('aiEditHint')}</div>
      <div class="ai-sub-actions">
        <div class="action-btn btn-primary interactable" id="btn-sub-apply">${t('aiApply')}</div>
        <div class="action-btn secondary-btn interactable" id="btn-sub-regen">${t('aiRegen')}</div>
      </div>
    `;
    section.classList.remove('hidden');
    btnAI.textContent = originalText;
    btnAI.style.pointerEvents = '';

    $('btn-sub-apply').onclick = () => applySubdivision();
    $('btn-sub-regen').onclick = () => runAISubdivide(btnAI);
  }, 600);
}

// Read the (possibly user-edited) blocks straight from the DOM and create tasks.
function applySubdivision() {
  const rows = [...document.querySelectorAll('#ai-subdivide-output [data-sub-row]')];
  const blocks = rows.map(row => ({
    title: (row.querySelector('.ai-sub-title-input').value || '').trim(),
    dur: Math.max(5, parseInt(row.querySelector('.ai-sub-dur-input').value) || 25)
  })).filter(b => b.title);
  if (!blocks.length) return;

  const now = new Date();
  let hr = now.getHours();
  let min = now.getMinutes() < 30 ? 30 : 0;
  if (now.getMinutes() >= 30) hr++;

  blocks.forEach(b => {
    const timeLabel = `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    appState.tasks.push({
      id: 't_' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(2, 4),
      title: b.title.toUpperCase(),
      focusMinutes: b.dur,
      breakMinutes: 5,
      status: 'open',
      timeLabel,
      targetDate: currentModalDate,
      order: appState.tasks.length
    });
    min += b.dur + 5;
    while (min >= 60) { hr++; min -= 60; }
  });
  saveTasks();
  closeEditModal();
  renderAll();
}

// ==========================================
// NAV / HOME BINDINGS
// ==========================================
function bindNav() {
  if (navItems.home) navItems.home.onclick = () => { showView('home'); renderHome(); };
  if (navItems.calendar) navItems.calendar.onclick = () => { showView('calendar'); renderPlanner(); };
  if (navItems.archive) navItems.archive.onclick = () => { showView('archive'); renderArchive(); };

  const btnLang = $('btn-lang-toggle');
  if (btnLang) btnLang.onclick = () => {
    toggleLanguage();
  };
}

function bindTabBar() {
  if (tabItems.home) tabItems.home.onclick = () => { showView('home'); renderHome(); };
  if (tabItems.calendar) tabItems.calendar.onclick = () => { showView('calendar'); renderPlanner(); };
  if (tabItems.archive) tabItems.archive.onclick = () => { showView('archive'); renderArchive(); };
  if (tabItems.focus) tabItems.focus.onclick = () => {
    showView(appState.session.mode === 'break' ? 'break' : 'focus');
    renderFocusLauncher();
  };
  if (tabItems.new) tabItems.new.onclick = () => {
    showView('focus');
    renderFocusLauncher();
    $('focus-draft-title')?.focus();
  };
}

function bindHome() {
  const btnBegin = $('btn-hero-begin');
  const btnPlan = $('btn-hero-plan');
  const heroTask = $('btn-ritual-start');

  const begin = () => {
    const task = appState.tasks.find(t => t.id === appState.session.activeTaskId) || pickHomeTask();
    if (task) startTaskRitual(task);
    else startQuickRitual();
  };
  if (btnBegin) btnBegin.onclick = begin;
  if (heroTask) heroTask.onclick = begin;
  if (btnPlan) btnPlan.onclick = () => { showView('calendar'); renderPlanner(); };
}

function bindFocusControls() {
  const btnPause = $('btn-ritual-pause');
  const btnComplete = $('btn-ritual-complete');
  const btnOpenWidget = $('btn-open-widget');

  if (btnPause) btnPause.onclick = () => {
    const mode = appState.session.mode;
    // Fresh start from the focus screen when nothing is running yet.
    if (mode === 'idle' || appState.session.remainingSeconds <= 0) {
      const task = getActiveTask() || pickHomeTask();
      if (task) startTaskRitual(task);
      else startQuickRitual();
    } else if (appState.session.isRunning) {
      pauseSession();
    } else {
      resumeSession();
    }
    // Button label + status text are driven centrally by updateFocusHUD
    // (via the tomato:statechange event), keeping main + widget in sync.
  };
  if (btnComplete) btnComplete.onclick = () => {
    // Engine logs once (dedup-safe) and dispatches tomato:timerend,
    // which drives the transition into break via handleTimerEnd.
    // A user-pressed finish is recorded honestly as a manual completion.
    completeFocus({ completionType: 'manual_complete' });
  };
  if (btnOpenWidget) btnOpenWidget.onclick = requestWidgetOpen;
}

function bindBreakControls() {
  const btnSkip = $('btn-skip-break');
  const btnOpenBreak = $('btn-open-widget-break');
  // Skip ends the break through the single transition path. We must NOT call
  // resetSession() first — that wipes activeTaskId and makes the next-ritual
  // picker re-suggest the block we just finished.
  if (btnSkip) btnSkip.onclick = () => endBreakManually();
  if (btnOpenBreak) btnOpenBreak.onclick = requestWidgetOpen;
}

function bindTimerEvents() {
  window.addEventListener('tomato:statechange', onStateChange);
  window.addEventListener('tomato:timerend', handleTimerEnd);
}

function onStateChange() {
  updateFocusHUD();
  if (currentView === 'home') renderHome();
}

// ==========================================
// FOCUS HUD
// ==========================================
function renderFocusTicks(total) {
  const el = $('fs-ticks');
  if (!el) return;
  const totalMin = Math.round(total / 60);
  const marks = [0];
  for (let m = 5; m < totalMin; m += 5) marks.push(m);
  marks.push(totalMin);
  el.innerHTML = marks.map(m => `<span>${m}M</span>`).join('');
}

function updateFocusHUD() {
  const mode = appState.session.mode;
  const remaining = appState.session.remainingSeconds;
  const running = appState.session.isRunning;
  const task = getActiveTask();
  const show = (el, visible) => { if (el) el.style.display = visible ? '' : 'none'; };

  // Offer the floating PiP widget whenever a timed block is in progress.
  show($('btn-open-widget'), isPipSupported() && mode === 'focus' && remaining > 0);
  show($('btn-open-widget-break'), isPipSupported() && mode === 'break' && remaining > 0);

  // Primary control label: START (fresh) / RESUME (paused mid-block) / PAUSE (running)
  const btnPause = $('btn-ritual-pause');
  if (btnPause) {
    if (running) btnPause.textContent = t('btnPause');
    else if (mode === 'idle' || remaining <= 0) btnPause.textContent = t('btnStart');
    else btnPause.textContent = t('btnResume');
  }

  if (mode === 'focus' && currentView === 'focus') {
    const elTimeLeft = $('time-left');
    if (elTimeLeft) {
      const [mm, ss] = formatTime(remaining).split(':');
      elTimeLeft.innerHTML = `${mm}<span class="col">:</span>${ss}`;
      elTimeLeft.classList.toggle('heavy', running);
      elTimeLeft.classList.toggle('echo', !running);
    }
    const task = getActiveTask();
    const linked = $('fs-linked');
    if (linked) linked.textContent = task ? `→ ${task.title}` : '';

    const total = task ? task.focusMinutes * 60 : (remaining || 25 * 60);
    const pct = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
    const fill = $('fs-progress-fill');
    if (fill) fill.style.width = `${pct}%`;

    // phase shift
    const screen = $('view-focus');
    if (screen) {
      screen.classList.remove('phase-warm', 'phase-tension');
      const ratio = remaining / total;
      if (ratio < 0.25) screen.classList.add('phase-tension');
      else if (ratio < 0.5) screen.classList.add('phase-warm');
    }

    // Status text — single source of truth so the main screen stays in sync no
    // matter where pause/resume was triggered (main controls OR the widget).
    const statusEl = $('ritual-status');
    if (statusEl) {
      if (!running && remaining > 0) statusEl.textContent = t('signalPaused');
      else if (running && remaining <= 180 && remaining > 0) statusEl.textContent = t('finalStretch');
      else if (running) statusEl.textContent = t('signalLocked');
    }
  }

  if (mode === 'break' && currentView === 'break') {
    const elBreak = $('break-time-left');
    if (elBreak) {
      elBreak.textContent = formatTime(remaining);
      elBreak.classList.toggle('heavy', running);
      elBreak.classList.toggle('echo', !running);
    }
  }

  // Mirror state into the floating widget if it is open.
  if (isWidgetOpen()) updateWidget(getWidgetSnapshot());
}

// ==========================================
// FOCUS → BREAK CYCLE
// ==========================================
function enterBreakMode() {
  // History was already logged by timer.js#completeFocus. Here we only run the
  // engine's break start and update the UI / 3D scene / widget.
  const task = getActiveTask();
  const taskTitle = task ? task.title : 'RITUAL';
  sendNotification('notifFocusDoneTitle', 'notifFocusDoneBody', `// ${taskTitle}`);

  startBreak();
  showView('break');
  try { set3DMode('break'); } catch (e) {}
  const isLong = appState.session.pomodoroCount > 0 && appState.session.pomodoroCount % 4 === 0;
  const br = $('break-status');
  if (br) br.textContent = isLong ? t('longRest') : t('signalResting');
  syncWidgetState();
  updateFocusHUD();
}

// Single transition out of break → standby/next ritual. Capture the just-
// completed task BEFORE resetting so the next-ritual picker can exclude it.
function finishBreakTransition() {
  const completedTaskId = appState.session.activeTaskId;
  resetSession();
  const nextTask = getNextFocusCandidate(appState.tasks, getTodayStr(), completedTaskId);
  appState.session.lastBreakEndedAt = Date.now();
  saveSession();
  try { set3DMode('focus'); } catch (e) {}
  syncWidgetState();
  // Show the next ritual on HOME if one exists, otherwise return to the
  // creation flow so the user can build the next block.
  showView(nextTask ? 'home' : 'focus');
  renderAll();
  renderFocusLauncher();
}

// Natural break completion (timer reached zero).
function endBreak() {
  sendNotification('notifRestDoneTitle', 'notifRestDoneBody');
  finishBreakTransition();
}

// User actively ended the break (main SKIP button / widget DONE). Same
// transition, but no "rest finished" notification since it wasn't a surprise.
function endBreakManually() {
  finishBreakTransition();
}

function handleTimerEnd(e) {
  const detail = (e && e.detail) || {};
  const endedMode = detail.mode || appState.session.mode;
  if (endedMode === 'break') {
    endBreak();
    return;
  }
  // Focus just completed — timer.js already logged the history record.
  // A manual finish means the user is present: offer a choice (reflect / break
  // / skip). A natural or recovered finish auto-flows into the break rhythm.
  if (detail.completionType === 'manual_complete') {
    showCompletionChoice(detail.historyId);
  } else {
    enterBreakMode();
  }
}

// Completion choice overlay shown after a manual finish.
function showCompletionChoice(historyId) {
  const overlay = $('completion-overlay');
  if (!overlay) { enterBreakMode(); return; }
  const task = getActiveTask();
  const titleEl = $('completion-task');
  if (titleEl) titleEl.textContent = task ? task.title : t('heroStandby');
  const reflect = $('completion-reflect');
  if (reflect) reflect.value = '';

  const saveReflection = () => {
    const text = reflect ? reflect.value.trim() : '';
    if (text && historyId) updateHistoryReflection(historyId, text);
  };

  const btnBreak = $('completion-break');
  const btnSkip = $('completion-skip');
  if (btnBreak) btnBreak.onclick = () => {
    saveReflection();
    overlay.classList.add('hidden');
    enterBreakMode();
  };
  if (btnSkip) btnSkip.onclick = () => {
    saveReflection();
    overlay.classList.add('hidden');
    finishBreakTransition();
  };

  overlay.classList.remove('hidden');
}

// When focus view shown, prime ticks
function primeFocusTicks() {
  const task = getActiveTask();
  const total = task ? task.focusMinutes * 60 : 25 * 60;
  renderFocusTicks(total);
}

// Hook view change to prime focus ticks
const _showView = showView;
function showViewWithHook(name) {
  _showView(name);
  if (name === 'focus') primeFocusTicks();
}
// Override the showView reference used in rest of file above — we already call original showView; patch bindings that transition to focus via primeFocusTicks
// The minute ticks are fixed for a given block, so only rebuild the DOM when
// the total actually changes — not on every per-second statechange.
let lastTickTotal = -1;
window.addEventListener('tomato:statechange', () => {
  if (currentView === 'focus') {
    const task = getActiveTask();
    const total = task ? task.focusMinutes * 60 : 25 * 60;
    if (total !== lastTickTotal) {
      lastTickTotal = total;
      renderFocusTicks(total);
    }
  }
});

// ==========================================
// BOOT
// ==========================================
init();
