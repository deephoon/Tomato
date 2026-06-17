import { appState, saveTasks, saveHistory, saveSession, saveLang } from '../state.js';

export function exportData() {
  const user = appState.auth.user;
  if (!user) return null;

  const data = {
    version: 1,
    app: 'Tomato',
    edition: 'Media-Art',
    exportedAt: Date.now(),
    userId: user.id,
    tasks: appState.tasks,
    history: appState.history,
    session: appState.session,
    preferences: appState.prefs
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `tomato-backup-${user.id}-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return true;
}

export function importData(jsonString, options = { merge: false }) {
  const user = appState.auth.user;
  if (!user) return { success: false, message: 'Not logged in' };

  try {
    const data = JSON.parse(jsonString);
    
    // Validation
    if (data.app !== 'Tomato') return { success: false, message: 'Invalid app format' };
    if (!data.version) return { success: false, message: 'Invalid version' };
    if (!Array.isArray(data.tasks) || !Array.isArray(data.history)) {
      return { success: false, message: 'Invalid data structure' };
    }

    if (data.userId !== user.id && !options.forceDifferentUser) {
      return { success: false, message: 'User ID mismatch. Need confirmation.', requiresConfirmation: true };
    }

    if (options.merge) {
      // Very basic merge
      const existingTaskIds = new Set(appState.tasks.map(t => t.id));
      data.tasks.forEach(t => { if (!existingTaskIds.has(t.id)) appState.tasks.push(t); });
      
      const existingHistoryIds = new Set(appState.history.map(h => h.id));
      data.history.forEach(h => { if (!existingHistoryIds.has(h.id)) appState.history.push(h); });
    } else {
      // Replace
      appState.tasks = data.tasks;
      appState.history = data.history;
      if (data.session) Object.assign(appState.session, data.session);
      if (data.preferences) Object.assign(appState.prefs, data.preferences);
    }

    saveTasks();
    saveHistory();
    saveSession();
    saveLang();

    return { success: true, message: 'Import successful' };
  } catch (err) {
    console.error('Import error:', err);
    return { success: false, message: 'Invalid JSON file' };
  }
}
