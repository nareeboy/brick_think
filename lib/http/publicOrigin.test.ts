import { describe, expect, it } from 'vitest';

import { publicOriginFromHeaders } from './publicOrigin';

/** Minimal `.get()`-shaped stub matching both `Headers` and `next/headers`. */
function headersFrom(map: Record<string, string>): { get(name: string): string | null } {
  return { get: (name: string) => map[name.toLowerCase()] ?? null };
}

describe('publicOriginFromHeaders', () => {
  it('prefers x-forwarded-host over the internal host header (the Railway bug)', () => {
    // Railway rewrites `host` to the internal port-bound address and exposes
    // the real public hostname via x-forwarded-host. Reading `host` produced
    // the malformed staging magic-link.
    const origin = publicOriginFromHeaders(
      headersFrom({
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'web-service-staging-78b3.up.railway.app',
        host: 'localhost:8080',
      }),
    );
    expect(origin).toBe('https://web-service-staging-78b3.up.railway.app');
  });

  it('falls back to host when x-forwarded-host is absent', () => {
    const origin = publicOriginFromHeaders(
      headersFrom({ 'x-forwarded-proto': 'http', host: 'localhost:3000' }),
    );
    expect(origin).toBe('http://localhost:3000');
  });

  it('defaults proto to http so local dev (no proxy headers) stays http', () => {
    const origin = publicOriginFromHeaders(headersFrom({ host: 'localhost:3000' }));
    expect(origin).toBe('http://localhost:3000');
  });

  it('falls back to localhost:3000 when no host headers are present', () => {
    const origin = publicOriginFromHeaders(headersFrom({}));
    expect(origin).toBe('http://localhost:3000');
  });
});
