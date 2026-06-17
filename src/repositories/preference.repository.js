import { supabase } from '../supabase/client.js';
import { readJSON, writeJSON } from '../utils/safeStorage.js';

const getPreferenceKey = (userId) => `tomato_user_${userId}_preferences`;

const DEFAULT_PREFERENCES = {
  focusMinutes: 25,
  breakMinutes: 5,
  lang: 'ko',
  widgetEnabled: true,
  archiveInsightEnabled: true
};

export async function getPreferences(userId) {
  if (!userId) return getLocalCache(null);
  
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching preferences:', error);
    return getLocalCache(userId);
  }

  const merged = { ...getLocalCache(userId), ...dbToPref(data) };
  saveLocalCache(userId, merged);
  return merged;
}

export async function savePreferences(userId, preferences) {
  if (!userId) return false;
  saveLocalCache(userId, preferences);
  
  const payload = prefToDb(userId, preferences);
  const { error } = await supabase
    .from('user_preferences')
    .upsert(payload, { onConflict: 'user_id' });
    
  if (error) {
    console.error('Error saving preferences:', error);
    return false;
  }
  return true;
}

export function getLocalCache(userId) {
  const base = { ...DEFAULT_PREFERENCES };
  if (!userId) return base;
  return { ...base, ...readJSON(getPreferenceKey(userId), {}) };
}

function saveLocalCache(userId, preferences) {
  if (userId) writeJSON(getPreferenceKey(userId), preferences);
}

function dbToPref(row) {
  return {
    lang: row.language,
    focusMinutes: row.default_focus_minutes,
    breakMinutes: row.default_break_minutes,
    widgetEnabled: row.widget_enabled,
    archiveInsightEnabled: row.archive_insight_enabled
  };
}

function prefToDb(userId, pref) {
  return {
    user_id: userId,
    language: pref.lang || 'ko',
    default_focus_minutes: pref.focusMinutes || 25,
    default_break_minutes: pref.breakMinutes || 5,
    widget_enabled: pref.widgetEnabled ?? true,
    archive_insight_enabled: pref.archiveInsightEnabled ?? true,
    updated_at: new Date().toISOString()
  };
}
