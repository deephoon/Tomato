import { defineConfig } from 'vite';

// Cross-window/tab state sync is handled entirely in the browser via
// BroadcastChannel (see src/state.js). The Document Picture-in-Picture widget
// is a child window of the main page, so no separate process or dev-server
// relay is required.
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js']
  }
});
