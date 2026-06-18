// ==========================================
// FLOATING WIDGET — Document Picture-in-Picture
// A compact, media-art HUD that mirrors the focus/break timer in a window
// that floats above other apps. Driven entirely by the main page; this module
// owns the PiP window's DOM, styling and its 0.1s state sync.
// ==========================================
import { isPipSupported } from '../utils/runtime.js';
import { formatTime } from '../timer.js';

let pipWindow = null;
let pipT = (k) => k;        // translation fn, injected at open()
let pipHandlers = {};       // { onPrimary, onComplete, onClosed }

export function isWidgetOpen() {
  return !!pipWindow;
}

export function closeWidget() {
  if (pipWindow) pipWindow.close();
}

// snapshot: { mode, remaining, running, title, total }
export function updateWidget(snapshot) {
  if (!pipWindow) return;
  const doc = pipWindow.document;
  const { mode, remaining, running, title, total } = snapshot;
  const isBreak = mode === 'break';
  const isIdle = mode === 'idle' || remaining <= 0;

  const ring = doc.getElementById('pip-ring');
  const clock = doc.getElementById('pip-clock');
  const modeEl = doc.getElementById('pip-mode');
  const taskEl = doc.getElementById('pip-task');
  const primary = doc.getElementById('pip-primary');
  const complete = doc.getElementById('pip-complete');

  // Progress ring shows remaining portion, depleting as time runs out.
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  // Phase: final stretch when under 15% or 60s left.
  const ratio = total > 0 ? remaining / total : 1;
  const finalStretch = !isIdle && !isBreak && running && (ratio <= 0.15 || remaining <= 60);

  const accent = isBreak ? 'var(--break-green, #2ECC71)' : 'var(--hero-red, #FB3640)';
  if (ring) {
    ring.style.setProperty('--pip-pct', isIdle ? '0' : String(pct));
    ring.style.setProperty('--pip-accent', accent);
    ring.classList.toggle('break', isBreak);
    ring.classList.toggle('pulse', !!finalStretch);
    ring.classList.toggle('idle', isIdle);
  }
  if (clock) {
    clock.textContent = isIdle ? '--:--' : formatTime(remaining);
    clock.classList.toggle('break', isBreak);
  }
  if (modeEl) {
    modeEl.classList.toggle('break', isBreak);
    if (isBreak) modeEl.textContent = pipT('tabBreak') || 'BREAK';
    else if (isIdle) modeEl.textContent = pipT('heroStandby') || 'STANDBY';
    else modeEl.textContent = finalStretch ? (pipT('finalStretch') || 'FINAL STRETCH') : (pipT('tabFocus') || 'FOCUS');
  }
  if (taskEl) {
    taskEl.textContent = (!isBreak && title) ? `→ ${title}` : '';
  }
  if (primary) {
    if (isIdle) primary.textContent = pipT('btnStart') || 'START';
    else primary.textContent = running ? (pipT('btnPause') || 'PAUSE') : (pipT('btnResume') || 'RESUME');
  }
  if (complete) {
    complete.style.display = isIdle ? 'none' : '';
    complete.textContent = pipT('btnComplete') || 'DONE';
  }
}

// opts: { t, onPrimary, onComplete, onClosed, getSnapshot }
export async function openWidget(opts = {}) {
  if (!isPipSupported()) {
    const msg = (opts.t && opts.t('pipNotSupported'))
      || '이 브라우저는 위젯(PiP) 기능을 지원하지 않습니다. (최신 Chrome/Edge 사용 권장)';
    alert(msg);
    return;
  }
  if (pipWindow) {
    pipWindow.focus();
    return;
  }

  pipT = opts.t || pipT;
  pipHandlers = {
    onPrimary: opts.onPrimary || (() => {}),
    onComplete: opts.onComplete || (() => {}),
    onClosed: opts.onClosed || (() => {})
  };

  try {
    pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 280,
      height: 300
    });
  } catch (err) {
    console.error('Failed to open PiP window:', err);
    pipWindow = null;
    return;
  }

  const doc = pipWindow.document;

  // Pull in the main stylesheets so CRT classes + design tokens resolve.
  [...document.styleSheets].forEach((styleSheet) => {
    try {
      const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
      const style = document.createElement('style');
      style.textContent = cssRules;
      doc.head.appendChild(style);
    } catch (e) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = styleSheet.type;
      link.media = styleSheet.media;
      link.href = styleSheet.href;
      doc.head.appendChild(link);
    }
  });

  const style = doc.createElement('style');
  style.textContent = WIDGET_CSS;
  doc.head.appendChild(style);

  doc.body.innerHTML = WIDGET_HTML;

  doc.getElementById('pip-primary').onclick = () => pipHandlers.onPrimary();
  doc.getElementById('pip-complete').onclick = () => pipHandlers.onComplete();
  doc.getElementById('pip-close').onclick = () => closeWidget();

  pipWindow.addEventListener('pagehide', () => {
    pipWindow = null;
    pipHandlers.onClosed();
  });

  if (typeof opts.getSnapshot === 'function') {
    updateWidget(opts.getSnapshot());
  }
}

