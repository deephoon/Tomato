import { describe, expect, it } from 'vitest';
import { applyTimerVisualState } from '../services/timerVisualState.service.js';

function makeScreens() {
  return {
    focusScreen: document.createElement('section'),
    breakScreen: document.createElement('section')
  };
}

describe('applyTimerVisualState', () => {
  it('marks the focus screen as paused only while a focus block is paused', () => {
    const screens = makeScreens();

    applyTimerVisualState(screens, {
      mode: 'focus',
      isRunning: false,
      remainingSeconds: 1200
    });

    expect(screens.focusScreen.classList.contains('is-paused')).toBe(true);
    expect(screens.breakScreen.classList.contains('is-paused')).toBe(false);

    applyTimerVisualState(screens, {
      mode: 'focus',
      isRunning: true,
      remainingSeconds: 1200
    });

    expect(screens.focusScreen.classList.contains('is-paused')).toBe(false);
  });

  it('keeps pause state scoped to the active timer screen', () => {
    const screens = makeScreens();

    applyTimerVisualState(screens, {
      mode: 'break',
      isRunning: false,
      remainingSeconds: 180
    });

    expect(screens.focusScreen.classList.contains('is-paused')).toBe(false);
    expect(screens.breakScreen.classList.contains('is-paused')).toBe(true);

    applyTimerVisualState(screens, {
      mode: 'idle',
      isRunning: false,
      remainingSeconds: 0
    });

    expect(screens.focusScreen.classList.contains('is-paused')).toBe(false);
    expect(screens.breakScreen.classList.contains('is-paused')).toBe(false);
  });
});
