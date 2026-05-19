import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSql = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('RLS policy coverage', () => {
  it('allows admins to hide or moderate posts through a DB policy', () => {
    const sql = readSql('supabase/rls.sql');

    expect(sql).toContain('CREATE POLICY "Admins can moderate posts"');
    expect(sql).toContain("role IN ('school_admin', 'super_admin')");
    expect(sql).toContain('ON posts FOR UPDATE');
  });

  it('keeps post create/update scoped to the authenticated owner', () => {
    const sql = readSql('supabase/rls.sql');

    expect(sql).toContain('CREATE POLICY "Insert own posts"');
    expect(sql).toContain('WITH CHECK (auth.uid() = user_id)');
    expect(sql).toContain('CREATE POLICY "Update own posts"');
    expect(sql).toContain('USING (auth.uid() = user_id)');
    expect(sql).toContain('CREATE POLICY "Delete own posts"');
    expect(sql).toContain('ON posts FOR DELETE');
  });

  it('requires chat rooms to match the real post seller', () => {
    const sql = readSql('supabase/chat.sql');

    expect(sql).toContain('CREATE POLICY "Users can create chat rooms"');
    expect(sql).toContain('auth.uid() = buyer_id');
    expect(sql).toContain('posts.user_id = chat_rooms.seller_id');
    expect(sql).toContain("posts.status IN ('Available', 'Reserved')");
  });

  it('checks chat message access against room participants', () => {
    const sql = readSql('supabase/chat.sql');

    expect(sql).toContain('CREATE POLICY "Users can send messages in their rooms"');
    expect(sql).toContain('auth.uid() = sender_id');
    expect(sql).toContain('chat_rooms.seller_id = auth.uid() OR chat_rooms.buyer_id = auth.uid()');
  });

  it('checks image upload paths against post owners and chat participants', () => {
    const postImageSql = readSql('supabase/storage.sql');
    const chatImageSql = readSql('supabase/storage_policies.sql');

    expect(postImageSql).toContain('Post owners insert post-images');
    expect(postImageSql).toContain("posts.id = (storage.foldername(name))[1]::uuid");
    expect(postImageSql).toContain('posts.user_id = auth.uid()');

    expect(chatImageSql).toContain('Chat participants upload');
    expect(chatImageSql).toContain("chat_rooms.id = (storage.foldername(name))[1]::uuid");
    expect(chatImageSql).toContain('chat_rooms.seller_id = auth.uid() OR chat_rooms.buyer_id = auth.uid()');
  });
});
