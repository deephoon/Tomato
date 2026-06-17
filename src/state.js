// ==========================================
// STATE MANAGEMENT — Single Source of Truth
// ==========================================
import { getCurrentUser } from './auth.js';
import * as taskRepo from './repositories/task.repository.js';
import * as historyRepo from './repositories/history.repository.js';
import * as sessionRepo from './repositories/session.repository.js';
import * as prefRepo from './repositories/preference.repository.js';
import { getTodayStr } from './utils/dateTime.js';

let syncedWidgetUser = null;

function getRuntimeUser() {
  return getCurrentUser() || syncedWidgetUser;
}

// --- Global App State ---
export const appState = {
  auth: { user: getCurrentUser() },
  tasks: [],
  history: [],
  session: {},
  aiTasks: [], // AI proposed tasks
  prefs: {}
};

// Initialize State
appState.tasks = loadTasks();
appState.history = loadHistory();
appState.session = loadSession();
appState.prefs = loadPreferences();

export function saveLang() {
  const user = getRuntimeUser();
  if (user) {
    prefRepo.savePreferences(user.id, appState.prefs);
  }
}

function loadTasks() {
  const user = getRuntimeUser();
  return user ? taskRepo.getTasks(user.id) : [];
}

function loadHistory() {
  const user = getRuntimeUser();
  return user ? historyRepo.getHistory(user.id) : [];
}

function loadSession() {
  const user = getRuntimeUser();
  return user ? sessionRepo.getSession(user.id) : sessionRepo.getSession(null);
}

function loadPreferences() {
  const user = getRuntimeUser();
  return user ? prefRepo.getPreferences(user.id) : prefRepo.getPreferences(null);
}

// Legacy migration logic
const LEGACY_STORAGE_KEY = 'tomato_os_tasks';
const LEGACY_HISTORY_KEY = 'tomato_os_history';
const LEGACY_SESSION_KEY = 'tomato_os_session';
const LEGACY_CLAIM_KEY = 'tomato_legacy_claimed_by';

export function claimLegacyDataForCurrentUser() {
  const user = getCurrentUser();
  if (!user || localStorage.getItem(LEGACY_CLAIM_KEY)) return false;
  let copied = false;
  
  const legacyTasks = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyTasks && taskRepo.getTasks(user.id).length === 0) {
    taskRepo.saveTasks(user.id, JSON.parse(legacyTasks));
    copied = true;
  }
  
  const legacyHistory = localStorage.getItem(LEGACY_HISTORY_KEY);
  if (legacyHistory && historyRepo.getHistory(user.id).length === 0) {
    historyRepo.saveHistory(user.id, JSON.parse(legacyHistory));
    copied = true;
  }
  
  const legacySession = localStorage.getItem(LEGACY_SESSION_KEY);
  if (legacySession) {
    // Session is often overwritten, but we can copy it if we want
    const parsed = JSON.parse(legacySession);
    sessionRepo.saveSession(user.id, parsed);
    copied = true;
  }

  if (copied) localStorage.setItem(LEGACY_CLAIM_KEY, user.id);
  return copied;
}

export function reloadForCurrentUser() {
  syncedWidgetUser = null;
  appState.auth.user = getCurrentUser();
  appState.tasks = loadTasks();
  appState.history = loadHistory();
  appState.session = loadSession();
  appState.prefs = loadPreferences();
  appState.aiTasks = [];
  checkDayRollover();
  window.dispatchEvent(new CustomEvent('tomato:userchange'));
}

// Day rollover check: if todayDate doesn't match, reset pomodoro count
function checkDayRollover() {
  if (!appState.auth.user) return;
  const today = getTodayStr();
  if (appState.session.todayDate !== today) {
    appState.session.pomodoroCount = 0;
    appState.session.todayDate = today;
    // Mark yesterday's incomplete tasks as missed
    appState.tasks.forEach(t => {
      if (t.status === 'active' || t.status === 'open') {
        t.status = 'missed';
      }
    });
    saveTasks();
    saveSession();
  }
}

// --- Persistence ---
export function saveTasks() {
  const user = getRuntimeUser();
  if (!user) return;
  taskRepo.saveTasks(user.id, appState.tasks);
  broadcastSync('tasks', appState.tasks);
}

export function saveHistory() {
  const user = getRuntimeUser();
  if (!user) return;
  historyRepo.saveHistory(user.id, appState.history);
  broadcastSync('history', appState.history);
}

