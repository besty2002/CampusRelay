import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminPostsPage } from './AdminPostsPage';
import { ToastProvider } from '../../components/feedback/ToastProvider';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
};

const authMocks = vi.hoisted(() => ({
  user: { id: 'admin-1', email: 'admin@example.com' },
}));

const routerMocks = vi.hoisted(() => ({
  role: 'super_admin' as 'super_admin' | 'school_admin',
}));

const supabaseMocks = vi.hoisted(() => {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(async () => ({
      data: [
        {
          id: 'post-1',
          title: '春の図工セット',
          category: 'Textbook',
          status: 'Available',
          mode: 'GIVEAWAY',
          user_id: 'user-1',
          admin_note: null,
          hidden_by: null,
          created_at: '2026-05-16T00:00:00.000Z',
          profiles: [{ display_name: '出品者A' }],
          post_images: [],
          schools: [{ name_ja: '新田学園中学校' }],
        },
      ],
      count: 1,
      error: null,
    })),
    ilike: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(async () => ({ error: null })),
    delete: vi.fn(() => builder),
  };

  const auditBuilder: Record<string, unknown> = {
    insert: vi.fn(async () => ({ error: null })),
  };

  const notificationBuilder: Record<string, unknown> = {
    insert: vi.fn(async () => ({ error: null })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'posts') return builder;
      if (table === 'admin_audit_logs') return auditBuilder;
      if (table === 'admin_notifications') return notificationBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: authMocks.user, loading: false }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>,
  useOutletContext: () => ({ role: routerMocks.role, adminSchoolIds: [] }),
}));

describe('AdminPostsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMocks.role = 'super_admin';
  });

  it('opens the hide modal before hiding a post', async () => {
    render(
      <ToastProvider>
        <AdminPostsPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('春の図工セット')).toBeTruthy();
    });

    fireEvent.click(screen.getByTitle('非公開にする'));

    expect(screen.getByText('投稿を非公開にしますか？')).toBeTruthy();
    expect(
      screen.getByText('必要であれば管理メモを残して、この投稿を一般ユーザーから見えない状態にします。')
    ).toBeTruthy();
  });
});
