import { appState, saveTasks, saveHistory } from './state.js';
import { formatTime, startTimer, pauseTimer, switchMode, stopTimer } from './timer.js';
import { init3DScene, set3DMode, triggerRitualManeuver } from './three-scene.js';

// ==========================================
// DOM References (grabbed once)
// ==========================================
const views = {
  home: document.getElementById('view-home'),
  focus: document.getElementById('view-focus'),
  calendar: document.getElementById('view-calendar'),
  archive: document.getElementById('view-archive')
};
const navItems = {
  home: document.getElementById('nav-home'),
  calendar: document.getElementById('nav-calendar'),
  archive: document.getElementById('nav-archive')
};

const elTimeLeft = document.getElementById('time-left');
const elStatusIndicator = document.getElementById('ritual-status');
const elFocusCenter = document.querySelector('.focus-center');
const btnRitualStart = document.getElementById('btn-ritual-start');
const btnRitualPause = document.getElementById('btn-ritual-pause');
const btnRitualComplete = document.getElementById('btn-ritual-complete');
const elPlannerGrid = document.getElementById('planner-grid');
const elArchiveGallery = document.getElementById('archive-gallery');
const elHomeCardContent = document.getElementById('home-card-content');

let currentView = 'home';

// ==========================================
// INIT
// ==========================================
function init() {
  try { init3DScene(); } catch(e) { console.error('3D scene failed:', e); }
  bindNav();
  bindHome();
  bindFocusControls();
  bindTimerEvents();
  renderAll();
  showView('home');
}

// ==========================================
// VIEW SWITCHING (no setTimeout race condition)
// ==========================================
function showView(name) {
  currentView = name;

  // Hide all views
  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    el.style.display = 'none';
    el.classList.remove('active');
    el.classList.add('hidden');
  });

  // Deactivate nav
  Object.values(navItems).forEach(n => { if(n) n.classList.remove('active-nav'); });

  // Show target
  const target = views[name];
  if (target) {
    target.style.display = 'flex';
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  if (navItems[name]) navItems[name].classList.add('active-nav');

  try { set3DMode(name); } catch(e) { /* 3D not ready yet */ }
}

// ==========================================
// RENDER FUNCTIONS (data-driven)
// ==========================================
function renderAll() {
  renderHome();
  renderPlanner();
  renderArchive();
}

function renderHome() {
  if (!elHomeCardContent) return;

  // Find the first active or non-done task
  const task = appState.tasks.find(t => t.status === 'active')
            || appState.tasks.find(t => t.status !== 'done')
            || appState.tasks[0];

  if (!task) {
    elHomeCardContent.innerHTML = `
      <div class="block-title" style="font-size:2rem;">ALL SYSTEMS SYNCED</div>
      <div class="block-meta">NO PENDING RITUALS &nbsp;|&nbsp; <span class="highlight-red">STANDBY</span></div>
    `;
    return;
  }

  appState.session.activeTaskId = task.id;
  appState.session.remainingSeconds = task.focusMinutes * 60;

  elHomeCardContent.innerHTML = `
    <div class="block-id">#F_${task.id} // SECURING SIGNAL</div>
    <div class="block-title">${task.title}</div>
    <div class="block-meta">${task.focusMinutes} MIN RITUAL &nbsp;|&nbsp; <span class="highlight-red">READY NOW</span></div>
  `;
}

