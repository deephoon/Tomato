// ==========================================
// MAIN.JS — App Orchestrator (Entry Point)
// ==========================================
import { appState } from './state.js';
import { switchMode } from './timer.js';
import { updateHUD, bindEvents, applyInitialLanguage, renderSheetTasks } from './ui-controller.js';

function init() {
  // Apply saved language to all i18n elements
  applyInitialLanguage();

  // Set initial active task
  if (appState.tasks.length > 0) {
    appState.session.activeTaskId = appState.tasks[0].id;
    appState.session.remainingSeconds = appState.tasks[0].focusMinutes * 60;
  }

  // Bind all event listeners
  bindEvents();

  // Initial HUD render
  updateHUD();
}

init();
