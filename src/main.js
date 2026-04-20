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
  bindAIFlowEvents();
  bindArchiveVault();
  
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
// PLANNER (CALENDAR VIEW)
// ==========================================
const monthNames = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

function renderPlanner() {
  const calGrid = document.getElementById('calendar-grid');
  const calTitle = document.getElementById('cal-month-title');
  if (!calGrid || !calTitle) return;
  
  // Remove old dynamic cells (keep the 7 day headers)
  calGrid.querySelectorAll('.cal-cell').forEach(el => el.remove());

  const now = new Date();
  const currentViewDate = new Date(now.getFullYear(), now.getMonth() + appState.session.calendarOffset, 1);
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  calTitle.textContent = `${year}. ${monthNames[month]}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Draw cells
  for (let i = 0; i < 42; i++) {
    let cellDate, cellYear, cellMonth, cellDay, isOtherMonth = false;

    if (i < firstDay) {
      // Prev month
      cellYear = month === 0 ? year - 1 : year;
      cellMonth = month === 0 ? 11 : month - 1;
      cellDay = daysInPrevMonth - firstDay + i + 1;
      isOtherMonth = true;
    } else if (i >= firstDay + daysInMonth) {
      // Next month
      cellYear = month === 11 ? year + 1 : year;
      cellMonth = month === 11 ? 0 : month + 1;
      cellDay = i - firstDay - daysInMonth + 1;
      isOtherMonth = true;
    } else {
      // Current month
      cellYear = year;
      cellMonth = month;
      cellDay = i - firstDay + 1;
    }

    const dateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(cellDay).padStart(2, '0')}`;
    const isToday = dateStr === getTodayStr();

    // Merge persistent tasks and AI tentative tasks
    const allTasksForDate = [
      ...appState.tasks.filter(t => t.targetDate === dateStr),
      ...appState.aiTasks.filter(t => t.targetDate === dateStr).map(t => ({ ...t, isTentative: true }))
    ].sort((a,b) => (a.timeLabel || '').localeCompare(b.timeLabel || ''));

    let tasksHTML = '';
    allTasksForDate.forEach(t => {
      let cls = t.isTentative ? 'tentative' : '';
      if (!t.isTentative) {
        if (t.status === 'active') cls = 'active';
        if (t.status === 'done') cls = 'done';
        if (t.status === 'missed') cls = 'missed';
      }

      tasksHTML += `
        <div class="cal-task-item ${cls}" data-id="${t.id}" title="${t.title}">
          ${t.timeLabel || '--:--'} ${t.title}
        </div>
      `;
    });

    const cellHtml = `
      <div class="cal-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today-cell' : ''}" data-date="${dateStr}">
        <span class="cal-date-label">${cellDay}</span>
        <div class="cal-tasks">
          ${tasksHTML}
        </div>
      </div>
    `;
    calGrid.insertAdjacentHTML('beforeend', cellHtml);
  }

  // --- Render Right Pane (AI Queue) ---
  const aiQueueList = document.getElementById('ai-queue-list');
  const aiActionsPanel = document.getElementById('ai-actions-panel');
  if (aiQueueList && aiActionsPanel) {
    if (appState.aiTasks.length === 0) {
      aiQueueList.innerHTML = `<div class="empty-queue-msg">${t('unscheduledTasks') || 'NO TASKS IN QUEUE'}</div>`;
      aiActionsPanel.classList.add('hidden');
    } else {
      let queueHTML = '';
      appState.aiTasks.forEach(t => {
        queueHTML += `
          <div class="ai-task-card">
            <span class="task-duration">${t.focusMinutes}m</span>
            <div>${t.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">SLOT: ${t.targetDate} / ${t.timeLabel}</div>
          </div>
        `;
      });
      aiQueueList.innerHTML = queueHTML;
      aiActionsPanel.classList.remove('hidden');
    }
  }

  bindPlannerEvents();
}

