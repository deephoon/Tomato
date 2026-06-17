import { readJSON, writeJSON, removeKey } from '../utils/safeStorage.js';
import { getTodayStr } from '../utils/dateTime.js';

const getSessionKey = (userId) => `tomato_user_${userId}_session`;

const DEFAULT_SESSION = {
  activeTaskId: null,
  mode: 'idle',           // idle | focus | break
  remainingSeconds: 0,
  isRunning: false,
  endTime: 0,
  startedAt: 0,
  pausedAt: 0,
  pauseCount: 0,
  resumedCount: 0,
  lastCompletedEnd: 0,    // dedupe key so synced clients don't double-log a finish
  pomodoroCount: 0,       // today's completed pomodoros
  pomodoroGoal: 4,        // daily goal
  todayDate: getTodayStr(),
  calendarOffset: 0,      // 0 for current month, -1 for previous, etc.
  selectedDate: getTodayStr(), // currently selected date in planner
  aiPlanningActive: false
};

export function getSession(userId) {
  if (!userId) return { ...DEFAULT_SESSION, todayDate: getTodayStr(), selectedDate: getTodayStr() };
  const session = readJSON(getSessionKey(userId), DEFAULT_SESSION);
  return { ...DEFAULT_SESSION, ...session };
}

export function saveSession(userId, session) {
  if (!userId) return false;
  return writeJSON(getSessionKey(userId), session);
}

export function clearSession(userId) {
  if (!userId) return false;
  return removeKey(getSessionKey(userId));
}
