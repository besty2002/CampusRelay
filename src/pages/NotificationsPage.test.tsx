import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationsPage } from './NotificationsPage';

const authMocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'user@example.com' },
}));

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => {
  const createBuilder = (data: unknown) => {
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown }) => unknown) => Promise.resolve(resolve({ data })),
    };

    return builder;
  };

  const requestsBuilder = createBuilder([]);
  const approvedBuilder = createBuilder([]);

  let requestCount = 0;

  return {
    from: vi.fn((table: string) => {
      if (table !== 'post_requests') {
        throw new Error(`Unexpected table: ${table}`);
      }

      requestCount += 1;
      return requestCount === 1 ? requestsBuilder : approvedBuilder;
    }),
    reset: () => {
      requestCount = 0;
    },
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
  useNavigate: () => routerMocks.navigate,
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    supabaseMocks.reset();
    vi.clearAllMocks();
  });

  it('renders clean copy for the empty state', async () => {
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('お知らせ')).toBeTruthy();
      expect(screen.getByText('まだお知らせはありません。')).toBeTruthy();
    });

    expect(screen.getByText('マナーのひとこと')).toBeTruthy();
  });
});
