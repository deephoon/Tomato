import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  upsertSnapshot,
  pushHistoryAppend,
  clearEntity,
  isEmpty,
  readPending,
  setPendingSnapshot,
  addPendingHistoryAppend,
  clearPendingEntity,
  hasPending
} from '../services/pendingWrites.service.js';

describe('pendingWrites pure transforms', () => {
  it('upsertSnapshot sets a full payload per entity (latest-wins)', () => {
    let p = upsertSnapshot({}, 'tasks', [{ id: 'a' }]);
    expect(p.tasks).toEqual([{ id: 'a' }]);
    p = upsertSnapshot(p, 'tasks', [{ id: 'a' }, { id: 'b' }]);
    expect(p.tasks).toHaveLength(2);
    p = upsertSnapshot(p, 'session', { mode: 'focus' });
    expect(p.session).toEqual({ mode: 'focus' });
    expect(p.tasks).toHaveLength(2);
  });

  it('pushHistoryAppend appends and dedupes by id', () => {
    let p = pushHistoryAppend({}, { id: 'h1' });
    p = pushHistoryAppend(p, { id: 'h2' });
    expect(p.historyAppends).toHaveLength(2);
    // re-enqueue h1 (e.g. retried) → still one h1, moved to end
    p = pushHistoryAppend(p, { id: 'h1', actualSeconds: 999 });
    expect(p.historyAppends).toHaveLength(2);
    expect(p.historyAppends.at(-1)).toEqual({ id: 'h1', actualSeconds: 999 });
  });

  it('clearEntity removes one entity, leaves the rest', () => {
    const p = { tasks: [1], session: { a: 1 }, historyAppends: [{ id: 'h' }] };
    expect(clearEntity(p, 'tasks')).toEqual({ session: { a: 1 }, historyAppends: [{ id: 'h' }] });
  });

  it('isEmpty reflects whether anything is queued', () => {
    expect(isEmpty({})).toBe(true);
    expect(isEmpty({ historyAppends: [] })).toBe(true);
    expect(isEmpty({ tasks: [] })).toBe(false); // empty array is still an intentional snapshot
    expect(isEmpty({ historyAppends: [{ id: 'h' }] })).toBe(false);
  });
});

describe('pendingWrites storage (per user, survives reload)', () => {
  const USER = 'user-1';
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('round-trips a task snapshot', () => {
    expect(hasPending(USER)).toBe(false);
    setPendingSnapshot(USER, 'tasks', [{ id: 'a', title: 'WRITE' }]);
    expect(hasPending(USER)).toBe(true);
    expect(readPending(USER).tasks).toEqual([{ id: 'a', title: 'WRITE' }]);
  });

  it('keeps separate queues per user', () => {
    setPendingSnapshot('user-1', 'tasks', [{ id: 'a' }]);
    setPendingSnapshot('user-2', 'tasks', [{ id: 'z' }]);
    expect(readPending('user-1').tasks).toEqual([{ id: 'a' }]);
    expect(readPending('user-2').tasks).toEqual([{ id: 'z' }]);
  });

  it('clearing the last entity removes the storage key entirely', () => {
    addPendingHistoryAppend(USER, { id: 'h1' });
    clearPendingEntity(USER, 'historyAppends');
    expect(hasPending(USER)).toBe(false);
    expect(localStorage.getItem('tomato_pending_user-1')).toBeNull();
  });
});
