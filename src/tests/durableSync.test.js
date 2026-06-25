import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Drives state.js with mocked repositories to prove the durable-write lifecycle:
// failed remote write -> payload persisted -> replayed on flush -> queue cleared.

const flushAsync = () => new Promise((r) => setTimeout(r, 0));

describe('durable failed-write queue (state integration)', () => {
  let saveTasksMock;
  let appendHistoryMock;
  let saveSessionMock;

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    saveTasksMock = vi.fn();
    appendHistoryMock = vi.fn();
    saveSessionMock = vi.fn();

    vi.doMock('../supabase/client.js', () => ({ getCurrentUser: vi.fn(), supabase: null }));
    vi.doMock('../repositories/task.repository.js', () => ({ saveTasks: saveTasksMock, getTasks: vi.fn() }));
    vi.doMock('../repositories/history.repository.js', () => ({
      appendHistory: appendHistoryMock,
      saveHistory: vi.fn().mockResolvedValue(true),
      getHistory: vi.fn(),
      updateHistoryItem: vi.fn().mockResolvedValue(true)
    }));
    vi.doMock('../repositories/session.repository.js', () => ({
      saveSession: saveSessionMock,
      getSession: vi.fn(),
      getLocalCache: vi.fn(() => ({}))
    }));
    vi.doMock('../repositories/preference.repository.js', () => ({
      getPreferences: vi.fn(),
      savePreferences: vi.fn(),
      getLocalCache: vi.fn(() => ({ lang: 'en' }))
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it('queues a failed task save and replays it on flush', async () => {
    saveTasksMock.mockResolvedValueOnce(false); // first save fails (offline)
    const { appState, saveTasks, flushPendingWrites } = await import('../state.js');
    const pending = await import('../services/pendingWrites.service.js');

    appState.auth.user = { id: 'user-1' };
    appState.isCloudLoaded = true;
    appState.tasks = [{ id: '11111111-1111-4111-8111-111111111111', title: 'WRITE' }];

    saveTasks();
    await flushAsync();

    // Failure persisted the snapshot.
    expect(pending.readPending('user-1').tasks).toHaveLength(1);

    // Network recovers → replay succeeds → queue cleared.
    saveTasksMock.mockResolvedValue(true);
    await flushPendingWrites();

    expect(saveTasksMock).toHaveBeenCalledTimes(2);
    expect(pending.readPending('user-1').tasks).toBeUndefined();
  });

  it('clears the task queue immediately when the live save succeeds', async () => {
    saveTasksMock.mockResolvedValue(true);
    const { appState, saveTasks } = await import('../state.js');
    const pending = await import('../services/pendingWrites.service.js');

    appState.auth.user = { id: 'user-1' };
    appState.isCloudLoaded = true;
    appState.tasks = [{ id: '22222222-2222-4222-8222-222222222222', title: 'READ' }];

    saveTasks();
    await flushAsync();

    expect(pending.hasPending('user-1')).toBe(false);
  });

  it('queues a failed history append and replays the item on flush', async () => {
    appendHistoryMock.mockResolvedValueOnce(false);
    const { appState, appendHistoryItem, flushPendingWrites } = await import('../state.js');
    const pending = await import('../services/pendingWrites.service.js');

    appState.auth.user = { id: 'user-1' };
    appState.history = [];

    appendHistoryItem({ id: 'h1', actualSeconds: 1500 });
    await flushAsync();

    expect(pending.readPending('user-1').historyAppends).toHaveLength(1);

    appendHistoryMock.mockResolvedValue(true);
    await flushPendingWrites();

    expect(appendHistoryMock).toHaveBeenCalledTimes(2);
    expect(pending.hasPending('user-1')).toBe(false);
  });
});
