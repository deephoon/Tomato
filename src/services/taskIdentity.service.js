import { generateUuid, isUuid } from '../utils/id.js';

export function normalizeTaskIds(tasks, { session = null, createId = generateUuid } = {}) {
  const remap = new Map();
  if (!Array.isArray(tasks)) return remap;

  tasks.forEach(task => {
    if (!task || isUuid(task.id)) return;
    const previousId = task.id;
    const nextId = createId();
    task.id = nextId;
    remap.set(previousId, nextId);
  });

  if (session?.activeTaskId && remap.has(session.activeTaskId)) {
    session.activeTaskId = remap.get(session.activeTaskId);
  }

  if (session?.completedHistoryId && remap.has(session.completedHistoryId)) {
    session.completedHistoryId = remap.get(session.completedHistoryId);
  }

  return remap;
}

export function dedupeTasksBySignature(tasks) {
  if (!Array.isArray(tasks)) return [];

  const seen = new Set();
  return tasks.filter(task => {
    const signature = [
      task.title || '',
      task.focusMinutes || 25,
      task.breakMinutes || 5,
      task.status || 'open',
      task.targetDate || '',
      task.order ?? 0,
      task.source || 'manual'
    ].join('|');

    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}
