import { supabase } from '../supabase/client.js';
import { getTodayStr } from '../utils/dateTime.js';
import { readJSON, writeJSON } from '../utils/safeStorage.js';

const getSessionKey = (userId) => `tomato_user_${userId}_session`;

const DEFAULT_SESSION = {
  activeTaskId: null,
  mode: 'idle',           // idle | focus | break
  remainingSeconds: 0,
  isRunning: false,
  endTime: 0,
  startedAt: 0,
  pausedAt: 0,
  pauseCount: 0,
  resumedCount: 0,
  lastCompletedEnd: 0,    // dedupe key
  pomodoroCount: 0,
  pomodoroGoal: 4,
  todayDate: getTodayStr(),
  calendarOffset: 0,
  selectedDate: getTodayStr(),
  aiPlanningActive: false,
  completionKey: null
};

// Returns a promise
export async function getSession(userId) {
  if (!userId) return getLocalCache(null);
  
  const { data, error } = await supabase
    .from('current_sessions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching session from Supabase:', error);
    return getLocalCache(userId);
  }

  if (!data) {
    return getLocalCache(userId);
  }

  const merged = {
    ...getLocalCache(userId),
    ...dbToSession(data)
  };
  saveLocalCache(userId, merged);
  return merged;
}

export async function saveSession(userId, session) {
  if (!userId) return false;
  saveLocalCache(userId, session); // Immediate local cache update
  
  const payload = sessionToDb(userId, session);
  const { error } = await supabase
    .from('current_sessions')
    .upsert(payload, { onConflict: 'user_id' });
    
  if (error) {
    console.error('Error saving session to Supabase:', error);
    // Offline queue will handle the retry layer if implemented
    return false;
  }
  return true;
}

export function getLocalCache(userId) {
  const base = { ...DEFAULT_SESSION, todayDate: getTodayStr(), selectedDate: getTodayStr() };
  if (!userId) return base;
  return { ...base, ...readJSON(getSessionKey(userId), {}) };
}

function saveLocalCache(userId, session) {
  if (userId) writeJSON(getSessionKey(userId), session);
}

// Adapters
function dbToSession(row) {
  const now = Date.now();
  return {
    activeTaskId: row.active_task_id,
    mode: row.mode,
    remainingSeconds: row.remaining_seconds,
    isRunning: row.is_running,
    endTime: row.end_time ? new Date(row.end_time).getTime() : 0,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : 0,
    pausedAt: row.paused_at ? new Date(row.paused_at).getTime() : 0,
    pauseCount: row.pause_count,
    resumedCount: row.resumed_count,
    completionKey: row.completion_key,
    // we keep the local state for UI only fields by merging them later
  };
}

function sessionToDb(userId, session) {
  const row = {
    user_id: userId,
    active_task_id: session.activeTaskId || null,
    mode: session.mode || 'idle',
    is_running: !!session.isRunning,
    remaining_seconds: session.remainingSeconds || 0,
    pause_count: session.pauseCount || 0,
    resumed_count: session.resumedCount || 0,
    completion_key: session.completionKey || null,
    updated_at: new Date().toISOString()
  };
  if (session.endTime) row.end_time = new Date(session.endTime).toISOString();
  if (session.startedAt) row.started_at = new Date(session.startedAt).toISOString();
  if (session.pausedAt) row.paused_at = new Date(session.pausedAt).toISOString();
  return row;
}
