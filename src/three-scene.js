import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import gsap from 'gsap';

// Core
let scene, camera, renderer, composer, pixelPass;
let isReady = false;

// Layers
let horizonGrid;
let monolithPivot, monolithCore, monolithWire, monolithSignal;
let symbolParticles;

// State
let currentMode = 'idle';
const CFG = {
  gridSpeed: 0.001,
  monolithRotSpeed: 0.0005,
  particleDrift: 0.002
};

export function init3DScene() {
  const container = document.getElementById('canvas-container');
  if (!container) { console.warn('No canvas-container'); return; }

  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000F08);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1);
    container.appendChild(renderer.domElement);

    // Post-processing
    composer = new EffectComposer(renderer);
    pixelPass = new RenderPixelatedPass(6, scene, camera);
    pixelPass.normalEdgeStrength = 1.5;
    pixelPass.depthEdgeStrength = 0.5;
    composer.addPass(pixelPass);

    buildHorizonGrid();
    buildMonolith();
    buildParticles();

    // Very dim ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', onMouseMove);

    isReady = true;
    animate();
  } catch (err) {
    console.error('3D Init failed:', err);
  }
}

// ==========================================
// LAYER 1: Structural Horizon Grid
// ==========================================
function buildHorizonGrid() {
  horizonGrid = new THREE.GridHelper(100, 40, 0x111111, 0x050505);
  horizonGrid.position.set(0, -3, -10);
  horizonGrid.rotation.x = -Math.PI / 2.5;
  scene.add(horizonGrid);
}

// ==========================================
// LAYER 2: Pixel Monolith (Icosahedron Wireframe)
// ==========================================
function buildMonolith() {
  monolithPivot = new THREE.Group();
  scene.add(monolithPivot);

  const geo = new THREE.IcosahedronGeometry(2.2, 1);

  // Dark solid core
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
  monolithCore = new THREE.Mesh(geo, coreMat);
  monolithPivot.add(monolithCore);

  // Wireframe cage
  const wireGeo = new THREE.WireframeGeometry(geo);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.6
  });
  monolithWire = new THREE.LineSegments(wireGeo, wireMat);
  monolithPivot.add(monolithWire);

  // Inner red signal (starts invisible)
  const sigGeo = new THREE.IcosahedronGeometry(2.0, 0);
  const sigMat = new THREE.MeshBasicMaterial({
    color: 0xFB3640,
    wireframe: true,
    transparent: true,
    opacity: 0
  });
  monolithSignal = new THREE.Mesh(sigGeo, sigMat);
  monolithPivot.add(monolithSignal);
}

// ==========================================
// LAYER 3: Symbolic '+' Particles
// ==========================================
function buildParticles() {
  // Draw a '+' symbol on a tiny canvas
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F4F1EA';
  ctx.fillRect(7, 3, 2, 10); // vertical
  ctx.fillRect(3, 7, 10, 2); // horizontal
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;

  const count = 150;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = Math.round((Math.random() - 0.5) * 30);
    positions[i * 3 + 1] = Math.round((Math.random() - 0.5) * 20);
    positions[i * 3 + 2] = Math.round((Math.random() - 0.5) * 15 - 5);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.2,
    map: tex,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  symbolParticles = new THREE.Points(geo, mat);
  scene.add(symbolParticles);
}

// ==========================================
// ANIMATION LOOP
// ==========================================
function animate() {
  requestAnimationFrame(animate);

  if (horizonGrid) {
    horizonGrid.position.z += CFG.gridSpeed;
    if (horizonGrid.position.z >= 0) horizonGrid.position.z = -10;
  }

  if (monolithPivot) {
    monolithPivot.rotation.y += CFG.monolithRotSpeed;
    monolithPivot.rotation.z += CFG.monolithRotSpeed * 0.5;
  }

  if (symbolParticles) {
    const pos = symbolParticles.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] -= CFG.particleDrift;
      if (pos[i] < -10) pos[i] = 10;
    }
    symbolParticles.geometry.attributes.position.needsUpdate = true;
  }

  composer.render();
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
  if (currentMode === 'focus') return;
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = -(e.clientY / window.innerHeight) * 2 + 1;
  gsap.to(camera.position, { x: x * 0.5, y: y * 0.5, duration: 2, ease: 'power2.out' });
}

