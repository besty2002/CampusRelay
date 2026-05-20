import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const TARGET_NAME = process.env.E2E_ADMIN_BULK_TARGET_NAME;

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
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD || !TARGET_NAME, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, and E2E_ADMIN_BULK_TARGET_NAME to run admin bulk verification.');

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
    await expect(page.getByRole('heading', { name: 'ユーザー管理' })).toBeVisible();

    await page.getByPlaceholder('ユーザー名で検索...').fill(TARGET_NAME!);
    await page.waitForTimeout(1500);

    const targetRow = page.locator('article').filter({ hasText: TARGET_NAME! }).first();
    await expect(targetRow).toBeVisible();

    await targetRow.locator('input[type="checkbox"]').check({ force: true });
    await expect(page.getByText('1 人を選択中')).toBeVisible();

    await page.getByRole('button', { name: '認証を付与' }).click();
    await expect(page.getByText('選択したユーザーを認証済みにしますか？')).toBeVisible();
    await page.getByRole('button', { name: '認証を付与する' }).click();
    await expect(page.getByText('選択した 1 人を認証済みにしました')).toBeVisible();

    await targetRow.locator('input[type="checkbox"]').check({ force: true });
    await page.getByRole('button', { name: '認証を解除' }).click();
    await expect(page.getByText('選択したユーザーの認証を解除しますか？')).toBeVisible();
    await page.getByRole('button', { name: '認証を解除する' }).click();
    await expect(page.getByText('選択した 1 人の認証を解除しました')).toBeVisible();

    expect(consoleIssues).toEqual([]);
  });
});
