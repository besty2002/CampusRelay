import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const TARGET_NAME = process.env.E2E_ADMIN_BULK_TARGET_NAME;

const COPY = {
  heading: 'ユーザー管理',
  searchPlaceholder: 'ユーザー名で検索...',
  selectedCount: '選択中 1名',
  bulkVerify: '一括認証',
  bulkUnverify: '認証解除',
  bulkVerifyTitle: '選択したユーザーを認証済みにしますか？',
  bulkVerifyConfirm: '認証する',
  bulkVerifySuccess: '選択した 1 人を認証済みにしました',
  bulkUnverifyTitle: '選択したユーザーの認証を解除しますか？',
  bulkUnverifyConfirm: '認証解除',
  bulkUnverifySuccess: '選択した 1 人の認証を解除しました',
} as const;

const login = async (page: Page) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Missing admin credentials');

  await page.goto('/auth');
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.evaluate(() => {
    const button = document.querySelector('form button');
    if (button instanceof HTMLButtonElement) button.click();
  });
  await page.waitForTimeout(5000);
  await expect(page).not.toHaveURL(/\/auth$/);
};

test.describe('Admin users E2E', () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD || !TARGET_NAME,
    'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, and E2E_ADMIN_BULK_TARGET_NAME to run admin bulk verification.'
  );

  test('runs a safe bulk verify/unverify cycle for a QA target user', async ({ page }) => {
    const consoleIssues: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleIssues.push(msg.text());
    });
    page.on('pageerror', (error) => {
      consoleIssues.push(String(error));
    });

    await login(page);
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: COPY.heading })).toBeVisible();

    await page.getByPlaceholder(COPY.searchPlaceholder).fill(TARGET_NAME!);
    await page.waitForTimeout(1500);

    const checkbox = page.getByLabel(`${TARGET_NAME} を選択`).first();
    await expect(checkbox).toBeVisible();
    await checkbox.check({ force: true });
    await expect(page.getByText(COPY.selectedCount).first()).toBeVisible();

    await page.getByRole('button', { name: COPY.bulkVerify }).click();
    await expect(page.getByText(COPY.bulkVerifyTitle)).toBeVisible();
    await page.getByRole('button', { name: COPY.bulkVerifyConfirm }).click();
    await expect(page.getByText(COPY.bulkVerifySuccess).first()).toBeVisible();

    await checkbox.check({ force: true });
    await page.getByRole('button', { name: COPY.bulkUnverify }).click();
    await expect(page.getByText(COPY.bulkUnverifyTitle)).toBeVisible();
    await page.getByRole('button', { name: COPY.bulkUnverifyConfirm }).click();
    await expect(page.getByText(COPY.bulkUnverifySuccess).first()).toBeVisible();

    expect(consoleIssues).toEqual([]);
  });
});
