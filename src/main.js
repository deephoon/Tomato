import { appState, saveTasks, saveHistory, saveSession, getActiveTask, getTodayStr, getTodayDisplay, saveLang } from './state.js';
import { formatTime, startTimer, pauseTimer, switchMode, stopTimer } from './timer.js';
import { init3DScene, set3DMode, triggerRitualManeuver } from './three-scene.js';
import { dict } from './i18n.js';

// ==========================================
// I18N SYSTEM
// ==========================================
function t(key) {
  const lang = appState.prefs.lang || 'en';
  return dict[lang][key] || key;
}

function updateI18nDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.type === 'button') {
      el.value = t(key);
    } else {
      el.innerHTML = t(key);
    }
  });
  
  const langBtn = document.getElementById('btn-lang-toggle');
  if (langBtn) {
    langBtn.textContent = appState.prefs.lang === 'ko' ? '[ EN / KR* ]' : '[ EN* / KR ]';
  }
}

// ==========================================
// DOM REFERENCES
// ==========================================
const views = {
  home: document.getElementById('view-home'),
  focus: document.getElementById('view-focus'),
  break: document.getElementById('view-break'),
  calendar: document.getElementById('view-calendar'),
  archive: document.getElementById('view-archive')
};
const navItems = {
  home: document.getElementById('nav-home'),
  calendar: document.getElementById('nav-calendar'),
  archive: document.getElementById('nav-archive')
};

const elTodayDate = document.getElementById('today-date');
const elHomeCardContent = document.getElementById('home-card-content');
const elPomoDots = document.getElementById('pomo-dots');
const elHomePrompt = document.getElementById('home-prompt');
const elSignalReport = document.getElementById('signal-report');
const btnRitualStart = document.getElementById('btn-ritual-start');

const elFocusCenter = document.getElementById('focus-center');
const elFocusModeLabel = document.getElementById('focus-mode-label');
const elTimeLeft = document.getElementById('time-left');
const elStatusIndicator = document.getElementById('ritual-status');
const btnRitualPause = document.getElementById('btn-ritual-pause');
const btnRitualComplete = document.getElementById('btn-ritual-complete');

const elBreakTimeLeft = document.getElementById('break-time-left');
const elBreakStatus = document.getElementById('break-status');
const btnSkipBreak = document.getElementById('btn-skip-break');

const elPlannerGrid = document.getElementById('planner-grid');
const elArchiveGallery = document.getElementById('archive-gallery');

const elEditModal = document.getElementById('edit-modal');
const elEditTitle = document.getElementById('edit-title');
const elEditFocus = document.getElementById('edit-focus');
const elEditBreak = document.getElementById('edit-break');
const elEditTime = document.getElementById('edit-time');
const elEditTaskId = document.getElementById('edit-task-id');
const btnModalSave = document.getElementById('btn-modal-save');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalDelete = document.getElementById('btn-modal-delete');

let currentView = 'home';

// ==========================================
// NOTIFICATIONS
// ==========================================
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(titleKey, bodyKey, extraText = '') {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(t(titleKey), { body: `${t(bodyKey)} ${extraText}`, icon: '🍅' });
  }
}

// ==========================================
// INIT
// ==========================================
function init() {
  try { init3DScene(); } catch(e) { console.error('3D scene failed:', e); }
  requestNotificationPermission();
  bindNav();
  bindHome();
  bindFocusControls();
  bindBreakControls();
  bindModal();
  bindTimerEvents();
  
  // Set initial i18n
  updateI18nDOM();
  renderAll();
  showView('home');
}

// ==========================================
// VIEW SWITCHING
// ==========================================
function showView(name) {
  currentView = name;
  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    el.style.display = 'none';
    el.classList.remove('active');
    el.classList.add('hidden');
  });
  Object.values(navItems).forEach(n => { if(n) n.classList.remove('active-nav'); });

  const target = views[name];
  if (target) {
    target.style.display = 'flex';
    target.classList.remove('hidden');
    target.classList.add('active');
  }
  if (navItems[name]) navItems[name].classList.add('active-nav');
  try { set3DMode(name); } catch(e) {}
}

// ==========================================
// RENDER ALL
// ==========================================
function renderAll() {
  renderHome();
  renderPlanner();
  renderArchive();
  updateI18nDOM();
}

