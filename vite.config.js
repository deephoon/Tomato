import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

let widgetReadyAt = 0;
let widgetProcess = null;
let pendingWidgetControl = null;

function launchWidgetIfNeeded() {
  if (Date.now() - widgetReadyAt < 12000) return;
  if (widgetProcess && !widgetProcess.killed) return;

  const bin = resolve(process.cwd(), 'src-tauri/target/debug/app');
  if (!existsSync(bin)) return;

  widgetProcess = spawn(bin, [], {
    detached: true,
    stdio: 'ignore'
  });
  widgetProcess.on('exit', () => {
    widgetProcess = null;
    widgetReadyAt = 0;
  });
  widgetProcess.unref();
  widgetReadyAt = Date.now();
}

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'] // We will create this
  },
  plugins: [
    {
      name: 'tomato-sync',
      configureServer(server) {
        server.ws.on('tomato:widget-ready', () => {
          widgetReadyAt = Date.now();
          if (pendingWidgetControl) {
            server.ws.send('tomato:sync', pendingWidgetControl);
            pendingWidgetControl = null;
          }
        });
        server.ws.on('tomato:sync', (data, client) => {
          if (data && data.type === 'widget-control' && data.action === 'show') {
            pendingWidgetControl = data;
            launchWidgetIfNeeded();
          }
          // Broadcast to all connected clients reliably
          server.ws.send('tomato:sync', data);
        });
      }
    }
  ]
});
