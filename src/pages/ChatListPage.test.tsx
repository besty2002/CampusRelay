import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatListPage } from './ChatListPage';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
  to?: string;
};

const authMocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'user@example.com' },
}));

const supabaseMocks = vi.hoisted(() => {
  const createBuilder = (data: unknown) => {
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      or: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown }) => unknown) => Promise.resolve(resolve({ data })),
    };

    return builder;
  };

  const roomsBuilder = createBuilder([]);

  return {
    from: vi.fn((table: string) => {
      if (table === 'chat_rooms') return roomsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({}),
    })),
    removeChannel: vi.fn(),
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: authMocks.user, loading: false }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: supabaseMocks,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: LinkProps) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe('ChatListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders clean copy for the empty state', async () => {
    render(<ChatListPage />);

    await waitFor(() => {
      expect(screen.getByText('トーク')).toBeTruthy();
      expect(screen.getByPlaceholderText('トークを検索')).toBeTruthy();
    });

    expect(screen.getByText('まだトークはありません。')).toBeTruthy();
    expect(screen.getByRole('link', { name: /アイテムを見る/ })).toBeTruthy();
  });
});
