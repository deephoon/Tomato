// ==========================================
// RUNTIME ENVIRONMENT DETECTION
// Single source of truth for "where is this code running".
// Replaces the old window.isWidget global that leaked across modules.
// ==========================================

// In the Document Picture-in-Picture architecture the floating widget is a
// child window driven by the main page's handlers — there is no separate
// "widget runtime" executing app logic. Commands therefore always originate
// from the main web context. Kept as a function so callers have a stable,
// importable seam (and so a future dedicated widget runtime can flip it).
export function isWidget() {
  return false;
}

// True when the browser can open a Document Picture-in-Picture window.
export function isPipSupported() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}
