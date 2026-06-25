import { defineConfig } from 'vite';

// Cross-window/tab state sync is handled entirely in the browser via
// BroadcastChannel (see src/state.js). The Document Picture-in-Picture widget
// is a child window of the main page, so no separate process or dev-server
// relay is required.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/Tomato/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    // Unit tests live in src/tests (*.test.js). The Playwright E2E specs in
    // e2e/ (*.spec.js) run via `npm run test:e2e`, not vitest.
    include: ['src/tests/**/*.test.js']
  }
});
