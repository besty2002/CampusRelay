import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminLayout } from './AdminLayout';
import { ToastProvider } from '../../components/feedback/ToastProvider';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
};

const authMocks = vi.hoisted(() => ({
  user: { id: 'admin-1', email: 'admin@example.com' },
}));

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  pathname: '/admin',
}));

const supabaseMocks = vi.hoisted(() => {
  const state = {
    role: 'school_admin',
  };

  const profileBuilder: Record<string, unknown> = {
    select: vi.fn(() => profileBuilder),
    eq: vi.fn(() => profileBuilder),
    single: vi.fn(async () => ({ data: { role: state.role } })),
  };

  const schoolsBuilder: Record<string, unknown> = {
    select: vi.fn(() => schoolsBuilder),
    eq: vi.fn(() => schoolsBuilder),
    then: (resolve: (value: { data: unknown }) => unknown) =>
      Promise.resolve(resolve({ data: [{ school_id: 'school-1' }] })),
  };

  return {
    state,
    from: vi.fn((table: string) => {
      if (table === 'profiles') return profileBuilder;
      if (table === 'user_schools') return schoolsBuilder;
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
  Outlet: () => <div>admin content</div>,
  useNavigate: () => routerMocks.navigate,
  useLocation: () => ({ pathname: routerMocks.pathname }),
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.state.role = 'school_admin';
  });

  it('shows only school-admin tabs for school admins', async () => {
    render(
      <ToastProvider>
        <AdminLayout />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('管理者パネル')).toBeTruthy();
    });

    expect(screen.getByText('概要')).toBeTruthy();
    expect(screen.getByText('通報')).toBeTruthy();
    expect(screen.queryByText('招待コード')).toBeNull();
    expect(screen.queryByText('監査ログ')).toBeNull();
  });

  it('shows super-admin tabs for super admins', async () => {
    supabaseMocks.state.role = 'super_admin';

    render(
      <ToastProvider>
        <AdminLayout />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('管理者パネル')).toBeTruthy();
    });

    expect(screen.getByText('招待コード')).toBeTruthy();
    expect(screen.getByText('監査ログ')).toBeTruthy();
    expect(screen.getByText('ユーザー')).toBeTruthy();
  });
});
