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
              schools: { id: 'school-1', name_ja: '江北小学校', type: 'elementary' },
            },
            {
              school_id: 'school-2',
              schools: { id: 'school-2', name_ja: '新田学園中学校', type: 'middle' },
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

describe('CreatePostPage enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('truncates title and description to the configured maximum lengths', async () => {
    render(
      <ToastProvider>
        <CreatePostPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('江北小学校')).toBeTruthy();
    });

    const [titleInput, descriptionInput] = screen.getAllByRole('textbox') as [
      HTMLInputElement,
      HTMLTextAreaElement,
    ];

    fireEvent.change(titleInput, { target: { value: 'a'.repeat(100) } });
    fireEvent.change(descriptionInput, { target: { value: 'b'.repeat(700) } });

    expect(titleInput.value).toHaveLength(60);
    expect(descriptionInput.value).toHaveLength(500);
    expect(screen.getByText('60/60')).toBeTruthy();
    expect(screen.getByText('500/500')).toBeTruthy();
  });

  it('restores the saved draft and preferred school for create mode', async () => {
    window.localStorage.setItem('campusrelay:create-post:last-school:user-1', 'school-2');
    window.localStorage.setItem(
      'campusrelay:create-post:draft:user-1',
      JSON.stringify({
        mode: 'GIVEAWAY',
        category: 'Textbook',
        condition: 'Good',
        title: '下書きタイトル',
        description: '下書き本文',
        exchangeWanted: '',
        itemSize: '',
        targetSchoolId: 'school-2',
        savedAt: '2026-05-19T10:00:00.000Z',
      })
    );

    render(
      <ToastProvider>
        <CreatePostPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('保存していた入力内容を復元しました。')).toBeTruthy();
    });

    const [titleInput, descriptionInput] = screen.getAllByRole('textbox') as [
      HTMLInputElement,
      HTMLTextAreaElement,
    ];

    expect(titleInput.value).toBe('下書きタイトル');
    expect(descriptionInput.value).toBe('下書き本文');

    const preferredSchoolButton = screen.getByRole('button', { name: /新田学園中学校/ });
    expect(preferredSchoolButton.className).toContain('bg-lime-500');
  });
});
