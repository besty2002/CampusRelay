import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminAuthPage } from './AdminAuthPage';
import { ToastProvider } from '../../components/feedback/ToastProvider';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
};

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => {
  const auth = {
    signInWithOAuth: vi.fn(async () => ({ error: null })),
    signInWithPassword: vi.fn(async () => ({ data: { user: { id: 'admin-1' } }, error: null })),
    signUp: vi.fn(async () => ({ data: { user: { id: 'admin-2' } }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
  };

  const profilesBuilder: Record<string, unknown> = {
    select: vi.fn(() => profilesBuilder),
    eq: vi.fn(() => profilesBuilder),
    single: vi.fn(async () => ({ data: { role: 'super_admin' } })),
  };

  return {
    auth,
    rpc: vi.fn(async () => ({ error: null })),
    from: vi.fn((table: string) => {
      if (table === 'profiles') return profilesBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: supabaseMocks.auth,
    rpc: supabaseMocks.rpc,
    from: supabaseMocks.from,
  },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>,
  useNavigate: () => routerMocks.navigate,
}));

describe('AdminAuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows invite code fields when switching to registration mode', async () => {
    render(
      <ToastProvider>
        <AdminAuthPage />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('招待コードを持っていますか？ 新規登録へ'));

    expect(screen.getByText('管理者アカウント登録')).toBeTruthy();
    expect(screen.getByPlaceholderText('ADMIN-XXXX-XXXX')).toBeTruthy();
    expect(screen.getByPlaceholderText('表示名')).toBeTruthy();
  });

  it('shows a validation error when registration is submitted without an invite code', async () => {
    render(
      <ToastProvider>
        <AdminAuthPage />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('招待コードを持っていますか？ 新規登録へ'));

    fireEvent.change(screen.getByPlaceholderText('ADMIN-XXXX-XXXX'), { target: { value: '   ' } });
    fireEvent.change(screen.getByPlaceholderText('表示名'), { target: { value: 'Admin User' } });
    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('6文字以上'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('アカウントを作成'));

    await waitFor(() => {
      expect(screen.getByText('招待コードを入力してください。')).toBeTruthy();
    });
  });
});
