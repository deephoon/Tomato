import { describe, expect, it } from 'vitest';
import { getNextFocusCandidate } from '../services/focusFlow.service.js';

describe('getNextFocusCandidate', () => {
  const today = '2026-06-17';

  it('returns only an open task from today', () => {
    const result = getNextFocusCandidate([
      { id: 'done', status: 'done', targetDate: today, order: 0 },
      { id: 'other-day', status: 'open', targetDate: '2026-06-18', order: 0 },
      { id: 'next', status: 'open', targetDate: today, order: 1 }
    ], today);

    expect(result.id).toBe('next');
  });

  it('prioritizes order, then createdAt, then timeLabel', () => {
    const result = getNextFocusCandidate([
      { id: 'late', status: 'open', targetDate: today, order: 2, createdAt: 1, timeLabel: '08:00' },
      { id: 'created-later', status: 'open', targetDate: today, order: 1, createdAt: 20, timeLabel: '07:00' },
      { id: 'created-earlier', status: 'open', targetDate: today, order: 1, createdAt: 10, timeLabel: '09:00' }
    ], today);

    expect(result.id).toBe('created-earlier');
  });

  it('excludes the current task', () => {
    const result = getNextFocusCandidate([
      { id: 'current', status: 'open', targetDate: today, order: 0 },
      { id: 'next', status: 'open', targetDate: today, order: 1 }
    ], today, 'current');

    expect(result.id).toBe('next');
  });

  it('returns null when no candidate exists', () => {
    expect(getNextFocusCandidate([], today)).toBeNull();
    expect(getNextFocusCandidate([{ id: 'done', status: 'done', targetDate: today }], today)).toBeNull();
  });
});
