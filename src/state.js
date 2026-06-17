import { getCurrentUser } from './supabase/client.js';
import * as taskRepo from './repositories/task.repository.js';
import * as historyRepo from './repositories/history.repository.js';
import * as sessionRepo from './repositories/session.repository.js';
import * as prefRepo from './repositories/preference.repository.js';
import { getTodayStr } from './utils/dateTime.js';

let syncedWidgetUser = null;

export function getRuntimeUser() {
  return appState.auth.user || syncedWidgetUser;
}

// --- Global App State ---
export const appState = {
  auth: { user: null },
  tasks: [],
  history: [],
  session: sessionRepo.getLocalCache(null),
  aiTasks: [], // AI proposed tasks
  prefs: prefRepo.getLocalCache(null),
  isCloudLoaded: false
};

// Start initialization
(async () => {
  const user = await getCurrentUser();
  appState.auth.user = user;
  if (user) {
    await loadCloudState();
  }
  window.dispatchEvent(new CustomEvent('tomato:auth-ready', { detail: { user } }));
})();

export async function loadCloudState() {
  const user = appState.auth.user;
  if (!user) return;
  
  appState.isCloudLoaded = false;
  
  // Load cached first so UI can paint something immediately if it wants
  appState.session = sessionRepo.getLocalCache(user.id);
  appState.prefs = await prefRepo.getPreferences(user.id);
  
  try {
    // Fetch from Supabase
    const [tasks, history, session] = await Promise.all([
      taskRepo.getTasks(user.id),
      historyRepo.getHistory(user.id),
      sessionRepo.getSession(user.id) // This will fetch from DB and fallback to cache
    ]);
    
    appState.tasks = tasks;
    appState.history = history;
    appState.session = session;
  } catch (err) {
    console.error("Cloud sync failed, falling back to local cache:", err);
    // On failure, we should still allow the user to use the app in offline mode.
    // In a real app, we'd maybe show a warning banner.
  } finally {
    appState.isCloudLoaded = true;
    checkDayRollover();
    window.dispatchEvent(new CustomEvent('tomato:cloud-loaded'));
  }
}

export function saveLang() {
  const user = getRuntimeUser();
  if (user) {
    prefRepo.savePreferences(user.id, appState.prefs);
  }
}

export async function reloadForCurrentUser() {
  syncedWidgetUser = null;
  appState.auth.user = await getCurrentUser();
  appState.aiTasks = [];
  if (appState.auth.user) {
    await loadCloudState();
  } else {
    appState.tasks = [];
    appState.history = [];
    appState.session = sessionRepo.getLocalCache(null);
    appState.prefs = prefRepo.getLocalCache(null);
  }
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
// These are now fire-and-forget async wrapper functions
export function saveTasks() {
  const user = getRuntimeUser();
  if (!user) return;
  taskRepo.saveTasks(user.id, appState.tasks).catch(e => console.error(e));
  broadcastSync('tasks', appState.tasks);
}

export function appendHistoryItem(item) {
  appState.history.push(item);
  const user = getRuntimeUser();
  if (user) {
    historyRepo.appendHistory(user.id, item).catch(e => console.error(e));
  }
  broadcastSync('history-append', item);
}

export function updateHistoryReflection(historyId, reflection) {
  const item = appState.history.find(h => h.id === historyId);
  if (item) {
    item.reflection = reflection;
    const user = getRuntimeUser();
    if (user) {
      historyRepo.updateHistoryItem(user.id, historyId, { reflection }).catch(e => console.error(e));
    }
    broadcastSync('history-update', { id: historyId, reflection });
  }
}

export function saveHistory() {
  const user = getRuntimeUser();
  if (!user) return;
  // History is mostly append-only, but if we need to sync full array we can.
  // Actually, saveHistory here is just local cache update if needed.
  historyRepo.saveHistory(user.id, appState.history).catch(e => console.error(e));
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
  sessionRepo.saveSession(user.id, payload).catch(e => console.error(e));
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
  const user = getRuntimeUser();
  const msg = { type, payload, src: CLIENT_ID, userId: user ? user.id : null, user };
  if (syncChannel) syncChannel.postMessage(msg);
  if (import.meta.hot) import.meta.hot.send('tomato:sync', msg);
}

export function sendWidgetControl(action) {
  const user = getRuntimeUser();
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
    changed = true;
  } else if (data.type === 'history') {
    appState.history = data.payload;
    changed = true;
  } else if (data.type === 'history-append') {
    if (!appState.history.some(h => h.completionKey === data.payload.completionKey)) {
      appState.history.push(data.payload);
      changed = true;
    }
  } else if (data.type === 'history-update') {
    const item = appState.history.find(h => h.id === data.payload.id);
    if (item) {
      item.reflection = data.payload.reflection;
      changed = true;
    }

  } else if (data.type === 'session') {
    Object.assign(appState.session, data.payload);
    changed = true;
  }
  if (changed) {
    window.dispatchEvent(new CustomEvent('tomato-synced', { detail: data }));
  }
}

if (syncChannel) syncChannel.onmessage = (ev) => applySync(ev.data);
if (import.meta.hot) import.meta.hot.on('tomato:sync', (data) => applySync(data));

// Legacy migration logic
const LEGACY_STORAGE_KEY = 'tomato_os_tasks';
const LEGACY_HISTORY_KEY = 'tomato_os_history';
const LEGACY_SESSION_KEY = 'tomato_os_session';
const LEGACY_CLAIM_KEY = 'tomato_legacy_claimed_by';

export function claimLegacyDataForCurrentUser() {
  const user = getRuntimeUser();
  if (!user || localStorage.getItem(LEGACY_CLAIM_KEY)) return false;
  let copied = false;
  
  const legacyTasks = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyTasks && appState.tasks.length === 0) {
    appState.tasks = JSON.parse(legacyTasks);
    saveTasks();
    copied = true;
  }
  
  const legacyHistory = localStorage.getItem(LEGACY_HISTORY_KEY);
  if (legacyHistory && appState.history.length === 0) {
    appState.history = JSON.parse(legacyHistory);
    saveHistory();
    copied = true;
  }
  
  const legacySession = localStorage.getItem(LEGACY_SESSION_KEY);
  if (legacySession) {
    const parsed = JSON.parse(legacySession);
    appState.session = { ...appState.session, ...parsed };
    saveSession();
    copied = true;
  }

  if (copied) localStorage.setItem(LEGACY_CLAIM_KEY, user.id);
  return copied;
}
