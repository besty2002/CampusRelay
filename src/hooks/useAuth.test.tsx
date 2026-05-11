import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

const authMocks = vi.hoisted(() => ({
  unsubscribe: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    authMocks.unsubscribe.mockReset();
    authMocks.getSession.mockReset();
    authMocks.onAuthStateChange.mockReset();
  });

  it('loads the current session user', async () => {
    const user = { id: 'user-1', email: 'student@example.com' };
    authMocks.getSession.mockResolvedValue({ data: { session: { user } } });
    authMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: authMocks.unsubscribe } } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(user);
  });

  it('updates the user when auth state changes', async () => {
    let authCallback: (_event: string, session: { user: { id: string } } | null) => void = () => {};
    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: authMocks.unsubscribe } } };
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();

    authCallback('SIGNED_IN', { user: { id: 'user-2' } });

    await waitFor(() => expect(result.current.user).toEqual({ id: 'user-2' }));
  });
});
