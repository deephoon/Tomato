import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appState } from '../state.js';
import { importData } from '../services/exportImport.service.js';

describe('exportImport.service', () => {
  beforeEach(() => {
    appState.auth = { user: { id: 'test_user' } };
    appState.tasks = [];
    appState.history = [];
    appState.session = {};
    appState.prefs = {};
  });

  it('rejects import if not logged in', () => {
    appState.auth.user = null;
    const result = importData('{}');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Not logged in');
  });

  it('rejects invalid JSON structure', () => {
    const invalidJson = JSON.stringify({ version: 1, app: 'NotTomato' });
    const result = importData(invalidJson);
    expect(result.success).toBe(false);
  });

  it('rejects missing arrays', () => {
    const invalidJson = JSON.stringify({ version: 1, app: 'Tomato', userId: 'test_user' });
    const result = importData(invalidJson);
    expect(result.success).toBe(false);
  });

  it('imports valid JSON successfully', () => {
    const validJson = JSON.stringify({
      version: 1,
      app: 'Tomato',
      userId: 'test_user',
      tasks: [{ id: 't1' }],
      history: [{ id: 'h1' }]
    });
    
    const result = importData(validJson);
    expect(result.success).toBe(true);
    expect(appState.tasks.length).toBe(1);
    expect(appState.tasks[0].id).toBe('t1');
  });

  it('handles user ID mismatch if forced', () => {
    const validJson = JSON.stringify({
      version: 1,
      app: 'Tomato',
      userId: 'other_user',
      tasks: [{ id: 't1' }],
      history: [{ id: 'h1' }]
    });
    
    const resultReject = importData(validJson);
    expect(resultReject.success).toBe(false);
    expect(resultReject.requiresConfirmation).toBe(true);
    
    const resultForce = importData(validJson, { forceDifferentUser: true });
    expect(resultForce.success).toBe(true);
  });
});
