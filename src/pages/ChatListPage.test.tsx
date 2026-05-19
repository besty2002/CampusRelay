import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatListPage } from './ChatListPage';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
  to?: string;
};

const authMocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'user@example.com' },
}));

const currentRooms = vi.hoisted<{ value: unknown[] }>(() => ({ value: [] }));

const supabaseMocks = vi.hoisted(() => {
  const createBuilder = () => {
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      or: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown }) => unknown) => Promise.resolve(resolve({ data: currentRooms.value })),
    };

    return builder;
  };

  const roomsBuilder = createBuilder();

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
    currentRooms.value = [];
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

  it('falls back to an icon when the thumbnail image fails to load', async () => {
    currentRooms.value = [
      {
        id: 'room-1',
        seller_id: 'user-1',
        buyer_id: 'user-2',
        last_message_text: '取引の約束を提案しました。',
        last_message_at: '2026-05-19T11:00:00.000Z',
        unread_count_seller: 0,
        unread_count_buyer: 0,
        posts: {
          title: '絵の具',
          post_images: [{ storage_path: 'broken-image.png' }],
        },
        seller: { id: 'user-1', display_name: 'Seller' },
        buyer: { id: 'user-2', display_name: 'Buyer' },
      },
    ];

    const { container } = render(<ChatListPage />);

    await waitFor(() => {
      expect(screen.getByText('絵の具')).toBeTruthy();
    });

    const image = container.querySelector('img');
    expect(image).toBeTruthy();
    if (!image) {
      throw new Error('Expected thumbnail image to be rendered');
    }

    await act(async () => {
      fireEvent.error(image);
    });

    await waitFor(() => {
      expect(screen.getByTestId('chat-thumbnail-fallback-room-1')).toBeTruthy();
    });
  });
});
