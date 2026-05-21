import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/server', () => ({ createServerSupabaseClient: vi.fn() }));

import { createServerSupabaseClient } from '@/lib/db/server';

import { GET } from './route';

type VerifyOtpFn = (args: {
  token_hash: string;
  type: string;
}) => Promise<{ error: { message: string; code?: string } | null }>;

function mockSupabase(verifyOtp: VerifyOtpFn): void {
  (createServerSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { verifyOtp },
  });
}

function makeRequest(search: string, headers: Record<string, string> = {}): Request {
  return new Request(`https://www.brickthink.io/auth/confirm${search}`, {
    method: 'GET',
    headers: {
      host: 'www.brickthink.io',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'www.brickthink.io',
      ...headers,
    },
  });
}

describe('GET /auth/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies token_hash and redirects to next on success', async () => {
    const verifyOtp = vi.fn<VerifyOtpFn>().mockResolvedValue({ error: null });
    mockSupabase(verifyOtp);

    const res = await GET(makeRequest('?token_hash=abc123&type=magiclink&next=/app/sessions') as never);

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'magiclink' });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('location')).toBe('https://www.brickthink.io/app/sessions');
  });

  it('defaults next to /app/my-designs when missing', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: null }));

    const res = await GET(makeRequest('?token_hash=abc&type=email') as never);

    expect(res.headers.get('location')).toBe('https://www.brickthink.io/app/my-designs');
  });

  it('rejects non-absolute next as untrusted and falls back', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: null }));

    const res = await GET(
      makeRequest('?token_hash=abc&type=email&next=https://evil.example/x') as never,
    );

    expect(res.headers.get('location')).toBe('https://www.brickthink.io/app/my-designs');
  });

  it('bounces to /sign-in with link_malformed when token_hash missing', async () => {
    const verifyOtp = vi.fn();
    mockSupabase(verifyOtp);

    const res = await GET(makeRequest('?type=magiclink') as never);

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe(
      'https://www.brickthink.io/sign-in?error_code=link_malformed',
    );
  });

  it('bounces to /sign-in with link_malformed when type unknown', async () => {
    const verifyOtp = vi.fn();
    mockSupabase(verifyOtp);

    const res = await GET(makeRequest('?token_hash=abc&type=banana') as never);

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe(
      'https://www.brickthink.io/sign-in?error_code=link_malformed',
    );
  });

  it('bounces to /sign-in with link_expired when supabase reports expiry', async () => {
    mockSupabase(
      vi.fn().mockResolvedValue({ error: { message: 'Token has expired', code: 'otp_expired' } }),
    );

    const res = await GET(makeRequest('?token_hash=abc&type=magiclink') as never);

    expect(res.headers.get('location')).toBe(
      'https://www.brickthink.io/sign-in?error_code=link_expired',
    );
  });

  it('bounces to /sign-in with link_invalid for other verifyOtp errors', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: { message: 'invalid token' } }));

    const res = await GET(makeRequest('?token_hash=abc&type=magiclink') as never);

    expect(res.headers.get('location')).toBe(
      'https://www.brickthink.io/sign-in?error_code=link_invalid',
    );
  });

  it('honours x-forwarded-host for the redirect origin (Railway proxy)', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: null }));

    const req = new Request('https://localhost:8080/auth/confirm?token_hash=abc&type=email', {
      method: 'GET',
      headers: {
        host: 'localhost:8080',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'www.brickthink.io',
      },
    });

    const res = await GET(req as never);
    expect(res.headers.get('location')).toBe('https://www.brickthink.io/app/my-designs');
  });
});
