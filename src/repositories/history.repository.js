import { readJSON, writeJSON } from '../utils/safeStorage.js';

const getHistoryKey = (userId) => `tomato_user_${userId}_history`;

export function getHistory(userId) {
  if (!userId) return [];
  const history = readJSON(getHistoryKey(userId), []);
  return Array.isArray(history) ? history : [];
}

export function saveHistory(userId, history) {
  if (!userId) return false;
  return writeJSON(getHistoryKey(userId), history);
}

export function appendHistory(userId, item) {
  if (!userId) return false;
  const history = getHistory(userId);
  history.push(item);
  return saveHistory(userId, history);
}

export function updateHistoryItem(userId, historyId, patch) {
  if (!userId) return false;
  const history = getHistory(userId);
  const index = history.findIndex((h) => h.id === historyId);
  if (index !== -1) {
    history[index] = { ...history[index], ...patch };
    return saveHistory(userId, history);
  }
  return false;
}
