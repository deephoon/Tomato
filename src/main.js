import { appState, saveTasks, saveHistory, saveSession, getActiveTask, getTodayStr, getTodayDisplay } from './state.js';
import { formatTime, startTimer, pauseTimer, switchMode, stopTimer } from './timer.js';
import { init3DScene, set3DMode, triggerRitualManeuver } from './three-scene.js';

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

// Home
const elTodayDate = document.getElementById('today-date');
const elHomeCardContent = document.getElementById('home-card-content');
const elPomoDots = document.getElementById('pomo-dots');
const elHomePrompt = document.getElementById('home-prompt');
const elSignalReport = document.getElementById('signal-report');
const btnRitualStart = document.getElementById('btn-ritual-start');

// Focus
const elFocusCenter = document.getElementById('focus-center');
const elFocusModeLabel = document.getElementById('focus-mode-label');
const elTimeLeft = document.getElementById('time-left');
const elStatusIndicator = document.getElementById('ritual-status');
const btnRitualPause = document.getElementById('btn-ritual-pause');
const btnRitualComplete = document.getElementById('btn-ritual-complete');

// Break
const elBreakTimeLeft = document.getElementById('break-time-left');
const elBreakStatus = document.getElementById('break-status');
const btnSkipBreak = document.getElementById('btn-skip-break');

// Planner
const elPlannerGrid = document.getElementById('planner-grid');

// Archive
const elArchiveGallery = document.getElementById('archive-gallery');

// Edit Modal
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

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🍅' });
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
}

// ==========================================
// HOME RENDER
// ==========================================
function renderHome() {
  // Date
  if (elTodayDate) elTodayDate.textContent = getTodayDisplay();

  // Hero card
  if (!elHomeCardContent) return;
  const task = appState.tasks.find(t => t.status === 'active')
            || appState.tasks.find(t => t.status === 'open')
            || appState.tasks[0];

  if (!task) {
    elHomeCardContent.innerHTML = `
      <div class="block-title" style="font-size:2rem;">ALL SYSTEMS SYNCED</div>
      <div class="block-meta">NO PENDING RITUALS &nbsp;|&nbsp; <span class="highlight-red">STANDBY</span></div>
    `;
    if (elHomePrompt) elHomePrompt.style.display = 'none';
  } else {
    appState.session.activeTaskId = task.id;
    appState.session.remainingSeconds = task.focusMinutes * 60;
    elHomeCardContent.innerHTML = `
      <div class="block-id">#F_${task.id} // ${task.focusMinutes}m RITUAL</div>
      <div class="block-title">${task.title}</div>
      <div class="block-meta">${task.focusMinutes} MIN FOCUS / ${task.breakMinutes || 5} MIN REST &nbsp;|&nbsp; <span class="highlight-red">READY NOW</span></div>
    `;
    if (elHomePrompt) elHomePrompt.style.display = '';
  }

  // Pomo dots
  renderPomoDots();

  // Signal report (today's summary)
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

  const complete = count >= goal ? ' // DAILY RITUAL COMPLETE ✓' : '';
  elSignalReport.innerHTML = `SIGNAL REPORT // ${count} OF ${goal} BLOCKS // TOTAL FOCUS: ${totalMinutes} MIN${complete}`;
}

// ==========================================
// PLANNER RENDER
// ==========================================
function renderPlanner() {
  if (!elPlannerGrid) return;
  elPlannerGrid.innerHTML = '';

  // Sort by order
  const sorted = [...appState.tasks].sort((a, b) => (a.order || 0) - (b.order || 0));

  sorted.forEach(task => {
    let cls = 'open';
    let prefix = 'OPEN: ';
    const time = task.timeLabel || '--:--';

    if (task.status === 'done')   { cls = 'completed'; prefix = 'DONE: '; }
    if (task.status === 'active') { cls = 'active-slot'; prefix = 'ARMED: '; }
    if (task.status === 'missed') { cls = 'missed'; prefix = 'MISSED: '; }

    elPlannerGrid.insertAdjacentHTML('beforeend', `
      <div class="slot ${cls} interactable" data-id="${task.id}">
        <span class="slot-time">${time}</span>
        <span class="slot-task">[ ${prefix}${task.title} ]</span>
        <span class="slot-duration">${task.focusMinutes}m</span>
      </div>
    `);
  });

  // Empty slot CTA
  elPlannerGrid.insertAdjacentHTML('beforeend', `
    <div class="slot empty interactable" id="btn-add-task">
      <span class="slot-time"></span>
      <span class="slot-task">+ DROP NEXT RITUAL</span>
    </div>
  `);

  // Bind slot clicks
  elPlannerGrid.querySelectorAll('.slot[data-id]').forEach(el => {
    el.addEventListener('click', () => openEditModal(el.dataset.id));
  });
  const addBtn = document.getElementById('btn-add-task');
  if (addBtn) addBtn.onclick = () => openEditModal(null); // null = new task
}

