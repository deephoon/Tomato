import { getFirstRitualCandidate } from './ritualStarter.service.js';
import { appState, saveHistory } from '../state.js';

export function getNextFocusCandidate(tasks, todayDate, currentTaskId = null) {
  const filteredTasks = currentTaskId ? tasks.filter(t => t.id !== currentTaskId) : tasks;
  return getFirstRitualCandidate(filteredTasks, todayDate);
}

export function getPostFocusActions({ hasBreak, nextTask }) {
  const actions = [];
  
  if (hasBreak) {
    actions.push({ type: 'start_break', label: '휴식 시작', primary: true });
  }
  
  if (nextTask) {
    actions.push({ type: 'next_focus', label: '다음 집중 시작', primary: !hasBreak });
  } else {
    actions.push({ type: 'end_today', label: '오늘은 종료', primary: false });
  }
  
  return actions;
}

export function saveReflection(historyId, reflectionValue) {
  if (!historyId || !reflectionValue) return false;
  
  const historyItem = appState.history.find(h => h.id === historyId);
  if (historyItem) {
    historyItem.reflection = reflectionValue;
    saveHistory();
    return true;
  }
  return false;
}
