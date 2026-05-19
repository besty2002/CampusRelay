import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminUsersPage } from './AdminUsersPage';
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
          id: 'user-1',
          display_name: '対象ユーザー',
          avatar_url: null,
          role: 'user',
          completed_count: 2,
          avg_rating: 4.7,
          manner_temp: 36.5,
          email_verified: false,
          is_banned: false,
          created_at: '2026-05-16T00:00:00.000Z',
        },
      ],
      count: 1,
      error: null,
    })),
    ilike: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    update: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
  };

  const notificationBuilder: Record<string, unknown> = {
    insert: vi.fn(async () => ({ error: null })),
  };

  const auditBuilder: Record<string, unknown> = {
    insert: vi.fn(async () => ({ error: null })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return builder;
      if (table === 'posts') return builder;
      if (table === 'admin_notifications') return notificationBuilder;
      if (table === 'admin_audit_logs') return auditBuilder;
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

vi.mock('../../components/UserAvatar', () => ({
  UserAvatar: ({ displayName }: { displayName: string }) => <div>{displayName}</div>,
}));

vi.mock('../../components/MannerTempGauge', () => ({
  MannerTempGauge: () => null,
}));

vi.mock('../../components/VerifiedBadge', () => ({
  VerifiedBadge: () => null,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>,
  useOutletContext: () => ({ role: routerMocks.role, adminSchoolIds: [] }),
}));

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMocks.role = 'super_admin';
  });

  it('opens the ban modal before banning a user', async () => {
    render(
      <ToastProvider>
        <AdminUsersPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('対象ユーザー').length).toBeGreaterThan(0);
    });

    const banButtons = screen.getAllByTitle(/BAN/);
    fireEvent.click(banButtons[0]);

    expect(screen.getByText('アカウントを停止しますか？')).toBeTruthy();
  });

  it('shows bulk actions when a user is selected', async () => {
    render(
      <ToastProvider>
        <AdminUsersPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('対象ユーザー を選択')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('対象ユーザー を選択'));

    expect(screen.getByText('1 人を選択中')).toBeTruthy();
    expect(screen.getByRole('button', { name: '認証を付与' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '一括BAN' })).toBeTruthy();
  });
});
