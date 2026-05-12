import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./lib/env', () => ({
  isSupabaseConfigured: false,
  missingPublicEnvVars: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
}));

vi.mock('./lib/supabase', () => ({
  supabase: {},
}));

describe('App startup', () => {
  it('renders a setup message instead of crashing when env is missing', async () => {
    const { default: App } = await import('./App');

    render(<App />);

    expect(screen.getByText("Campus Relay can't start yet")).toBeTruthy();
    expect(screen.getByText(/Missing now: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY/)).toBeTruthy();
    expect(screen.getByText(/You can start from/i)).toBeTruthy();
  });
});
