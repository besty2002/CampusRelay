import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthPage } from './AuthPage';
import { ToastProvider } from '../components/feedback/ToastProvider';

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({ error: null })),
    signInWithOAuth: vi.fn(async () => ({ error: null })),
  },
}));

vi.mock('../lib/supabase', () => ({
  supabase: supabaseMocks,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => routerMocks.navigate,
}));

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches to signup mode and shows the display name field', () => {
    render(
      <ToastProvider>
        <AuthPage />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('アカウントをお持ちでない場合は新規登録へ'));

    expect(screen.getByLabelText('表示名')).toBeTruthy();
    expect(screen.getByText('新規登録')).toBeTruthy();
    expect(screen.getByText('すでにアカウントをお持ちの場合はログインへ')).toBeTruthy();
  });

  it('logs in and navigates to the school selection page', async () => {
    render(
      <ToastProvider>
        <AuthPage />
      </ToastProvider>
    );

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('ログイン'));

    await waitFor(() => {
      expect(supabaseMocks.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(routerMocks.navigate).toHaveBeenCalledWith('/schools');
    });
  });

  it('exposes a clean accessible name for the Google sign-in button', () => {
    render(
      <ToastProvider>
        <AuthPage />
      </ToastProvider>
    );

    expect(screen.getByRole('button', { name: 'Googleで続ける' })).toBeTruthy();
  });
});
