import { supabase } from '../supabase/client.js';

export async function getHistory(userId, targetDate) {
  if (!userId || !supabase) return [];
  let query = supabase.from('focus_history').select('*').eq('user_id', userId);
  if (targetDate) query = query.eq('target_date', targetDate);
  query = query.order('completed_at', { ascending: true });
  
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }
  return data.map(dbToHistory);
}

export async function saveHistory(userId, history) {
  // Not used directly much in Supabase as we just append.
  // Kept for backward compatibility if replacing the whole array.
  return true; 
}

export async function appendHistory(userId, item) {
  if (!userId || !supabase) return false;
  
  const payload = historyToDb(userId, item);
  const { error } = await supabase.from('focus_history').insert(payload);
  
  if (error) {
    // If error is unique violation (23505), it's a deduplicated item
    if (error.code === '23505') {
      console.log('History item already exists (deduplicated by completion_key)');
      return true; // We consider it a success
    }
    console.error('Error appending history:', error);
    return false;
  }
  return true;
}

export async function updateHistoryItem(userId, historyId, patch) {
  if (!userId || !historyId || !supabase) return false;
  const { error } = await supabase.from('focus_history').update({ reflection: patch.reflection }).eq('id', historyId).eq('user_id', userId);
  if (error) {
    console.error('Error updating history:', error);
    return false;
  }
  return true;
}

// Adapters
function dbToHistory(row) {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    focusMinutes: row.focus_minutes,
    breakMinutes: row.break_minutes,
    plannedSeconds: row.planned_seconds,
    actualSeconds: row.actual_seconds,
    completedAt: new Date(row.completed_at).getTime(),
    targetDate: row.target_date,
    reflection: row.reflection,
    completionType: row.completion_type,
    completionKey: row.completion_key,
    source: row.source,
    systemNote: row.system_note
  };
}

function historyToDb(userId, item) {
  return {
    user_id: userId,
    task_id: item.taskId || null,
    title: item.title,
    focus_minutes: item.focusMinutes || 25,
    break_minutes: item.breakMinutes || 5,
    planned_seconds: item.plannedSeconds || 0,
    actual_seconds: item.actualSeconds || 0,
    completed_at: item.completedAt ? new Date(item.completedAt).toISOString() : new Date().toISOString(),
    target_date: item.targetDate,
    reflection: item.reflection || null,
    completion_type: item.completionType || 'normal',
    completion_key: item.completionKey,
    pause_count: item.pauseCount || 0,
    resumed_count: item.resumedCount || 0,
    source: item.source || 'web',
    system_note: item.systemNote || null
  };
}
