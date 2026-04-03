import * as THREE from 'three';
import gsap from 'gsap';

// ==========================================
// 1. i18n DICTIONARY
// ==========================================
const i18n = {
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
    editTask: '작업 설정'
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
    finishEarly: 'Finish Early',
    glassColor: 'Glass Body Color',
    resetTimer: 'Reset Timer',
    editTask: 'Edit Task'
  }
};

function t(key) {
  return i18n[appState.prefs.lang]?.[key] || i18n.en[key] || key;
}

// ==========================================
// 2. STATE MANAGEMENT
// ==========================================
const DEFAULT_TASKS = [
  { id: '1', title: 'Deep Work', focusMinutes: 25, breakMinutes: 5, themeColor1: '#ff007f', themeColor2: '#7000ff', glassColor: '#ff2a2a' },
  { id: '2', title: 'Brainstorm', focusMinutes: 45, breakMinutes: 10, themeColor1: '#00f0ff', themeColor2: '#00ff66', glassColor: '#2a88ff' },
  { id: '3', title: 'Quick Task', focusMinutes: 15, breakMinutes: 3, themeColor1: '#ffaa00', themeColor2: '#ff0055', glassColor: '#ff9900' }
];

const LOCAL_STORAGE_KEY = 'tomato_os_tasks';
const LANG_STORAGE_KEY = 'tomato_lang';

const appState = {
  tasks: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || DEFAULT_TASKS,
  session: {
    activeTaskId: null,
    mode: 'idle',       // idle | focus | break
    remainingSeconds: 0,
    isRunning: false,
    endTime: 0
  },
  prefs: {
    lang: localStorage.getItem(LANG_STORAGE_KEY) || 'ko'
  }
};

let timerInterval = null;
let editingTaskId = null;

function saveTasks() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState.tasks));
}

function saveLang() {
  localStorage.setItem(LANG_STORAGE_KEY, appState.prefs.lang);
}

// ==========================================
// 3. DOM ELEMENTS
// ==========================================
const elTaskTitle = document.getElementById('current-task-title');
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

// Interruption Modal (pause during focus)
const modalInterruption = document.getElementById('interruption-modal');
const modalInterruptionContent = modalInterruption.querySelector('.modal-content');
const btnResume = document.getElementById('btn-resume');
const btnStartBreakNow = document.getElementById('btn-start-break-now');
const btnFinishEarly = document.getElementById('btn-finish-early');
const btnResetTimer = document.getElementById('btn-reset-timer');
const btnEditTask = document.getElementById('btn-edit-task');

// ==========================================
// 4. THREE.JS — 3D ORGANIC GLASS TOMATO
// ==========================================
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.15, 4.5);

// Environment for reflections
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envRT = pmremGenerator.fromScene(new THREE.Scene(), 0.04);
scene.environment = envRT.texture;

// --- Build Organic Tomato Geometry ---
const baseGeometry = new THREE.IcosahedronGeometry(1.2, 64);
const positionAttr = baseGeometry.getAttribute('position');

// Shape the sphere into a tomato: squash Y, add ribs, indent poles
for (let i = 0; i < positionAttr.count; i++) {
  let x = positionAttr.getX(i);
  let y = positionAttr.getY(i);
  let z = positionAttr.getZ(i);

  const len = Math.sqrt(x * x + y * y + z * z);
  const nx = x / len, ny = y / len, nz = z / len;

  // 1. Squash Y for tomato proportion, flat bottom and top
  y *= 0.75;

  // 2. Add 5-6 natural lobes around the equator (ribs)
  const angle = Math.atan2(nz, nx);
  const ribStrength = 0.06;
  const ribCount = 5.5; // Slightly irregular ribs
  const ribFactor = 1 + Math.cos(angle * ribCount) * ribStrength * (1 - Math.abs(ny));

  x *= ribFactor;
  z *= ribFactor;

  // 3. Deep indent at the top (stem) and dimple at the bottom
  const topIndent = Math.exp(-((ny - 1.0) * (ny - 1.0)) / 0.1) * 0.2;
  const bottomIndent = Math.exp(-((ny + 1.0) * (ny + 1.0)) / 0.15) * 0.1;

  y -= topIndent * 1.2; 
  y += bottomIndent * 0.5;

  // Pull in the sides near the indents, and squeeze horizontally (less fat)
  const radialScale = 1 - (topIndent * 0.4) - (bottomIndent * 0.2);
  const slimFactor = 0.86; // Reduces chunkiness on sides

  x *= radialScale * slimFactor;
  z *= radialScale * slimFactor;

  positionAttr.setXYZ(i, x, y, z);
}

