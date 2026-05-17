import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreatePostPage } from './CreatePostPage';
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
  const userSchoolsBuilder: Record<string, unknown> = {
    select: vi.fn(() => userSchoolsBuilder),
    eq: vi.fn(() => userSchoolsBuilder),
    then: (resolve: (value: { data: unknown }) => unknown) =>
      Promise.resolve(
        resolve({
          data: [
            {
              school_id: 'school-1',
              schools: { id: 'school-1', name_ja: '弘道小学校', type: 'elementary' },
            },
          ],
        })
      ),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'user_schools') return userSchoolsBuilder;
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
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: LinkProps) => <a {...props}>{children}</a>,
  useNavigate: () => routerMocks.navigate,
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File) => file),
}));

describe('CreatePostPage limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('truncates title and description to the configured maximum lengths', async () => {
    render(
      <ToastProvider>
        <CreatePostPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('弘道小学校')).toBeTruthy();
    });

    const titleInput = screen.getByPlaceholderText('例：弘道小学校の体操服（上）') as HTMLInputElement;
    const descriptionInput = screen.getByPlaceholderText('詳細を入力してください。') as HTMLTextAreaElement;

    fireEvent.change(titleInput, { target: { value: 'a'.repeat(100) } });
    fireEvent.change(descriptionInput, { target: { value: 'b'.repeat(700) } });

    expect(titleInput.value).toHaveLength(60);
    expect(descriptionInput.value).toHaveLength(500);
    expect(screen.getByText('60/60')).toBeTruthy();
    expect(screen.getByText('500/500')).toBeTruthy();
  });
});
