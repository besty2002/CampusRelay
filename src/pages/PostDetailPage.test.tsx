import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PostDetailPage } from './PostDetailPage';

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  postId: 'post-1',
}));

const authMocks = vi.hoisted(() => ({
  user: { id: 'owner-1', email: 'owner@example.com' },
}));

const supabaseMocks = vi.hoisted(() => {
  const state = {
    postRequestsCallCount: 0,
  };

  const createBuilder = (data: unknown) => {
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      single: vi.fn(() => builder),
      maybeSingle: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown }) => unknown) => Promise.resolve(resolve({ data })),
    };

    return builder;
  };

  const postsBuilder = createBuilder({
    id: 'post-1',
    school_id: 'school-1',
    user_id: 'owner-1',
    mode: 'GIVEAWAY',
    title: '算数セット',
    description: '記名ありですが、まだ使えます。',
    category: 'Textbook',
    condition: 'Good',
    status: 'Reserved',
    created_at: '2026-05-16T00:00:00.000Z',
    profiles: {
      id: 'owner-1',
      display_name: '出品者',
      role: 'user',
      completed_count: 3,
      avg_rating: 4.8,
      rating_count: 12,
      manner_temp: 36.7,
      email_verified: true,
      verified_school_domain: 'example.ac.jp',
    },
    post_images: [],
  });

  const commentsBuilder = createBuilder([]);
  const approvedRequestBuilder = createBuilder({
    id: 'req-1',
    post_id: 'post-1',
    requester_id: 'buyer-1',
    message: 'お願いします',
    status: 'Approved',
    created_at: '2026-05-16T01:00:00.000Z',
    profiles: {
      id: 'buyer-1',
      display_name: '購入希望者',
      role: 'user',
      completed_count: 2,
      avg_rating: 5,
      rating_count: 4,
      manner_temp: 36.5,
      email_verified: true,
    },
  });
  const requestsBuilder = createBuilder([
    {
      id: 'req-1',
      post_id: 'post-1',
      requester_id: 'buyer-1',
      message: 'お願いします',
      status: 'Approved',
      created_at: '2026-05-16T01:00:00.000Z',
      profiles: {
        id: 'buyer-1',
        display_name: '購入希望者',
        role: 'user',
        completed_count: 2,
        avg_rating: 5,
        rating_count: 4,
        manner_temp: 36.5,
        email_verified: true,
      },
    },
  ]);
  const wishlistBuilder = createBuilder(null);

  return {
    state,
    from: vi.fn((table: string) => {
      if (table === 'posts') return postsBuilder;
      if (table === 'comments') return commentsBuilder;
      if (table === 'wishlists') return wishlistBuilder;
      if (table === 'post_requests') {
        if (state.postRequestsCallCount === 0) {
          state.postRequestsCallCount += 1;
          return approvedRequestBuilder;
        }
        return requestsBuilder;
      }
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
  useNavigate: () => routerMocks.navigate,
  useParams: () => ({ postId: routerMocks.postId }),
}));

vi.mock('../components/ReviewModal', () => ({
  ReviewModal: () => null,
}));

vi.mock('../components/VerifiedBadge', () => ({
  VerifiedBadge: () => null,
}));

vi.mock('../components/MannerTempGauge', () => ({
  MannerTempGauge: () => null,
}));

vi.mock('../components/ImageViewer', () => ({
  ImageViewer: () => null,
}));

describe('PostDetailPage trade flow', () => {
  beforeEach(() => {
    supabaseMocks.state.postRequestsCallCount = 0;
    vi.clearAllMocks();
  });

  it('shows the reserved trade summary and owner next-step guidance', async () => {
    render(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('取引ステータス')).toBeTruthy();
      expect(screen.getByText('譲渡先が決まりました')).toBeTruthy();
    });

    expect(screen.getByText('現在の取引相手')).toBeTruthy();
    expect(screen.getByText('購入希望者')).toBeTruthy();
    expect(screen.getByText('次のステップ')).toBeTruthy();
    expect(screen.getByText('取引を完了にする')).toBeTruthy();
  });
});
