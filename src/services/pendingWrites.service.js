// ==========================================
// DURABLE PENDING WRITES
//
// When a remote write fails (offline / network / RLS), the change would be lost
// on refresh because tasks/history have no local persistence for logged-in
// users. This service keeps the unsynced payloads in localStorage so they
// survive a reload and can be replayed once connectivity returns.
//
// Shape (per user):
//   {
//     tasks?:          Task[]          // full snapshot (latest-wins, idempotent save)
//     session?:        SessionPayload  // full snapshot (latest-wins, idempotent upsert)
//     historyAppends?: HistoryItem[]   // append ops (idempotent via completion_key dedup)
//   }
//
// tasks/session are idempotent full-state saves, so a snapshot is enough.
// History append is incremental (saveHistory is a no-op), so we keep the items.
// ==========================================

import { readJSON, writeJSON, removeKey } from '../utils/safeStorage.js';

const storageKey = (userId) => `tomato_pending_${userId}`;

// --- Pure transforms (unit-tested) ---------------------------------------

export function upsertSnapshot(pending, entity, payload) {
  return { ...pending, [entity]: payload };
}

export function pushHistoryAppend(pending, item) {
  const list = Array.isArray(pending?.historyAppends) ? pending.historyAppends : [];
  const idOf = (it) => it?.id ?? it?.completionKey;
  const key = idOf(item);
  // Latest-wins per id so re-enqueuing the same item doesn't grow unbounded.
  const deduped = list.filter((it) => idOf(it) !== key);
  return { ...(pending || {}), historyAppends: [...deduped, item] };
}

export function clearEntity(pending, entity) {
  const next = { ...(pending || {}) };
  delete next[entity];
  return next;
}

export function isEmpty(pending) {
  if (!pending) return true;
  return !pending.tasks && !pending.session && !(pending.historyAppends && pending.historyAppends.length);
}

// --- Storage-backed API ---------------------------------------------------

export function readPending(userId) {
  if (!userId) return {};
  return readJSON(storageKey(userId), {}) || {};
}

function persist(userId, pending) {
  if (isEmpty(pending)) removeKey(storageKey(userId));
  else writeJSON(storageKey(userId), pending);
}

export function setPendingSnapshot(userId, entity, payload) {
  if (!userId) return;
  persist(userId, upsertSnapshot(readPending(userId), entity, payload));
}

export function addPendingHistoryAppend(userId, item) {
  if (!userId || !item) return;
  persist(userId, pushHistoryAppend(readPending(userId), item));
}

export function clearPendingEntity(userId, entity) {
  if (!userId) return;
  persist(userId, clearEntity(readPending(userId), entity));
}

export function clearPendingHistoryAppends(userId) {
  clearPendingEntity(userId, 'historyAppends');
}

export function hasPending(userId) {
  return !isEmpty(readPending(userId));
}
