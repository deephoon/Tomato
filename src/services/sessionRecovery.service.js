import { appState, saveSession } from '../state.js';
import { completeFocus, resetSession, startFocus, startBreak, resumeSession } from '../timer.js';

export function recoverSession() {
  const user = appState.auth.user;
  if (!user) {
    return { status: 'idle', message: 'No user to recover' };
  }

  const session = appState.session;

  if (session.mode === 'idle' || !session.isRunning) {
    return { status: 'idle', message: 'Session was idle or paused' };
  }

  // Corrupted session check
  if (!session.endTime || !session.startedAt) {
    resetSession();
    return { status: 'corrupted', message: 'Session data was corrupted and has been reset' };
  }

  const now = Date.now();

  // If time is still remaining
  if (now < session.endTime) {
    // Let timer.js handle resuming automatically via `resumeTimerIfRunning` style,
    // but since we rewrote timer.js, we can just call `resumeSession()`
    // after making sure remainingSeconds is correct.
    session.remainingSeconds = (session.endTime - now) / 1000;
    resumeSession();
    
    return { 
      status: session.mode === 'focus' ? 'recovered_focus' : 'recovered_break', 
      session, 
      message: `Recovered ${session.mode} session` 
    };
  }

  // If time has elapsed
  if (now >= session.endTime) {
    if (session.mode === 'focus') {
      // Simulate ticking to 0
      completeFocus();
      
      const lastHistoryId = session.completedHistoryId;
      const historyItem = appState.history.find(h => h.id === lastHistoryId) || null;
      
      return { 
        status: 'completed_while_away', 
        session, 
        historyItem,
        message: 'Focus session completed while away' 
      };
    } else if (session.mode === 'break') {
      resetSession();
      return { 
        status: 'break_finished_while_away', 
        session, 
        message: 'Break session finished while away' 
      };
    }
  }

  return { status: 'idle', message: 'Unknown state' };
}
