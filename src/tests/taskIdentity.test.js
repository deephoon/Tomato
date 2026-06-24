import { describe, expect, it } from 'vitest';
import { dedupeTasksBySignature, normalizeTaskIds } from '../services/taskIdentity.service.js';

describe('task identity helpers', () => {
  it('converts local task ids to UUIDs and updates active session references', () => {
    const tasks = [
      { id: 't_local_1', title: 'WRITE', targetDate: '2026-06-24' },
      { id: '5f0f4c9d-7b37-4d30-8d73-8414da839f42', title: 'READ', targetDate: '2026-06-24' }
    ];
    const session = { activeTaskId: 't_local_1' };

    const remap = normalizeTaskIds(tasks, {
      session,
      createId: () => '7a738af0-36ec-42e2-99c8-2f6ef895c3d3'
    });

    expect(remap.get('t_local_1')).toBe('7a738af0-36ec-42e2-99c8-2f6ef895c3d3');
    expect(tasks[0].id).toBe('7a738af0-36ec-42e2-99c8-2f6ef895c3d3');
    expect(tasks[1].id).toBe('5f0f4c9d-7b37-4d30-8d73-8414da839f42');
    expect(session.activeTaskId).toBe('7a738af0-36ec-42e2-99c8-2f6ef895c3d3');
  });

  it('keeps one copy of remotely duplicated tasks with the same signature', () => {
    const tasks = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'WRITE',
        focusMinutes: 25,
        breakMinutes: 5,
        status: 'open',
        targetDate: '2026-06-24',
        order: 1,
        source: 'manual'
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        title: 'WRITE',
        focusMinutes: 25,
        breakMinutes: 5,
        status: 'open',
        targetDate: '2026-06-24',
        order: 1,
        source: 'manual'
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        title: 'WRITE',
        focusMinutes: 50,
        breakMinutes: 5,
        status: 'open',
        targetDate: '2026-06-24',
        order: 2,
        source: 'manual'
      }
    ];

    expect(dedupeTasksBySignature(tasks)).toEqual([tasks[0], tasks[2]]);
  });
});
