import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';
import { ToastProvider } from '../components/feedback/ToastProvider';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode;
};

const authMocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'student@example.com' },
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
      limit: vi.fn(() => builder),
      single: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown }) => unknown) => Promise.resolve(resolve({ data })),
    };

    return builder;
  };

  const profilesBuilder = createBuilder({
    id: 'user-1',
    display_name: 'Student',
    role: 'user',
    completed_count: 3,
    avg_rating: 4.8,
    rating_count: 5,
    manner_temp: 36.5,
    email_verified: false,
  });
  const postsBuilder = createBuilder([]);
  const wishlistsBuilder = createBuilder([]);
  const reviewsBuilder = createBuilder([
    { id: 'review-1', manner_tags: ['返信が早い', '丁寧'] },
    { id: 'review-2', manner_tags: ['返信が早い'] },
  ]);

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return profilesBuilder;
      if (table === 'posts') return postsBuilder;
      if (table === 'wishlists') return wishlistsBuilder;
      if (table === 'reviews') return reviewsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
    auth: {
      signOut: vi.fn(),
    },
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: authMocks.user, loading: false }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
    auth: supabaseMocks.auth,
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>,
  useNavigate: () => routerMocks.navigate,
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}));

vi.mock('../components/MannerTempGauge', () => ({
  MannerTempGauge: () => null,
}));

vi.mock('../components/VerifiedBadge', () => ({
  VerifiedBadge: () => null,
}));

vi.mock('../components/skeletons/ProfileSkeleton', () => ({
  ProfileSkeleton: () => <div>loading</div>,
}));

vi.mock('../components/UserAvatar', () => ({
  UserAvatar: () => <div>avatar</div>,
}));

vi.mock('../components/StatusBadge', () => ({
  StatusBadge: () => null,
}));

describe('ProfilePage enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows trust highlights with top review tags', async () => {
    render(
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('信頼サマリー')).toBeTruthy();
      expect(screen.getByText('返信が早い')).toBeTruthy();
      expect(screen.getByText('丁寧')).toBeTruthy();
    });

    expect(screen.getByText('信頼サマリー')).toBeTruthy();
  });
});
