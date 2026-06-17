// Tomato — 3D pixel-constructed background stage
// Low-frequency pixel polygons drifting in a lattice field. Reacts to screen.

(function() {
  const canvas = document.getElementById('stage-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Pixel-constructed polygons (3D-ish rotation, low frequency)
  const polys = [];
  const rand = (a,b) => a + Math.random()*(b-a);
  for (let i = 0; i < 5; i++) {
    polys.push({
      cx: rand(0.15, 0.85),
      cy: rand(0.2, 0.85),
      r: rand(80, 220),
      sides: Math.floor(rand(4, 7)),
      rot: rand(0, Math.PI*2),
      speed: rand(0.0006, 0.0018) * (Math.random() < 0.5 ? -1 : 1),
      tilt: rand(0.3, 0.85), // foreshortening
      stroke: Math.random() < 0.25 ? 'red' : 'white',
    });
  }

  // Lattice dots
  const dots = [];
  for (let i = 0; i < 80; i++) {
    dots.push({
      x: Math.random(), y: Math.random(),
      r: rand(0.6, 1.4),
      ph: Math.random()*Math.PI*2,
      sp: rand(0.4, 1.2),
    });
  }

  // Horizon particle drift
  const particles = [];
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: Math.random(), y: Math.random(),
      vx: rand(-0.00008, 0.00008),
      vy: rand(-0.00005, 0.00005),
      size: Math.random() < 0.15 ? 2 : 1,
    });
  }

  let state = { intensity: 0.5, accent: 'running' }; // running | idle | focus | planner | archive
  window.__stageSetState = (s) => { state = Object.assign(state, s); };

  let t0 = performance.now();
  function drawPoly(p, t) {
    const cx = p.cx * w;
    const cy = p.cy * h;
    const rot = p.rot + p.speed * t;
    ctx.save();
    ctx.translate(cx, cy);
    // tilt for "3D" feel
    ctx.scale(1, p.tilt);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i <= p.sides; i++) {
      const a = (i / p.sides) * Math.PI * 2;
      const x = Math.cos(a) * p.r;
      const y = Math.sin(a) * p.r;
      // Pixel-quantize for constructed feel
      const q = 4;
      const px = Math.round(x / q) * q;
      const py = Math.round(y / q) * q;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 1;
    const strokeAlpha = (p.stroke === 'red')
      ? (state.accent === 'running' || state.accent === 'focus' ? 0.22 : 0.08)
      : 0.15;
    ctx.strokeStyle = p.stroke === 'red'
      ? `rgba(251,54,64,${strokeAlpha})`
      : `rgba(244,241,234,${strokeAlpha})`;
    ctx.stroke();

    // Vertex markers
    for (let i = 0; i < p.sides; i++) {
      const a = (i / p.sides) * Math.PI * 2;
      const x = Math.round(Math.cos(a) * p.r / 4) * 4;
      const y = Math.round(Math.sin(a) * p.r / 4) * 4;
      ctx.fillStyle = p.stroke === 'red'
        ? `rgba(251,54,64,${strokeAlpha + 0.15})`
        : `rgba(244,241,234,${strokeAlpha + 0.25})`;
      ctx.fillRect(x - 2, y - 2, 3, 3);
    }
    ctx.restore();
  }

  function draw() {
    const t = performance.now() - t0;
    ctx.clearRect(0, 0, w, h);

    // subtle lattice grid
    ctx.save();
    ctx.strokeStyle = 'rgba(244,241,234,0.03)';
    ctx.lineWidth = 1;
    const g = 64;
    const offset = (t * 0.003) % g;
    for (let x = -offset; x < w; x += g) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = -offset; y < h; y += g) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();

    // dots field
    for (const d of dots) {
      const alpha = 0.25 + 0.35 * Math.sin(t * 0.0008 * d.sp + d.ph);
      ctx.fillStyle = `rgba(244,241,234,${alpha * 0.25})`;
      ctx.fillRect(d.x * w, d.y * h, d.r, d.r);
    }

    // polygons
    for (const p of polys) drawPoly(p, t);

    // particles
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      ctx.fillStyle = 'rgba(244,241,234,0.3)';
      ctx.fillRect(p.x * w, p.y * h, p.size, p.size);
    }

    // accent signal pulse when running
    if (state.accent === 'running' || state.accent === 'focus') {
      const pulse = (Math.sin(t * 0.002) * 0.5 + 0.5);
      const r = 100 + pulse * 40;
      const grad = ctx.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, r*4);
      grad.addColorStop(0, `rgba(251,54,64,${0.04 + pulse*0.03})`);
      grad.addColorStop(1, 'rgba(251,54,64,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    requestAnimationFrame(draw);
  }
  draw();
})();