// ==========================================
// HOME RENDER
// ==========================================
function renderHome() {
  if (elTodayDate) elTodayDate.textContent = getTodayDisplay();

  if (!elHomeCardContent) return;
  const task = appState.tasks.find(t => t.status === 'active')
            || appState.tasks.find(t => t.status === 'open')
            || appState.tasks[0];

  if (!task) {
    elHomeCardContent.innerHTML = `
      <div class="block-title" style="font-size:2rem;">${t('syncState')}</div>
      <div class="block-meta">${t('syncMeta')}</div>
    `;
    if (elHomePrompt) elHomePrompt.style.display = 'none';
  } else {
    appState.session.activeTaskId = task.id;
    appState.session.remainingSeconds = task.focusMinutes * 60;
    elHomeCardContent.innerHTML = `
      <div class="block-id">#F_${task.id} // ${task.focusMinutes}${t('min')} RITUAL</div>
      <div class="block-title">${task.title}</div>
      <div class="block-meta">${task.focusMinutes} ${t('minFocusLabel')} / ${task.breakMinutes || 5} ${t('minRestLabel')} &nbsp;|&nbsp; <span class="highlight-red">${t('readyMeta')}</span></div>
    `;
    if (elHomePrompt) elHomePrompt.style.display = '';
  }

  renderPomoDots();
  renderSignalReport();
}

function renderPomoDots() {
  if (!elPomoDots) return;
  const count = appState.session.pomodoroCount || 0;
  const goal = appState.session.pomodoroGoal || 4;
  let html = '';
  for (let i = 0; i < goal; i++) {
    html += i < count
      ? '<span class="pomo-dot-filled">◆</span>'
      : '<span class="pomo-dot-empty">◇</span>';
  }
  elPomoDots.innerHTML = html;
}

function renderSignalReport() {
  if (!elSignalReport) return;
  const today = getTodayStr();
  const todayHistory = appState.history.filter(h => h.date === today);
  const totalMinutes = todayHistory.reduce((sum, h) => sum + (h.focusMinutes || 0), 0);
  const count = appState.session.pomodoroCount || 0;
  const goal = appState.session.pomodoroGoal || 4;

  if (count === 0 && todayHistory.length === 0) {
    elSignalReport.textContent = '';
    return;
  }

  const complete = count >= goal ? ` // ${t('dailyComplete')}` : '';
  elSignalReport.innerHTML = `${t('signalReport')} // ${count} OF ${goal} ${t('blocks')} // ${t('totalFocus')}: ${totalMinutes} ${t('min')}${complete}`;
}

// ==========================================
// PLANNER RENDER (With Timeline & D&D)
// ==========================================
let draggedTaskId = null;

function renderPlanner() {
  if (!elPlannerGrid) return;
  elPlannerGrid.innerHTML = '';

  const sorted = [...appState.tasks].sort((a, b) => (a.order || 0) - (b.order || 0));

  sorted.forEach(task => {
    let cls = 'open';
    let prefix = t('stateOpen');
    const time = task.timeLabel || '--:--';

    if (task.status === 'done')   { cls = 'completed'; prefix = t('stateDone'); }
    if (task.status === 'active') { cls = 'active-slot'; prefix = t('stateArmed'); }
    if (task.status === 'missed') { cls = 'missed'; prefix = t('stateMissed'); }

    elPlannerGrid.insertAdjacentHTML('beforeend', `
      <div class="slot ${cls} interactable draggable-slot" draggable="true" data-id="${task.id}">
        <span class="slot-time">${time}</span>
        <span class="slot-task">[ ${prefix}${task.title} ]</span>
        <span class="slot-duration">${task.focusMinutes}m</span>
        <div class="slot-actions">
          <div class="quick-btn btn-edit" data-id="${task.id}">MOD</div>
          <div class="quick-btn danger btn-del" data-id="${task.id}">DEL</div>
        </div>
      </div>
    `);
  });

  elPlannerGrid.insertAdjacentHTML('beforeend', `
    <div class="slot empty interactable" id="btn-add-task">
      <span class="slot-time"></span>
      <span class="slot-task">${t('dropNextRitual')}</span>
    </div>
  `);

  bindPlannerEvents();
}