// ==========================================
// ARCHIVE RENDER (date-grouped)
// ==========================================
function renderArchive() {
  if (!elArchiveGallery) return;
  elArchiveGallery.innerHTML = '';

  if (appState.history.length === 0) {
    elArchiveGallery.innerHTML = `
      <div class="stamp-row" style="justify-content:center;">
        <div class="stamp empty-stamp interactable">
          <div class="stamp-icon">+</div>
          <div class="stamp-title">AWAIT</div>
        </div>
      </div>
    `;
    return;
  }

  // Group by date
  const groups = {};
  appState.history.forEach(h => {
    const date = h.date || 'UNKNOWN';
    if (!groups[date]) groups[date] = [];
    groups[date].push(h);
  });

  // Sort dates descending (newest first)
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  sortedDates.forEach(date => {
    const items = groups[date];
    const totalMin = items.reduce((s, h) => s + (h.focusMinutes || 0), 0);

    let groupHTML = `<div class="archive-date-group">`;
    groupHTML += `<div class="archive-date-header">${date} <span>${items.length} RITUALS // ${totalMin} MIN</span></div>`;
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

  // Always add an empty slot at end
  elArchiveGallery.insertAdjacentHTML('beforeend', `
    <div class="stamp-row" style="justify-content:center; margin-top:1rem;">
      <div class="stamp empty-stamp interactable">
        <div class="stamp-icon">+</div>
        <div class="stamp-title">AWAIT</div>
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
    // Edit existing
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;
    elEditTitle.value = task.title;
    elEditFocus.value = task.focusMinutes;
    elEditBreak.value = task.breakMinutes || 5;
    elEditTime.value = task.timeLabel || '';
    elEditTaskId.value = task.id;
    if (btnModalDelete) btnModalDelete.style.display = '';
  } else {
    // New task
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
    const title = (elEditTitle.value || 'UNTITLED').toUpperCase().trim();
    const focusMin = Math.max(1, Math.min(120, parseInt(elEditFocus.value) || 25));
    const breakMin = Math.max(1, Math.min(30, parseInt(elEditBreak.value) || 5));
    const timeLabel = elEditTime.value.trim() || '--:--';

    if (id) {
      // Update existing
      const task = appState.tasks.find(t => t.id === id);
      if (task) {
        task.title = title;
        task.focusMinutes = focusMin;
        task.breakMinutes = breakMin;
        task.timeLabel = timeLabel;
      }
    } else {
      // Create new
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
    if (!confirm('DECOMMISSION this ritual signal?')) return;
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
        btnRitualPause.textContent = '[ RESUME ]';
        if (elStatusIndicator) elStatusIndicator.textContent = 'SIGNAL PAUSED // AWAITING...';
        if (elFocusCenter) elFocusCenter.classList.remove('tension');
      } else {
        startTimer();
        btnRitualPause.textContent = '[ PAUSE ]';
        if (elStatusIndicator) elStatusIndicator.textContent = 'SIGNAL LOCKED // IN PROGRESS';
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

    // Push to history with date
    appState.history.push({
      ...task,
      completedAt: Date.now(),
      date: getTodayStr()
    });
    saveHistory();

    // Increment pomo count
    appState.session.pomodoroCount = (appState.session.pomodoroCount || 0) + 1;
    saveSession();
  }

  // Notification
  const taskTitle = task ? task.title : 'RITUAL';
  sendNotification('SIGNAL COMPLETE', `${taskTitle} // FOCUS SESSION DONE`);

  // Transition to break
  enterBreakMode();
}

function enterBreakMode() {
  switchMode('break');
  showView('break');
  try { set3DMode('break'); } catch(e) {}

  const isLong = appState.session.pomodoroCount > 0 && appState.session.pomodoroCount % 4 === 0;
  if (elBreakStatus) {
    elBreakStatus.textContent = isLong
      ? 'LONG REST // 4 BLOCKS COMPLETE // RECHARGE'
      : 'SIGNAL RESTING // RECHARGE';
  }

  startTimer();
}

function endBreak() {
  // Notification
  sendNotification('REST COMPLETE', 'READY TO LOCK NEXT SIGNAL');

  // Go back to home, pick next task
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
    if (elFocusModeLabel) elFocusModeLabel.textContent = 'FOCUS';

    // Tension UX at ≤3 min
    if (appState.session.isRunning && remaining <= 180 && remaining > 0) {
      if (elFocusCenter) elFocusCenter.classList.add('tension');
      if (elStatusIndicator) elStatusIndicator.textContent = 'FINAL STRETCH // CLOSING LOOP...';
    } else if (remaining > 180) {
      if (elFocusCenter) elFocusCenter.classList.remove('tension');
      if (elStatusIndicator && appState.session.isRunning) {
        elStatusIndicator.textContent = 'SIGNAL LOCKED // IN PROGRESS';
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
