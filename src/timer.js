// ==========================================
// TIMER LOGIC — Date.now() Based Precision
// ==========================================
import { appState, saveTasks, saveSession, getActiveTask, appendHistoryItem } from './state.js';
import { generateId } from './utils/id.js';
import { executeCommand } from './services/command.service.js';

let timerInterval = null;
// Tracks the last whole-second we pushed to the UI, so the 100ms tick can keep
// sub-second timing precision while only repainting the HUD once per second.
let lastDispatchedSecond = -1;

function getModeDurationSeconds(mode, task) {
  if (mode === 'break') {
    const breakMins = task ? (task.breakMinutes || 5) : 5;
    const isLongBreak = appState.session.pomodoroCount > 0 && appState.session.pomodoroCount % 4 === 0;
    return (isLongBreak ? 15 : breakMins) * 60;
  }
  return (task ? (task.focusMinutes || 25) : 25) * 60;
}

export function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '00:00';
  const s2 = Math.ceil(totalSeconds);
  const m = Math.floor(s2 / 60).toString().padStart(2, '0');
  const s = (s2 % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// --- Essential Actions ---

export function startFocus(task) {
  const durationSeconds = getModeDurationSeconds('focus', task);
  const now = Date.now();
  
  appState.session.mode = 'focus';
  appState.session.activeTaskId = task ? task.id : null;
  appState.session.startedAt = now;
  appState.session.remainingSeconds = durationSeconds;
  appState.session.endTime = now + (durationSeconds * 1000);
  appState.session.isRunning = true;
  appState.session.pauseCount = 0;
  appState.session.resumedCount = 0;
  appState.session.pausedAt = 0;
  
  // Create completion key to prevent duplicate history records
  appState.session.completionKey = `${task ? task.id : 'notask'}_${now}_${durationSeconds}`;
  appState.session.completedHistoryId = null;

  if (timerInterval) clearInterval(timerInterval);
  lastDispatchedSecond = -1;
  timerInterval = setInterval(tick, 100);
  saveSession();
  executeCommand('startFocus', { taskId: task ? task.id : null, mode: 'focus' });
  window.dispatchEvent(new CustomEvent('tomato:statechange'));
}

export function pauseSession() {
  if (!appState.session.isRunning) return;
  
  const now = Date.now();
  const remainingMs = Math.max(0, appState.session.endTime - now);
  
  appState.session.remainingSeconds = remainingMs / 1000;
  appState.session.pauseCount = (appState.session.pauseCount || 0) + 1;
  appState.session.pausedAt = now;
  appState.session.isRunning = false;
  
  clearInterval(timerInterval);
  timerInterval = null;
  saveSession();
  executeCommand('pauseSession');
  window.dispatchEvent(new CustomEvent('tomato:statechange'));
}

export function resumeSession() {
  if (appState.session.isRunning) return;
  if (appState.session.remainingSeconds <= 0) return;
  
  if (appState.session.pausedAt) {
    appState.session.resumedCount = (appState.session.resumedCount || 0) + 1;
    appState.session.pausedAt = 0;
  }
  
  appState.session.isRunning = true;
  appState.session.endTime = Date.now() + (appState.session.remainingSeconds * 1000);
  
  if (timerInterval) clearInterval(timerInterval);
  lastDispatchedSecond = -1;
  timerInterval = setInterval(tick, 100);
  saveSession();
  executeCommand('resumeSession');
  window.dispatchEvent(new CustomEvent('tomato:statechange'));
}

export function completeFocus(options = {}) {
  if (appState.session.mode !== 'focus') return;

  const completionType = options.completionType || 'completed';
  const source = options.source || 'focus';

  const completionKey = appState.session.completionKey;
  // Deduplicate: check if this completionKey is already in history
  const alreadySaved = appState.history.some(h => h.completionKey === completionKey);

  let historyId = appState.session.completedHistoryId;

  if (!alreadySaved) {
    const task = getActiveTask();
    historyId = generateId('h');

    const plannedSeconds = task ? task.focusMinutes * 60 : 25 * 60;
    const startedAt = appState.session.startedAt || Date.now();
    // True elapsed time. Cap at planned so a clock that drifts slightly past
    // the target never reports more than the planned block.
    const actualSeconds = Math.max(0, Math.min(plannedSeconds, Math.floor((Date.now() - startedAt) / 1000)));
    const ratio = plannedSeconds > 0 ? actualSeconds / plannedSeconds : 1;
    // Honestly label an early manual stop as a partial run.
    const isPartial = completionType === 'manual_complete' && ratio < 0.95;
    const systemNote = isPartial
      ? 'Signal cut early — ritual logged as partial.'
      : 'Signal remained stable through completion.';

    // Create new history item
    const historyItem = {
      id: historyId,
      taskId: task ? task.id : null,
      title: task ? task.title : '이름 없는 집중',
      focusMinutes: task ? task.focusMinutes : 25,
      breakMinutes: task ? task.breakMinutes : 5,
      completedAt: Date.now(),
      date: appState.session.todayDate,
      sequence: appState.history.filter(h => h.date === appState.session.todayDate).length + 1,
      systemNote,
      reflection: null, // to be updated later
      actualSeconds,
      plannedSeconds,
      completionType,
      source,
      pauseCount: appState.session.pauseCount || 0,
      resumedCount: appState.session.resumedCount || 0,
      completionKey: completionKey
    };

    appendHistoryItem(historyItem);

    // Update original task
    if (task) {
      task.status = 'done';
      saveTasks();
    }
    
    appState.session.pomodoroCount += 1;
    appState.session.completedHistoryId = historyId;
    saveSession();
    executeCommand('completeFocus', { historyItem });
  }

  // Stop current ticking
  appState.session.isRunning = false;
  appState.session.remainingSeconds = 0;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  saveSession();
  
  // We don't automatically start break here. The UI decides (auto-break on a
  // natural finish, or a completion choice when the user finished manually).
  window.dispatchEvent(new CustomEvent('tomato:statechange'));
  window.dispatchEvent(new CustomEvent('tomato:timerend', { detail: { historyId, completionType, mode: 'focus' } }));
}

export function startBreak() {
  const task = getActiveTask();
  const durationSeconds = getModeDurationSeconds('break', task);
  const now = Date.now();
  
  appState.session.mode = 'break';
  appState.session.startedAt = now;
  appState.session.remainingSeconds = durationSeconds;
  appState.session.endTime = now + (durationSeconds * 1000);
  appState.session.isRunning = true;
  appState.session.pauseCount = 0;
  appState.session.resumedCount = 0;
  appState.session.pausedAt = 0;

  if (timerInterval) clearInterval(timerInterval);
  lastDispatchedSecond = -1;
  timerInterval = setInterval(tick, 100);
  saveSession();
  executeCommand('startBreak');
  window.dispatchEvent(new CustomEvent('tomato:statechange'));
}

export function skipBreak() {
  resetSession();
}

export function resetSession() {
  appState.session.mode = 'idle';
  appState.session.activeTaskId = null;
  appState.session.remainingSeconds = 0;
  appState.session.isRunning = false;
  appState.session.endTime = 0;
  appState.session.startedAt = 0;
  appState.session.pausedAt = 0;
  appState.session.completionKey = null;
  appState.session.completedHistoryId = null;
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  saveSession();
  window.dispatchEvent(new CustomEvent('tomato:statechange'));
}

export function setTask(id) {
  resetSession();
  appState.session.activeTaskId = id;
  saveSession();
}

// Tick logic
function tick() {
  const now = Date.now();
  const remainingMs = appState.session.endTime - now;
  
  if (remainingMs <= 0) {
    appState.session.remainingSeconds = 0;
    if (appState.session.mode === 'focus') {
      completeFocus();
    } else if (appState.session.mode === 'break') {
      // Stop ticking but keep mode === 'break' until a listener transitions us,
      // so the UI layer can pick the next ritual and notify. main.js owns reset.
      appState.session.isRunning = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      saveSession();
      window.dispatchEvent(new CustomEvent('tomato:timerend', { detail: { mode: 'break' } }));
    }
  } else {
    appState.session.remainingSeconds = remainingMs / 1000;
    // Only repaint when the displayed second (MM:SS, ceil) actually changes.
    // This cuts HUD/widget re-renders from ~10/s to ~1/s without losing precision.
    const shownSecond = Math.ceil(appState.session.remainingSeconds);
    if (shownSecond !== lastDispatchedSecond) {
      lastDispatchedSecond = shownSecond;
      window.dispatchEvent(new CustomEvent('tomato:statechange'));
    }
  }
}

// Sync interval with incoming session state
window.addEventListener('tomato-synced', (e) => {
  if (e.detail.type === 'session') {
    const s = e.detail.payload;
    if (s.isRunning && !timerInterval) {
      timerInterval = setInterval(tick, 100);
    } else if (!s.isRunning && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
});
