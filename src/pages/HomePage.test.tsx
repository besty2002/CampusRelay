import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HomePage } from './HomePage';

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
  const postsBuilder = createBuilder([]);

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
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
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
    render(<HomePage />);

    await waitFor(() => {
      expect(supabaseMocks.userSchoolsBuilder.select).toHaveBeenCalled();
      expect(supabaseMocks.postsBuilder.in).toHaveBeenCalledWith('school_id', ['school-1']);
    });

    const postQueryCalls = supabaseMocks.postsBuilder.in.mock.calls.filter(
      ([column, ids]: [string, string[]]) => column === 'school_id' && ids.length === 0
    );

    expect(postQueryCalls).toHaveLength(0);
  });
});
