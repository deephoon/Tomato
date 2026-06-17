import { readJSON, writeJSON } from '../utils/safeStorage.js';
import { getRuntimeUser } from '../state.js';
import { insertCommand } from '../repositories/command.repository.js';

const getQueueKey = (userId) => `tomato_offline_commands_${userId}`;

export function getOfflineQueue() {
  const user = getRuntimeUser();
  if (!user) return [];
  return readJSON(getQueueKey(user.id), []);
}

export function queueCommand(commandObj) {
  const user = getRuntimeUser();
  if (!user) return;
  const queue = getOfflineQueue();
  queue.push(commandObj);
  writeJSON(getQueueKey(user.id), queue);
  window.dispatchEvent(new CustomEvent('tomato:offline-queue-updated', { detail: queue.length }));
}

export async function processQueue() {
  const user = getRuntimeUser();
  if (!user) return;
  
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const remaining = [];
  let processedCount = 0;

  for (const cmd of queue) {
    const success = await insertCommand({
      userId: user.id,
      command: cmd.command,
      payload: cmd.payload,
      issuedBy: cmd.issuedBy,
      idempotencyKey: cmd.idempotencyKey
    });

    if (success) {
      processedCount++;
    } else {
      remaining.push(cmd);
    }
  }

  writeJSON(getQueueKey(user.id), remaining);
  if (processedCount > 0 || remaining.length > 0) {
    window.dispatchEvent(new CustomEvent('tomato:offline-queue-updated', { detail: remaining.length }));
  }
}

// Optionally, process queue periodically or on online event
window.addEventListener('online', processQueue);
