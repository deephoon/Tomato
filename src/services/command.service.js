import { getRuntimeUser } from '../state.js';
import { insertCommand } from '../repositories/command.repository.js';
import { queueCommand } from './offlineQueue.service.js';
import { generateId } from '../utils/id.js';
import { isWidget } from '../utils/runtime.js';

export async function executeCommand(commandName, payload = {}) {
  const user = getRuntimeUser();
  if (!user) return false;

  const cmdObj = {
    id: generateId('cmd'),
    command: commandName,
    payload,
    issuedBy: isWidget() ? 'widget' : 'web',
    issuedAt: new Date().toISOString(),
    idempotencyKey: payload.completionKey || generateId('idem') // For complete, use completionKey. For others, generate.
  };

  const success = await insertCommand({
    userId: user.id,
    command: cmdObj.command,
    payload: cmdObj.payload,
    issuedBy: cmdObj.issuedBy,
    idempotencyKey: cmdObj.idempotencyKey
  });

  if (!success) {
    console.warn(`Command ${commandName} failed to reach Supabase. Queuing offline.`);
    queueCommand(cmdObj);
    return false;
  }
  return true;
}