positionAttr.needsUpdate = true;
baseGeometry.computeVertexNormals();

// Save the shaped positions as the "rest" state for morphing
const originalPositions = new Float32Array(positionAttr.array);

// --- Glass Material ---
const tomatoMaterial = new THREE.MeshPhysicalMaterial({
  transmission: 1,
  roughness: 0.12,
  ior: 1.5,
  thickness: 2.5,
  envMapIntensity: 1.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.08,
  transparent: true,
  opacity: 0.95,
  color: new THREE.Color(0xffffff),
  side: THREE.DoubleSide
});

const tomatoMesh = new THREE.Mesh(baseGeometry, tomatoMaterial);
scene.add(tomatoMesh);

// --- Stem (꼭지) ---
const stemGroup = new THREE.Group();

// Stalk (short angled cylinder)
const stalkGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.25, 8);
stalkGeo.translate(0, 0.125, 0); // pivot at bottom
const stalkMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#3a5a28'),
  roughness: 0.8,
  metalness: 0.05
});
const stalk = new THREE.Mesh(stalkGeo, stalkMat);
stalk.rotation.x = 0.15;
stalk.rotation.z = -0.1;
stemGroup.add(stalk);

// Leaves (5-6 thin sepals curving down)
const leafGeo = new THREE.ConeGeometry(0.035, 0.4, 4);
leafGeo.translate(0, 0.2, 0); // Set pivot at the base
const leafMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#2d6b1e'),
  roughness: 0.7,
  metalness: 0.02,
  side: THREE.DoubleSide
});

for (let i = 0; i < 6; i++) {
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  const angle = (i / 6) * Math.PI * 2 + (Math.random() * 0.2); // slight random orbit
  
  leaf.position.set(Math.cos(angle) * 0.02, 0.0, Math.sin(angle) * 0.02);
  
  // Point outwards and curve downwards over the tomato surface
  leaf.rotation.y = -angle + Math.PI / 2;
  leaf.rotation.z = -Math.PI / 2 - 0.25; 
  
  // Random organic twist
  leaf.rotation.x = (Math.random() - 0.5) * 0.3;
  
  stemGroup.add(leaf);
}

// Position stem deep in the top indent of the tomato
stemGroup.position.set(0, 0.68, 0);
scene.add(stemGroup);

// --- Aurora Lights (inside the tomato) ---
const light1 = new THREE.PointLight(0xff007f, 1.5, 6);
const light2 = new THREE.PointLight(0x7000ff, 1.5, 6);
light1.position.set(0.3, 0.1, 0.3);
light2.position.set(-0.3, -0.1, -0.3);
scene.add(light1, light2);

// Glow spheres visible through glass
const glowGeom = new THREE.SphereGeometry(0.1, 16, 16);
const glowMat1 = new THREE.MeshBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.9, toneMapped: false });
const glowMat2 = new THREE.MeshBasicMaterial({ color: 0x7000ff, transparent: true, opacity: 0.9, toneMapped: false });
const glowSphere1 = new THREE.Mesh(glowGeom, glowMat1);
const glowSphere2 = new THREE.Mesh(glowGeom, glowMat2);
scene.add(glowSphere1, glowSphere2);

