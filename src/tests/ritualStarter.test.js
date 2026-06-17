import { describe, it, expect } from 'vitest';
import { getFirstRitualCandidate, getTodayOpenTasks, createQuickStartTask } from '../services/ritualStarter.service.js';

describe('ritualStarter.service', () => {
  it('should recommend the open task with lowest order for today', () => {
    const tasks = [
      { id: '1', title: 'Task 1', status: 'done', targetDate: '2026-04-20', order: 0 },
      { id: '2', title: 'Task 2', status: 'open', targetDate: '2026-04-20', order: 2, createdAt: 100 },
      { id: '3', title: 'Task 3', status: 'open', targetDate: '2026-04-20', order: 1, createdAt: 200 },
      { id: '4', title: 'Task 4', status: 'open', targetDate: '2026-04-21', order: 0 },
    ];
    
    const candidate = getFirstRitualCandidate(tasks, '2026-04-20');
    expect(candidate.id).toBe('3');
  });

  it('should fall back to createdAt if orders are equal', () => {
    const tasks = [
      { id: '1', title: 'A', status: 'open', targetDate: '2026-04-20', order: 1, createdAt: 200 },
      { id: '2', title: 'B', status: 'open', targetDate: '2026-04-20', order: 1, createdAt: 100 },
    ];
    
    const candidate = getFirstRitualCandidate(tasks, '2026-04-20');
    expect(candidate.id).toBe('2');
  });

  it('should return null if no open task for today', () => {
    const tasks = [
      { id: '1', title: 'A', status: 'done', targetDate: '2026-04-20' }
    ];
    const candidate = getFirstRitualCandidate(tasks, '2026-04-20');
    expect(candidate).toBeNull();
  });

  it('should create quick start task', () => {
    const task = createQuickStartTask({ title: 'Quick', focusMinutes: 45, breakMinutes: 10, todayDate: '2026-04-20' });
    expect(task.title).toBe('Quick');
    expect(task.focusMinutes).toBe(45);
    expect(task.breakMinutes).toBe(10);
    expect(task.targetDate).toBe('2026-04-20');
    expect(task.order).toBe(-1);
    expect(task.status).toBe('active');
  });
});
