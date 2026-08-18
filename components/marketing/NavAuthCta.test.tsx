import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavAuthCta } from './NavAuthCta';

// The browser Supabase client reads public env at construction — stub it so
// the component's mount effect resolves against a canned session instead.
const getSession = vi.fn<() => Promise<{ data: { session: { user: object } | null } }>>();

vi.mock('@/lib/db/client', () => ({
  getBrowserSupabaseClient: () => ({ auth: { getSession } }),
}));

describe('NavAuthCta', () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it('renders the Sign in CTA when no session exists', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<NavAuthCta />);

    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link.getAttribute('href')).toBe('/sign-in');

    // The mount effect resolves with no session — the CTA must not change.
    await waitFor(() => expect(getSession).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /sign in/i }).getAttribute('href')).toBe('/sign-in');
  });

  it('upgrades to Start a session when a session exists', async () => {
    getSession.mockResolvedValue({ data: { session: { user: {} } } });
    render(<NavAuthCta />);

    const link = await screen.findByRole('link', { name: /start a session/i });
    expect(link.getAttribute('href')).toBe('/app');
  });
});
