// ==========================================
// THREE.JS — 3D ORGANIC GLASS TOMATO ENGINE
// ==========================================
import * as THREE from 'three';
import gsap from 'gsap';
import { appState, getActiveTask } from './state.js';

// --- Renderer Setup ---
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

for (let i = 0; i < positionAttr.count; i++) {
  let x = positionAttr.getX(i);
  let y = positionAttr.getY(i);
  let z = positionAttr.getZ(i);

  const len = Math.sqrt(x * x + y * y + z * z);
  const nx = x / len, ny = y / len, nz = z / len;

  // 1. Squash Y for tomato proportion
  y *= 0.75;

  // 2. Natural lobes around the equator (ribs)
  const angle = Math.atan2(nz, nx);
  const ribStrength = 0.06;
  const ribCount = 5.5;
  const ribFactor = 1 + Math.cos(angle * ribCount) * ribStrength * (1 - Math.abs(ny));
  x *= ribFactor;
  z *= ribFactor;

  // 3. Indent at top (stem) and dimple at bottom
  const topIndent = Math.exp(-((ny - 1.0) * (ny - 1.0)) / 0.1) * 0.2;
  const bottomIndent = Math.exp(-((ny + 1.0) * (ny + 1.0)) / 0.15) * 0.1;
  y -= topIndent * 1.2;
  y += bottomIndent * 0.5;

  const radialScale = 1 - (topIndent * 0.4) - (bottomIndent * 0.2);
  const slimFactor = 0.86;
  x *= radialScale * slimFactor;
  z *= radialScale * slimFactor;

  positionAttr.setXYZ(i, x, y, z);
}

positionAttr.needsUpdate = true;
baseGeometry.computeVertexNormals();

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

// --- Stem ---
const stemGroup = new THREE.Group();

const stalkGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.25, 8);
stalkGeo.translate(0, 0.125, 0);
const stalkMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#3a5a28'),
  roughness: 0.8,
  metalness: 0.05
});
const stalk = new THREE.Mesh(stalkGeo, stalkMat);
stalk.rotation.x = 0.15;
stalk.rotation.z = -0.1;
stemGroup.add(stalk);

// Leaves
const leafGeo = new THREE.ConeGeometry(0.035, 0.4, 4);
leafGeo.translate(0, 0.2, 0);
const leafMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#2d6b1e'),
  roughness: 0.7,
  metalness: 0.02,
  side: THREE.DoubleSide
});

for (let i = 0; i < 6; i++) {
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  const angle = (i / 6) * Math.PI * 2 + (Math.random() * 0.2);
  leaf.position.set(Math.cos(angle) * 0.02, 0.0, Math.sin(angle) * 0.02);
  leaf.rotation.y = -angle + Math.PI / 2;
  leaf.rotation.z = -Math.PI / 2 - 0.25;
  leaf.rotation.x = (Math.random() - 0.5) * 0.3;
  stemGroup.add(leaf);
}

stemGroup.position.set(0, 0.68, 0);
scene.add(stemGroup);

// --- Aurora Lights ---
const light1 = new THREE.PointLight(0xff007f, 1.5, 6);
const light2 = new THREE.PointLight(0x7000ff, 1.5, 6);
light1.position.set(0.3, 0.1, 0.3);
light2.position.set(-0.3, -0.1, -0.3);
scene.add(light1, light2);

// Glow spheres
const glowGeom = new THREE.SphereGeometry(0.1, 16, 16);
const glowMat1 = new THREE.MeshBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.9, toneMapped: false });
const glowMat2 = new THREE.MeshBasicMaterial({ color: 0x7000ff, transparent: true, opacity: 0.9, toneMapped: false });
const glowSphere1 = new THREE.Mesh(glowGeom, glowMat1);
const glowSphere2 = new THREE.Mesh(glowGeom, glowMat2);
scene.add(glowSphere1, glowSphere2);

// Scene Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const rimLight = new THREE.DirectionalLight(0xffffff, 2.5);
rimLight.position.set(2, 5, -5);
scene.add(rimLight);
const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
frontLight.position.set(0, 2, 5);
scene.add(frontLight);

// --- Particle System ---
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

// --- Mode Parameters ---
let currentScale = 1.0;
const modeParams = {
  idle:  { morphSpeed: 0.3, lightIntensity: 1.2, morphAmp: 0.04 },
  focus: { morphSpeed: 0.6, lightIntensity: 2.0, morphAmp: 0.06 },
  break: { morphSpeed: 0.15, lightIntensity: 0.5, morphAmp: 0.03 }
};
let currentModeParams = { ...modeParams.idle };