// Ambient and Rim Lighting to make glass visible on black background
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 2.5);
rimLight.position.set(2, 5, -5);
scene.add(rimLight);

const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
frontLight.position.set(0, 2, 5);
scene.add(frontLight);

// --- Particle Scatter System ---
const particleCount = 200;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleLife = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = 0;
  particlePositions[i * 3 + 1] = -999;
  particlePositions[i * 3 + 2] = 0;
  particleLife[i] = 0;
}
particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.08,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleSystem);
// -------------------------------

let currentScale = 1.0; // For hourglass shrinking effect

// --- Mode parameters ---
const modeParams = {
  idle:  { morphSpeed: 0.3, lightIntensity: 1.2, morphAmp: 0.04 },
  focus: { morphSpeed: 0.6, lightIntensity: 2.0, morphAmp: 0.06 },
  break: { morphSpeed: 0.15, lightIntensity: 0.5, morphAmp: 0.03 }
};
// Use a mutable copy for GSAP to tween
let currentModeParams = { ...modeParams.idle };

// --- Color Sync (FIXED: Tween THREE.Color directly) ---
function updateTomatoColors(hexC1, hexC2, hexGlass) {
  const targetC1 = new THREE.Color(hexC1);
  const targetC2 = new THREE.Color(hexC2);
  const targetGlass = new THREE.Color(hexGlass || '#ff3b30');

  // Directly tween the 'r', 'g', 'b' properties of the THREE.Color objects
  gsap.to(light1.color, { r: targetC1.r, g: targetC1.g, b: targetC1.b, duration: 1.2, ease: "power2.out" });
  gsap.to(glowMat1.color, { r: targetC1.r, g: targetC1.g, b: targetC1.b, duration: 1.2, ease: "power2.out" });
  
  gsap.to(light2.color, { r: targetC2.r, g: targetC2.g, b: targetC2.b, duration: 1.2, ease: "power2.out" });
  gsap.to(glowMat2.color, { r: targetC2.r, g: targetC2.g, b: targetC2.b, duration: 1.2, ease: "power2.out" });

  gsap.to(tomatoMaterial.color, { r: targetGlass.r, g: targetGlass.g, b: targetGlass.b, duration: 1.2, ease: "power2.out" });
}

function setModeParams(mode) {
  const target = modeParams[mode] || modeParams.idle;
  gsap.to(currentModeParams, {
    morphSpeed: target.morphSpeed,
    lightIntensity: target.lightIntensity,
    morphAmp: target.morphAmp,
    duration: 2,
    ease: "power2.out",
    onUpdate: () => {
      light1.intensity = currentModeParams.lightIntensity;
      light2.intensity = currentModeParams.lightIntensity;
    }
  });
}

// --- Pointer interaction ---
let pointerNX = 0, pointerNY = 0;
let smoothPX = 0, smoothPY = 0;

window.addEventListener('mousemove', (e) => {
  pointerNX = (e.clientX / window.innerWidth - 0.5) * 2;
  pointerNY = -(e.clientY / window.innerHeight - 0.5) * 2;
});
window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    pointerNX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
    pointerNY = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  }
}, { passive: true });
window.addEventListener('mouseout', () => { pointerNX = 0; pointerNY = 0; });
window.addEventListener('touchend', () => { pointerNX = 0; pointerNY = 0; });

// Resize (debounced)
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 200);
});

// --- Render Loop ---
const clock = new THREE.Clock();

