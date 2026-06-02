import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminAnnouncementsPage } from './AdminAnnouncementsPage';
import { ToastProvider } from '../../components/feedback/ToastProvider';

const authMocks = vi.hoisted(() => ({
  user: { id: 'admin-1', email: 'admin@example.com' },
}));

const routerMocks = vi.hoisted(() => ({
  role: 'super_admin' as 'super_admin' | 'school_admin',
}));

const supabaseMocks = vi.hoisted(() => {
  const announcementsResponse = {
    data: [
      {
        id: 'notice-1',
        title: 'オープン準備のお知らせ',
        body: '6月中は一部機能を段階公開します。',
        is_active: true,
        show_as_popup: true,
        starts_at: '2026-06-01T00:00:00.000Z',
        ends_at: null,
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-02T00:00:00.000Z',
        created_by: 'admin-1',
      },
    ],
    error: null,
  };

  const announcementsBuilder: Record<string, unknown> = {
    select: vi.fn(() => announcementsBuilder),
    order: vi.fn(() => announcementsBuilder),
    update: vi.fn(() => announcementsBuilder),
    delete: vi.fn(() => announcementsBuilder),
    eq: vi.fn(() => announcementsBuilder),
    single: vi.fn(async () => ({ data: { id: 'notice-2' }, error: null })),
    insert: vi.fn(() => announcementsBuilder),
    then: (resolve: (value: typeof announcementsResponse) => unknown) =>
      Promise.resolve(resolve(announcementsResponse)),
  };

  const auditBuilder: Record<string, unknown> = {
    insert: vi.fn(async () => ({ error: null })),
  };

  return {
    builders: {
      announcementsBuilder,
      auditBuilder,
    },
    from: vi.fn((table: string) => {
      if (table === 'announcements') return announcementsBuilder;
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

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useOutletContext: () => ({ role: routerMocks.role, adminSchoolIds: [] }),
}));

describe('AdminAnnouncementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMocks.role = 'super_admin';
  });

  it('renders existing announcements and enters edit mode', async () => {
    render(
      <ToastProvider>
        <AdminAnnouncementsPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('オープン準備のお知らせ')).toBeTruthy();
    });

    fireEvent.click(screen.getByTitle('編集する'));

    expect(screen.getByDisplayValue('オープン準備のお知らせ')).toBeTruthy();
    expect(screen.getByRole('button', { name: '更新する' })).toBeTruthy();
  });

  it('opens delete confirmation before removing an announcement', async () => {
    render(
      <ToastProvider>
        <AdminAnnouncementsPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('オープン準備のお知らせ')).toBeTruthy();
    });

    fireEvent.click(screen.getByTitle('削除する'));

    expect(screen.getByText('お知らせを削除しますか？')).toBeTruthy();
  });

  it('shows permission guidance for school admins', async () => {
    routerMocks.role = 'school_admin';

    render(
      <ToastProvider>
        <AdminAnnouncementsPage />
      </ToastProvider>
    );

    expect(screen.getByText(/Super Admin/)).toBeTruthy();
  });
});