// --- Public API: Color Sync ---
export function updateTomatoColors(hexC1, hexC2, hexGlass) {
  const targetC1 = new THREE.Color(hexC1);
  const targetC2 = new THREE.Color(hexC2);
  const targetGlass = new THREE.Color(hexGlass || '#ff3b30');

  gsap.to(light1.color, { r: targetC1.r, g: targetC1.g, b: targetC1.b, duration: 1.2, ease: "power2.out" });
  gsap.to(glowMat1.color, { r: targetC1.r, g: targetC1.g, b: targetC1.b, duration: 1.2, ease: "power2.out" });
  gsap.to(light2.color, { r: targetC2.r, g: targetC2.g, b: targetC2.b, duration: 1.2, ease: "power2.out" });
  gsap.to(glowMat2.color, { r: targetC2.r, g: targetC2.g, b: targetC2.b, duration: 1.2, ease: "power2.out" });
  gsap.to(tomatoMaterial.color, { r: targetGlass.r, g: targetGlass.g, b: targetGlass.b, duration: 1.2, ease: "power2.out" });
}

// --- Public API: Mode Transition ---
export function setModeParams(mode) {
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

// --- Pointer Interaction ---
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

// --- Resize ---
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
let animationFrameId = null;

export function startRenderLoop() {
  function renderLoop() {
    animationFrameId = requestAnimationFrame(renderLoop);

    const elapsed = clock.getElapsedTime();
    const speed = currentModeParams.morphSpeed;
    const amp = currentModeParams.morphAmp;

    // Vertex morphing
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

    // Aurora orbit
    const orbitR = 0.35;
    light1.position.set(Math.sin(elapsed * 0.5) * orbitR, Math.cos(elapsed * 0.3) * orbitR * 0.3, Math.cos(elapsed * 0.5) * orbitR);
    light2.position.set(Math.cos(elapsed * 0.4) * orbitR, Math.sin(elapsed * 0.6) * orbitR * 0.3, Math.sin(elapsed * 0.4) * orbitR);
    glowSphere1.position.copy(light1.position);
    glowSphere2.position.copy(light2.position);

    // Pointer-based rotation
    smoothPX += (pointerNX - smoothPX) * 0.05;
    smoothPY += (pointerNY - smoothPY) * 0.05;
    tomatoMesh.rotation.y = smoothPX * 0.3;
    tomatoMesh.rotation.x = -smoothPY * 0.15;
    stemGroup.rotation.y = smoothPX * 0.3;
    stemGroup.rotation.x = -smoothPY * 0.15;

    // Hourglass shrinking effect
    const task = getActiveTask();
    let totalSecs = task ? task.focusMinutes * 60 : 1;
    if (appState.session.mode === 'break' && task) {
      totalSecs = task.breakMinutes * 60;
    }

    let targetScale = 1.0;
    if (appState.session.mode !== 'idle' && appState.session.remainingSeconds > 0) {
      targetScale = Math.max(0.01, appState.session.remainingSeconds / totalSecs);
    }

    currentScale += (targetScale - currentScale) * 0.05;
    tomatoMesh.scale.setScalar(currentScale);
    stemGroup.scale.setScalar(currentScale);
    stemGroup.position.set(0, 0.68 * currentScale, 0);

    const objScale = Math.max(0.4, currentScale);
    glowSphere1.scale.setScalar(objScale);
    glowSphere2.scale.setScalar(objScale);

    // Particle scatter
    const pPositions = particleGeometry.attributes.position.array;
    const scatterActive = (currentScale < 0.99 && appState.session.isRunning);
    const spawnChance = scatterActive ? ((1.0 - currentScale) * 0.5 + 0.05) : 0;

    for (let i = 0; i < particleCount; i++) {
      const pt = i * 3;
      if (particleLife[i] <= 0) {
        if (Math.random() < spawnChance) {
          const phi = Math.random() * Math.PI * 2;
          const theta = Math.random() * Math.PI * 0.6;
          const r = 0.8 * currentScale;
          pPositions[pt] = r * Math.sin(theta) * Math.cos(phi);
          pPositions[pt + 1] = r * Math.cos(theta);
          pPositions[pt + 2] = r * Math.sin(theta) * Math.sin(phi);
          particleLife[i] = 1.0 + Math.random() * 0.5;
        }
      } else {
        pPositions[pt] += Math.sin(elapsed * 2 + i) * 0.003;
        pPositions[pt + 1] += 0.005 + (Math.random() * 0.005);
        pPositions[pt + 2] += Math.cos(elapsed * 2 + i) * 0.003;
        particleLife[i] -= 0.015;
        if (particleLife[i] <= 0) pPositions[pt + 1] = -999;
      }
    }
    particleGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  renderLoop();
}

// --- Public API: Pause/Resume rendering (for modal optimization) ---
export function pauseRendering() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

export function resumeRendering() {
  if (!animationFrameId) {
    startRenderLoop();
  }
}
