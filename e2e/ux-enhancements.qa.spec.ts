import { expect, test, type Page } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5173';

const ACCOUNT_A = {
  email: 'test-user-a@example.com',
  password: 'Test1234!',
};

const COPY = {
  trustSummary: '信頼サマリー',
  publicTrustSummary: 'このユーザーの信頼感',
  autoSavedDraft: '下書きを自動保存しています',
  clearDraft: '下書きを削除',
  adminUsers: 'ユーザー管理',
  bulkSelectVisible: '表示中のユーザーをまとめて選択',
  bulkBan: '一括BAN',
  bulkVerify: '認証を付与',
  tagFastReply: '返信が早い',
  tagPolite: '丁寧',
  tagOnTime: '時間厳守',
  tagSmooth: 'やり取りがスムーズ',
} as const;

const login = async (page: Page) => {
  await page.goto(`${APP_URL}/auth`);
  await page.waitForTimeout(2500);
  await page.locator('input[type="email"]').fill(ACCOUNT_A.email);
  await page.locator('input[type="password"]').fill(ACCOUNT_A.password);
  await page.evaluate(() => {
    const button = document.querySelector('form button');
    if (button instanceof HTMLButtonElement) button.click();
  });
  await page.waitForTimeout(5000);

  if (page.url().includes('/auth')) {
    await page.evaluate(() => {
      const button = document.querySelector('form button');
      if (button instanceof HTMLButtonElement) button.click();
    });
    await page.waitForTimeout(5000);
  }

  await expect(page).not.toHaveURL(/\/auth$/);
};

const readCurrentUserId = async (page: Page) =>
  page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => key.includes('-auth-token'));
    if (!entry) return null;

    try {
      const parsed = JSON.parse(entry[1]);
      return parsed?.user?.id || parsed?.currentSession?.user?.id || null;
    } catch {
      return null;
    }
  });

test.describe('UX enhancement QA', () => {
  test('create-post draft restore, trust summary, and admin bulk UI', async ({ page }) => {
    const consoleIssues: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleIssues.push(msg.text());
    });
    page.on('pageerror', (error) => {
      consoleIssues.push(String(error));
    });

    await login(page);

    await test.step('출품 폼 임시저장과 복원', async () => {
      await page.goto(`${APP_URL}/post/new`);
      await page.waitForTimeout(3000);

      const titleInput = page.locator('input:not([type="file"])').first();
      const descriptionInput = page.locator('textarea').first();
      const draftTitle = `QA Draft ${Date.now()}`;
      const draftDescription = '自動保存の確認用テキスト';

      await titleInput.fill(draftTitle);
      await descriptionInput.fill(draftDescription);
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForTimeout(3000);

      await expect(page.getByText(COPY.autoSavedDraft)).toBeVisible();
      await expect(titleInput).toHaveValue(draftTitle);
      await expect(descriptionInput).toHaveValue(draftDescription);

      await page.getByRole('button', { name: COPY.clearDraft }).click();
      await page.waitForTimeout(800);
      await expect(titleInput).toHaveValue('');
      await expect(descriptionInput).toHaveValue('');
    });

    await test.step('프로필 신뢰 요약과 공개 프로필 확인', async () => {
      await page.goto(`${APP_URL}/me`);
      await page.waitForTimeout(2500);

      await expect(page.getByText(COPY.trustSummary)).toBeVisible();

      const tags = [COPY.tagFastReply, COPY.tagPolite, COPY.tagOnTime, COPY.tagSmooth];
      const tagVisible = await Promise.any(
        tags.map(async (tag) => {
          await expect(page.getByText(tag, { exact: false }).first()).toBeVisible({ timeout: 4000 });
          return tag;
        })
      ).catch(() => null);

      const userId = await readCurrentUserId(page);
      expect(userId).toBeTruthy();

      await page.goto(`${APP_URL}/user/${userId}`);
      await page.waitForTimeout(2500);
      await expect(page.getByText(COPY.publicTrustSummary)).toBeVisible();

      if (tagVisible) {
        await expect(page.getByText(tagVisible, { exact: false }).first()).toBeVisible();
      }
    });

    await test.step('관리자 사용자 일괄 작업 UI 확인', async () => {
      await page.goto(`${APP_URL}/admin/users`);
      await page.waitForTimeout(3000);

      const adminTitleVisible = await page.getByText(COPY.adminUsers).isVisible().catch(() => false);
      if (!adminTitleVisible) {
        console.log('[QA] admin users scenario blocked: current account does not have admin access');
        return;
      }

      await expect(page.getByText(COPY.bulkSelectVisible)).toBeVisible();

      const rowCheckboxes = page.locator('input[type="checkbox"]');
      await expect(rowCheckboxes.first()).toBeVisible();
      await rowCheckboxes.first().check({ force: true });
      await page.waitForTimeout(600);

      await expect(page.getByRole('button', { name: COPY.bulkBan })).toBeVisible();
      await expect(page.getByRole('button', { name: COPY.bulkVerify })).toBeVisible();
    });

    expect(consoleIssues).toEqual([]);
  });
});
