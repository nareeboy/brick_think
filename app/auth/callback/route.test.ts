import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/server', () => ({ createServerSupabaseClient: vi.fn() }));

let adminPanelEnabled = false;
vi.mock('@/lib/premium/server', () => ({
  get adminPanelEnabled() {
    return adminPanelEnabled;
  },
}));

import { createServerSupabaseClient } from '@/lib/db/server';

import { GET } from './route';

type ExchangeFn = (code: string) => Promise<{ error: { message: string } | null }>;

function mockSupabase(exchange: ExchangeFn, profile?: { isSiteAdmin: boolean }): void {
  (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      exchangeCodeForSession: exchange,
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { is_site_admin: profile?.isSiteAdmin === true } }),
        })),
      })),
    })),
  });
}

function makeRequest(search: string): Request {
  return new Request(`https://www.brickthink.io/auth/callback${search}`, {
    method: 'GET',
    headers: {
      host: 'www.brickthink.io',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'www.brickthink.io',
    },
  });
}

describe('GET /auth/callback — error code classification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminPanelEnabled = false;
  });

  it('classifies PKCE verifier-missing as pkce_verifier_missing (not raw leak)', async () => {
    mockSupabase(
      vi.fn().mockResolvedValue({
        error: { message: 'PKCE code verifier not found in storage.' },
      }),
    );

    const res = await GET(makeRequest('?code=abc') as never);

    expect(res.headers.get('location')).toBe(
      'https://www.brickthink.io/sign-in?error_code=pkce_verifier_missing',
    );
  });

  it('classifies expired-link errors', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: { message: 'Token has expired' } }));

    const res = await GET(makeRequest('?code=abc') as never);

    expect(res.headers.get('location')).toBe(
      'https://www.brickthink.io/sign-in?error_code=link_expired',
    );
  });

  it('classifies rate-limit errors', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: { message: 'rate limit exceeded' } }));

    const res = await GET(makeRequest('?code=abc') as never);

    expect(res.headers.get('location')).toBe(
      'https://www.brickthink.io/sign-in?error_code=rate_limited',
    );
  });

  it('falls back to link_invalid for unknown errors', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: { message: 'something unexpected' } }));

    const res = await GET(makeRequest('?code=abc') as never);

    expect(res.headers.get('location')).toBe(
      'https://www.brickthink.io/sign-in?error_code=link_invalid',
    );
  });

  it('classifies error_description from provider redirects without calling exchange', async () => {
    const exchange = vi.fn();
    mockSupabase(exchange);

    const res = await GET(makeRequest('?error_description=PKCE+code+verifier+not+found') as never);

    expect(exchange).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe(
      'https://www.brickthink.io/sign-in?error_code=pkce_verifier_missing',
    );
  });

  it('redirects to next on success', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: null }));

    const res = await GET(makeRequest('?code=abc&next=/app/sessions') as never);

    expect(res.headers.get('location')).toBe('https://www.brickthink.io/app/sessions');
  });

  it('sends a site admin to /app/admin on default-next success when the panel is enabled', async () => {
    adminPanelEnabled = true;
    mockSupabase(vi.fn().mockResolvedValue({ error: null }), { isSiteAdmin: true });

    const res = await GET(makeRequest('?code=abc') as never);

    expect(res.headers.get('location')).toBe('https://www.brickthink.io/app/admin');
  });

  it('keeps my-designs for non-admins even with the panel enabled', async () => {
    adminPanelEnabled = true;
    mockSupabase(vi.fn().mockResolvedValue({ error: null }), { isSiteAdmin: false });

    const res = await GET(makeRequest('?code=abc') as never);

    expect(res.headers.get('location')).toBe('https://www.brickthink.io/app/my-designs');
  });

  it('honours an explicit next for site admins (deep links win)', async () => {
    adminPanelEnabled = true;
    mockSupabase(vi.fn().mockResolvedValue({ error: null }), { isSiteAdmin: true });

    const res = await GET(makeRequest('?code=abc&next=/app/sessions') as never);

    expect(res.headers.get('location')).toBe('https://www.brickthink.io/app/sessions');
  });
});
