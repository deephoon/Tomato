export function createCompletionKey({ userId, taskId, startedAt, plannedSeconds }) {
  // A unique key to prevent duplicate history records for the same session
  return `${userId}_${taskId || 'notask'}_${new Date(startedAt).getTime()}_${plannedSeconds}`;
}

export function getRemainingSeconds(session, now) {
  if (!session) return 0;
  if (!session.is_running) return Math.max(0, session.remaining_seconds);
  if (!session.end_time) return Math.max(0, session.remaining_seconds);
  
  const endMs = new Date(session.end_time).getTime();
  const nowMs = new Date(now).getTime();
  return Math.max(0, Math.ceil((endMs - nowMs) / 1000));
}

export function createStartSessionPayload({ userId, task, now, mode = 'focus', breakMinutes = 5 }) {
  const nowStr = new Date(now).toISOString();
  const focusMinutes = task ? task.focus_minutes : 25;
  const targetMinutes = mode === 'focus' ? focusMinutes : breakMinutes;
  const plannedSeconds = targetMinutes * 60;
  
  const endMs = new Date(now).getTime() + (plannedSeconds * 1000);
  const endStr = new Date(endMs).toISOString();

  const completionKey = createCompletionKey({ 
    userId, 
    taskId: task?.id, 
    startedAt: nowStr, 
    plannedSeconds 
  });

  return {
    user_id: userId,
    active_task_id: task ? task.id : null,
    mode: mode,
    is_running: true,
    started_at: nowStr,
    paused_at: null,
    end_time: endStr,
    remaining_seconds: plannedSeconds,
    title: task ? task.title : (mode === 'focus' ? 'Focus Session' : 'Break'),
    completion_key: completionKey,
    pause_count: 0,
    resumed_count: 0,
    updated_at: nowStr
  };
}

export function createPausePayload(session, now) {
  const remaining = getRemainingSeconds(session, now);
  const nowStr = new Date(now).toISOString();
  
  return {
    ...session,
    is_running: false,
    paused_at: nowStr,
    remaining_seconds: remaining,
    pause_count: (session.pause_count || 0) + 1,
    updated_at: nowStr
  };
}

export function createResumePayload(session, now) {
  const remaining = session.remaining_seconds || 0;
  const nowMs = new Date(now).getTime();
  const endMs = nowMs + (remaining * 1000);
  const nowStr = new Date(nowMs).toISOString();
  const endStr = new Date(endMs).toISOString();
  
  return {
    ...session,
    is_running: true,
    end_time: endStr,
    resumed_count: (session.resumed_count || 0) + 1,
    updated_at: nowStr
  };
}

export function createCompleteHistoryPayload({ session, task, now, source = 'web' }) {
  const nowStr = new Date(now).toISOString();
  const focusMinutes = task ? task.focus_minutes : 25;
  const breakMinutes = task ? task.break_minutes : 5;
  
  // Calculate planned vs actual
  const startedAtMs = new Date(session.started_at).getTime();
  const nowMs = new Date(now).getTime();
  let actualSeconds = Math.floor((nowMs - startedAtMs) / 1000);
  
  // We don't have exact pause duration tracked easily unless we compute it from pause_count
  // For now, if actualSeconds is absurd, cap it. (MVP)
  if (actualSeconds < 0) actualSeconds = 0;

  // The planned seconds when the session started
  // We can approximate it based on focusMinutes if it's a focus session
  const plannedSeconds = focusMinutes * 60;

  return {
    user_id: session.user_id,
    task_id: session.active_task_id,
    title: session.title || 'Untitled Session',
    focus_minutes: focusMinutes,
    break_minutes: breakMinutes,
    planned_seconds: plannedSeconds,
    actual_seconds: actualSeconds,
    completed_at: nowStr,
    target_date: task ? task.target_date : new Date(now).toISOString().split('T')[0],
    reflection: null,
    completion_type: 'done',
    completion_key: session.completion_key,
    pause_count: session.pause_count || 0,
    resumed_count: session.resumed_count || 0,
    source: source,
    system_note: `Completed from ${source}`
  };
}

export function shouldCompleteSession(session, now) {
  if (!session || !session.is_running) return false;
  return getRemainingSeconds(session, now) <= 0;
}
