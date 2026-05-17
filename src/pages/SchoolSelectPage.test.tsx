import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SchoolSelectPage } from './SchoolSelectPage';
import { ToastProvider } from '../components/feedback/ToastProvider';

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => {
  const auth = {
    getUser: vi.fn(async () => ({
      data: {
        user: {
          id: 'user-1',
          email: 'student@example.com',
          user_metadata: { display_name: 'Student' },
        },
      },
    })),
  };

  const userSchoolsBuilder: Record<string, unknown> = {
    select: vi.fn(() => userSchoolsBuilder),
    eq: vi.fn(() => userSchoolsBuilder),
    returns: vi.fn(() =>
      Promise.resolve({
        data: [
          {
            school_id: 'school-1',
            schools: { id: 'school-1', name_ja: '弘道小学校', type: 'elementary' },
          },
        ],
      })
    ),
  };

  const postsBuilder: Record<string, unknown> = {
    select: vi.fn(() => postsBuilder),
    in: vi.fn(() => postsBuilder),
    eq: vi.fn(() => postsBuilder),
    returns: vi.fn(() => Promise.resolve({ data: [{ school_id: 'school-1' }] })),
  };

  return {
    auth,
    from: vi.fn((table: string) => {
      if (table === 'user_schools') return userSchoolsBuilder;
      if (table === 'posts') return postsBuilder;
      if (table === 'schools') {
        return {
          select: vi.fn(() => ({
            ilike: vi.fn(() => ({
              limit: vi.fn(() => ({
                returns: vi.fn(() => Promise.resolve({ data: [] })),
              })),
            })),
          })),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'user-1' } })),
            })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: supabaseMocks.auth,
    from: supabaseMocks.from,
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => routerMocks.navigate,
}));

describe('SchoolSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens a confirmation dialog before removing a school', async () => {
    render(
      <ToastProvider>
        <SchoolSelectPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('弘道小学校')).toBeTruthy();
    });

    fireEvent.click(screen.getByTitle('削除'));

    expect(screen.getByText('この学校をリストから外しますか？')).toBeTruthy();
    expect(screen.getByText('この学校で出品中のアイテムも非公開にする')).toBeTruthy();
  });
});
