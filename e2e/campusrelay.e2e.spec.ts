import { test, expect, type Page } from '@playwright/test';
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
  displayName: process.env.E2E_ACCOUNT_A_DISPLAY_NAME || 'Test User A',
};

const ACCOUNT_B = {
  email: process.env.E2E_ACCOUNT_B_EMAIL || 'test-user-b@example.com',
  password: process.env.E2E_ACCOUNT_B_PASSWORD || 'Test1234!',
  displayName: process.env.E2E_ACCOUNT_B_DISPLAY_NAME || 'Test User B',
};

const COPY = {
  signupSwitch: '\u65b0\u898f\u767b\u9332',
  login: '\u30ed\u30b0\u30a4\u30f3',
  search: '\u691c\u7d22',
  add: '\u8ffd\u52a0',
  request: '\u8b72\u6e21\u3092\u5e0c\u671b\u3059\u308b',
  approve: '\u627f\u8a8d\u3059\u308b',
  chat: '\u30c1\u30e3\u30c3\u30c8\u3067\u76f8\u8ac7\u3059\u308b',
  complete: '\u53d6\u5f15\u3092\u5b8c\u4e86\u306b\u3059\u308b',
  review: '\u30ec\u30d3\u30e5\u30fc',
  reviewSubmit: '\u30ec\u30d3\u30e5\u30fc\u3092\u9001\u4fe1',
  logout: '\u30ed\u30b0\u30a2\u30a6\u30c8',
  publish: '\u51fa\u54c1\u5b8c\u4e86',
  schoolKeyword: '\u65b0\u7530',
  schoolName: '\u65b0\u7530\u5b66\u5712',
  schoolRequired: '\u51fa\u54c1\u5148\u306e\u5b66\u6821\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  messagePlaceholder: '\u30e1\u30c3\u30bb\u30fc\u30b8',
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
  console.log(`[E2E] ${ok ? 'OK' : 'FAIL'} ${step}: ${note}`);
};

const makeClient = async (email: string, password: string): Promise<SupabaseClient> => {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
};

const attachConsoleCapture = (page: Page, bag: string[]) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      bag.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    bag.push(`pageerror: ${String(error)}`);
  });
};

const submitAuthForm = async (page: Page) => {
  await page.evaluate(() => {
    const button = document.querySelector('form button');
    if (button instanceof HTMLButtonElement) button.click();
  });
};

const clickControlByText = async (page: Page, label: string) => {
  const clicked = await page.evaluate((text) => {
    const controls = Array.from(document.querySelectorAll('button, a'));
    const target = controls.find((element) => (element.textContent || '').includes(text));
    if (target instanceof HTMLElement) {
      target.click();
      return true;
    }
    return false;
  }, label);

  await page.waitForTimeout(2000);
  return clicked;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const waitForRequestRow = async (
  client: SupabaseClient,
  postId: string,
  expectedStatus?: 'Pending' | 'Approved',
  attempts = 10
) => {
  for (let index = 0; index < attempts; index += 1) {
    const query = client.from('post_requests').select('id, status, post_id').eq('post_id', postId);
    const { data } = await query.maybeSingle();
    if (data && (!expectedStatus || data.status === expectedStatus)) return data;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return null;
};

const login = async (page: Page, email: string, password: string) => {
  await page.goto('/auth');
  await page.waitForTimeout(2500);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await submitAuthForm(page);
  await page.waitForTimeout(5000);

  if (page.url().includes('/auth')) {
    await submitAuthForm(page);
    await page.waitForTimeout(5000);
  }
};

const signupIfNeeded = async (page: Page, account: typeof ACCOUNT_A) => {
  await page.goto('/auth');
  await page.waitForTimeout(2500);
  await clickControlByText(page, COPY.signupSwitch);
  await page.locator('#display-name').fill(account.displayName);
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await submitAuthForm(page);
  await page.waitForTimeout(5000);

  if (page.url().includes('/auth')) {
    await login(page, account.email, account.password);
  }
};

const ensureSchool = async (page: Page) => {
  await page.goto('/schools');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  if (text.includes(COPY.schoolName)) return;

  await page.locator('input').first().fill(COPY.schoolKeyword);
  await clickControlByText(page, COPY.search);
  await clickControlByText(page, COPY.add);
};

const uploadAvatar = async (page: Page) => {
  await page.goto('/me');
  await page.waitForTimeout(2500);
  await page.locator('input[type="file"]').setInputFiles(imagePath);
  await page.waitForTimeout(5000);
};

const waitForAvatarUrl = async (client: SupabaseClient, userId: string, attempts = 10) => {
  for (let index = 0; index < attempts; index += 1) {
    const { data } = await client.from('profiles').select('avatar_url').eq('id', userId).single();
    if (data?.avatar_url) return data.avatar_url;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return '';
};

const createListing = async (page: Page, title: string, schoolId?: string) => {
  const url = schoolId ? `/post/new?schoolId=${schoolId}` : '/post/new';
  await page.goto(url);
  await page.locator('h1').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[type="file"]').setInputFiles(imagePath);
  await page.locator('img[alt="preview"]').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('input:not([type="file"])').first().fill(title);
  await page.locator('textarea').fill(`${title} description`);
  await expect(page.getByRole('button', { name: new RegExp(escapeRegExp(COPY.publish)) })).toBeEnabled({
    timeout: 15000,
  });
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  });
  await page.waitForURL(/\/post\/[0-9a-f-]+$/i, { timeout: 20000 });
  return page.url();
};

const requestListing = async (page: Page, url: string) => {
  await page.goto(url);
  await page.locator('h1').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: new RegExp(escapeRegExp(COPY.request)) }).click();
  await page.waitForTimeout(2000);
};

