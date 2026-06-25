import { expect, test } from '@playwright/test';

/**
 * 로그인 없이 돌릴 수 있는 스모크.
 *
 * Tomato는 auth-gate로 앱 전체를 가리므로, 로그인 전에 검증 가능한 표면은
 * "부팅 안정성 + auth-gate UI + 클라이언트 검증 + i18n + 반응형"이다.
 * 이 티어는 Supabase 시크릿 없이도(=CI에서) 신뢰성 있게 통과해야 한다.
 */

test.describe('boot & auth-gate (no login required)', () => {
  test('앱이 uncaught 예외 없이 부팅되고 auth-gate가 보인다', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    // auth-gate가 화면을 가린다 (= 로그인 전 기본 상태)
    const gate = page.locator('#auth-gate');
    await expect(gate).toBeVisible();

    // 3D(WebGL) 콘솔 경고는 헤드리스에서 정상이지만, uncaught JS 예외는 0이어야 한다.
    expect(pageErrors, `uncaught errors:\n${pageErrors.join('\n')}`).toEqual([]);
  });

  test('auth-gate에 이메일/비밀번호 입력과 SIGN IN 버튼이 있다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();
    await expect(page.locator('#btn-auth-submit')).toBeVisible();
    await expect(page.locator('#btn-auth-switch')).toBeVisible();
  });

  test('약한 비밀번호는 네트워크 호출 없이 클라이언트 검증에서 막힌다', async ({ page }) => {
    await page.goto('/');

    await page.locator('#auth-email').fill('tester@example.com');
    await page.locator('#auth-password').fill('short'); // 8자 미만 → authErrorPasswordLength
    await page.locator('#btn-auth-submit').click();

    // 앱 레벨 검증 메시지가 error 상태로 표시되고, 게이트는 그대로 남는다.
    const message = page.locator('#auth-message');
    await expect(message).toHaveClass(/error/);
    await expect(message).not.toBeEmpty();
    await expect(page.locator('#auth-gate')).toBeVisible();
  });

  test('CREATE NEW USER로 전환하면 회원가입 모드(표시 이름 필드)가 나타난다', async ({ page }) => {
    await page.goto('/');

    const displayField = page.locator('#auth-display-field');
    const title = page.locator('#auth-title');

    // 로그인 모드에서는 표시 이름 필드가 숨겨져 있다.
    await expect(displayField).toBeHidden();
    const signinTitle = (await title.textContent())?.trim();

    await page.locator('#btn-auth-switch').click();

    // 회원가입 모드: 표시 이름 필드 노출 + 타이틀 변경.
    await expect(displayField).toBeVisible();
    await expect(title).not.toHaveText(signinTitle || '');
  });

  test('언어 토글이 문구를 바꾼다 (EN ↔ KR)', async ({ page }) => {
    await page.goto('/');

    const title = page.locator('#auth-title');
    const before = (await title.textContent())?.trim();

    await page.locator('#btn-auth-lang-toggle').click();

    await expect(title).not.toHaveText(before || '');
  });

  test('오프라인이 되면 메타바에 동기화 상태가 표시된다', async ({ page, context }) => {
    await page.goto('/');

    // 동기화 정상/유휴 상태에서는 배지가 숨겨져 있다.
    const pill = page.locator('#sync-status');
    await expect(pill).toBeHidden();

    // 네트워크가 끊기면 OFFLINE 배지가 나타난다.
    await context.setOffline(true);
    await expect(pill).toBeVisible();
    await expect(pill).toContainText(/OFFLINE|오프라인/);

    // 복구되면 다시 사라진다.
    await context.setOffline(false);
    await expect(pill).toBeHidden();
  });
});

test.describe('responsive', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('390px 모바일에서 auth-gate가 가로 오버플로 없이 들어간다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#auth-gate')).toBeVisible();

    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    // 1px 정도의 서브픽셀 오차는 허용.
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