function renderPlanner() {
  if (!elPlannerGrid) return;
  elPlannerGrid.innerHTML = '';

  appState.tasks.forEach(task => {
    let cls = 'open';
    let prefix = 'OPEN: ';
    const time = task.timeLabel || '00:00';

    if (task.status === 'done')   { cls = 'completed';   prefix = 'DONE: '; }
    if (task.status === 'active') { cls = 'active-slot';  prefix = 'ARMED: '; }
    if (task.status === 'missed') { cls = 'missed';       prefix = 'MISSED: '; }

    elPlannerGrid.insertAdjacentHTML('beforeend', `
      <div class="slot ${cls} interactable" data-id="${task.id}">
        <span class="slot-time">${time}</span>
        <span class="slot-task">[ ${prefix}${task.title} ]</span>
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
  const addBtn = document.getElementById('btn-add-task');
  if (addBtn) addBtn.onclick = promptNewTask;
}

function renderArchive() {
  if (!elArchiveGallery) return;
  elArchiveGallery.innerHTML = '';

  appState.history.forEach((h, i) => {
    const cls = i % 2 === 0 ? 'red' : 'white';
    const icon = i % 2 === 0 ? '■' : '▲';
    const label = (h.title || 'RITUAL').split(' ')[0];
    elArchiveGallery.insertAdjacentHTML('beforeend', `
      <div class="stamp ${cls} interactable">
        <div class="stamp-icon">${icon}</div>
        <div class="stamp-title">${label}</div>
        <div class="stamp-duration">${h.focusMinutes || 25}m</div>
      </div>
    `);
  });

  elArchiveGallery.insertAdjacentHTML('beforeend', `
    <div class="stamp empty-stamp interactable">
      <div class="stamp-icon">+</div>
      <div class="stamp-title">AWAIT</div>
    </div>
  `);
}

// ==========================================
// EVENT BINDING
// ==========================================
function bindNav() {
  if (navItems.home)     navItems.home.onclick     = () => showView('home');
  if (navItems.calendar) navItems.calendar.onclick = () => showView('calendar');
  if (navItems.archive)  navItems.archive.onclick  = () => showView('archive');
}

function bindHome() {
  if (!btnRitualStart) return;
  btnRitualStart.onclick = () => {
    if (!appState.session.activeTaskId) return;
    try { triggerRitualManeuver(); } catch(e) {}
    setTimeout(() => {
      showView('focus');
      switchMode('focus');
      if (btnRitualPause) btnRitualPause.classList.remove('hidden');
      if (btnRitualComplete) btnRitualComplete.classList.remove('hidden');
      if (!appState.session.isRunning) startTimer();
    }, 600);
  };
}

function bindFocusControls() {
  if (btnRitualPause) {
    btnRitualPause.onclick = () => {
      if (appState.session.isRunning) {
        pauseTimer();
        btnRitualPause.textContent = '[ RESUME ]';
        btnRitualPause.classList.add('btn-danger');
        if (elStatusIndicator) elStatusIndicator.textContent = 'SIGNAL PAUSED // AWAITING...';
        if (elFocusCenter) elFocusCenter.classList.remove('tension');
      } else {
        startTimer();
        btnRitualPause.textContent = '[ PAUSE ]';
        btnRitualPause.classList.remove('btn-danger');
        if (elStatusIndicator) elStatusIndicator.textContent = 'SIGNAL LOCKED // IN PROGRESS';
      }
    };
  }

  if (btnRitualComplete) {
    btnRitualComplete.onclick = () => {
      stopTimer();
      completeActiveTask();
    };
  }
}

function bindTimerEvents() {
  window.addEventListener('tomato:statechange', updateFocusHUD);
  window.addEventListener('tomato:timerend', () => completeActiveTask());
}

// ==========================================
// ACTIONS
// ==========================================
function promptNewTask() {
  const title = prompt('Enter Focus Ritual Name (ex: DEEP WORK):');
  if (!title) return;
  const timeLabel = prompt('Set Time Slot (ex: 23:00):') || '00:00';
  appState.tasks.push({
    id: 't_' + Date.now().toString().slice(-6),
    title: title.toUpperCase(),
    focusMinutes: 25,
    status: 'open',
    timeLabel
  });
  saveTasks();
  renderAll();
}

function completeActiveTask() {
  const task = appState.tasks.find(t => t.id === appState.session.activeTaskId);
  if (task) {
    task.status = 'done';
    saveTasks();
    appState.history.push({ ...task, completedAt: Date.now() });
    saveHistory();
  }
  appState.session.remainingSeconds = 0;
  if (elFocusCenter) elFocusCenter.classList.remove('tension');
  renderAll();
  showView('archive');
  switchMode('idle');
}

function updateFocusHUD() {
  if (elTimeLeft) elTimeLeft.textContent = formatTime(appState.session.remainingSeconds);

  if (appState.session.isRunning && appState.session.mode === 'focus') {
    const remaining = appState.session.remainingSeconds;
    if (remaining <= 180 && remaining > 0) {
      if (elFocusCenter) elFocusCenter.classList.add('tension');
      if (elStatusIndicator) elStatusIndicator.textContent = 'FINAL STRETCH // CLOSING LOOP...';
    } else if (remaining > 180) {
      if (elFocusCenter) elFocusCenter.classList.remove('tension');
      if (elStatusIndicator) elStatusIndicator.textContent = 'SIGNAL LOCKED // IN PROGRESS';
    }
  }
}

// ==========================================
// START
// ==========================================
init();
