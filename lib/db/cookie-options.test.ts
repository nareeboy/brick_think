import { describe, expect, it } from 'vitest';

import { getAuthCookieOptions } from './cookie-options';

describe('getAuthCookieOptions', () => {
  it('uses SameSite=None; Secure on HTTPS deployments so cross-site iframes keep the session', () => {
    expect(getAuthCookieOptions(true)).toEqual({ sameSite: 'none', secure: true });
  });

  it('falls back to SameSite=Lax without Secure on local HTTP so sign-in still works', () => {
    expect(getAuthCookieOptions(false)).toEqual({ sameSite: 'lax', secure: false });
  });
});
