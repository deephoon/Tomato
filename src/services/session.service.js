import * as timerSvc from './timer.service.js';
import * as sessionRepo from '../repositories/session.repository.js';
import * as historyRepo from '../repositories/history.repository.js';

export async function startSession(userId, task, mode = 'focus') {
  const now = new Date().toISOString();
  const payload = timerSvc.createStartSessionPayload({ userId, task, now, mode });
  const success = await sessionRepo.upsertCurrentSession(userId, payload);
  if (success) {
    sessionRepo.saveLocalCache(userId, payload);
  }
  return success ? payload : null;
}

export async function pauseSession(userId, currentSession) {
  if (!currentSession) return null;
  const now = new Date().toISOString();
  const payload = timerSvc.createPausePayload(currentSession, now);
  const success = await sessionRepo.upsertCurrentSession(userId, payload);
  if (success) {
    sessionRepo.saveLocalCache(userId, payload);
  }
  return success ? payload : null;
}

export async function resumeSession(userId, currentSession) {
  if (!currentSession) return null;
  const now = new Date().toISOString();
  const payload = timerSvc.createResumePayload(currentSession, now);
  const success = await sessionRepo.upsertCurrentSession(userId, payload);
  if (success) {
    sessionRepo.saveLocalCache(userId, payload);
  }
  return success ? payload : null;
}

export async function completeSession(userId, currentSession, task, source = 'web') {
  if (!currentSession) return false;
  const now = new Date().toISOString();
  
  // 1. Insert history
  const historyPayload = timerSvc.createCompleteHistoryPayload({ session: currentSession, task, now, source });
  const historySuccess = await historyRepo.insertHistory(userId, historyPayload);
  
  if (!historySuccess) {
    // We might have failed due to unique constraint, meaning it was already completed by another client.
    // That's fine, we proceed to clear/change the session.
  }
  
  // 2. Change session to idle or break
  const payload = {
    ...currentSession,
    mode: 'idle',
    is_running: false,
    active_task_id: null,
    remaining_seconds: 0,
    end_time: null,
    title: null,
    updated_at: now
  };
  
  const sessionSuccess = await sessionRepo.upsertCurrentSession(userId, payload);
  if (sessionSuccess) {
    sessionRepo.saveLocalCache(userId, payload);
  }
  return true;
}

export async function skipBreak(userId, currentSession) {
  if (!currentSession) return null;
  const now = new Date().toISOString();
  const payload = {
    ...currentSession,
    mode: 'idle',
    is_running: false,
    active_task_id: null,
    remaining_seconds: 0,
    end_time: null,
    title: null,
    updated_at: now
  };
  const success = await sessionRepo.upsertCurrentSession(userId, payload);
  if (success) {
    sessionRepo.saveLocalCache(userId, payload);
  }
  return success ? payload : null;
}