const WIDGET_HTML = `
  <div class="vignette"></div>
  <div class="scanlines"></div>
  <div class="grain"></div>
  <div class="pip-shell">
    <span class="corner tl"></span>
    <span class="corner tr"></span>
    <span class="corner bl"></span>
    <span class="corner br"></span>
    <div class="pip-mode" id="pip-mode">FOCUS</div>
    <div class="pip-ring" id="pip-ring">
      <div class="pip-clock" id="pip-clock">--:--</div>
    </div>
    <div class="pip-task" id="pip-task"></div>
    <div class="pip-controls">
      <button class="btn-pip" id="pip-primary">PAUSE</button>
      <button class="btn-pip btn-pip-accent" id="pip-complete">DONE</button>
      <button class="btn-pip btn-pip-close" id="pip-close" title="Close">✕</button>
    </div>
  </div>
`;

const WIDGET_CSS = `
  body {
    margin: 0; padding: 0;
    background: var(--bg-deep, #000F08);
    color: var(--text-primary, #F4F1EA);
    font-family: var(--font-pixel, "Silkscreen", "Galmuri11", monospace);
    height: 100vh; width: 100vw; box-sizing: border-box;
    user-select: none; overflow: hidden;
  }
  .pip-shell {
    position: relative;
    width: calc(100% - 18px);
    height: calc(100% - 18px);
    margin: 9px;
    background: radial-gradient(120% 120% at 50% 0%, rgba(251,54,64,0.06), transparent 60%), var(--bg-stage, #050505);
    border: 1px solid var(--hairline-2, rgba(255,255,255,0.14));
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 10px;
    z-index: 20;
  }
  .pip-shell .corner {
    position: absolute; width: 7px; height: 7px;
    border: 1px solid var(--hero-red, #FB3640); opacity: 0.7;
  }
  .pip-shell .corner.tl { top: 6px; left: 6px; border-right: 0; border-bottom: 0; }
  .pip-shell .corner.tr { top: 6px; right: 6px; border-left: 0; border-bottom: 0; }
  .pip-shell .corner.bl { bottom: 6px; left: 6px; border-right: 0; border-top: 0; }
  .pip-shell .corner.br { bottom: 6px; right: 6px; border-left: 0; border-top: 0; }

  .pip-mode {
    font-size: 11px;
    letter-spacing: 0.22em;
    color: var(--hero-red, #FB3640);
    text-transform: uppercase;
    text-align: center;
    min-height: 13px;
    padding: 0 10px;
    max-width: 100%;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }
  .pip-mode.break { color: var(--break-green, #2ECC71); }

  .pip-ring {
    --pip-pct: 0;
    --pip-accent: var(--hero-red, #FB3640);
    position: relative;
    width: 138px; height: 138px;
    border-radius: 50%;
    background: conic-gradient(var(--pip-accent) calc(var(--pip-pct) * 1%), rgba(255,255,255,0.07) 0);
    display: flex; align-items: center; justify-content: center;
    transition: background 0.3s linear;
    filter: drop-shadow(0 0 14px rgba(251,54,64,0.28));
  }
  .pip-ring.break { filter: drop-shadow(0 0 14px rgba(46,204,113,0.26)); }
  .pip-ring.idle { filter: none; }
  .pip-ring::before {
    content: ''; position: absolute; inset: 7px;
    border-radius: 50%;
    background: var(--bg-stage, #050505);
    border: 1px solid var(--hairline-1, rgba(255,255,255,0.08));
  }
  .pip-ring.pulse { animation: pip-pulse 1.1s ease-in-out infinite; }
  @keyframes pip-pulse {
    0%, 100% { filter: drop-shadow(0 0 12px rgba(251,54,64,0.30)); }
    50% { filter: drop-shadow(0 0 26px rgba(251,54,64,0.65)); }
  }
  .pip-clock {
    position: relative; z-index: 1;
    font-size: 42px; line-height: 1;
    color: var(--hero-red, #FB3640);
    text-shadow: 0 0 18px var(--hero-red-glow, rgba(251,54,64,0.35));
  }
  .pip-clock.break {
    color: var(--break-green, #2ECC71);
    text-shadow: 0 0 18px var(--break-green-glow, rgba(46,204,113,0.3));
  }

  .pip-task {
    font-size: 10px;
    letter-spacing: 0.04em;
    color: var(--text-muted, rgba(244,241,234,0.72));
    text-align: center;
    max-width: calc(100% - 24px);
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    min-height: 12px;
  }

  .pip-controls { display: flex; gap: 8px; margin-top: 2px; }
  .btn-pip {
    background: transparent;
    border: 1px solid var(--hairline-3, rgba(255,255,255,0.22));
    color: var(--text-muted, rgba(244,241,234,0.72));
    cursor: pointer;
    padding: 6px 14px;
    font-size: 11px;
    font-family: var(--font-pixel, inherit);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: all 0.16s;
  }
  .btn-pip:hover {
    background: rgba(255,255,255,0.05);
    border-color: var(--text-primary, #F4F1EA);
    color: var(--text-primary, #F4F1EA);
  }
  .btn-pip-accent { border-color: var(--hero-red-dim, rgba(251,54,64,0.18)); color: var(--hero-red, #FB3640); }
  .btn-pip-accent:hover { border-color: var(--hero-red, #FB3640); color: var(--hero-red, #FB3640); background: var(--hero-red-dim, rgba(251,54,64,0.12)); }
  .btn-pip-close { padding: 6px 10px; }
`;
