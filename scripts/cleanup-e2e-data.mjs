import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const accounts = [
  {
    label: 'A',
    email: process.env.E2E_ACCOUNT_A_EMAIL || 'test-user-a@example.com',
    password: process.env.E2E_ACCOUNT_A_PASSWORD || 'Test1234!',
  },
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
];

const makeClient = async (email, password) => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw error || new Error(`Unable to authenticate ${email}`);
  }

  return { client, user: data.user };
};

const extractAvatarPath = (avatarUrl) => {
  if (!avatarUrl) return null;
  const normalized = avatarUrl.split('?')[0];
  const marker = '/storage/v1/object/public/avatars/';
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return null;
  return decodeURIComponent(normalized.slice(markerIndex + marker.length));
};

const cleanupAccount = async (account) => {
  try {
    const { client, user } = await makeClient(account.email, account.password);

    const { data: posts, error: postsError } = await client
      .from('posts')
      .select('id, title')
      .eq('user_id', user.id)
      .ilike('title', 'E2E-%');

    if (postsError) throw postsError;

    const postIds = (posts || []).map((post) => post.id);
    let imagePaths = [];

    if (postIds.length > 0) {
      const { data: postImages, error: imageError } = await client
        .from('post_images')
        .select('storage_path')
        .in('post_id', postIds);

      if (imageError) throw imageError;
      imagePaths = (postImages || []).map((row) => row.storage_path).filter(Boolean);

      if (imagePaths.length > 0) {
        const { error: storageError } = await client.storage.from('post-images').remove(imagePaths);
        if (storageError) {
          console.warn(`[cleanup] failed to remove post images for ${account.email}: ${storageError.message}`);
        }
      }

      const { error: deleteError } = await client.from('posts').delete().in('id', postIds);
      if (deleteError) throw deleteError;
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const avatarPath = extractAvatarPath(profile.avatar_url);
    if (avatarPath) {
      const { error: avatarStorageError } = await client.storage.from('avatars').remove([avatarPath]);
      if (avatarStorageError) {
        console.warn(`[cleanup] failed to remove avatar object for ${account.email}: ${avatarStorageError.message}`);
      }
    }

    if (profile.avatar_url) {
      const { error: avatarUpdateError } = await client.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      if (avatarUpdateError) throw avatarUpdateError;
    }

    const { count: remainingPosts, error: verifyPostsError } = await client
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .ilike('title', 'E2E-%');

    if (verifyPostsError) throw verifyPostsError;

    const { count: remainingReviews, error: verifyReviewsError } = await client
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    if (verifyReviewsError) throw verifyReviewsError;

    await client.auth.signOut();

    const remainingPostCount = remainingPosts || 0;

    return {
      account: account.label,
      email: account.email,
      removedPosts: postIds.length,
      removedImages: imagePaths.length,
      clearedAvatar: Boolean(profile.avatar_url),
      remainingE2EPosts: remainingPostCount,
      remainingReviews: remainingReviews || 0,
      ok: remainingPostCount === 0,
      error:
        remainingPostCount > 0
          ? 'posts DELETE policy is likely not applied on the remote database yet'
          : '',
    };
  } catch (error) {
    return {
      account: account.label,
      email: account.email,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const summaries = [];
for (const account of accounts) {
  summaries.push(await cleanupAccount(account));
}

console.table(summaries);

if (summaries.some((summary) => summary.ok === false)) {
  process.exitCode = 1;
}
