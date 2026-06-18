import { describe, expect, it } from 'vitest';
import {
  inferTaskType,
  splitDurations,
  generateSubdivisionBlocks
} from '../services/subdivide.service.js';

describe('inferTaskType', () => {
  it('detects types from English keywords', () => {
    expect(inferTaskType('Write the launch blog post')).toBe('writing');
    expect(inferTaskType('Implement timer bugfix')).toBe('dev');
    expect(inferTaskType('Study for the exam')).toBe('study');
    expect(inferTaskType('Design the settings UI')).toBe('design');
    expect(inferTaskType('Team planning meeting')).toBe('meeting');
  });

  it('detects types from Korean keywords', () => {
    expect(inferTaskType('보고서 작성')).toBe('writing');
    expect(inferTaskType('로그인 기능 구현')).toBe('dev');
    expect(inferTaskType('알고리즘 공부')).toBe('study');
  });

  it('falls back to default for unknown titles', () => {
    expect(inferTaskType('Misc errands')).toBe('default');
    expect(inferTaskType('')).toBe('default');
  });
});

describe('splitDurations', () => {
  it('sums exactly to the total', () => {
    for (const [total, count] of [[100, 4], [90, 4], [25, 2], [60, 3], [120, 5]]) {
      const durs = splitDurations(total, count);
      expect(durs).toHaveLength(count);
      expect(durs.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it('keeps every block at least 10 minutes', () => {
    const durs = splitDurations(45, 4);
    expect(Math.min(...durs)).toBeGreaterThanOrEqual(10);
    expect(durs.reduce((a, b) => a + b, 0)).toBe(45);
  });
});

describe('generateSubdivisionBlocks', () => {
  it('labels blocks with the task title and a meaningful phase', () => {
    const blocks = generateSubdivisionBlocks('Write report', 50);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0].title).toBe('Write report · OUTLINE');
    expect(blocks[blocks.length - 1].phase).toBe('POLISH');
    expect(blocks.reduce((a, b) => a + b.dur, 0)).toBe(50);
  });

  it('is deterministic', () => {
    const a = generateSubdivisionBlocks('Build API', 75);
    const b = generateSubdivisionBlocks('Build API', 75);
    expect(a).toEqual(b);
  });

  it('uses dev phases for coding tasks', () => {
    const blocks = generateSubdivisionBlocks('Implement feature', 60);
    expect(blocks[0].phase).toBe('DESIGN');
  });
});
