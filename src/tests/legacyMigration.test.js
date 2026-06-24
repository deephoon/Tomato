import { beforeEach, describe, expect, it } from 'vitest';
import { appState, claimLegacyDataForCurrentUser } from '../state.js';

describe('legacy data migration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    appState.auth = { user: { id: 'legacy-user' } };
    appState.tasks = [];
    appState.history = [];
    appState.session = { mode: 'idle', remainingSeconds: 0 };
  });

  it('ignores corrupted legacy storage without crashing login', () => {
    window.localStorage.setItem('tomato_os_tasks', '{bad json');
    window.localStorage.setItem('tomato_os_history', '[not json');
    window.localStorage.setItem('tomato_os_session', 'undefined');

    expect(() => claimLegacyDataForCurrentUser()).not.toThrow();
    expect(appState.tasks).toEqual([]);
    expect(appState.history).toEqual([]);
    expect(appState.session).toMatchObject({ mode: 'idle', remainingSeconds: 0 });
  });
});
