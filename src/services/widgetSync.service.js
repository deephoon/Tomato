import { appState, sendWidgetControl } from '../state.js';

export function syncWidgetState() {
  const { mode, isRunning, remainingSeconds, activeTaskId } = appState.session;
  
  const activeTask = appState.tasks.find(t => t.id === activeTaskId);
  const title = activeTask ? activeTask.title : '이름 없는 집중';

  // The state.js `broadcastSync` handles sending full state already.
  // This service acts as a specialized payload builder if needed,
  // or a wrapper for specific widget commands.
  
  // Here we can dispatch a specific custom event or call sendWidgetControl if we want to ensure widget shows/hides.
  if (isRunning && mode !== 'idle') {
    sendWidgetControl('show');
  } else if (mode === 'idle') {
    sendWidgetControl('hide');
  }
}

export function handleWidgetCommand(command) {
  // This function would be called from main.js when receiving widget events.
  // Currently widget syncs natively through 'tomato-synced' events handled in state.js and timer.js.
  // This file is to provide a clean service interface for widget operations as per V11 plan.
}
