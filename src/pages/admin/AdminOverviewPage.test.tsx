import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminOverviewPage } from './AdminOverviewPage';

const routerMocks = vi.hoisted(() => ({
  outletContext: { role: 'school_admin' as const, adminSchoolIds: ['school-1'] },
}));

const supabaseMocks = vi.hoisted(() => {
  const makeBuilder = (response: unknown) => {
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      returns: vi.fn(() => Promise.resolve(response)),
    };
    return builder;
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        const builder = makeBuilder({ count: 12 });
        builder.eq = vi.fn(() => builder);
        builder.gte = vi.fn(() => Promise.resolve({ count: 2 }));
        return builder;
      }
      if (table === 'posts') {
        const builder = makeBuilder({
          data: [
            { created_at: '2026-05-17T00:00:00.000Z' },
            { created_at: '2026-05-16T00:00:00.000Z' },
          ],
        });
        builder.eq = vi.fn(() => Promise.resolve({ count: 5 }));
        builder.neq = vi.fn(() =>
          Promise.resolve({
            data: [
              { category: 'Uniform' },
              { category: 'Textbook' },
            ],
          })
        );
        return builder;
      }
      if (table === 'reports') {
        const builder = makeBuilder({ count: 1 });
        builder.eq = vi.fn(() => Promise.resolve({ count: 1 }));
        return builder;
      }
      if (table === 'chat_messages') {
        const builder = makeBuilder({ count: 7 });
        builder.gte = vi.fn(() => Promise.resolve({ count: 7 }));
        return builder;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

vi.mock('react-router-dom', () => ({
  useOutletContext: () => routerMocks.outletContext,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  Legend: () => <div />,
}));

describe('AdminOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cleaned Japanese overview labels', async () => {
    render(<AdminOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText('総ユーザー')).toBeTruthy();
    });

    expect(screen.getByText('本日の新規登録')).toBeTruthy();
    expect(screen.getByText('カテゴリー分布')).toBeTruthy();
    expect(
      screen.getByText(
        /School Admin は担当学校のデータのみ管理できます。広域の管理が必要な場合は Super Admin にお問い合わせください。/
      )
    ).toBeTruthy();
  });
});
