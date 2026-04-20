// ==========================================
// STATE MANAGEMENT — Single Source of Truth
// ==========================================

// --- Storage Keys ---
const LOCAL_STORAGE_KEY = 'tomato_os_tasks';
const LOCAL_HISTORY_KEY = 'tomato_os_history';
const LOCAL_SESSION_KEY = 'tomato_os_session';
const LANG_STORAGE_KEY = 'tomato_lang';

// --- Helpers ---
export function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function getTodayDisplay() {
  const d = new Date();
  const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} // ${days[d.getDay()]}`;
}

// --- Default Tasks ---
const DEFAULT_TASKS = [
  { id: 't_1', title: 'DEEP SYSTEM DESIGN', focusMinutes: 25, breakMinutes: 5, status: 'active', timeLabel: '22:00', targetDate: getTodayStr(), order: 0 }
];

// --- Persistence Security Core ---
function safeLoad(key, defaultData) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null') return defaultData;
    const parsed = JSON.parse(raw);
    if (Array.isArray(defaultData)) {
      return Array.isArray(parsed) ? parsed : defaultData;
    }
    return typeof parsed === 'object' && parsed !== null ? parsed : defaultData;
  } catch (err) {
    console.error('Storage parse error:', err);
    return defaultData;
  }
}

// --- Default Session ---
const DEFAULT_SESSION = {
  activeTaskId: null,
  mode: 'idle',           // idle | focus | break
  remainingSeconds: 0,
  isRunning: false,
  endTime: 0,
  pomodoroCount: 0,       // today's completed pomodoros
  pomodoroGoal: 4,        // daily goal
  todayDate: getTodayStr(),
  calendarOffset: 0,      // 0 for current month, -1 for previous, etc.
  aiPlanningActive: false
};

// --- Global App State ---
export const appState = {
  tasks: safeLoad(LOCAL_STORAGE_KEY, DEFAULT_TASKS),
  history: safeLoad(LOCAL_HISTORY_KEY, []),
  session: { ...DEFAULT_SESSION, ...safeLoad(LOCAL_SESSION_KEY, DEFAULT_SESSION) },
  aiTasks: [], // AI proposed tasks
  prefs: { lang: localStorage.getItem(LANG_STORAGE_KEY) || 'en' }
};

export function saveLang() {
  localStorage.setItem(LANG_STORAGE_KEY, appState.prefs.lang);
}


// Day rollover check: if todayDate doesn't match, reset pomodoro count
(function checkDayRollover() {
  const today = getTodayStr();
  if (appState.session.todayDate !== today) {
    appState.session.pomodoroCount = 0;
    appState.session.todayDate = today;
    // Mark yesterday's incomplete tasks as missed
    appState.tasks.forEach(t => {
      if (t.status === 'active' || t.status === 'open') {
        t.status = 'missed';
      }
    });
    saveTasks();
    saveSession();
  }
})();

// --- Persistence ---
export function saveTasks() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState.tasks));
}

export function saveHistory() {
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(appState.history));
}

export function saveSession() {
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({
    pomodoroCount: appState.session.pomodoroCount,
    pomodoroGoal: appState.session.pomodoroGoal,
    todayDate: appState.session.todayDate,
    calendarOffset: appState.session.calendarOffset
  }));
}

// --- Active Task Helper ---
export function getActiveTask() {
  return appState.tasks.find(tk => tk.id === appState.session.activeTaskId) || appState.tasks[0];
}
