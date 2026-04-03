// ==========================================
// STATE MANAGEMENT — Single Source of Truth
// ==========================================
import gsap from 'gsap';

// --- i18n Dictionary ---
export const i18n = {
  ko: {
    selectTask: '작업 선택',
    restBreak: '휴식',
    timesUp: '시간 종료',
    greatSession: '훌륭한 집중이었어요.',
    startBreak: '휴식 시작',
    extend1min: '+ 1분 연장',
    finishSession: '세션 종료',
    breakOver: '휴식 끝',
    readyAgain: '다시 집중할 준비 됐나요?',
    startFocus: '집중 시작',
    tasks: '작업 목록',
    newTask: '+ 새 작업',
    taskName: '작업 이름',
    workMin: '작업 (분)',
    breakMin: '휴식 (분)',
    themeColor1: '테마 색상 1',
    themeColor2: '테마 색상 2',
    cancel: '취소',
    saveTask: '저장',
    minOneTask: '최소 하나의 작업이 필요합니다!',
    work: '작업',
    breakLabel: '휴식',
    paused: '일시 정지',
    interruptionMsg: '집중 흐름을 이어가거나, 잠시 쉴 수 있습니다.',
    resume: '계속 진행',
    startBreakNow: '지금 바로 휴식',
    startFocusNow: '바로 집중 시작',
    finishEarly: '일찍 완료',
    glassColor: '유리 본체 색상',
    resetTimer: '타이머 초기화',
    editTask: '작업 설정',
    aiSlice: 'AI로 분해하기',
    aiSlicing: 'AI 분해 중...',
    aiKeyNeeded: 'Settings에서 Gemini API Key를 먼저 입력하세요.',
    apiKeyLabel: 'Gemini API Key',
    apiKeyPlaceholder: 'AIza...'
  },
  en: {
    selectTask: 'SELECT TASK',
    restBreak: 'REST / BREAK',
    timesUp: "Time's Up",
    greatSession: 'Great focus session.',
    startBreak: 'Start Break',
    extend1min: '+ Extend 1 min',
    finishSession: 'Finish Session',
    breakOver: 'Break Over',
    readyAgain: 'Ready to dive back in?',
    startFocus: 'Start Focus',
    tasks: 'Tasks',
    newTask: '+ New Task',
    taskName: 'Task Name',
    workMin: 'Work (min)',
    breakMin: 'Break (min)',
    themeColor1: 'Theme Color 1',
    themeColor2: 'Theme Color 2',
    cancel: 'Cancel',
    saveTask: 'Save Task',
    minOneTask: 'You must have at least one task!',
    work: 'Work',
    breakLabel: 'Break',
    paused: 'Paused',
    interruptionMsg: 'Continue your flow, or take a break.',
    resume: 'Resume',
    startBreakNow: 'Start Break Now',
    startFocusNow: 'Start Focus Now',
    finishEarly: 'Finish Early',
    glassColor: 'Glass Body Color',
    resetTimer: 'Reset Timer',
    editTask: 'Edit Task',
    aiSlice: 'AI Slice',
    aiSlicing: 'AI Slicing...',
    aiKeyNeeded: 'Enter Gemini API Key in Settings first.',
    apiKeyLabel: 'Gemini API Key',
    apiKeyPlaceholder: 'AIza...'
  }
};

// --- Translation Helper ---
export function t(key) {
  return i18n[appState.prefs.lang]?.[key] || i18n.en[key] || key;
}

// --- Storage Keys ---
const LOCAL_STORAGE_KEY = 'tomato_os_tasks';
const LANG_STORAGE_KEY = 'tomato_lang';
const API_KEY_STORAGE_KEY = 'tomato_gemini_key';

// --- Default Tasks ---
const DEFAULT_TASKS = [
  { id: '1', title: 'Deep Work', focusMinutes: 25, breakMinutes: 5, themeColor1: '#ff007f', themeColor2: '#7000ff', glassColor: '#ff2a2a' },
  { id: '2', title: 'Brainstorm', focusMinutes: 45, breakMinutes: 10, themeColor1: '#00f0ff', themeColor2: '#00ff66', glassColor: '#2a88ff' },
  { id: '3', title: 'Quick Task', focusMinutes: 15, breakMinutes: 3, themeColor1: '#ffaa00', themeColor2: '#ff0055', glassColor: '#ff9900' }
];

// --- Global App State ---
export const appState = {
  tasks: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || DEFAULT_TASKS,
  session: {
    activeTaskId: null,
    mode: 'idle',       // idle | focus | break
    remainingSeconds: 0,
    isRunning: false,
    endTime: 0
  },
  prefs: {
    lang: localStorage.getItem(LANG_STORAGE_KEY) || 'ko',
    geminiApiKey: localStorage.getItem(API_KEY_STORAGE_KEY) || ''
  }
};

// --- Persistence ---
export function saveTasks() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState.tasks));
}

export function saveLang() {
  localStorage.setItem(LANG_STORAGE_KEY, appState.prefs.lang);
}

export function saveApiKey() {
  localStorage.setItem(API_KEY_STORAGE_KEY, appState.prefs.geminiApiKey);
}

// --- Active Task Helper ---
export function getActiveTask() {
  return appState.tasks.find(tk => tk.id === appState.session.activeTaskId) || appState.tasks[0];
}
