import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';

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
      single: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown }) => unknown) => Promise.resolve(resolve({ data })),
    };

    return builder;
  };

  const profilesBuilder = createBuilder({
    id: 'user-1',
    display_name: 'Student',
    role: 'user',
    completed_count: 0,
    avg_rating: 0,
    rating_count: 0,
    manner_temp: 36.5,
    email_verified: false,
  });
  const postsBuilder = createBuilder([]);
  const wishlistsBuilder = createBuilder([]);

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return profilesBuilder;
      if (table === 'posts') return postsBuilder;
      if (table === 'wishlists') return wishlistsBuilder;
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
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
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

describe('ProfilePage menu links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows only activity and settings shortcuts in the profile menu', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('取引履歴')).toBeTruthy();
      expect(screen.getByText('設定')).toBeTruthy();
    });

    expect(screen.queryByText('通知・キーワード設定')).toBeNull();
    expect(screen.queryByText('学校認証')).toBeNull();

    fireEvent.click(screen.getByText('取引履歴'));
    expect(routerMocks.navigate).toHaveBeenCalledWith('/activity');

    fireEvent.click(screen.getByText('設定'));
    expect(routerMocks.navigate).toHaveBeenCalledWith('/settings');
  });
});
