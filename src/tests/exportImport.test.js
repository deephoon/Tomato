import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appState } from '../state.js';
import { buildBackupFilename, importData } from '../services/exportImport.service.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    expect(appState.tasks[0].id).toMatch(uuidRegex);
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

  it('uses a human-readable backup filename', () => {
    expect(buildBackupFilename('user-123', new Date('2026-06-24T12:00:00Z')))
      .toBe('tomato-restore-file-20260624.json');
  });
});
