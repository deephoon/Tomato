import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appState } from '../state.js';
import { recoverSession } from '../services/sessionRecovery.service.js';

describe('sessionRecovery.service', () => {
  beforeEach(() => {
    // Set a dummy user to bypass auth checks in the service
    appState.auth = { user: { id: 'test_user' } };
    
    appState.session = {
      mode: 'idle',
      isRunning: false,
      endTime: 0,
      startedAt: 0,
      remainingSeconds: 0
    };
    appState.history = [];
    appState.tasks = [];
    vi.useFakeTimers();
  });

  it('does nothing if session is idle', () => {
    const result = recoverSession();
    expect(result.status).toBe('idle');
  });

  it('recovers focus session if time remains', () => {
    const now = 1000;
    vi.setSystemTime(new Date(now));
    
    appState.session.mode = 'focus';
    appState.session.isRunning = true;
    appState.session.startedAt = now - 5000;
    appState.session.endTime = now + 10000; // 10s left
    
    const result = recoverSession();
    
    expect(result.status).toBe('recovered_focus');
    expect(appState.session.remainingSeconds).toBe(10);
    expect(appState.session.isRunning).toBe(true);
  });

  it('completes focus session if time elapsed while away', () => {
    const now = 20000;
    vi.setSystemTime(new Date(now));
    
    appState.session.mode = 'focus';
    appState.session.isRunning = true;
    appState.session.startedAt = 1000;
    appState.session.endTime = 10000; // Passed 10s ago
    appState.session.completionKey = 'test_key';
    
    const result = recoverSession();
    
    expect(result.status).toBe('completed_while_away');
    expect(appState.session.isRunning).toBe(false);
    expect(appState.history.length).toBe(1); // completeFocus should have been called
  });

  it('resets break session if time elapsed while away', () => {
    const now = 20000;
    vi.setSystemTime(new Date(now));
    
    appState.session.mode = 'break';
    appState.session.isRunning = true;
    appState.session.startedAt = 1000;
    appState.session.endTime = 10000; // Passed
    
    const result = recoverSession();
    
    expect(result.status).toBe('break_finished_while_away');
    expect(appState.session.mode).toBe('idle');
  });

  it('resets corrupted session safely', () => {
    appState.session.mode = 'focus';
    appState.session.isRunning = true;
    // Missing startedAt and endTime
    
    const result = recoverSession();
    
    expect(result.status).toBe('corrupted');
    expect(appState.session.mode).toBe('idle');
  });
});