function renderLoop() {
  requestAnimationFrame(renderLoop);

  const elapsed = clock.getElapsedTime();
  const speed = currentModeParams.morphSpeed;
  const amp = currentModeParams.morphAmp;

  // Vertex morphing (breathing pseudo-perlin noise)
  const positions = positionAttr.array;
  for (let i = 0; i < positions.length; i += 3) {
    const ox = originalPositions[i];
    const oy = originalPositions[i + 1];
    const oz = originalPositions[i + 2];

    const noise1 = Math.sin(ox * 2.5 + elapsed * speed) * Math.cos(oz * 2.5 + elapsed * speed);
    const noise2 = Math.sin(oy * 4.0 - elapsed * (speed * 1.5)) * Math.cos(ox * 4.0 - elapsed * (speed * 1.5));
    const pulseLayer = Math.sin(elapsed * speed * 2 + oy * 5) * 0.5;

    const totalNoise = (noise1 * 0.6 + noise2 * 0.3 + pulseLayer * 0.1) * amp;
    const factor = 1 + totalNoise;

    positions[i] = ox * factor;
    positions[i + 1] = oy * factor;
    positions[i + 2] = oz * factor;
  }
  positionAttr.needsUpdate = true;
  baseGeometry.computeVertexNormals();

  // Aurora orbit (lights circle inside)
  const orbitR = 0.35;
  light1.position.set(
    Math.sin(elapsed * 0.5) * orbitR,
    Math.cos(elapsed * 0.3) * orbitR * 0.3,
    Math.cos(elapsed * 0.5) * orbitR
  );
  light2.position.set(
    Math.cos(elapsed * 0.4) * orbitR,
    Math.sin(elapsed * 0.6) * orbitR * 0.3,
    Math.sin(elapsed * 0.4) * orbitR
  );
  glowSphere1.position.copy(light1.position);
  glowSphere2.position.copy(light2.position);

  // Pointer-based rotation
  smoothPX += (pointerNX - smoothPX) * 0.05;
  smoothPY += (pointerNY - smoothPY) * 0.05;
  tomatoMesh.rotation.y = smoothPX * 0.3;
  tomatoMesh.rotation.x = -smoothPY * 0.15;
  stemGroup.rotation.y = smoothPX * 0.3;
  stemGroup.rotation.x = -smoothPY * 0.15;

  // Hourglass effect: Calculate target scale based on remaining time
  const task = getActiveTask();
  let totalSecs = task ? task.focusMinutes * 60 : 1;
  if (appState.session.mode === 'break' && task) {
    totalSecs = task.breakMinutes * 60;
  }
  
  let targetScale = 1.0;
  if (appState.session.mode !== 'idle' && appState.session.remainingSeconds > 0) {
    targetScale = Math.max(0.01, appState.session.remainingSeconds / totalSecs);
  }

  // Smoothly lerp towards target scale
  currentScale += (targetScale - currentScale) * 0.05;
  
  // Apply scale to tomato and stem
  tomatoMesh.scale.setScalar(currentScale);
  stemGroup.scale.setScalar(currentScale);
  stemGroup.position.set(0, 0.68 * currentScale, 0); // Ride the top

  // Scale down the lights slightly as well so the glow matches
  const objScale = Math.max(0.4, currentScale);
  glowSphere1.scale.setScalar(objScale);
  glowSphere2.scale.setScalar(objScale);

  // --- Particle Scatter Animation ---
  const pPositions = particleGeometry.attributes.position.array;
  const scatterActive = (currentScale < 0.99 && appState.session.isRunning);
  const spawnChance = scatterActive ? ((1.0 - currentScale) * 0.5 + 0.05) : 0;

  for (let i = 0; i < particleCount; i++) {
    const pt = i * 3;
    if (particleLife[i] <= 0) {
      if (Math.random() < spawnChance) {
        // Spawn randomly around upper hemisphere of the current scaled tomato
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI * 0.6; // mostly top hemisphere
        const r = 0.8 * currentScale; 
        pPositions[pt] = r * Math.sin(theta) * Math.cos(phi);
        pPositions[pt+1] = r * Math.cos(theta);
        pPositions[pt+2] = r * Math.sin(theta) * Math.sin(phi);
        particleLife[i] = 1.0 + Math.random() * 0.5;
      }
    } else {
      // Float up and scatter outwards smoothly
      pPositions[pt] += Math.sin(elapsed * 2 + i) * 0.003;
      pPositions[pt+1] += 0.005 + (Math.random() * 0.005);
      pPositions[pt+2] += Math.cos(elapsed * 2 + i) * 0.003;
      
      particleLife[i] -= 0.015;
      if (particleLife[i] <= 0) pPositions[pt+1] = -999;
    }
  }
  particleGeometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

// ==========================================
// 5. CORE TIMER LOGIC (PRESERVED)
// ==========================================
function getActiveTask() {
  return appState.tasks.find(tk => tk.id === appState.session.activeTaskId) || appState.tasks[0];
}

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '00:00';
  const s2 = Math.ceil(totalSeconds);
  const m = Math.floor(s2 / 60).toString().padStart(2, '0');
  const s = (s2 % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateHUD() {
  const task = getActiveTask();
  if (!task) return;

  if (appState.session.mode === 'idle' || appState.session.mode === 'focus') {
    elTaskTitle.textContent = appState.session.mode === 'idle' ? `[ ${task.title} ]` : task.title;
    elTimeLeft.textContent = formatTime(appState.session.remainingSeconds);
    updateTomatoColors(task.themeColor1, task.themeColor2, task.glassColor);
    setModeParams(appState.session.mode);
  } else if (appState.session.mode === 'break') {
    elTaskTitle.textContent = t('restBreak');
    elTimeLeft.textContent = formatTime(appState.session.remainingSeconds);
    updateTomatoColors('#333355', '#221133', '#111122');
    setModeParams('break');
  }

  if (appState.session.mode === 'idle') {
    btnStop.style.display = 'none';
  } else {
    btnStop.style.display = 'flex';
  }

  if (appState.session.isRunning) {
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
  } else {
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
  }
}

function switchMode(newMode) {
  appState.session.mode = newMode;
  const task = getActiveTask();

  if (newMode === 'idle') {
    appState.session.remainingSeconds = task.focusMinutes * 60;
  } else if (newMode === 'focus') {
    if (appState.session.remainingSeconds <= 0) {
      appState.session.remainingSeconds = task.focusMinutes * 60;
    }
  } else if (newMode === 'break') {
    appState.session.remainingSeconds = task.breakMinutes * 60;
  }
  updateHUD();
}

function setTask(id) {
  stopTimer();
  appState.session.activeTaskId = id;
  switchMode('idle');
  renderSheetTasks();
}

function startTimer() {
  if (appState.tasks.length === 0) return;
  if (appState.session.mode === 'idle') switchMode('focus');

  appState.session.isRunning = true;
  appState.session.endTime = Date.now() + (appState.session.remainingSeconds * 1000);

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 100);
  updateHUD();
}

function pauseTimer() {
  // Precisely freeze remaining time using Date.now()
  if (appState.session.isRunning) {
    const remainingMs = appState.session.endTime - Date.now();
    appState.session.remainingSeconds = Math.max(0, remainingMs / 1000);
  }
  appState.session.isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  updateHUD();
}

function stopTimer() {
  appState.session.isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
}

function tick() {
  const remainingMs = appState.session.endTime - Date.now();
  if (remainingMs <= 0) {
    appState.session.remainingSeconds = 0;
    stopTimer();
    updateHUD();
    handleTimerEnd();
  } else {
    appState.session.remainingSeconds = remainingMs / 1000;
    elTimeLeft.textContent = formatTime(appState.session.remainingSeconds);
  }
}

function handleTimerEnd() {
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);

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
// 6. PLAY/PAUSE — INTERRUPTION UX
// ==========================================
btnPlayPause.onclick = () => {
  if (appState.session.isRunning) {
    // PAUSE: freeze timer and show interruption modal (even during break)
    pauseTimer();
    openInterruptionModal();
  } else {
    startTimer();
  }
};

btnStop.onclick = () => {
  stopTimer();
  switchMode('idle');
};

// ==========================================
// 7. GSAP MODAL & SHEET TRANSITIONS
// ==========================================
// --- Transition Modal (timer end) ---
function openTransitionModal() {
  modalTransition.style.display = 'flex';
  gsap.fromTo(modalTransition, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  gsap.fromTo(modalTransitionContent, { scale: 0.9, y: 30 }, { scale: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" });
}

function closeTransitionModal() {
  gsap.to(modalTransition, { opacity: 0, duration: 0.3 });
  gsap.to(modalTransitionContent, { scale: 0.95, y: 20, duration: 0.3, ease: "power2.in", onComplete: () => {
    modalTransition.style.display = 'none';
  }});
}

// --- Interruption Modal (pause) ---
function openInterruptionModal() {
  const isFocus = appState.session.mode === 'focus';
  document.querySelector('.transition-title').textContent = t('paused');

  if (isFocus) {
    btnStartBreakNow.textContent = t('startBreakNow');
    btnStartBreakNow.onclick = () => {
      closeInterruptionModal();
      switchMode('break');
      startTimer();
    };
  } else {
    btnStartBreakNow.textContent = t('startFocusNow');
    btnStartBreakNow.onclick = () => {
      closeInterruptionModal();
      switchMode('focus');
      startTimer();
    };
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

// Resume: recalculate endTime from frozen remainingSeconds, restart
btnResume.onclick = () => {
  closeInterruptionModal();
  startTimer();
};

// Reset Timer: set remaining back to full
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

// Edit Task: open config
btnEditTask.onclick = () => {
  closeInterruptionModal();
  openSheet();
  openEditForm(appState.session.activeTaskId);
};

// Finish Early: end session, go idle
btnFinishEarly.onclick = () => {
  closeInterruptionModal();
  switchMode('idle');
};

// --- Bottom Sheet ---
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

btnTasks.onclick = openSheet;
btnCloseSheet.onclick = closeSheet;
sheetBackdrop.onclick = closeSheet;

// ==========================================
// 8. GSAP TACTILE BUTTON SPRING ANIMATIONS
// ==========================================
function attachSpring(btn) {
  btn.addEventListener('pointerdown', () => {
    gsap.to(btn, { scale: 0.92, duration: 0.15, ease: "power2.in" });
  });
  btn.addEventListener('pointerup', () => {
    gsap.to(btn, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
  });
  btn.addEventListener('pointerleave', () => {
    gsap.to(btn, { scale: 1, duration: 0.4, ease: "power2.out" });
  });
}

document.querySelectorAll('.glass-btn').forEach(attachSpring);

// ==========================================
// 9. UI: SHEET & CRUD LOGIC
// ==========================================
function renderSheetTasks() {
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

    li.querySelector('.task-info').onclick = () => { setTask(task.id); closeSheet(); };
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

btnAddNewTask.onclick = openAddForm;
btnFormCancel.onclick = showListView;

// ==========================================
// 10. i18n LANGUAGE SYSTEM
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

  // Also update HUD dynamic text
  setTimeout(() => updateHUD(), 200);
}

btnLangToggle.onclick = () => {
  const newLang = appState.prefs.lang === 'ko' ? 'en' : 'ko';
  applyLanguage(newLang);
};

// ==========================================
// 11. BOOTSTRAP
// ==========================================
function init() {
  // Set initial language label
  langLabel.textContent = appState.prefs.lang === 'ko' ? 'EN' : '한';

  // Apply language to all i18n elements (no animation on init)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  if (appState.tasks.length > 0) {
    appState.session.activeTaskId = appState.tasks[0].id;
    appState.session.remainingSeconds = appState.tasks[0].focusMinutes * 60;
  }

  updateHUD();
  renderLoop();
}

init();