export function saveSession() {
  const user = getRuntimeUser();
  if (!user) return;
  const payload = {
    pomodoroCount: appState.session.pomodoroCount,
    pomodoroGoal: appState.session.pomodoroGoal,
    todayDate: appState.session.todayDate,
    calendarOffset: appState.session.calendarOffset,
    selectedDate: appState.session.selectedDate,
    activeTaskId: appState.session.activeTaskId,
    mode: appState.session.mode,
    remainingSeconds: appState.session.remainingSeconds,
    isRunning: appState.session.isRunning,
    endTime: appState.session.endTime,
    startedAt: appState.session.startedAt,
    pausedAt: appState.session.pausedAt,
    pauseCount: appState.session.pauseCount || 0,
    resumedCount: appState.session.resumedCount || 0,
    lastCompletedEnd: appState.session.lastCompletedEnd,
    lastBreakEndedAt: appState.session.lastBreakEndedAt || 0,
    completionKey: appState.session.completionKey || null,
    completedHistoryId: appState.session.completedHistoryId || null
  };
  sessionRepo.saveSession(user.id, payload);
  broadcastSync('session', payload);
}

// --- Active Task Helper ---
export function getActiveTask() {
  return appState.tasks.find(tk => tk.id === appState.session.activeTaskId) || null;
}

// --- Cross-Client Sync ---
const CLIENT_ID = Math.random().toString(36).slice(2);

const syncChannel = (typeof BroadcastChannel !== 'undefined')
  ? new BroadcastChannel('tomato-sync')
  : null;

function broadcastSync(type, payload) {
  const user = getRuntimeUser() || appState.auth.user;
  const msg = { type, payload, src: CLIENT_ID, userId: user ? user.id : null, user };
  if (syncChannel) syncChannel.postMessage(msg);
  if (import.meta.hot) import.meta.hot.send('tomato:sync', msg);
}

export function sendWidgetControl(action) {
  const user = getRuntimeUser() || appState.auth.user;
  const msg = {
    type: 'widget-control',
    action,
    src: CLIENT_ID,
    userId: user ? user.id : null,
    user,
    snapshot: {
      tasks: appState.tasks,
      history: appState.history,
      session: appState.session
    }
  };
  if (syncChannel) syncChannel.postMessage(msg);
  if (import.meta.hot) import.meta.hot.send('tomato:sync', msg);
}

function applySync(data) {
  if (!data || !data.type || data.src === CLIENT_ID) return;
  const isTauriRuntime = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
  if (data.type === 'widget-control') {
    if (isTauriRuntime && data.user) {
      syncedWidgetUser = data.user;
      appState.auth.user = data.user;
    }
    if (isTauriRuntime && data.snapshot) {
      if (Array.isArray(data.snapshot.tasks)) appState.tasks = data.snapshot.tasks;
      if (Array.isArray(data.snapshot.history)) appState.history = data.snapshot.history;
      if (data.snapshot.session) Object.assign(appState.session, data.snapshot.session);
      window.dispatchEvent(new CustomEvent('tomato-synced', { detail: { type: 'session', payload: appState.session } }));
    }
    window.dispatchEvent(new CustomEvent('tomato-widget-control', { detail: data.action }));
    return;
  }
  if (isTauriRuntime && !getRuntimeUser() && data.user) {
    syncedWidgetUser = data.user;
    appState.auth.user = data.user;
  }
  const currentUser = getRuntimeUser();
  if ((data.userId || null) !== (currentUser ? currentUser.id : null)) return;
  let changed = false;
  if (data.type === 'tasks') {
    appState.tasks = data.payload;
    const user = getRuntimeUser();
    if (user) taskRepo.saveTasks(user.id, appState.tasks);
    changed = true;
  } else if (data.type === 'history') {
    appState.history = data.payload;
    const user = getRuntimeUser();
    if (user) historyRepo.saveHistory(user.id, appState.history);
    changed = true;
  } else if (data.type === 'session') {
    Object.assign(appState.session, data.payload);
    const user = getRuntimeUser();
    if (user) sessionRepo.saveSession(user.id, data.payload);
    changed = true;
  }
  if (changed) {
    window.dispatchEvent(new CustomEvent('tomato-synced', { detail: data }));
  }
}

if (syncChannel) syncChannel.onmessage = (ev) => applySync(ev.data);
if (import.meta.hot) import.meta.hot.on('tomato:sync', (data) => applySync(data));

checkDayRollover();
