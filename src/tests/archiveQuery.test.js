import { describe, it, expect } from 'vitest';
import {
  filterByType,
  searchHistory,
  sortHistory,
  getStreakDates,
  queryArchive
} from '../services/archiveQuery.service.js';

const history = [
  { id: 'a', title: 'Deep Work', reflection: 'flow state', focusMinutes: 50, actualSeconds: 3000, date: '2026-06-19', completedAt: 1000 },
  { id: 'b', title: 'Email Triage', reflection: 'restless', focusMinutes: 25, actualSeconds: 1500, date: '2026-06-19', completedAt: 2000 },
  { id: 'c', title: 'Reading', reflection: '', focusMinutes: 25, actualSeconds: 900, date: '2026-06-18', completedAt: 3000 },
  { id: 'd', title: 'Design', reflection: 'productive', focusMinutes: 50, actualSeconds: 3000, date: '2026-06-16', completedAt: 4000 },
];

describe('archiveQuery.service', () => {
  describe('filterByType', () => {
    it('returns everything for "all"', () => {
      expect(filterByType(history, 'all', '2026-06-19')).toHaveLength(4);
    });
    it('25 keeps short rituals (<=25m)', () => {
      const r = filterByType(history, '25', '2026-06-19');
      expect(r.map(h => h.id).sort()).toEqual(['b', 'c']);
    });
    it('50 keeps long rituals (>=50m)', () => {
      const r = filterByType(history, '50', '2026-06-19');
      expect(r.map(h => h.id).sort()).toEqual(['a', 'd']);
    });
    it('streak keeps only records inside the current streak window', () => {
      // 06-19 and 06-18 are consecutive ending today; 06-16 breaks the chain.
      const r = filterByType(history, 'streak', '2026-06-19');
      expect(r.map(h => h.id).sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('getStreakDates', () => {
    it('walks back from today through consecutive days', () => {
      const dates = getStreakDates(history, '2026-06-19');
      expect(dates.has('2026-06-19')).toBe(true);
      expect(dates.has('2026-06-18')).toBe(true);
      expect(dates.has('2026-06-16')).toBe(false);
    });
    it('still counts a streak that ended yesterday', () => {
      const dates = getStreakDates(history, '2026-06-20');
      expect(dates.has('2026-06-19')).toBe(true);
      expect(dates.has('2026-06-18')).toBe(true);
    });
    it('returns empty when the latest record is older than yesterday', () => {
      const dates = getStreakDates(history, '2026-06-25');
      expect(dates.size).toBe(0);
    });
  });

  describe('searchHistory', () => {
    it('matches on title (case-insensitive)', () => {
      expect(searchHistory(history, 'deep').map(h => h.id)).toEqual(['a']);
    });
    it('matches on reflection text', () => {
      expect(searchHistory(history, 'productive').map(h => h.id)).toEqual(['d']);
    });
    it('returns all when query is blank', () => {
      expect(searchHistory(history, '   ')).toHaveLength(4);
    });
  });

  describe('sortHistory', () => {
    it('newest first by completedAt', () => {
      expect(sortHistory(history, 'newest').map(h => h.id)).toEqual(['d', 'c', 'b', 'a']);
    });
    it('oldest first', () => {
      expect(sortHistory(history, 'oldest').map(h => h.id)).toEqual(['a', 'b', 'c', 'd']);
    });
    it('longest by actual focus seconds', () => {
      const ids = sortHistory(history, 'longest').map(h => h.id);
      expect(ids[0] === 'a' || ids[0] === 'd').toBe(true); // both 3000s
      expect(ids[ids.length - 1]).toBe('c'); // 900s shortest
    });
    it('does not mutate the input', () => {
      const before = history.map(h => h.id);
      sortHistory(history, 'oldest');
      expect(history.map(h => h.id)).toEqual(before);
    });
  });

  describe('queryArchive', () => {
    it('groups by date, newest group first', () => {
      const groups = queryArchive(history, { today: '2026-06-19' });
      expect(groups.map(g => g.date)).toEqual(['2026-06-19', '2026-06-18', '2026-06-16']);
      expect(groups[0].count).toBe(2);
      expect(groups[0].totalMin).toBe(75);
    });
    it('reverses group order for oldest sort', () => {
      const groups = queryArchive(history, { sort: 'oldest', today: '2026-06-19' });
      expect(groups.map(g => g.date)).toEqual(['2026-06-16', '2026-06-18', '2026-06-19']);
    });
    it('composes filter + search', () => {
      const groups = queryArchive(history, { filter: '50', search: 'design', today: '2026-06-19' });
      expect(groups).toHaveLength(1);
      expect(groups[0].items.map(h => h.id)).toEqual(['d']);
    });
    it('returns an empty array when nothing matches', () => {
      expect(queryArchive(history, { search: 'zzz', today: '2026-06-19' })).toEqual([]);
    });
    it('handles empty/undefined history safely', () => {
      expect(queryArchive(undefined, { today: '2026-06-19' })).toEqual([]);
    });
  });
});
