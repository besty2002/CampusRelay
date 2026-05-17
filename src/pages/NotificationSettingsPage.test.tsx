import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationSettingsPage } from './NotificationSettingsPage';
import { ToastProvider } from '../components/feedback/ToastProvider';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
};

const authMocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'user@example.com' },
}));

const supabaseMocks = vi.hoisted(() => {
  const createBuilder = (data: unknown) => {
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      single: vi.fn(() => builder),
      then: (resolve: (value: { data?: unknown; count?: number | null }) => unknown) =>
        Promise.resolve(resolve(typeof data === 'object' && data !== null && 'count' in data ? (data as { data?: unknown; count?: number | null }) : { data })),
    };

    return builder;
  };

  const keywordBuilder = createBuilder([]);
  const pushBuilder = createBuilder({ count: 0 });

  return {
    from: vi.fn((table: string) => {
      if (table === 'keyword_alerts') return keywordBuilder;
      if (table === 'push_subscriptions') return pushBuilder;
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
}));

describe('NotificationSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders clean Japanese copy and accessible controls', async () => {
    render(
      <ToastProvider>
        <NotificationSettingsPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('通知設定')).toBeTruthy();
      expect(screen.getByText('関連キーワード通知')).toBeTruthy();
    });

    expect(screen.getByLabelText('プッシュ通知をオンにする')).toBeTruthy();
    expect(screen.getByLabelText('キーワードを追加する')).toBeTruthy();
    expect(screen.getByText('登録されているキーワードはまだありません。')).toBeTruthy();
  });
});
