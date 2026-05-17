import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminDashboard } from './AdminDashboard';
import { ToastProvider } from '../components/feedback/ToastProvider';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
};

const authMocks = vi.hoisted(() => ({
  user: { id: 'admin-1', email: 'admin@example.com' },
}));

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => {
  const profileBuilder: Record<string, unknown> = {
    select: vi.fn(() => profileBuilder),
    eq: vi.fn(() => profileBuilder),
    single: vi.fn(async () => ({ data: { role: 'school_admin' }, error: null })),
  };

  const reportsBuilder: Record<string, unknown> = {
    select: vi.fn(() => reportsBuilder),
    eq: vi.fn(() => reportsBuilder),
    order: vi.fn(async () => ({
      data: [
        {
          id: 'report-1',
          post_id: 'post-1',
          reason: '説明が実物と違う',
          status: 'Pending',
          created_at: '2026-05-16T00:00:00.000Z',
          posts: { title: '家庭科セット', status: 'Open', user_id: 'user-2' },
          profiles: { display_name: '通報ユーザー' },
        },
      ],
      error: null,
    })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return profileBuilder;
      if (table === 'reports') return reportsBuilder;
      if (table === 'posts') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: authMocks.user, loading: false }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>,
  useNavigate: () => routerMocks.navigate,
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens a confirmation dialog before hiding a reported post', async () => {
    render(
      <ToastProvider>
        <AdminDashboard />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('説明が実物と違う')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('投稿を非表示にする'));

    expect(screen.getByText('投稿を非表示にしますか？')).toBeTruthy();
    expect(
      screen.getByText('この投稿は一般ユーザーに表示されなくなります。必要であれば後から管理画面で再確認できます。')
    ).toBeTruthy();
  });
});
