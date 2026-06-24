import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('repositories without Supabase configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../supabase/client.js', () => ({ supabase: null }));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.doUnmock('../supabase/client.js');
  });

  it('keeps preferences local and skips remote writes', async () => {
    const { getPreferences, savePreferences } = await import('../repositories/preference.repository.js');

    await expect(savePreferences('user-1', { lang: 'en', focusMinutes: 40 })).resolves.toBe(false);
    await expect(getPreferences('user-1')).resolves.toMatchObject({
      lang: 'en',
      focusMinutes: 40
    });
  });

  it('treats command operations as offline no-ops', async () => {
    const {
      insertCommand,
      listPendingCommands,
      markCommandProcessed
    } = await import('../repositories/command.repository.js');

    await expect(insertCommand({
      userId: 'user-1',
      command: 'pause',
      payload: {},
      issuedBy: 'test',
      idempotencyKey: 'cmd-1'
    })).resolves.toBe(false);
    await expect(listPendingCommands('user-1')).resolves.toEqual([]);
    await expect(markCommandProcessed('user-1', 'cmd-1')).resolves.toBe(false);
  });

  it('treats task, session, and history writes as offline no-ops', async () => {
    const taskRepository = await import('../repositories/task.repository.js');
    const sessionRepository = await import('../repositories/session.repository.js');
    const historyRepository = await import('../repositories/history.repository.js');

    await expect(taskRepository.getTasks('user-1')).resolves.toEqual([]);
    await expect(taskRepository.saveTasks('user-1', [{ id: 'task-1', title: 'Focus' }])).resolves.toBe(false);
    await expect(taskRepository.updateTask('user-1', 'task-1', { title: 'Deep Focus' })).resolves.toBe(false);
    await expect(taskRepository.deleteTask('user-1', 'task-1')).resolves.toBe(false);

    const session = { mode: 'focus', remainingSeconds: 1500, isRunning: true };
    await expect(sessionRepository.saveSession('user-1', session)).resolves.toBe(false);
    await expect(sessionRepository.getSession('user-1')).resolves.toMatchObject(session);

    await expect(historyRepository.getHistory('user-1')).resolves.toEqual([]);
    await expect(historyRepository.appendHistory('user-1', {
      title: 'Focus',
      targetDate: '2026-06-24',
      completionKey: 'history-1'
    })).resolves.toBe(false);
    await expect(historyRepository.updateHistoryItem('user-1', 'history-1', { reflection: 'done' })).resolves.toBe(false);
  });
});
