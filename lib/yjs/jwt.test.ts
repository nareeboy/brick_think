import { describe, expect, test } from 'vitest';

import { mintYjsToken, verifyYjsToken } from './jwt';

const SECRET = 'a'.repeat(64);

describe('yjs jwt', () => {
  test('round-trips a valid token', async () => {
    const { token, expiresAt } = await mintYjsToken({
      profileId: '00000000-0000-0000-0000-000000000001',
      modelId: '00000000-0000-0000-0000-000000000abc',
      secret: SECRET,
      ttlSeconds: 60,
    });
    expect(typeof token).toBe('string');
    expect(expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const claims = await verifyYjsToken({ token, secret: SECRET });
    expect(claims.profileId).toBe('00000000-0000-0000-0000-000000000001');
    expect(claims.modelId).toBe('00000000-0000-0000-0000-000000000abc');
  });

  test('rejects a tampered signature', async () => {
    const { token } = await mintYjsToken({
      profileId: '00000000-0000-0000-0000-000000000001',
      modelId: '00000000-0000-0000-0000-000000000abc',
      secret: SECRET,
      ttlSeconds: 60,
    });
    const tampered = `${token.slice(0, -2)}aa`;
    await expect(
      verifyYjsToken({ token: tampered, secret: SECRET }),
    ).rejects.toThrow();
  });

  test('rejects an expired token', async () => {
    const { token } = await mintYjsToken({
      profileId: '00000000-0000-0000-0000-000000000001',
      modelId: '00000000-0000-0000-0000-000000000abc',
      secret: SECRET,
      ttlSeconds: -10,
    });
    await expect(verifyYjsToken({ token, secret: SECRET })).rejects.toThrow();
  });

  test('rejects a token signed with a different secret', async () => {
    const { token } = await mintYjsToken({
      profileId: '00000000-0000-0000-0000-000000000001',
      modelId: '00000000-0000-0000-0000-000000000abc',
      secret: SECRET,
      ttlSeconds: 60,
    });
    await expect(
      verifyYjsToken({ token, secret: 'b'.repeat(64) }),
    ).rejects.toThrow();
  });
});
