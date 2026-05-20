import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FeedPage } from './FeedPage';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
};

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
  const postsBuilder = createBuilder([
    {
      id: 'post-1',
      school_id: 'school-1',
      user_id: 'user-a',
      title: '絵の具セット',
      description: '絵の具セット',
      category: 'Textbook',
      condition: 'Good',
      mode: 'GIVEAWAY',
      status: 'Available',
      created_at: '2026-05-17T00:00:00.000Z',
      profiles: {
        display_name: 'ilikebeatles77',
        completed_count: 1,
        avg_rating: 5,
        rating_count: 1,
        email_verified: true,
        manner_temp: 36.7,
      },
      post_images: [],
    },
    {
      id: 'post-2',
      school_id: 'school-1',
      user_id: 'user-b',
      title: '体操服',
      description: '体操服 上下セット',
      category: 'Uniform',
      condition: 'Good',
      mode: 'EXCHANGE',
      status: 'Available',
      created_at: '2026-05-17T00:00:00.000Z',
      profiles: {
        display_name: 'doogiya2002',
        completed_count: 0,
        avg_rating: 0,
        rating_count: 0,
        email_verified: false,
        manner_temp: 36.5,
      },
      post_images: [],
    },
  ]);

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
  Link: ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>,
  useParams: () => ({ schoolId: routerMocks.schoolId }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
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

  it('hides duplicate card descriptions when they match the title', async () => {
    routerMocks.schoolId = 'school-1';

    render(<FeedPage />);

    await waitFor(() => {
      expect(screen.getByText('School A')).toBeTruthy();
      expect(screen.getByText('絵の具セット')).toBeTruthy();
      expect(screen.getByText('体操服 上下セット')).toBeTruthy();
    });

    expect(screen.getAllByText('絵の具セット')).toHaveLength(1);
    expect(screen.getAllByText('体操服')).toHaveLength(1);
  });

  it('shows the improved filter summary controls in Japanese', async () => {
    routerMocks.schoolId = 'school-1';

    render(<FeedPage />);

    await waitFor(() => {
      expect(screen.getByText('School A')).toBeTruthy();
    });

    expect(screen.getByLabelText('フィルターを開く')).toBeTruthy();
    expect(screen.getByText('この学校の出品を表示中')).toBeTruthy();
    expect(screen.getByText('2件')).toBeTruthy();
  });
});
