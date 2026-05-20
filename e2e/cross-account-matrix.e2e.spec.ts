import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const env = Object.fromEntries(
  fs
    .readFileSync(path.resolve(process.cwd(), '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const ACCOUNT_A = {
  email: process.env.E2E_ACCOUNT_A_EMAIL || 'test-user-a@example.com',
  password: process.env.E2E_ACCOUNT_A_PASSWORD || 'Test1234!',
};

const EXTRA_ACCOUNTS = [
  {
    label: 'B',
    email: process.env.E2E_ACCOUNT_B_EMAIL || 'test-user-b@example.com',
    password: process.env.E2E_ACCOUNT_B_PASSWORD || 'Test1234!',
  },
  {
    label: 'C',
    email: process.env.E2E_ACCOUNT_C_EMAIL || 'test-user-c@example.com',
    password: process.env.E2E_ACCOUNT_C_PASSWORD || 'Test1234!',
  },
  {
    label: 'D',
    email: process.env.E2E_ACCOUNT_D_EMAIL || 'test-user-d@example.com',
    password: process.env.E2E_ACCOUNT_D_PASSWORD || 'Test1234!',
  },
] as const;

const COPY = {
  publish: '出品完了',
  request: '譲渡を希望する',
} as const;

const imagePath = path.resolve(process.cwd(), 'public', 'pwa-192x192.png');

type StepResult = {
  step: string;
  ok: boolean;
  note: string;
};

const results: StepResult[] = [];

const record = (step: string, ok: boolean, note: string) => {
  results.push({ step, ok, note });
  console.log(`[E2E-MATRIX] ${ok ? 'OK' : 'FAIL'} ${step}: ${note}`);
};

const makeClient = async (email: string, password: string): Promise<SupabaseClient> => {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
};

const login = async (page: Page, email: string, password: string) => {
  await page.goto('/auth');
  await page.waitForTimeout(2500);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
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
};

const createListing = async (page: Page, title: string, schoolId: string) => {
  await page.goto(`/post/new?schoolId=${schoolId}`);
  await page.locator('h1').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[type="file"]').setInputFiles(imagePath);
  await page.locator('img[alt="preview"]').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('input:not([type="file"])').first().fill(title);
  await page.locator('textarea').fill(`${title} description`);
  await expect(page.getByRole('button', { name: COPY.publish })).toBeEnabled({ timeout: 15000 });
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  });
  await page.waitForURL(/\/post\/[0-9a-f-]+$/i, { timeout: 20000 });
  return page.url();
};

const cleanupOwnedMatrixPosts = async (client: SupabaseClient, userId: string) => {
  const { data: posts } = await client.from('posts').select('id').eq('user_id', userId).ilike('title', 'E2E-MATRIX-%');
  const postIds = (posts || []).map((post) => post.id);

  if (postIds.length === 0) return;

  const { data: postImages } = await client.from('post_images').select('storage_path').in('post_id', postIds);
  const imagePaths = (postImages || []).map((row) => row.storage_path).filter(Boolean);

  if (imagePaths.length > 0) {
    await client.storage.from('post-images').remove(imagePaths);
  }

  await client.from('posts').delete().in('id', postIds);
};

test.describe.serial('Cross-account permission matrix', () => {
  test('blocks non-owners from mutating another user listing while keeping it visible', async ({ browser }) => {
    test.setTimeout(12 * 60 * 1000);

    const ownerContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const ownerPage = await ownerContext.newPage();
    const extraContexts = await Promise.all(EXTRA_ACCOUNTS.map(() => browser.newContext({ viewport: { width: 430, height: 932 } })));
    const extraPages = await Promise.all(extraContexts.map((context) => context.newPage()));

    const ownerClient = await makeClient(ACCOUNT_A.email, ACCOUNT_A.password);
    const ownerId = (await ownerClient.auth.getUser()).data.user?.id ?? '';
    const extraClients = await Promise.all(EXTRA_ACCOUNTS.map((account) => makeClient(account.email, account.password)));
    const { data: schoolRows } = await ownerClient.from('user_schools').select('school_id').eq('user_id', ownerId).limit(1);
    const schoolId = schoolRows?.[0]?.school_id ?? '';

    const listingTitle = `E2E-MATRIX-${Date.now()}`;
    let listingId = '';
    let listingUrl = '';

    try {
      await cleanupOwnedMatrixPosts(ownerClient, ownerId);

      await login(ownerPage, ACCOUNT_A.email, ACCOUNT_A.password);
      record('login_owner', !ownerPage.url().includes('/auth'), ownerPage.url());

      expect(schoolId).toBeTruthy();
      listingUrl = await createListing(ownerPage, listingTitle, schoolId);
      listingId = listingUrl.split('/post/')[1] || '';
      record('create_listing_owner', Boolean(listingId), listingUrl);

      for (const [index, account] of EXTRA_ACCOUNTS.entries()) {
        const client = extraClients[index];
        const mutatedTitle = `${listingTitle}-${account.label}-mutated`;
        const { error: updateError } = await client.from('posts').update({ title: mutatedTitle }).eq('id', listingId);
        const { data: titleCheck } = await ownerClient.from('posts').select('title').eq('id', listingId).maybeSingle();
        record(
          `policy_update_blocked_${account.label.toLowerCase()}`,
          Boolean(updateError) || titleCheck?.title === listingTitle,
          updateError?.message || JSON.stringify(titleCheck)
        );

        const { error: deleteError } = await client.from('posts').delete().eq('id', listingId);
        const { data: existsCheck } = await ownerClient.from('posts').select('id').eq('id', listingId).maybeSingle();
        record(
          `policy_delete_blocked_${account.label.toLowerCase()}`,
          Boolean(deleteError) || Boolean(existsCheck?.id),
          deleteError?.message || JSON.stringify(existsCheck)
        );
      }

      for (const [index, account] of EXTRA_ACCOUNTS.entries()) {
        const page = extraPages[index];
        await login(page, account.email, account.password);
        await page.goto(listingUrl);
        await page.locator('h1').waitFor({ state: 'visible', timeout: 15000 });
        const headingText = ((await page.locator('h1').textContent()) || '').replace(/\s+/g, '');
        const requestVisible = await page.getByRole('button', { name: COPY.request }).isVisible().catch(() => false);
        record(
          `ui_visibility_${account.label.toLowerCase()}`,
          headingText.includes(listingTitle.replace(/\s+/g, '')) && requestVisible,
          JSON.stringify({ url: await page.url(), requestVisible })
        );
      }

      console.table(results);
      expect(results.some((entry) => entry.ok === false)).toBeFalsy();
    } finally {
      await cleanupOwnedMatrixPosts(ownerClient, ownerId).catch(() => {});
      await ownerContext.close().catch(() => {});
      for (const context of extraContexts) {
        await context.close().catch(() => {});
      }
    }
  });
});
