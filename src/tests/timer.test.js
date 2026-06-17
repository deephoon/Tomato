import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appState } from '../state.js';
import { startFocus, pauseSession, resumeSession, completeFocus, startBreak, resetSession } from '../timer.js';

describe('timer logic', () => {
  beforeEach(() => {
    // Reset state before each test
    appState.session = {
      mode: 'idle',
      remainingSeconds: 0,
      isRunning: false,
      endTime: 0,
      startedAt: 0,
      pausedAt: 0,
      pauseCount: 0,
      resumedCount: 0,
      completionKey: null,
      completedHistoryId: null,
      todayDate: '2026-04-20',
      pomodoroCount: 0
    };
    appState.history = [];
    appState.tasks = [];
    
    vi.useFakeTimers();
  });

  it('startFocus sets endTime correctly', () => {
    const task = { id: 't_1', focusMinutes: 25 };
    vi.setSystemTime(new Date(1000));
    
    startFocus(task);
    
    expect(appState.session.mode).toBe('focus');
    expect(appState.session.remainingSeconds).toBe(25 * 60);
    expect(appState.session.endTime).toBe(1000 + (25 * 60 * 1000));
    expect(appState.session.isRunning).toBe(true);
    expect(appState.session.completionKey).toBe(`t_1_1000_${25 * 60}`);
  });

  it('pauseSession calculates remainingSeconds correctly', () => {
    const task = { id: 't_1', focusMinutes: 25 };
    vi.setSystemTime(new Date(1000));
    startFocus(task);
    
    // Fast forward 5 minutes
    vi.setSystemTime(new Date(1000 + (5 * 60 * 1000)));
    
    pauseSession();
    
    expect(appState.session.isRunning).toBe(false);
    expect(appState.session.remainingSeconds).toBe(20 * 60);
    expect(appState.session.pauseCount).toBe(1);
    expect(appState.session.pausedAt).toBe(1000 + (5 * 60 * 1000));
  });

  it('resumeSession recalculates endTime correctly', () => {
    const task = { id: 't_1', focusMinutes: 25 };
    vi.setSystemTime(new Date(1000));
    startFocus(task);
    
    vi.setSystemTime(new Date(1000 + (5 * 60 * 1000))); // 5 mins passed
    pauseSession();
    
    vi.setSystemTime(new Date(1000 + (10 * 60 * 1000))); // Paused for 5 mins
    resumeSession();
    
    expect(appState.session.isRunning).toBe(true);
    // End time should be now + remaining time (20 mins)
    const expectedEndTime = (1000 + (10 * 60 * 1000)) + (20 * 60 * 1000);
    expect(appState.session.endTime).toBe(expectedEndTime);
    expect(appState.session.resumedCount).toBe(1);
  });

  it('completeFocus creates history exactly once', () => {
    const task = { id: 't_1', focusMinutes: 25, title: 'Test' };
    appState.tasks.push(task);
    
    vi.setSystemTime(new Date(1000));
    startFocus(task);
    
    // Fast forward 25 mins
    vi.setSystemTime(new Date(1000 + (25 * 60 * 1000)));
    
    completeFocus();
    
    expect(appState.history.length).toBe(1);
    expect(appState.history[0].taskId).toBe('t_1');
    expect(appState.session.isRunning).toBe(false);
    
    // Call again, should not create duplicate history
    completeFocus();
    expect(appState.history.length).toBe(1); // Still 1
  });

  it('startBreak changes mode to break', () => {
    vi.setSystemTime(new Date(1000));
    startBreak();
    
    expect(appState.session.mode).toBe('break');
    expect(appState.session.remainingSeconds).toBe(5 * 60); // Default break is 5 mins
    expect(appState.session.isRunning).toBe(true);
  });

  it('resetSession resets state to idle', () => {
    startFocus(null);
    resetSession();
    
    expect(appState.session.mode).toBe('idle');
    expect(appState.session.isRunning).toBe(false);
    expect(appState.session.activeTaskId).toBeNull();
  });
});