function bindPlannerEvents() {
  // Quick Actions
  elPlannerGrid.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(e.target.dataset.id); });
  });
  elPlannerGrid.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', (e) => { 
      e.stopPropagation(); 
      if (confirm(t('confirmDelete'))) {
        appState.tasks = appState.tasks.filter(t => t.id !== e.target.dataset.id);
        saveTasks();
        renderAll();
      }
    });
  });

  const addBtn = document.getElementById('btn-add-task');
  if (addBtn) addBtn.onclick = () => openEditModal(null);

  // Drag and Drop Logic
  const slots = elPlannerGrid.querySelectorAll('.draggable-slot');
  slots.forEach(slot => {
    slot.addEventListener('dragstart', (e) => {
      draggedTaskId = slot.dataset.id;
      slot.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    slot.addEventListener('dragend', () => {
      slot.classList.remove('dragging');
      draggedTaskId = null;
    });
  });

  elPlannerGrid.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(elPlannerGrid, e.clientY);
    const dragging = document.querySelector('.dragging');
    if (dragging) {
      if (afterElement == null) {
        elPlannerGrid.insertBefore(dragging, addBtn);
      } else {
        elPlannerGrid.insertBefore(dragging, afterElement);
      }
    }
  });

  elPlannerGrid.addEventListener('drop', (e) => {
    e.preventDefault();
    // Recompute order based on DOM position
    const domSlots = elPlannerGrid.querySelectorAll('.draggable-slot');
    domSlots.forEach((slot, index) => {
      const id = slot.dataset.id;
      const t = appState.tasks.find(x => x.id === id);
      if (t) t.order = index;
    });
    saveTasks();
    renderAll();
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.draggable-slot:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ==========================================
// ARCHIVE RENDER
// ==========================================
function renderArchive() {
  if (!elArchiveGallery) return;
  elArchiveGallery.innerHTML = '';

  if (appState.history.length === 0) {
    elArchiveGallery.innerHTML = `
      <div class="stamp-row" style="justify-content:center;">
        <div class="stamp empty-stamp interactable">
          <div class="stamp-icon">+</div>
          <div class="stamp-title">${t('await')}</div>
        </div>
      </div>
    `;
    return;
  }

  const groups = {};
  appState.history.forEach(h => {
    const date = h.date || 'UNKNOWN';
    if (!groups[date]) groups[date] = [];
    groups[date].push(h);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  sortedDates.forEach(date => {
    const items = groups[date];
    const totalMin = items.reduce((s, h) => s + (h.focusMinutes || 0), 0);

    let groupHTML = `<div class="archive-date-group">`;
    groupHTML += `<div class="archive-date-header">${date} <span>${items.length} ${t('rituals')} // ${totalMin} ${t('min')}</span></div>`;
    groupHTML += `<div class="stamp-row">`;

    items.forEach((h, i) => {
      const cls = i % 2 === 0 ? 'red' : 'white';
      const icon = i % 2 === 0 ? '■' : '▲';
      const label = (h.title || 'RITUAL').split(' ')[0];
      groupHTML += `
        <div class="stamp ${cls} interactable">
          <div class="stamp-icon">${icon}</div>
          <div class="stamp-title">${label}</div>
          <div class="stamp-duration">${h.focusMinutes || 25}m</div>
        </div>
      `;
    });

    groupHTML += `</div></div>`;
    elArchiveGallery.insertAdjacentHTML('beforeend', groupHTML);
  });

  elArchiveGallery.insertAdjacentHTML('beforeend', `
    <div class="stamp-row" style="justify-content:center; margin-top:1rem;">
      <div class="stamp empty-stamp interactable">
        <div class="stamp-icon">+</div>
        <div class="stamp-title">${t('await')}</div>
      </div>
    </div>
  `);
}

// ==========================================
// EDIT MODAL
// ==========================================
function openEditModal(taskId) {
  if (!elEditModal) return;
  if (taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;
    elEditTitle.value = task.title;
    elEditFocus.value = task.focusMinutes;
    elEditBreak.value = task.breakMinutes || 5;
    elEditTime.value = task.timeLabel || '';
    elEditTaskId.value = task.id;
    if (btnModalDelete) btnModalDelete.style.display = '';
  } else {
    elEditTitle.value = '';
    elEditFocus.value = 25;
    elEditBreak.value = 5;
    elEditTime.value = '';
    elEditTaskId.value = '';
    if (btnModalDelete) btnModalDelete.style.display = 'none';
  }
  elEditModal.classList.remove('hidden');
}

function closeEditModal() {
  if (elEditModal) elEditModal.classList.add('hidden');
}

function bindModal() {
  if (btnModalSave) btnModalSave.onclick = () => {
    const id = elEditTaskId.value;
    const title = (elEditTitle.value || t('untitled')).toUpperCase().trim();
    const focusMin = Math.max(1, Math.min(120, parseInt(elEditFocus.value) || 25));
    const breakMin = Math.max(1, Math.min(30, parseInt(elEditBreak.value) || 5));
    const timeLabel = elEditTime.value.trim() || '--:--';

    if (id) {
      const task = appState.tasks.find(t => t.id === id);
      if (task) {
        task.title = title;
        task.focusMinutes = focusMin;
        task.breakMinutes = breakMin;
        task.timeLabel = timeLabel;
      }
    } else {
      appState.tasks.push({
        id: 't_' + Date.now().toString().slice(-6),
        title,
        focusMinutes: focusMin,
        breakMinutes: breakMin,
        status: 'open',
        timeLabel,
        order: appState.tasks.length
      });
    }
    saveTasks();
    closeEditModal();
    renderAll();
  };

  if (btnModalCancel) btnModalCancel.onclick = closeEditModal;

  if (btnModalDelete) btnModalDelete.onclick = () => {
    const id = elEditTaskId.value;
    if (!id) return;
    if (!confirm(t('confirmDelete'))) return;
    appState.tasks = appState.tasks.filter(t => t.id !== id);
    saveTasks();
    closeEditModal();
    renderAll();
  };
}

// ==========================================
// EVENT BINDING
// ==========================================
function bindNav() {
  if (navItems.home) navItems.home.onclick = () => { showView('home'); renderAll(); };
  if (navItems.calendar) navItems.calendar.onclick = () => showView('calendar');
  if (navItems.archive) navItems.archive.onclick = () => showView('archive');

  const btnLang = document.getElementById('btn-lang-toggle');
  if (btnLang) {
    btnLang.onclick = () => {
      appState.prefs.lang = appState.prefs.lang === 'ko' ? 'en' : 'ko';
      saveLang();
      renderAll();
    };
  }
}

function bindHome() {
  if (!btnRitualStart) return;
  btnRitualStart.onclick = () => {
    if (!appState.session.activeTaskId) return;
    try { triggerRitualManeuver(); } catch(e) {}
    setTimeout(() => {
      showView('focus');
      switchMode('focus');
      if (!appState.session.isRunning) startTimer();
    }, 500);
  };
}

function bindFocusControls() {
  if (btnRitualPause) {
    btnRitualPause.onclick = () => {
      if (appState.session.isRunning) {
        pauseTimer();
        btnRitualPause.textContent = t('btnResume');
        if (elStatusIndicator) elStatusIndicator.textContent = t('signalPaused');
        if (elFocusCenter) elFocusCenter.classList.remove('tension');
      } else {
        startTimer();
        btnRitualPause.textContent = t('btnPause');
        if (elStatusIndicator) elStatusIndicator.textContent = t('signalLocked');
      }
    };
  }

  if (btnRitualComplete) {
    btnRitualComplete.onclick = () => {
      stopTimer();
      completeFocusSession();
    };
  }
}

function bindBreakControls() {
  if (btnSkipBreak) {
    btnSkipBreak.onclick = () => {
      stopTimer();
      endBreak();
    };
  }
}

function bindTimerEvents() {
  window.addEventListener('tomato:statechange', updateTimerHUD);
  window.addEventListener('tomato:timerend', handleTimerEnd);
}

// ==========================================
// FOCUS → BREAK CYCLE
// ==========================================
function completeFocusSession() {
  const task = appState.tasks.find(t => t.id === appState.session.activeTaskId);
  if (task) {
    task.status = 'done';
    saveTasks();

    appState.history.push({
      ...task,
      completedAt: Date.now(),
      date: getTodayStr()
    });
    saveHistory();

    appState.session.pomodoroCount = (appState.session.pomodoroCount || 0) + 1;
    saveSession();
  }

  const taskTitle = task ? task.title : 'RITUAL';
  sendNotification('notifFocusDoneTitle', 'notifFocusDoneBody', `// ${taskTitle}`);
  enterBreakMode();
}

function enterBreakMode() {
  switchMode('break');
  showView('break');
  try { set3DMode('break'); } catch(e) {}

  const isLong = appState.session.pomodoroCount > 0 && appState.session.pomodoroCount % 4 === 0;
  if (elBreakStatus) {
    elBreakStatus.textContent = isLong ? t('longRest') : t('signalResting');
  }

  startTimer();
}

function endBreak() {
  sendNotification('notifRestDoneTitle', 'notifRestDoneBody');
  const nextTask = appState.tasks.find(t => t.status === 'active' || t.status === 'open');
  if (nextTask) {
    nextTask.status = 'active';
    saveTasks();
  }
  renderAll();
  showView('home');
  switchMode('idle');
}

function handleTimerEnd() {
  if (appState.session.mode === 'focus') {
    completeFocusSession();
  } else if (appState.session.mode === 'break') {
    endBreak();
  }
}

// ==========================================
// TIMER HUD UPDATE
// ==========================================
function updateTimerHUD() {
  const mode = appState.session.mode;
  const remaining = appState.session.remainingSeconds;

  if (mode === 'focus' && currentView === 'focus') {
    if (elTimeLeft) elTimeLeft.textContent = formatTime(remaining);
    if (elFocusModeLabel) elFocusModeLabel.textContent = t('modeFocus');

    if (appState.session.isRunning && remaining <= 180 && remaining > 0) {
      if (elFocusCenter) elFocusCenter.classList.add('tension');
      if (elStatusIndicator) elStatusIndicator.textContent = t('finalStretch');
    } else if (remaining > 180) {
      if (elFocusCenter) elFocusCenter.classList.remove('tension');
      if (elStatusIndicator && appState.session.isRunning) {
        elStatusIndicator.textContent = t('signalLocked');
      }
    }
  }

  if (mode === 'break' && currentView === 'break') {
    if (elBreakTimeLeft) elBreakTimeLeft.textContent = formatTime(remaining);
  }
}

// ==========================================
// START
// ==========================================
init();
