import { readJSON, writeJSON } from '../utils/safeStorage.js';

const getPreferenceKey = (userId) => `tomato_user_${userId}_preferences`;

const DEFAULT_PREFERENCES = {
  focusMinutes: 25,
  breakMinutes: 5,
  lang: 'ko'
};

export function getPreferences(userId) {
  if (!userId) return { ...DEFAULT_PREFERENCES };
  const prefs = readJSON(getPreferenceKey(userId), DEFAULT_PREFERENCES);
  
  // Migrate legacy lang if not in prefs yet but exists in localStorage
  if (!prefs.lang) {
    const legacyLang = localStorage.getItem('tomato_lang');
    if (legacyLang) {
      prefs.lang = legacyLang;
    }
  }

  return { ...DEFAULT_PREFERENCES, ...prefs };
}

export function savePreferences(userId, preferences) {
  if (!userId) return false;
  return writeJSON(getPreferenceKey(userId), preferences);
}
