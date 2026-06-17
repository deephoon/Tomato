import { readJSON, writeJSON } from '../utils/safeStorage.js';
import { getTodayStr } from '../utils/dateTime.js';

const getTaskKey = (userId) => `tomato_user_${userId}_tasks`;

const DEFAULT_TASKS = [
  { id: 't_1', title: 'DEEP SYSTEM DESIGN', focusMinutes: 25, breakMinutes: 5, status: 'active', timeLabel: '22:00', targetDate: getTodayStr(), order: 0 }
];

export function getTasks(userId) {
  if (!userId) return [];
  const tasks = readJSON(getTaskKey(userId), DEFAULT_TASKS);
  return Array.isArray(tasks) ? tasks : [];
}

export function saveTasks(userId, tasks) {
  if (!userId) return false;
  return writeJSON(getTaskKey(userId), tasks);
}
