import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminReportsPage } from './AdminReportsPage';
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
  const reportsBuilder: Record<string, unknown> = {
    select: vi.fn(() => reportsBuilder),
    order: vi.fn(() => reportsBuilder),
    range: vi.fn(() => reportsBuilder),
    eq: vi.fn(() => reportsBuilder),
    then: (resolve: (value: { data: unknown; count: number; error: null }) => unknown) =>
      Promise.resolve(
        resolve({
          data: [
            {
              id: 'report-1',
              post_id: 'post-1',
              target_user_id: 'user-1',
              comment_id: null,
              target_type: 'post',
              reporter_id: 'reporter-1',
              reason: '不適切な内容です',
              category: 'inappropriate',
              status: 'Pending',
              admin_note: null,
              resolved_by: null,
              resolved_at: null,
              created_at: '2026-05-16T00:00:00.000Z',
              posts: { title: '問題のある投稿', status: 'Available' },
              profiles: { display_name: '通報者A' },
            },
          ],
          count: 1,
          error: null,
        })
      ),
    update: vi.fn(() => reportsBuilder),
  };

  const auditBuilder: Record<string, unknown> = {
    insert: vi.fn(async () => ({ error: null })),
  };

  const notificationBuilder: Record<string, unknown> = {
    insert: vi.fn(async () => ({ error: null })),
  };

  const postsBuilder: Record<string, unknown> = {
    update: vi.fn(() => postsBuilder),
    eq: vi.fn(() => postsBuilder),
    select: vi.fn(() => postsBuilder),
    single: vi.fn(async () => ({ data: { user_id: 'user-1', title: '問題のある投稿' }, error: null })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'reports') return reportsBuilder;
      if (table === 'admin_audit_logs') return auditBuilder;
      if (table === 'admin_notifications') return notificationBuilder;
      if (table === 'posts') return postsBuilder;
      if (table === 'profiles') return postsBuilder;
      if (table === 'comments') return postsBuilder;
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

describe('AdminReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMocks.role = 'super_admin';
  });

  it('opens the action modal before resolving a report', async () => {
    render(
      <ToastProvider>
        <AdminReportsPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('不適切な内容です')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('対応する'));

    expect(screen.getByText('通報への対応')).toBeTruthy();
    expect(screen.getAllByText('不適切な内容です').length).toBeGreaterThan(0);
  });
});
