// ==========================================
// UI CONTROLLER — DOM, GSAP, Modals, Sheets
// ==========================================
import gsap from 'gsap';
import { appState, t, saveTasks, saveLang, getActiveTask } from './state.js';
import { formatTime, switchMode, startTimer, pauseTimer, stopTimer, setTask } from './timer.js';
import { sliceTask } from './ai-service.js';

// ==========================================
// DOM REFERENCES
// ==========================================
const elTaskTitle = document.getElementById('current-task-title');
const elHudStatus = document.getElementById('hud-status');
const elTimeLeft = document.getElementById('time-left');
const btnTasks = document.getElementById('tasks-btn');
const btnPlayPause = document.getElementById('play-pause-btn');
const btnStop = document.getElementById('stop-btn');
const iconPlay = document.getElementById('play-icon');
const iconPause = document.getElementById('pause-icon');
const btnLangToggle = document.getElementById('lang-toggle-btn');
const langLabel = document.getElementById('lang-label');

// Task Sheet
const sheetTasks = document.getElementById('task-sheet');
const sheetBackdrop = sheetTasks.querySelector('.sheet-backdrop');
const sheetContent = sheetTasks.querySelector('.sheet-content');
const btnCloseSheet = document.getElementById('close-sheet-btn');
const taskListView = document.getElementById('task-list-view');
const sheetTaskList = document.getElementById('sheet-task-list');
const btnAddNewTask = document.getElementById('add-new-task-btn');

// Task Form
const taskFormView = document.getElementById('task-form-view');
const btnFormCancel = document.getElementById('form-cancel-btn');
const btnFormSave = document.getElementById('form-save-btn');
const inputFormName = document.getElementById('form-task-name');
const inputFormWork = document.getElementById('form-work-min');
const inputFormBreak = document.getElementById('form-break-min');
const inputFormCol1 = document.getElementById('form-color1');
const inputFormCol2 = document.getElementById('form-color2');
const inputFormCol3 = document.getElementById('form-color3');

// Transition Modal (timer end)
const modalTransition = document.getElementById('transition-modal');
const modalTransitionContent = modalTransition.querySelector('.modal-content');
const transitionTitle = document.getElementById('transition-title');
const transitionMessage = document.getElementById('transition-message');
const btnStartBreak = document.getElementById('btn-start-break');
const btnExtendMin = document.getElementById('btn-extend-min');
const btnFinishSession = document.getElementById('btn-finish-session');

// Interruption Modal (pause)
const modalInterruption = document.getElementById('interruption-modal');
const modalInterruptionContent = modalInterruption.querySelector('.modal-content');
const btnResume = document.getElementById('btn-resume');
const btnStartBreakNow = document.getElementById('btn-start-break-now');
const btnFinishEarly = document.getElementById('btn-finish-early');
const btnResetTimer = document.getElementById('btn-reset-timer');
const btnEditTask = document.getElementById('btn-edit-task');

let editingTaskId = null;

// ==========================================
// HUD UPDATE (called on every state change)
// ==========================================
export function updateHUD() {
  const task = getActiveTask();
  if (!task) return;

  if (appState.session.mode === 'idle' || appState.session.mode === 'focus') {
    elHudStatus.textContent = appState.session.mode === 'idle' ? 'STANDBY MODE' : 'FOCUS SESSION';
    elTaskTitle.textContent = appState.session.mode === 'idle' ? `[ ${task.title} ]` : `TASK: ${task.title}`;
    elTimeLeft.textContent = formatTime(appState.session.remainingSeconds);
    document.documentElement.style.setProperty('--tomato-color', task.glassColor || '#FF3B30');
    document.documentElement.style.setProperty('--tomato-glitch1', task.themeColor1 || '#FF007F');
    document.documentElement.style.setProperty('--tomato-glitch2', task.themeColor2 || '#7000FF');
    document.body.className = appState.session.mode;
  } else if (appState.session.mode === 'break') {
    elHudStatus.textContent = 'REST BREAK';
    elTaskTitle.textContent = t('restBreak');
    elTimeLeft.textContent = formatTime(appState.session.remainingSeconds);
    document.documentElement.style.setProperty('--tomato-color', '#333355');
    document.documentElement.style.setProperty('--tomato-glitch1', '#221133');
    document.documentElement.style.setProperty('--tomato-glitch2', '#111122');
    document.body.className = 'break';
  }

  btnStop.style.display = appState.session.mode === 'idle' ? 'none' : 'flex';

  if (appState.session.isRunning) {
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
  } else {
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
  }
}

