// ==========================================
// TIMER LOGIC — Date.now() Based Precision
// ==========================================
import { appState, getActiveTask } from './state.js';

let timerInterval = null;

// --- Format seconds → MM:SS ---
export function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '00:00';
  const s2 = Math.ceil(totalSeconds);
  const m = Math.floor(s2 / 60).toString().padStart(2, '0');
  const s = (s2 % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// --- Mode Switching ---
export function switchMode(newMode) {
  appState.session.mode = newMode;
  const task = getActiveTask();

  if (newMode === 'idle') {
    appState.session.remainingSeconds = task ? task.focusMinutes * 60 : 0;
  } else if (newMode === 'focus') {
    if (appState.session.remainingSeconds <= 0) {
      appState.session.remainingSeconds = task ? task.focusMinutes * 60 : 0;
    }
  } else if (newMode === 'break') {
    const breakMins = task ? (task.breakMinutes || 5) : 5;
    // Long break every 4 pomos
    const isLongBreak = appState.session.pomodoroCount > 0 && appState.session.pomodoroCount % 4 === 0;
    appState.session.remainingSeconds = isLongBreak ? 15 * 60 : breakMins * 60;
  }

  window.dispatchEvent(new CustomEvent('tomato:statechange'));
}

// --- Start Timer ---
export function startTimer() {
  if (appState.tasks.length === 0) return;
  if (appState.session.mode === 'idle') switchMode('focus');

  appState.session.isRunning = true;
  appState.session.endTime = Date.now() + (appState.session.remainingSeconds * 1000);

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 100);
  window.dispatchEvent(new CustomEvent('tomato:statechange'));
}

// --- Pause Timer ---
export function pauseTimer() {
  if (appState.session.isRunning) {
    const remainingMs = appState.session.endTime - Date.now();
    appState.session.remainingSeconds = Math.max(0, remainingMs / 1000);
  }
  appState.session.isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  window.dispatchEvent(new CustomEvent('tomato:statechange'));
}

// --- Stop Timer ---
export function stopTimer() {
  appState.session.isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
}

// --- Tick ---
function tick() {
  const remainingMs = appState.session.endTime - Date.now();
  if (remainingMs <= 0) {
    appState.session.remainingSeconds = 0;
    stopTimer();
    window.dispatchEvent(new CustomEvent('tomato:statechange'));
    window.dispatchEvent(new CustomEvent('tomato:timerend'));
  } else {
    appState.session.remainingSeconds = remainingMs / 1000;
    window.dispatchEvent(new CustomEvent('tomato:statechange'));
  }
}

// --- Set Active Task ---
export function setTask(id) {
  stopTimer();
  appState.session.activeTaskId = id;
  switchMode('idle');
}