const approveRequest = async (page: Page, url: string) => {
  await page.goto(url);
  await page.locator('h1').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: new RegExp(escapeRegExp(COPY.approve)) }).click();
  await page.waitForTimeout(2000);
};

const openChatFromDetail = async (page: Page, url: string) => {
  await page.goto(url);
  await page.locator('h1').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: new RegExp(escapeRegExp(COPY.chat)) }).click();
  await page.waitForURL(/\/chat\//, { timeout: 15000 });
};

const sendChatMessage = async (page: Page, message: string) => {
  await page.locator('footer input[type="text"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('footer input[type="text"]').fill(message);
  await page.locator('footer button[type="submit"]').click();
  await page.waitForTimeout(3000);
};

const completeTrade = async (page: Page, url: string) => {
  await page.goto(url);
  await page.locator('h1').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: new RegExp(escapeRegExp(COPY.complete)) }).click();
  await page.waitForTimeout(2000);
};

const writeReview = async (page: Page, url: string, comment: string) => {
  await page.goto(url);
  await page.locator('h1').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: new RegExp(escapeRegExp(COPY.review)) }).click();
  await page.waitForTimeout(1000);
  await page.locator('textarea').fill(comment);
  await page.getByRole('button', { name: new RegExp(escapeRegExp(COPY.reviewSubmit)) }).click();
  await page.waitForTimeout(2000);
};

const logout = async (page: Page) => {
  await page.goto('/me');
  await page.waitForTimeout(2500);
  await clickControlByText(page, COPY.logout);
  await page.waitForTimeout(2000);
};

const extractAvatarPath = (avatarUrl: string | null | undefined) => {
  if (!avatarUrl) return null;
  const normalized = avatarUrl.split('?')[0];
  const marker = '/storage/v1/object/public/avatars/';
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return null;
  return decodeURIComponent(normalized.slice(markerIndex + marker.length));
};

const cleanupOwnedE2EData = async (client: SupabaseClient, userId: string, clearAvatar = false) => {
  const { data: posts, error: postsError } = await client
    .from('posts')
    .select('id, title')
    .eq('user_id', userId)
    .ilike('title', 'E2E-%');

  if (postsError) {
    return { ok: false, error: postsError.message, removedPosts: 0, remainingPosts: -1 };
  }

  const postIds = (posts || []).map((post) => post.id);
  let removedImages = 0;

  if (postIds.length > 0) {
    const { data: postImages, error: postImagesError } = await client
      .from('post_images')
      .select('storage_path')
      .in('post_id', postIds);

    if (postImagesError) {
      return { ok: false, error: postImagesError.message, removedPosts: 0, remainingPosts: -1 };
    }

    const imagePaths = (postImages || []).map((row) => row.storage_path).filter(Boolean);
    removedImages = imagePaths.length;

    if (imagePaths.length > 0) {
      const { error: removeImageError } = await client.storage.from('post-images').remove(imagePaths);
      if (removeImageError) {
        return { ok: false, error: removeImageError.message, removedPosts: 0, remainingPosts: -1 };
      }
    }

    const { error: deleteError } = await client.from('posts').delete().in('id', postIds);
    if (deleteError) {
      return { ok: false, error: deleteError.message, removedPosts: 0, remainingPosts: -1 };
    }
  }

  let clearedAvatar = false;
  if (clearAvatar) {
    const { data: profile, error: profileError } = await client.from('profiles').select('avatar_url').eq('id', userId).single();
    if (profileError) {
      return { ok: false, error: profileError.message, removedPosts: postIds.length, remainingPosts: -1 };
    }

    const avatarPath = extractAvatarPath(profile.avatar_url);
    if (avatarPath) {
      const { error: removeAvatarError } = await client.storage.from('avatars').remove([avatarPath]);
      if (!removeAvatarError) clearedAvatar = true;
    }

    if (profile.avatar_url) {
      const { error: clearAvatarError } = await client.from('profiles').update({ avatar_url: null }).eq('id', userId);
      if (clearAvatarError) {
        return { ok: false, error: clearAvatarError.message, removedPosts: postIds.length, remainingPosts: -1 };
      }
      clearedAvatar = true;
    }
  }

  const { count: remainingPosts, error: verifyError } = await client
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .ilike('title', 'E2E-%');

  if (verifyError) {
    return { ok: false, error: verifyError.message, removedPosts: postIds.length, remainingPosts: -1 };
  }

  const remainingPostCount = remainingPosts || 0;

  return {
    ok: remainingPostCount === 0,
    error: remainingPostCount > 0 ? 'posts DELETE policy is likely not applied on the remote database yet' : '',
    removedPosts: postIds.length,
    removedImages,
    remainingPosts: remainingPostCount,
    clearedAvatar,
  };
};

