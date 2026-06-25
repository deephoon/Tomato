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

// Guard against stale-save data loss: task.repository.saveTasks() treats the
// local list as the source of truth and DELETES every remote row missing from
// it. If an empty list is saved before the cloud state has loaded (e.g. a save
// firing during boot), it would wipe ALL of the user's remote tasks. Block
// exactly that case — empty list + cloud not yet loaded. Non-empty saves and
// post-load saves (incl. an intentional "delete my last task") still proceed.
export function shouldSkipTaskPersist({ isCloudLoaded, taskCount } = {}) {
  return !isCloudLoaded && (taskCount || 0) === 0;
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
