import { expect, test } from '@playwright/test';

/**
 * 로그인이 필요한 전체 플로우(=auth tier).
 *
 * Tomato는 Supabase 이메일 인증으로 게이트를 연다. 따라서 이 스펙은 **확인 완료된**
 * 테스트 계정이 있어야 의미가 있다. 자격 증명이 없으면 전체를 skip한다(=CI 기본).
 *
 * 로컬 실행:
 *   E2E_EMAIL=you@example.com E2E_PASSWORD='...' npm run test:e2e
 *
 * 주의: 전용 테스트 계정을 쓸 것. 이 테스트는 실제 작업/세션을 계정에 만든다.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe('logged-in core flow', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL / E2E_PASSWORD 미설정 — auth tier 건너뜀');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#auth-email').fill(EMAIL);
    await page.locator('#auth-password').fill(PASSWORD);
    await page.locator('#btn-auth-submit').click();

    // 로그인 성공 시 게이트가 닫히고 home 뷰로 진입한다.
    await expect(page.locator('#auth-gate')).toBeHidden({ timeout: 15_000 });
    await expect(page.locator('body')).toHaveAttribute('data-view', 'home');
  });

  test('작업 생성 → 집중 시작 → 일시정지 → 재개 → 완료(휴식 진입)', async ({ page }) => {
    // focus 셋업 화면으로 이동
    await page.locator('#tab-focus').click();
    await expect(page.locator('#focus-draft-form')).toBeVisible();

    const title = `E2E ${Date.now()}`;
    await page.locator('#focus-draft-title').fill(title);
    await page.locator('#focus-draft-minutes').fill('25');

    // START NOW (form submit) → 타이머 시작 + focus 뷰
    await page.locator('#btn-focus-start-now').click();

    await expect(page.locator('body')).toHaveAttribute('data-view', 'focus', { timeout: 10_000 });
    const timeLeft = page.locator('#time-left');
    await expect(timeLeft).toBeVisible();

    // 실행 중: 주 컨트롤은 PAUSE 라벨. (로케일 독립적으로 상태 전이를 검증)
    const ctrl = page.locator('#btn-ritual-pause');
    const runningLabel = (await ctrl.textContent())?.trim();

    // 일시정지 → 라벨이 RESUME 류로 바뀐다.
    await ctrl.click();
    await expect(ctrl).not.toHaveText(runningLabel || '');
    const pausedLabel = (await ctrl.textContent())?.trim();

    // 재개 → 다시 PAUSE 라벨로 돌아온다.
    await ctrl.click();
    await expect(ctrl).not.toHaveText(pausedLabel || '');

    // 완료 → 휴식 뷰로 전이.
    await page.locator('#btn-ritual-complete').click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'break', { timeout: 10_000 });
  });

  test('아카이브 뷰에 접근할 수 있다', async ({ page }) => {
    await page.locator('#tab-archive').click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'archive');
    await expect(page.locator('#view-archive')).toBeVisible();
  });
});
