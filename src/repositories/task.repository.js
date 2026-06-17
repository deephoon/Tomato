import { supabase } from '../supabase/client.js';

export async function getTasks(userId, targetDate) {
  if (!userId) return [];
  let query = supabase.from('focus_tasks').select('*').eq('user_id', userId);
  if (targetDate) query = query.eq('target_date', targetDate);
  query = query.order('task_order', { ascending: true });
  
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  return data.map(dbToTask);
}

export async function saveTasks(userId, tasks) {
  if (!userId || !tasks.length) return false;
  const payload = tasks.map((t, idx) => taskToDb(userId, { ...t, order: idx }));
  
  const { error } = await supabase.from('focus_tasks').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('Error saving tasks:', error);
    return false;
  }
  return true;
}

export async function updateTask(userId, taskId, patch) {
  if (!userId || !taskId) return false;
  const { error } = await supabase.from('focus_tasks').update(patchToDb(patch)).eq('id', taskId).eq('user_id', userId);
  if (error) {
    console.error('Error updating task:', error);
    return false;
  }
  return true;
}

export async function deleteTask(userId, taskId) {
  if (!userId || !taskId) return false;
  const { error } = await supabase.from('focus_tasks').delete().eq('id', taskId).eq('user_id', userId);
  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }
  return true;
}

// Adapters
function dbToTask(row) {
  return {
    id: row.id,
    title: row.title,
    focusMinutes: row.focus_minutes,
    breakMinutes: row.break_minutes,
    status: row.status,
    targetDate: row.target_date,
    order: row.task_order,
    source: row.source,
    timeLabel: '' // not stored in DB, handled by UI if needed
  };
}

function taskToDb(userId, task) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.id);
  const row = {
    user_id: userId,
    title: task.title,
    focus_minutes: task.focusMinutes || 25,
    break_minutes: task.breakMinutes || 5,
    status: task.status || 'open',
    target_date: task.targetDate,
    task_order: task.order || 0,
    source: task.source || 'manual'
  };
  if (isUUID) row.id = task.id;
  return row;
}

function patchToDb(patch) {
  const row = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.focusMinutes !== undefined) row.focus_minutes = patch.focusMinutes;
  if (patch.breakMinutes !== undefined) row.break_minutes = patch.breakMinutes;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.targetDate !== undefined) row.target_date = patch.targetDate;
  if (patch.order !== undefined) row.task_order = patch.order;
  if (patch.source !== undefined) row.source = patch.source;
  return row;
}
