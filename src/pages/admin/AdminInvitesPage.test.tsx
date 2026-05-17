import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminInvitesPage } from './AdminInvitesPage';
import { ToastProvider } from '../../components/feedback/ToastProvider';

const authMocks = vi.hoisted(() => ({
  user: { id: 'admin-1', email: 'admin@example.com' },
}));

const routerMocks = vi.hoisted(() => ({
  role: 'super_admin' as 'super_admin' | 'school_admin',
}));

const supabaseMocks = vi.hoisted(() => {
  const invitesBuilder: Record<string, unknown> = {
    select: vi.fn(() => invitesBuilder),
    order: vi.fn(async () => ({
      data: [
        {
          id: 'invite-1',
          code: 'ADMIN-TEST-1234',
          role: 'school_admin',
          school_id: 'school-1',
          created_at: '2026-05-16T00:00:00.000Z',
          expires_at: '2099-05-16T00:00:00.000Z',
          used_at: null,
          schools: { name_ja: '新田学園中学校' },
          created_by_profile: { display_name: '管理者' },
          used_by_profile: null,
        },
      ],
      error: null,
    })),
    delete: vi.fn(() => invitesBuilder),
    eq: vi.fn(async () => ({ error: null })),
    insert: vi.fn(async () => ({ error: null })),
  };

  const schoolsBuilder: Record<string, unknown> = {
    select: vi.fn(() => schoolsBuilder),
    order: vi.fn(async () => ({
      data: [{ id: 'school-1', name_ja: '新田学園中学校' }],
      error: null,
    })),
  };

  const auditBuilder: Record<string, unknown> = {
    insert: vi.fn(async () => ({ error: null })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'admin_invites') return invitesBuilder;
      if (table === 'schools') return schoolsBuilder;
      if (table === 'admin_audit_logs') return auditBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: authMocks.user, loading: false }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

vi.mock('react-router-dom', () => ({
  useOutletContext: () => ({ role: routerMocks.role, adminSchoolIds: [] }),
}));

describe('AdminInvitesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMocks.role = 'super_admin';
  });

  it('opens a confirmation dialog before invalidating an invite code', async () => {
    render(
      <ToastProvider>
        <AdminInvitesPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ADMIN-TEST-1234')).toBeTruthy();
    });

    fireEvent.click(screen.getByTitle('無効化'));

    expect(screen.getByText('招待コードを無効化しますか？')).toBeTruthy();
    expect(
      screen.getByText('無効化した招待コードは再利用できません。必要なら新しいコードを作成してください。')
    ).toBeTruthy();
  });
});