// ==========================================
// MODE SWITCHING (safe & GSAP-compatible)
// ==========================================
export function triggerRitualManeuver() {
  if (!isReady) return;
  gsap.fromTo(pixelPass, { pixelSize: 32 }, { pixelSize: 6, duration: 0.8, ease: 'steps(4)' });
  // Flash wireframe white then back
  gsap.to(monolithWire.material, { opacity: 1, duration: 0.15, yoyo: true, repeat: 5 });
}

export function set3DMode(mode) {
  if (!isReady) return; // Protect against calls before init
  currentMode = mode;

  if (mode === 'focus') {
    CFG.gridSpeed = 0.005;
    CFG.monolithRotSpeed = 0.001;
    gsap.to(monolithPivot.position, { y: 0, z: 0, duration: 2, ease: 'power2.out' });
    gsap.to(monolithPivot.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 2 });
    // Change wireframe color via the Color object directly
    gsap.to(monolithWire.material.color, { r: 0.984, g: 0.212, b: 0.251, duration: 1.5 });
    gsap.to(monolithWire.material, { opacity: 0.8, duration: 1.5 });
    gsap.to(monolithSignal.material, { opacity: 0.3, duration: 2 });
  }
  else if (mode === 'break') {
    // BREAK: Monolith freezes, wireframe goes green, everything dims
    CFG.gridSpeed = 0.0003;
    CFG.monolithRotSpeed = 0; // Frozen
    gsap.to(monolithPivot.position, { y: 0, z: -2, duration: 2, ease: 'power2.out' });
    gsap.to(monolithPivot.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 2 });
    gsap.to(monolithWire.material.color, { r: 0.18, g: 0.8, b: 0.44, duration: 2 }); // #2ECC71
    gsap.to(monolithWire.material, { opacity: 0.4, duration: 2 });
    gsap.to(monolithSignal.material, { opacity: 0, duration: 1 });
  }
  else if (mode === 'calendar') {
    CFG.gridSpeed = 0.001;
    CFG.monolithRotSpeed = 0.0002;
    gsap.to(monolithPivot.position, { y: -2, z: -5, duration: 1.5, ease: 'power3.out' });
    gsap.to(monolithPivot.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 1.5 });
    gsap.to(monolithWire.material.color, { r: 0.165, g: 0.165, b: 0.165, duration: 1.5 });
    gsap.to(monolithWire.material, { opacity: 0.3, duration: 1.5 });
    gsap.to(monolithSignal.material, { opacity: 0, duration: 0.5 });
  }
  else if (mode === 'archive') {
    CFG.gridSpeed = 0.0002;
    CFG.monolithRotSpeed = 0.0001;
    gsap.to(monolithPivot.position, { y: 5, z: -10, duration: 2, ease: 'power2.inOut' });
    gsap.to(monolithPivot.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 2 });
    gsap.to(monolithWire.material, { opacity: 0.1, duration: 1 });
    gsap.to(monolithSignal.material, { opacity: 0, duration: 0.5 });
  }
  else {
    // HOME
    CFG.gridSpeed = 0.001;
    CFG.monolithRotSpeed = 0.0005;
    gsap.to(camera.position, { x: 0, y: 0, z: 8, duration: 1.5 });
    gsap.to(monolithPivot.position, { y: 0, z: 0, duration: 1.5, ease: 'power2.out' });
    gsap.to(monolithPivot.scale, { x: 1, y: 1, z: 1, duration: 1.5 });
    gsap.to(monolithWire.material.color, { r: 0.2, g: 0.2, b: 0.2, duration: 1.5 });
    gsap.to(monolithWire.material, { opacity: 0.6, duration: 1.5 });
    gsap.to(monolithSignal.material, { opacity: 0, duration: 1 });
  }
}
