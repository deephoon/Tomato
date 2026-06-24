export function applyTimerVisualState(screens, session) {
  const mode = session && session.mode ? session.mode : 'idle';
  const isPaused = !session?.isRunning && Number(session?.remainingSeconds || 0) > 0;

  if (screens?.focusScreen) {
    screens.focusScreen.classList.toggle('is-paused', mode === 'focus' && isPaused);
  }

  if (screens?.breakScreen) {
    screens.breakScreen.classList.toggle('is-paused', mode === 'break' && isPaused);
  }
}