// ==========================================
// TRANSITION MODAL (timer end)
// ==========================================
export function openTransitionModal() {
  modalTransition.style.display = 'flex';
  gsap.fromTo(modalTransition, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  gsap.fromTo(modalTransitionContent, { scale: 0.9, y: 30 }, { scale: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" });
}

export function closeTransitionModal() {
  gsap.to(modalTransition, { opacity: 0, duration: 0.3 });
  gsap.to(modalTransitionContent, { scale: 0.95, y: 20, duration: 0.3, ease: "power2.in", onComplete: () => {
    modalTransition.style.display = 'none';
  }});
}

// ==========================================
// INTERRUPTION MODAL (pause during session)
// ==========================================
function openInterruptionModal() {
  const isFocus = appState.session.mode === 'focus';
  document.querySelector('.transition-title').textContent = t('paused');

  if (isFocus) {
    btnStartBreakNow.textContent = t('startBreakNow');
    btnStartBreakNow.onclick = () => { closeInterruptionModal(); switchMode('break'); startTimer(); };
  } else {
    btnStartBreakNow.textContent = t('startFocusNow');
    btnStartBreakNow.onclick = () => { closeInterruptionModal(); switchMode('focus'); startTimer(); };
  }

  modalInterruption.style.display = 'flex';
  gsap.fromTo(modalInterruption, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  gsap.fromTo(modalInterruptionContent, { scale: 0.9, y: 30 }, { scale: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" });
}

function closeInterruptionModal() {
  gsap.to(modalInterruption, { opacity: 0, duration: 0.3 });
  gsap.to(modalInterruptionContent, { scale: 0.95, y: 20, duration: 0.3, ease: "power2.in", onComplete: () => {
    modalInterruption.style.display = 'none';
  }});
}

// ==========================================
// BOTTOM SHEET
// ==========================================
function openSheet() {
  renderSheetTasks();
  showListView();
  sheetTasks.style.display = 'flex';
  gsap.fromTo(sheetBackdrop, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  gsap.fromTo(sheetContent, { y: '100%' }, { y: 0, duration: 0.5, ease: "power3.out" });
}

function closeSheet() {
  gsap.to(sheetBackdrop, { opacity: 0, duration: 0.3 });
  gsap.to(sheetContent, { y: '100%', duration: 0.4, ease: "power2.in", onComplete: () => {
    sheetTasks.style.display = 'none';
  }});
}

// ==========================================
// TASK CRUD UI
// ==========================================
export function renderSheetTasks() {
  sheetTaskList.innerHTML = '';
  appState.tasks.forEach(task => {
    const li = document.createElement('li');
    const isActive = appState.session.activeTaskId === task.id;
    li.className = `task-list-item ${isActive ? 'active' : ''}`;
    li.innerHTML = `
      <div class="task-info">
        <span class="name" style="background: linear-gradient(45deg, ${task.themeColor1}, ${task.themeColor2}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${task.title}</span>
        <span class="times">${t('work')}: ${task.focusMinutes}m | ${t('breakLabel')}: ${task.breakMinutes}m</span>
      </div>
      <div class="task-actions">
        <button class="icon-btn btn-edit" data-id="${task.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
        <button class="icon-btn btn-delete" data-id="${task.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
      </div>
    `;

    li.querySelector('.task-info').onclick = () => { setTask(task.id); renderSheetTasks(); closeSheet(); };
    li.querySelector('.btn-edit').onclick = (e) => { e.stopPropagation(); openEditForm(task.id); };
    li.querySelector('.btn-delete').onclick = (e) => { e.stopPropagation(); deleteTask(task.id); };

    sheetTaskList.appendChild(li);
  });
}

function showListView() {
  taskListView.style.display = '';
  taskFormView.style.display = 'none';
}

function showFormView() {
  taskListView.style.display = 'none';
  taskFormView.style.display = '';
}

function openAddForm() {
  editingTaskId = null;
  inputFormName.value = '';
  inputFormWork.value = 25;
  inputFormBreak.value = 5;
  inputFormCol1.value = '#444444';
  inputFormCol2.value = '#888888';
  inputFormCol3.value = '#ff3b30';
  showFormView();
}

function openEditForm(id) {
  const task = appState.tasks.find(tk => tk.id === id);
  if (!task) return;
  editingTaskId = id;
  inputFormName.value = task.title;
  inputFormWork.value = task.focusMinutes;
  inputFormBreak.value = task.breakMinutes;
  inputFormCol1.value = task.themeColor1;
  inputFormCol2.value = task.themeColor2;
  inputFormCol3.value = task.glassColor || '#ff3b30';
  showFormView();
}

function deleteTask(id) {
  if (appState.tasks.length <= 1) {
    alert(t('minOneTask'));
    return;
  }
  appState.tasks = appState.tasks.filter(tk => tk.id !== id);
  saveTasks();
  if (appState.session.activeTaskId === id) setTask(appState.tasks[0].id);
  renderSheetTasks();
}

// ==========================================
// GSAP BUTTON WEIGHTED TACTILE ANIMATIONS
// ==========================================
function attachSpring(btn) {
  btn.addEventListener('pointerdown', () => {
    gsap.to(btn, { scale: 0.96, duration: 0.1, ease: "power2.inOut" });
  });
  btn.addEventListener('pointerup', () => {
    gsap.to(btn, { scale: 1, duration: 0.5, ease: "power3.out" });
  });
  btn.addEventListener('pointerleave', () => {
    gsap.to(btn, { scale: 1, duration: 0.3, ease: "power2.out" });
  });
}

// ==========================================
// i18n LANGUAGE SWITCHING
// ==========================================
function applyLanguage(newLang) {
  appState.prefs.lang = newLang;
  saveLang();

  langLabel.textContent = newLang === 'ko' ? 'EN' : '한';
  document.documentElement.lang = newLang;

  const els = document.querySelectorAll('[data-i18n]');
  els.forEach(el => {
    gsap.to(el, {
      opacity: 0, duration: 0.2, ease: "power2.inOut",
      onComplete: () => {
        el.textContent = t(el.dataset.i18n);
        gsap.to(el, { opacity: 1, duration: 0.3, ease: "power2.inOut" });
      }
    });
  });

  setTimeout(() => updateHUD(), 200);
}

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================
export function bindEvents() {
  // Play/Pause
  btnPlayPause.onclick = () => {
    // Request Notification permission on first interaction
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (appState.session.isRunning) {
      pauseTimer();
      openInterruptionModal();
    } else {
      startTimer();
    }
  };

  // Stop
  btnStop.onclick = () => {
    stopTimer();
    switchMode('idle');
  };

  // Tasks Sheet
  btnTasks.onclick = openSheet;
  btnCloseSheet.onclick = closeSheet;
  sheetBackdrop.onclick = closeSheet;

  // Task Form
  btnAddNewTask.onclick = openAddForm;
  btnFormCancel.onclick = showListView;
  btnFormSave.onclick = () => {
    const title = inputFormName.value.trim() || 'Task';
    const focusMinutes = parseInt(inputFormWork.value) || 25;
    const breakMinutes = parseInt(inputFormBreak.value) || 5;
    const themeColor1 = inputFormCol1.value;
    const themeColor2 = inputFormCol2.value;
    const glassColor = inputFormCol3.value;

    if (editingTaskId) {
      const idx = appState.tasks.findIndex(tk => tk.id === editingTaskId);
      if (idx !== -1) {
        appState.tasks[idx] = { ...appState.tasks[idx], id: editingTaskId, title, focusMinutes, breakMinutes, themeColor1, themeColor2, glassColor };
      }
    } else {
      const id = Date.now().toString();
      appState.tasks.push({ id, title, focusMinutes, breakMinutes, themeColor1, themeColor2, glassColor });
    }

    saveTasks();

    if (!appState.session.activeTaskId) {
      setTask(appState.tasks[appState.tasks.length - 1].id);
    } else {
      renderSheetTasks();
      if (editingTaskId === appState.session.activeTaskId) switchMode(appState.session.mode);
    }
    showListView();
  };

  // Interruption Modal Buttons
  btnResume.onclick = () => { closeInterruptionModal(); startTimer(); };
  btnResetTimer.onclick = () => {
    closeInterruptionModal();
    const task = getActiveTask();
    if (appState.session.mode === 'focus' || appState.session.mode === 'idle') {
      appState.session.remainingSeconds = task.focusMinutes * 60;
    } else if (appState.session.mode === 'break') {
      appState.session.remainingSeconds = task.breakMinutes * 60;
    }
    updateHUD();
  };
  btnEditTask.onclick = () => { closeInterruptionModal(); openSheet(); openEditForm(appState.session.activeTaskId); };
  btnFinishEarly.onclick = () => { closeInterruptionModal(); switchMode('idle'); };

  // Language Toggle
  btnLangToggle.onclick = () => {
    const newLang = appState.prefs.lang === 'ko' ? 'en' : 'ko';
    applyLanguage(newLang);
  };

  // --- AI Task Slicing ---
  const aiSliceBtn = document.getElementById('ai-slice-btn');

  // AI Slice button
  aiSliceBtn.addEventListener('click', async () => {
    const activeTask = getActiveTask();
    if (!activeTask) return;

    const btnLabel = aiSliceBtn.querySelector('[data-i18n]');
    const originalText = btnLabel.textContent;
    btnLabel.textContent = t('aiSlicing');
    aiSliceBtn.classList.add('loading');

    try {
      const subTasks = await sliceTask(activeTask.title);

      subTasks.forEach(sub => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
        appState.tasks.push({
          id,
          title: sub.title,
          focusMinutes: sub.focusMinutes,
          breakMinutes: 5,
          themeColor1: activeTask.themeColor1,
          themeColor2: activeTask.themeColor2,
          glassColor: activeTask.glassColor || '#ff3b30'
        });
      });

      saveTasks();
      renderSheetTasks();
      showToast(`${subTasks.length} ${appState.prefs.lang === 'ko' ? '개의 하위 작업이 생성되었습니다' : 'sub-tasks created'}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnLabel.textContent = originalText;
      aiSliceBtn.classList.remove('loading');
    }
  });

  // GSAP Spring on all glass buttons
  document.querySelectorAll('.glass-btn').forEach(attachSpring);

  // Listen for timer-end events from timer.js (no circular dependency)
  window.addEventListener('tomato:timerend', handleTimerEnd);

  // Listen for state changes
  window.addEventListener('tomato:statechange', updateHUD);
}

// ==========================================
// TIMER END HANDLER (via CustomEvent)
// ==========================================
function handleTimerEnd() {
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);

  if ('Notification' in window && Notification.permission === 'granted') {
    const title = appState.session.mode === 'focus' ? t('timesUp') : t('breakOver');
    const body = appState.session.mode === 'focus' ? t('greatSession') : t('readyAgain');
    new Notification(title, { body });
  }

  if (appState.session.mode === 'focus') {
    transitionTitle.textContent = t('timesUp');
    transitionMessage.textContent = t('greatSession');
    btnStartBreak.textContent = t('startBreak');
    btnStartBreak.onclick = () => { closeTransitionModal(); switchMode('break'); startTimer(); };
  } else {
    transitionTitle.textContent = t('breakOver');
    transitionMessage.textContent = t('readyAgain');
    btnStartBreak.textContent = t('startFocus');
    btnStartBreak.onclick = () => { closeTransitionModal(); switchMode('focus'); startTimer(); };
  }

  btnExtendMin.textContent = t('extend1min');
  btnExtendMin.onclick = () => { closeTransitionModal(); appState.session.remainingSeconds = 60; startTimer(); };

  btnFinishSession.textContent = t('finishSession');
  btnFinishSession.onclick = () => { closeTransitionModal(); switchMode('idle'); };

  openTransitionModal();
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  gsap.fromTo(toast,
    { opacity: 0, y: 100 },
    { opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.2)" }
  );

  gsap.to(toast, {
    opacity: 0, y: 30, duration: 0.3, delay: 3,
    ease: "power2.in",
    onComplete: () => toast.remove()
  });
}

// ==========================================
// INITIAL LANGUAGE APPLY (no animation)
// ==========================================
export function applyInitialLanguage() {
  langLabel.textContent = appState.prefs.lang === 'ko' ? 'EN' : '한';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}
