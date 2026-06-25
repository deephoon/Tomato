import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 설정.
 *
 * - 기본(no-auth) 스모크는 Supabase 로그인 없이 auth-gate UI/부팅/검증/i18n/반응형을 검사한다.
 *   → CI에서 시크릿 없이도 돌릴 수 있다.
 * - auth-flow 스펙은 E2E_EMAIL / E2E_PASSWORD 환경변수가 있을 때만 실행된다(없으면 skip).
 *   → 실제 확인된 테스트 계정으로 로컬에서 전체 플로우를 검증할 때 사용.
 *
 * dev 서버(`npm run dev`)는 `.env`의 VITE_SUPABASE_* 를 사용한다.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
