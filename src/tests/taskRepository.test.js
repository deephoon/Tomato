import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('task.repository remote synchronization', () => {
  let upsert;
  let deleteEq;
  let deleteNot;
  let listQuery;
  let supabase;

  beforeEach(() => {
    vi.resetModules();
    upsert = vi.fn().mockResolvedValue({ error: null });
    deleteNot = vi.fn().mockResolvedValue({ error: null });
    deleteEq = vi.fn(() => ({ not: deleteNot }));
    listQuery = {
      select: vi.fn(() => listQuery),
      eq: vi.fn(() => listQuery),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    };
    supabase = {
      from: vi.fn(() => ({
        ...listQuery,
        upsert,
        delete: vi.fn(() => ({ eq: deleteEq }))
      }))
    };
    vi.doMock('../supabase/client.js', () => ({ supabase }));
  });

  afterEach(() => {
    vi.doUnmock('../supabase/client.js');
  });

  it('normalizes local ids before upsert and deletes remote rows not in the current list', async () => {
    const { saveTasks } = await import('../repositories/task.repository.js');
    const tasks = [{ id: 't_local_1', title: 'WRITE', focusMinutes: 25, breakMinutes: 5, targetDate: '2026-06-24' }];

    await expect(saveTasks('user-1', tasks)).resolves.toBe(true);

    expect(tasks[0].id).toMatch(uuidRegex);
    expect(upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ id: tasks[0].id, user_id: 'user-1', title: 'WRITE' })],
      { onConflict: 'id' }
    );
    expect(deleteEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(deleteNot).toHaveBeenCalledWith('id', 'in', `(${tasks[0].id})`);
  });

  it('deletes all remote tasks when the current task list is empty', async () => {
    const { saveTasks } = await import('../repositories/task.repository.js');

    await expect(saveTasks('user-1', [])).resolves.toBe(true);

    expect(upsert).not.toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(deleteNot).not.toHaveBeenCalled();
  });

  it('deduplicates repeated remote rows before returning them to the UI', async () => {
    listQuery.order.mockResolvedValue({
      data: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'WRITE',
          focus_minutes: 25,
          break_minutes: 5,
          status: 'open',
          target_date: '2026-06-24',
          task_order: 1,
          source: 'manual'
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'WRITE',
          focus_minutes: 25,
          break_minutes: 5,
          status: 'open',
          target_date: '2026-06-24',
          task_order: 1,
          source: 'manual'
        }
      ],
      error: null
    });

    const { getTasks } = await import('../repositories/task.repository.js');

    await expect(getTasks('user-1')).resolves.toHaveLength(1);
  });
});
