// ==========================================
// WIDGET / MAIN HAND-OFF
// ==========================================
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

// Where the full web app is served. (Dev server; change for a hosted build.)
const MAIN_URL = 'http://localhost:5173/';
export function isTauri() {
  return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
}

export function isWidget() {
  if (isTauri()) return true;
  return false;
}

export function openWidget() {
  if (!isTauri()) return;
  const w = getCurrentWindow();
  w.show()
    .then(() => w.setFocus())
    .catch((e) => console.error('[widget] show failed:', e));
}

// Hand off from the widget to the full app.
//  - Tauri widget : ask any already-open main tab to surface itself; only spawn a
//                   NEW browser tab when no live main tab answers. This stops the
//                   widget from piling up a fresh tab on every click.
//  - Browser main : stay on the current full page.
export async function goToMainPage() {
  if (!isTauri()) return;

  const hot = import.meta.hot;
  if (hot) {
    let mainAlive = false;
    const onSync = (data) => { if (data && data.type === 'main-here') mainAlive = true; };
    hot.on('tomato:sync', onSync);
    hot.send('tomato:sync', { type: 'request-main-focus', ts: Date.now() });
    // Give a live main tab a moment to answer.
    await new Promise((r) => setTimeout(r, 450));
    if (typeof hot.off === 'function') hot.off('tomato:sync', onSync);
    if (mainAlive) return; // a main tab exists and was asked to come forward — don't open another
  }

  try { await invoke('open_main_page', { url: MAIN_URL }); }
  catch (e) { console.error('[widget] open main page failed:', e); }
}

// Hide the widget window. The Tauri app keeps running so the browser can
// re-show it later via sendWidgetControl('show').
export function hideWidgetSelf() {
  if (!isTauri()) return;
  getCurrentWindow().hide().catch((e) => console.error('[widget] hide failed:', e));
}

// In the Tauri widget, react to show/hide requests coming from the browser main.
export function bindWidgetWindowControl() {
  if (!isTauri()) return;
  window.addEventListener('tomato-widget-control', (e) => {
    const w = getCurrentWindow();
    if (e.detail === 'show') {
      w.show()
        .then(() => w.setFocus())
        .catch((err) => console.error('[widget] show control failed:', err));
    } else if (e.detail === 'hide') {
      w.hide().catch((err) => console.error('[widget] hide control failed:', err));
    }
  });
}

// Start an OS-level window drag for the frameless widget.
export function beginWindowDrag() {
  if (!isTauri()) return;
  getCurrentWindow().startDragging().catch((err) => console.error('[widget] drag failed:', err));
}

// Start an OS-level edge/corner resize for the frameless widget.
export function beginWindowResize(direction = 'SouthEast') {
  if (!isTauri()) return;
  getCurrentWindow().startResizeDragging(direction)
    .catch((err) => console.error('[widget] resize failed:', err));
}