test.describe.serial('CampusRelay end-to-end flow', () => {
  test('runs the two-user trading flow', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);

    const consoleErrors: string[] = [];
    const contextA = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const contextB = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    attachConsoleCapture(pageA, consoleErrors);
    attachConsoleCapture(pageB, consoleErrors);

    const userAClient = await makeClient(ACCOUNT_A.email, ACCOUNT_A.password);
    const userAId = (await userAClient.auth.getUser()).data.user?.id ?? '';
    const userBClient = await makeClient(ACCOUNT_B.email, ACCOUNT_B.password).catch(() => null);
    const userBId = userBClient ? (await userBClient.auth.getUser()).data.user?.id ?? '' : '';
    const { data: userASchools } = await userAClient
      .from('user_schools')
      .select('school_id')
      .eq('user_id', userAId)
      .limit(1);
    const userASchoolId = userASchools?.[0]?.school_id ?? '';
    const listingTitle = `E2E-${Date.now()}`;
    let listingUrl = '';
    let listingId = '';

    try {
      const preCleanupA = await cleanupOwnedE2EData(userAClient, userAId, true);
      record(
        'pre_cleanup_user_a',
        preCleanupA.ok,
        JSON.stringify({
          removedPosts: preCleanupA.removedPosts,
          removedImages: preCleanupA.removedImages,
          remainingPosts: preCleanupA.remainingPosts,
          error: preCleanupA.error,
        })
      );

      if (userBClient && userBId) {
        const preCleanupB = await cleanupOwnedE2EData(userBClient, userBId, true);
        record(
          'pre_cleanup_user_b',
          preCleanupB.ok,
          JSON.stringify({
            removedPosts: preCleanupB.removedPosts,
            removedImages: preCleanupB.removedImages,
            remainingPosts: preCleanupB.remainingPosts,
            error: preCleanupB.error,
          })
        );
      }

      await login(pageA, ACCOUNT_A.email, ACCOUNT_A.password);
      record('login_user_a', !pageA.url().includes('/auth'), pageA.url());

      await ensureSchool(pageA);
      record('school_user_a', true, COPY.schoolName);

      await uploadAvatar(pageA);
      const avatarUrl = await waitForAvatarUrl(userAClient, userAId);
      record('avatar_user_a', Boolean(avatarUrl), avatarUrl || 'missing avatar_url');

      listingUrl = await createListing(pageA, listingTitle, userASchoolId);
      listingId = listingUrl.split('/post/')[1] || '';
      const { data: postRow } = await userAClient
        .from('posts')
        .select('id, title, status')
        .eq('id', listingId)
        .single();
      const { data: imageRows } = await userAClient
        .from('post_images')
        .select('id, storage_path')
        .eq('post_id', listingId);
      record(
        'create_listing_user_a',
        Boolean(postRow && imageRows && imageRows.length > 0),
        JSON.stringify({ postRow, imageCount: imageRows?.length || 0 })
      );

      await logout(pageA);
      record('logout_user_a_after_create', true, 'completed');

      if (!userBClient) {
        await signupIfNeeded(pageB, ACCOUNT_B);
        record('signup_user_b', !pageB.url().includes('/auth'), pageB.url());
      } else {
        await login(pageB, ACCOUNT_B.email, ACCOUNT_B.password);
        record('login_user_b', !pageB.url().includes('/auth'), pageB.url());
      }

      await ensureSchool(pageB);
      record('school_user_b', true, COPY.schoolName);

      await pageB.goto(listingUrl);
      await pageB.locator('h1').waitFor({ state: 'visible', timeout: 15000 });
      const headingText = ((await pageB.locator('h1').textContent()) || '').replace(/\s+/g, '');
      record('view_listing_user_b', headingText.includes(listingTitle.replace(/\s+/g, '')), listingUrl);

      await requestListing(pageB, listingUrl);
      const userBClientReady = userBClient ?? (await makeClient(ACCOUNT_B.email, ACCOUNT_B.password));
      const requestRow = await waitForRequestRow(userBClientReady, listingId, 'Pending');
      record('request_user_b', Boolean(requestRow), JSON.stringify(requestRow));

      const hackedTitle = `${listingTitle}-hacked`;
      const { error: forbiddenUpdateError } = await userBClientReady
        .from('posts')
        .update({ title: hackedTitle })
        .eq('id', listingId);
      const { data: listingAfterUnauthorizedUpdate } = await userAClient
        .from('posts')
        .select('title')
        .eq('id', listingId)
        .single();
      const unauthorizedUpdateBlocked =
        Boolean(forbiddenUpdateError) || listingAfterUnauthorizedUpdate?.title === listingTitle;
      record(
        'permission_user_b_cannot_update_user_a_post',
        unauthorizedUpdateBlocked,
        forbiddenUpdateError?.message || JSON.stringify(listingAfterUnauthorizedUpdate)
      );

      await logout(pageB);
      record('logout_user_b_after_request', true, 'completed');

      await login(pageA, ACCOUNT_A.email, ACCOUNT_A.password);
      await approveRequest(pageA, listingUrl);
      const approvedRequest = await waitForRequestRow(userAClient, listingId, 'Approved');
      record('approve_user_a', approvedRequest?.status === 'Approved', JSON.stringify(approvedRequest));

      await openChatFromDetail(pageA, listingUrl);
      await sendChatMessage(pageA, 'A says hello');
      const { data: roomRow } = await userAClient.from('chat_rooms').select('id').eq('post_id', listingId).single();
      record('chat_room_created', Boolean(roomRow?.id), JSON.stringify(roomRow));

      await logout(pageA);
      record('logout_user_a_after_approve', true, 'completed');

      await login(pageB, ACCOUNT_B.email, ACCOUNT_B.password);
      await pageB.goto(`/chat/${roomRow?.id}`);
      await pageB.waitForTimeout(3000);
      await sendChatMessage(pageB, 'B replies');
      const { data: messageRows } = await userBClientReady
        .from('chat_messages')
        .select('id, text, room_id')
        .eq('room_id', roomRow?.id);
      record('chat_messages_exchanged', Boolean(messageRows && messageRows.length >= 2), JSON.stringify({ count: messageRows?.length || 0 }));

      await logout(pageB);
      record('logout_user_b_after_chat', true, 'completed');

      await login(pageA, ACCOUNT_A.email, ACCOUNT_A.password);
      await completeTrade(pageA, listingUrl);
      const { data: givenPost } = await userAClient.from('posts').select('status').eq('id', listingId).single();
      record('complete_trade_user_a', givenPost?.status === 'Given', JSON.stringify(givenPost));

      await logout(pageA);
      record('logout_user_a_after_complete', true, 'completed');

      await login(pageB, ACCOUNT_B.email, ACCOUNT_B.password);
      await writeReview(pageB, listingUrl, 'E2E review from user B');
      const { data: reviewRows } = await userBClientReady
        .from('reviews')
        .select('id, comment, post_id')
        .eq('post_id', listingId);
      record('review_user_b', Boolean(reviewRows && reviewRows.length > 0), JSON.stringify(reviewRows));

      const mobileNavText = await pageB.locator('body').innerText();
      record('mobile_ui_nav', mobileNavText.includes('\u30db\u30fc\u30e0') && mobileNavText.includes('\u51fa\u54c1'), 'mobile nav visible');

      await logout(pageB);
      record('logout_user_b_final', true, 'completed');

      const cleanupResult = await cleanupOwnedE2EData(userAClient, userAId, true);
      record(
        'cleanup_post',
        cleanupResult.ok,
        JSON.stringify({
          removedPosts: cleanupResult.removedPosts,
          removedImages: cleanupResult.removedImages,
          remainingPosts: cleanupResult.remainingPosts,
          clearedAvatar: cleanupResult.clearedAvatar,
          error: cleanupResult.error,
        })
      );

      record('console_errors', consoleErrors.length === 0, consoleErrors.join('\n') || 'none');

      console.table(results);
      expect(results.some((entry) => entry.ok === false)).toBeFalsy();
    } finally {
      await contextA.close().catch(() => {});
      await contextB.close().catch(() => {});
    }
  });
});