function bindPlannerEvents() {
  const calGrid = document.getElementById('calendar-grid');
  
  // Click on task
  calGrid.querySelectorAll('.cal-task-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(el.dataset.id);
    });
  });

  // Click on empty cell
  calGrid.querySelectorAll('.cal-cell').forEach(el => {
    el.addEventListener('click', () => {
      openEditModal(null, el.dataset.date);
    });
  });

  const btnPrev = document.getElementById('cal-prev');
  const btnNext = document.getElementById('cal-next');

  if (btnPrev) {
    btnPrev.onclick = () => {
      appState.session.calendarOffset--;
      saveSession();
      renderAll();
    };
  }
  if (btnNext) {
    btnNext.onclick = () => {
      appState.session.calendarOffset++;
      saveSession();
      renderAll();
    };
  }
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
      // Inject history ID (or generate one if missing) to map clicks to details
      const hId = h.id || `h_${Date.now()}_${i}`;
      h.id = hId; 
      
      groupHTML += `
        <div class="stamp ${cls} interactable vault-stamp" data-hid="${hId}">
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
let currentModalDate = getTodayStr(); // Keep track of which date cell was clicked

function openEditModal(taskId, targetDate = getTodayStr()) {
  if (!elEditModal) return;
  currentModalDate = targetDate;
  
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
    // Auto-fill time to now if it's today, otherwise blank
    if (targetDate === getTodayStr()) {
       const now = new Date();
       elEditTime.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    } else {
       elEditTime.value = '12:00';
    }
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
        targetDate: currentModalDate,
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
// V9: AI PLANNER & ARCHIVE VAULT BINDINGS
// ==========================================
function bindAIFlowEvents() {
  const btnReplan = document.getElementById('btn-replan-ai');
  const modalPrompt = document.getElementById('ai-prompt-modal');
  const btnCurate = document.getElementById('btn-ai-curate');
  const inputTarget = document.getElementById('ai-target-input');
  const loadingOverlay = document.getElementById('ai-loading-overlay');
  
  const btnApply = document.getElementById('btn-ai-apply');
  const btnRegen = document.getElementById('btn-ai-regen');

  if (btnReplan) {
    btnReplan.onclick = () => {
      if (modalPrompt) modalPrompt.classList.remove('hidden');
      if (inputTarget) inputTarget.focus();
    };
  }

  if (btnCurate) {
    btnCurate.onclick = () => {
      const target = inputTarget ? inputTarget.value.trim() : '';
      if (!target) return;
      
      if (modalPrompt) modalPrompt.classList.add('hidden');
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');

      // Simulate AI Processing
      setTimeout(() => {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        generateAITasks(target);
      }, 1500);
    };
  }

  if (btnApply) {
    btnApply.onclick = () => {
      appState.aiTasks.forEach(t => {
        appState.tasks.push({
          id: t.id,
          title: t.title,
          focusMinutes: t.focusMinutes,
          breakMinutes: t.breakMinutes,
          status: 'open',
          timeLabel: t.timeLabel,
          targetDate: t.targetDate,
          order: appState.tasks.length
        });
      });
      appState.aiTasks = [];
      saveTasks();
      renderAll();
    };
  }

  if (btnRegen) {
    btnRegen.onclick = () => {
      appState.aiTasks = [];
      if (modalPrompt) modalPrompt.classList.remove('hidden');
    };
  }
}

function generateAITasks(objective) {
  const now = new Date();
  const targetDateStr = getTodayStr();
  
  // Fake simple generation based on objective string
  const blocks = [
    { title: `${objective} - Phase 1 [Drafting]`, dur: 50 },
    { title: `${objective} - Phase 2 [Review]`, dur: 25 },
    { title: `${objective} - Final Polish`, dur: 25 }
  ];

  let currentMin = now.getMinutes() < 30 ? 30 : 0;
  let currentHr = now.getMinutes() < 30 ? now.getHours() : now.getHours() + 1;

  appState.aiTasks = blocks.map((b, i) => {
    const timeLabel = `${String(currentHr).padStart(2,'0')}:${String(currentMin).padStart(2,'0')}`;
    // advanced time a bit
    currentMin += b.dur + 5;
    if (currentMin >= 60) {
      currentHr += 1;
      currentMin -= 60;
    }
    
    return {
      id: 'ai_' + Date.now().toString() + i,
      title: b.title,
      focusMinutes: b.dur,
      breakMinutes: 5,
      targetDate: targetDateStr,
      timeLabel: timeLabel
    };
  });
  
  renderAll();
}

function bindArchiveVault() {
  const btnClose = document.getElementById('btn-vault-close');
  const modalVault = document.getElementById('vault-detail-modal');
  const vaultContent = document.getElementById('vault-detail-content');
  const archiveGallery = document.getElementById('archive-gallery');

  if (archiveGallery) {
    archiveGallery.addEventListener('click', (e) => {
      const stamp = e.target.closest('.vault-stamp');
      if (!stamp) return;
      const hId = stamp.dataset.hid;
      if (!hId) return;

      const record = appState.history.find(h => h.id === hId);
      if (!record) return;

      // Render details
      const cDate = new Date(record.completedAt || Date.now());
      const dateStr = `${cDate.getFullYear()}.${String(cDate.getMonth()+1).padStart(2,'0')}.${String(cDate.getDate()).padStart(2,'0')} / ${String(cDate.getHours()).padStart(2,'0')}:${String(cDate.getMinutes()).padStart(2,'0')}`;
      
      vaultContent.innerHTML = `
        <div class="vault-row">
          <span class="v-label">RITUAL ID:</span>
          <span class="v-value">${record.id}</span>
        </div>
        <div class="vault-row">
          <span class="v-label">DATE / TIME:</span>
          <span class="v-value">${dateStr}</span>
        </div>
        <div class="vault-row">
          <span class="v-label">TITLE:</span>
          <span class="v-value">${record.title || t('untitled')}</span>
        </div>
        <div class="vault-row">
          <span class="v-label">DURATION:</span>
          <span class="v-value">${record.focusMinutes || 25} MIN</span>
        </div>
        <div class="vault-row">
          <span class="v-label">${t('linkedTask') || 'LINKED TASK'}:</span>
          <span class="v-value">${record.title || '--'}</span>
        </div>
        <div class="vault-row">
          <span class="v-label">${t('sequence') || 'SEQUENCE'}:</span>
          <span class="v-value">${record.sequence || 1} RITUAL TONIGHT</span>
        </div>
        <div class="vault-row">
          <span class="v-label">${t('statusText') || 'STATUS'}:</span>
          <span class="v-value highlight-red">COMPLETED</span>
        </div>
        <div class="vault-note-box">
          ${record.systemNote || "Signal remained stable through completion."}
        </div>
      `;

      if (modalVault) modalVault.classList.remove('hidden');
    });
  }

  if (btnClose) {
    btnClose.onclick = () => {
      if (modalVault) modalVault.classList.add('hidden');
    };
  }
}

// ==========================================
// FOCUS → BREAK CYCLE
// ==========================================
function completeFocusSession() {
  const task = appState.tasks.find(t => t.id === appState.session.activeTaskId);
  if (task) {
    task.status = 'done';
    saveTasks();

    appState.session.pomodoroCount = (appState.session.pomodoroCount || 0) + 1;
    
    // Add meta data for Archive Vault
    appState.history.push({
      ...task,
      completedAt: Date.now(),
      date: getTodayStr(),
      sequence: appState.session.pomodoroCount,
      systemNote: `[ SYSTEM ]: Ritual ${task.title || 'Untitled'} successfully encoded into memory. Connection stable.`
    });
    saveHistory();
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
