import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HomePage } from './HomePage';
import { ToastProvider } from '../components/feedback/ToastProvider';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
};

const authMocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'student@example.com' },
}));

const infiniteScrollMocks = vi.hoisted(() => ({
  setHasMore: vi.fn(),
  setLoadingMore: vi.fn(),
  reset: vi.fn(),
  sentinelRef: { current: null },
}));

const supabaseMocks = vi.hoisted(() => {
  const createBuilder = (data: unknown) => {
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      ilike: vi.fn(() => builder),
      or: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown }) => unknown) => Promise.resolve(resolve({ data })),
    };

    return builder;
  };

  const wishlistBuilder = createBuilder([]);
  const userSchoolsBuilder = createBuilder([{ school_id: 'school-1' }]);
  const postsBuilder = createBuilder([
    {
      id: 'post-1',
      user_id: 'user-a',
      title: '絵の具',
      description: '絵の具',
      category: 'Textbook',
      condition: 'Good',
      mode: 'GIVEAWAY',
      status: 'Available',
      created_at: '2026-05-17T00:00:00.000Z',
      item_size: null,
      profiles: {
        display_name: 'ilikebeatles77',
        avg_rating: 5,
        email_verified: true,
        manner_temp: 36.5,
      },
      schools: { name_ja: '新田学園' },
      post_images: [],
    },
    {
      id: 'post-2',
      user_id: 'user-b',
      title: '江北',
      description: '江北 江北 江北',
      category: 'Textbook',
      condition: 'Good',
      mode: 'GIVEAWAY',
      status: 'Available',
      created_at: '2026-05-17T00:00:00.000Z',
      item_size: null,
      profiles: {
        display_name: 'doogiya2002',
        avg_rating: 0,
        email_verified: false,
        manner_temp: 36.5,
      },
      schools: { name_ja: '江北高校' },
      post_images: [],
    },
  ]);

  return {
    wishlistBuilder,
    userSchoolsBuilder,
    postsBuilder,
    from: vi.fn((table: string) => {
      if (table === 'wishlists') return wishlistBuilder;
      if (table === 'user_schools') return userSchoolsBuilder;
      if (table === 'posts') return postsBuilder;
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
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../components/VerifiedBadge', () => ({
  VerifiedBadge: () => null,
}));

vi.mock('../components/MannerTempGauge', () => ({
  MannerTempGauge: () => null,
}));

vi.mock('../components/StatusBadge', () => ({
  StatusBadge: () => null,
}));

vi.mock('../components/skeletons/PostCardSkeleton', () => ({
  PostCardSkeleton: () => <div>loading</div>,
}));

vi.mock('../hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({
    page: 0,
    hasMore: false,
    setHasMore: infiniteScrollMocks.setHasMore,
    loadingMore: false,
    setLoadingMore: infiniteScrollMocks.setLoadingMore,
    sentinelRef: infiniteScrollMocks.sentinelRef,
    reset: infiniteScrollMocks.reset,
  }),
}));

describe('HomePage', () => {
  beforeEach(() => {
    supabaseMocks.from.mockClear();
    vi.clearAllMocks();
  });

  it('waits for school lookup before fetching posts for signed-in users', async () => {
    render(
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(supabaseMocks.userSchoolsBuilder.select).toHaveBeenCalled();
      expect(supabaseMocks.postsBuilder.in).toHaveBeenCalledWith('school_id', ['school-1']);
    });

    const postQueryCalls = supabaseMocks.postsBuilder.in.mock.calls.filter(
      ([column, ids]: [string, string[]]) => column === 'school_id' && ids.length === 0
    );

    expect(postQueryCalls).toHaveLength(0);
  });

  it('hides duplicate card descriptions when they match the title', async () => {
    render(
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('絵の具')).toBeTruthy();
      expect(screen.getByText('江北 江北 江北')).toBeTruthy();
    });

    expect(screen.getAllByText('絵の具')).toHaveLength(1);
    expect(screen.getAllByText('江北')).toHaveLength(1);
  });
});
