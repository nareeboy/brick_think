import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/env', () => ({ isSupabaseConfigured: () => true }));
vi.mock('@/lib/db/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock('./actions', () => ({ signInWithGoogle: vi.fn() }));

let adminPanelEnabled = false;
vi.mock('@/lib/premium/server', () => ({
  get adminPanelEnabled() {
    return adminPanelEnabled;
  },
}));

import { createServerSupabaseClient } from '@/lib/db/server';

import SignInPage from './page';

function mockSupabase(opts: { userId: string | null; isSiteAdmin?: boolean }): void {
  (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.userId ? { id: opts.userId } : null },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { is_site_admin: opts.isSiteAdmin === true } }),
        })),
      })),
    })),
  });
}

function render(params: { next?: string } = {}): Promise<unknown> {
  return SignInPage({ searchParams: Promise.resolve(params) });
}

describe('SignInPage — already-signed-in redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminPanelEnabled = false;
  });

  it('redirects a signed-in user to the default destination', async () => {
    mockSupabase({ userId: 'u1', isSiteAdmin: false });

    await expect(render()).rejects.toThrow('REDIRECT:/app/my-designs');
  });

  it('redirects a signed-in site admin to /app/admin when the panel is enabled', async () => {
    adminPanelEnabled = true;
    mockSupabase({ userId: 'u1', isSiteAdmin: true });

    await expect(render()).rejects.toThrow('REDIRECT:/app/admin');
  });

  it('honours an explicit next for signed-in site admins', async () => {
    adminPanelEnabled = true;
    mockSupabase({ userId: 'u1', isSiteAdmin: true });

    await expect(render({ next: '/app/sessions' })).rejects.toThrow('REDIRECT:/app/sessions');
  });
});
