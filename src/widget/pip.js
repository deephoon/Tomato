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
    modeEl.classList.toggle('idle', isIdle);
    if (isBreak) modeEl.textContent = pipT('tabBreak') || 'BREAK';
    else if (isIdle) modeEl.textContent = pipT('heroStandby') || 'STANDBY';
    else modeEl.textContent = finalStretch ? (pipT('finalStretch') || 'FINAL STRETCH') : (pipT('tabFocus') || 'FOCUS');
  }
  if (taskEl) {
    taskEl.textContent = (!isBreak && title) ? `→ ${title}` : '';
  }
  // Keep the terminal bracket styling consistent with the static markup.
  const bracket = (label) => `[ ${label} ]`;
  if (primary) {
    if (isIdle) primary.textContent = bracket(pipT('btnStart') || 'START');
    else primary.textContent = bracket(running ? (pipT('btnPause') || 'PAUSE') : (pipT('btnResume') || 'RESUME'));
  }
  if (complete) {
    complete.style.display = isIdle ? 'none' : '';
    complete.textContent = bracket(pipT('btnComplete') || 'DONE');
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
    
    <div class="pip-header">
      <div class="pip-mode" id="pip-mode">FOCUS</div>
    </div>

    <div class="pip-body">
      <div class="pip-ring" id="pip-ring">
        <div class="pip-clock" id="pip-clock">--:--</div>
      </div>
      <div class="pip-task" id="pip-task"></div>
    </div>

    <div class="pip-footer">
      <div class="pip-controls">
        <button class="btn-pip" id="pip-primary">[ PAUSE ]</button>
        <button class="btn-pip btn-pip-accent" id="pip-complete">[ DONE ]</button>
        <button class="btn-pip btn-pip-close" id="pip-close" title="Close">[ ✕ ]</button>
      </div>
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
  .vignette, .scanlines, .grain {
    position: absolute; inset: 0; pointer-events: none; z-index: 10;
  }
  .vignette { box-shadow: inset 0 0 40px rgba(0,0,0,0.8); }

  .pip-shell {
    position: relative;
    width: calc(100% - 16px);
    height: calc(100% - 16px);
    margin: 8px;
    background: radial-gradient(100% 100% at 50% 0%, rgba(251,54,64,0.05), transparent 70%), var(--bg-stage, #050505);
    border: 1px solid var(--hairline-2, rgba(255,255,255,0.1));
    display: flex; flex-direction: column;
    z-index: 20;
    padding: 16px 12px;
    box-sizing: border-box;
  }
  .pip-shell .corner {
    position: absolute; width: 4px; height: 4px;
    background: var(--hero-red, #FB3640);
    opacity: 0.8;
  }
  .pip-shell .corner.tl { top: -2px; left: -2px; }
  .pip-shell .corner.tr { top: -2px; right: -2px; }
  .pip-shell .corner.bl { bottom: -2px; left: -2px; }
  .pip-shell .corner.br { bottom: -2px; right: -2px; }

  .pip-header {
    flex: 0 0 auto; width: 100%; display: flex; justify-content: center;
    margin-bottom: auto;
  }
  .pip-mode {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 11px;
    font-family: var(--font-pixel-ko, "Galmuri11", monospace);
    letter-spacing: 0.25em;
    color: var(--hero-red, #FB3640);
    text-shadow: 0 0 8px rgba(251,54,64,0.4);
    text-transform: uppercase; text-align: center;
  }
  /* CRT "signal" indicator — inherits the mode colour via currentColor. */
  .pip-mode::before {
    content: ''; width: 5px; height: 5px; border-radius: 50%;
    background: currentColor; box-shadow: 0 0 6px currentColor;
    flex: 0 0 auto;
  }
  .pip-mode.break { color: var(--break-green, #2ECC71); text-shadow: 0 0 8px rgba(46,204,113,0.4); }
  .pip-mode.idle::before { box-shadow: none; opacity: 0.5; }

  .pip-body {
    flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; margin: 10px 0;
  }
  .pip-ring {
    --pip-pct: 0;
    --pip-accent: var(--hero-red, #FB3640);
    position: relative;
    width: 144px; height: 144px;
    border-radius: 50%;
    background: conic-gradient(var(--pip-accent) calc(var(--pip-pct) * 1%), rgba(255,255,255,0.06) 0);
    display: flex; align-items: center; justify-content: center;
    transition: background 0.3s linear;
    filter: drop-shadow(0 0 10px rgba(251,54,64,0.2));
  }
  .pip-ring.break { filter: drop-shadow(0 0 10px rgba(46,204,113,0.2)); }
  .pip-ring.idle { filter: none; }
  /* Inset disc: subtle top highlight + inner shadow gives the ring real depth. */
  .pip-ring::before {
    content: ''; position: absolute; inset: 6px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 50% 32%, rgba(255,255,255,0.05), transparent 62%),
      var(--bg-stage, #050505);
    box-shadow: inset 0 0 12px rgba(0,0,0,0.65);
    border: 1px solid var(--hairline-1, rgba(255,255,255,0.06));
  }
  .pip-ring.pulse { animation: pip-pulse 1.2s ease-in-out infinite; }
  @keyframes pip-pulse {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(251,54,64,0.2)); }
    50% { filter: drop-shadow(0 0 20px rgba(251,54,64,0.5)); }
  }
  .pip-clock {
    position: relative; z-index: 1;
    font-family: var(--font-pixel-en, "Silkscreen", monospace);
    font-size: 32px; line-height: 1;
    color: var(--text-primary, #F4F1EA);
    text-shadow: 0 0 12px var(--hero-red-glow, rgba(251,54,64,0.4));
    letter-spacing: 0.04em;
    margin-right: -0.04em;
    transform: translateY(2px);
  }
  .pip-clock.break {
    text-shadow: 0 0 12px var(--break-green-glow, rgba(46,204,113,0.4));
  }

  .pip-task {
    font-size: 11px;
    font-family: var(--font-pixel-ko, "Galmuri11", monospace);
    letter-spacing: 0.05em;
    color: var(--text-primary, #F4F1EA);
    text-align: center;
    max-width: 95%;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }

  .pip-footer {
    flex: 0 0 auto; width: 100%; display: flex; flex-direction: column; align-items: center;
    margin-top: auto;
  }
  .pip-controls { display: flex; gap: 8px; justify-content: center; width: 100%; }
  .btn-pip {
    background: transparent;
    border: 1px solid var(--hairline-3, rgba(255,255,255,0.22));
    color: var(--text-muted, rgba(244,241,234,0.72));
    cursor: pointer;
    padding: 8px 0;
    font-size: 10px;
    font-family: var(--font-pixel-ko, "Galmuri11", monospace);
    letter-spacing: 0.1em;
    white-space: nowrap;
    transition: transform 0.1s, box-shadow 0.1s, color 0.1s, border-color 0.1s;
    box-shadow: 2px 2px 0 var(--hairline-1, rgba(255,255,255,0.08));
    flex: 1;
    text-align: center;
  }
  .btn-pip:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--hairline-3, rgba(255,255,255,0.2));
    color: var(--text-primary, #F4F1EA);
    border-color: var(--text-primary, #F4F1EA);
  }
  .btn-pip:active {
    transform: translate(1px, 1px);
    box-shadow: none;
  }
  .btn-pip-accent { 
    background: rgba(251,54,64,0.05);
    border-color: var(--hero-red, #FB3640); 
    color: var(--hero-red, #FB3640); 
    box-shadow: 2px 2px 0 rgba(251,54,64,0.2);
  }
  .btn-pip-accent:hover { 
    background: rgba(251,54,64,0.1);
    box-shadow: 3px 3px 0 rgba(251,54,64,0.3);
  }
  .btn-pip-close { flex: 0 0 auto; padding: 8px 10px; }
`;
