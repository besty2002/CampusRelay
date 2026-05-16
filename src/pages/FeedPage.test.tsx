import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { FeedPage } from './FeedPage';

const routerMocks = vi.hoisted(() => ({
  schoolId: undefined as string | undefined,
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
      or: vi.fn(() => builder),
      ilike: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(() => builder),
      single: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown }) => unknown) => Promise.resolve(resolve({ data })),
    };

    return builder;
  };

  const schoolsBuilder = createBuilder({ name_ja: 'School A' });
  const postsBuilder = createBuilder([]);

  return {
    schoolsBuilder,
    postsBuilder,
    from: vi.fn((table: string) => {
      if (table === 'schools') return schoolsBuilder;
      if (table === 'posts') return postsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useParams: () => ({ schoolId: routerMocks.schoolId }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('./HomePage', () => ({
  CATEGORY_MAP: {},
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

describe('FeedPage', () => {
  beforeEach(() => {
    routerMocks.schoolId = undefined;
    vi.clearAllMocks();
  });

  it('does not query school or posts before schoolId is available', async () => {
    render(<FeedPage />);

    await waitFor(() => {
      expect(infiniteScrollMocks.setHasMore).toHaveBeenCalledWith(false);
    });

    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });
});
