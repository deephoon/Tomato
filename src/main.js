// State Management & Timer Logic
const STATES = {
  EMPTY: 'EMPTY',
  TASKA: 'TASKA',
  TASKB: 'TASKB',
  BREAK: 'BREAK'
};

const COLORS = {
  [STATES.EMPTY]: { c1: '#404040', c2: '#808080' },
  [STATES.TASKA]: { c1: '#FF007F', c2: '#7000FF' },
  [STATES.TASKB]: { c1: '#00F0FF', c2: '#00FF66' },
  [STATES.BREAK]: { c1: '#E0E0E0', c2: '#FFFFFF' }
};

// Default Tasks Setup
let tasksConfig = JSON.parse(localStorage.getItem('pomodoro_tasks')) || {
  [STATES.TASKA]: { name: 'Focus A', minutes: 25 },
  [STATES.TASKB]: { name: 'Focus B', minutes: 45 },
  [STATES.BREAK]: { name: 'Break', minutes: 5 }
};

// App State
let currentState = STATES.EMPTY;
let isRunning = false;
let isPaused = false;
let endTime = 0;
let remainingTimeMs = 0;
let timerInterval = null;

// DOM Elements
const root = document.documentElement;
const statusLabel = document.getElementById('status-label');
const timeLeftDisplay = document.getElementById('time-left');

const btnTaskA = document.getElementById('task-a-btn');
const btnTaskB = document.getElementById('task-b-btn');
const btnBreak = document.getElementById('task-btn'); // Need to fix this ID reference
const btnTaskBtns = document.querySelectorAll('.task-btn');

const btnPlayPause = document.getElementById('play-pause-btn');
const btnStop = document.getElementById('stop-btn');
const iconPlay = document.getElementById('play-icon');
const iconPause = document.getElementById('pause-icon');

const btnSettings = document.getElementById('settings-btn');
const modalSettings = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('close-settings-btn');
const btnSaveSettings = document.getElementById('save-settings-btn');

// Initialization
function init() {
  updateUIFromConfig();
  switchState(STATES.EMPTY);
  updateTimeDisplay(0);
}

// Utility: Format MS to MM:SS
function formatTime(ms) {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// State Control
function switchState(newState) {
  currentState = newState;
  root.style.setProperty('--color-1', COLORS[newState].c1);
  root.style.setProperty('--color-2', COLORS[newState].c2);
  
  if (newState === STATES.EMPTY) {
    statusLabel.textContent = 'EMPTY';
    updateTimeDisplay(0);
  } else {
    statusLabel.textContent = tasksConfig[newState].name;
    remainingTimeMs = tasksConfig[newState].minutes * 60 * 1000;
    updateTimeDisplay(remainingTimeMs);
  }
  
  // Update Task Selector Buttons
  btnTaskBtns.forEach(btn => btn.classList.remove('active'));
  if (newState === STATES.TASKA) btnTaskA.classList.add('active');
  if (newState === STATES.TASKB) btnTaskB.classList.add('active');
  if (newState === STATES.BREAK) document.getElementById('break-btn').classList.add('active');
}

// Timer Logic
function startTimer() {
  if (currentState === STATES.EMPTY) return;
  
  isRunning = true;
  isPaused = false;
  endTime = Date.now() + remainingTimeMs;
  
  iconPlay.classList.add('hidden');
  iconPause.classList.remove('hidden');
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 100);
}

function pauseTimer() {
  isRunning = false;
  isPaused = true;
  clearInterval(timerInterval);
  timerInterval = null;
  // remainingTimeMs is already up to date from the last tick
  
  iconPause.classList.add('hidden');
  iconPlay.classList.remove('hidden');
}

function stopTimer() {
  isRunning = false;
  isPaused = false;
  clearInterval(timerInterval);
  timerInterval = null;
  
  switchState(STATES.EMPTY);
  iconPause.classList.add('hidden');
  iconPlay.classList.remove('hidden');
}

function tick() {
  remainingTimeMs = endTime - Date.now();
  if (remainingTimeMs <= 0) {
    remainingTimeMs = 0;
    updateTimeDisplay(0);
    stopTimer();
    // Optional: play sound here
  } else {
    updateTimeDisplay(remainingTimeMs);
  }
}

function updateTimeDisplay(ms) {
  timeLeftDisplay.textContent = formatTime(ms);
}

// Event Listeners
btnTaskA.addEventListener('click', () => {
  if (isRunning) stopTimer();
  switchState(STATES.TASKA);
});

btnTaskB.addEventListener('click', () => {
  if (isRunning) stopTimer();
  switchState(STATES.TASKB);
});

document.getElementById('break-btn').addEventListener('click', () => {
  if (isRunning) stopTimer();
  switchState(STATES.BREAK);
});

btnPlayPause.addEventListener('click', () => {
  if (currentState === STATES.EMPTY) return;
  
  if (isRunning && !isPaused) {
    pauseTimer();
  } else {
    startTimer();
  }
});

btnStop.addEventListener('click', () => {
  stopTimer();
});

// Settings Logic
function updateUIFromConfig() {
  btnTaskA.textContent = tasksConfig[STATES.TASKA].name;
  btnTaskB.textContent = tasksConfig[STATES.TASKB].name;
  document.getElementById('break-btn').textContent = tasksConfig[STATES.BREAK].name;
  
  document.getElementById('setting-task-a-name').value = tasksConfig[STATES.TASKA].name;
  document.getElementById('setting-task-a-time').value = tasksConfig[STATES.TASKA].minutes;
  document.getElementById('setting-task-b-name').value = tasksConfig[STATES.TASKB].name;
  document.getElementById('setting-task-b-time').value = tasksConfig[STATES.TASKB].minutes;
  document.getElementById('setting-break-name').value = tasksConfig[STATES.BREAK].name;
  document.getElementById('setting-break-time').value = tasksConfig[STATES.BREAK].minutes;
}

btnSettings.addEventListener('click', () => {
  modalSettings.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => {
  modalSettings.classList.add('hidden');
});

btnSaveSettings.addEventListener('click', () => {
  tasksConfig[STATES.TASKA].name = document.getElementById('setting-task-a-name').value || 'Task A';
  tasksConfig[STATES.TASKA].minutes = parseInt(document.getElementById('setting-task-a-time').value) || 25;
  
  tasksConfig[STATES.TASKB].name = document.getElementById('setting-task-b-name').value || 'Task B';
  tasksConfig[STATES.TASKB].minutes = parseInt(document.getElementById('setting-task-b-time').value) || 45;
  
  tasksConfig[STATES.BREAK].name = document.getElementById('setting-break-name').value || 'Break';
  tasksConfig[STATES.BREAK].minutes = parseInt(document.getElementById('setting-break-time').value) || 5;
  
  localStorage.setItem('pomodoro_tasks', JSON.stringify(tasksConfig));
  updateUIFromConfig();
  
  // If timer is stopped, refresh current state display
  if (!isRunning && !isPaused) {
    if (currentState !== STATES.EMPTY) {
      switchState(currentState);
    }
  }
  
  modalSettings.classList.add('hidden');
});

// Run
init();
