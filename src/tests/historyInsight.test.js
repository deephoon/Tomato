import { describe, it, expect } from 'vitest';
import { 
  getTotalFocusMinutes, 
  getLast7DaysFocusMinutes, 
  getAverageSessionMinutes, 
  getReflectionStats,
  getCurrentStreak
} from '../services/historyInsight.service.js';

describe('historyInsight.service', () => {
  const history = [
    { id: '1', focusMinutes: 25, actualSeconds: 1500, date: '2026-04-18', reflection: 'normal' },
    { id: '2', focusMinutes: 25, actualSeconds: 1500, date: '2026-04-19', reflection: 'easy' },
    { id: '3', focusMinutes: 50, actualSeconds: 3000, date: '2026-04-20', reflection: 'hard' },
  ];

  it('calculates total focus minutes correctly', () => {
    expect(getTotalFocusMinutes(history)).toBe(100);
  });

  it('calculates average session length', () => {
    expect(getAverageSessionMinutes(history)).toBe(33); // 100 / 3
  });

  it('aggregates reflection stats', () => {
    const stats = getReflectionStats(history);
    expect(stats.easy).toBe(1);
    expect(stats.normal).toBe(1);
    expect(stats.hard).toBe(1);
    expect(stats.total).toBe(3);
  });

  it('calculates current streak', () => {
    // 18, 19, 20 is a 3 day streak, assuming today is 20th
    const streak = getCurrentStreak(history, '2026-04-20');
    expect(streak).toBe(3);
  });
  
  it('returns 0 streak if missed a day', () => {
    const streak = getCurrentStreak(history, '2026-04-22');
    expect(streak).toBe(0);
  });
  
  it('returns empty stats if history is empty', () => {
    expect(getTotalFocusMinutes([])).toBe(0);
    expect(getAverageSessionMinutes([])).toBe(0);
    expect(getCurrentStreak([], '2026-04-20')).toBe(0);
  });
});
