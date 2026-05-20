import { describe, it, expect, beforeAll } from 'vitest';
import { encryptApiKey, decryptApiKey } from '@/lib/integrations/crypto';
import { randomBytes } from 'node:crypto';

beforeAll(() => {
  process.env.BRICKTHINK_ENCRYPTION_KEY = randomBytes(32).toString('hex');
});

describe('crypto', () => {
  it('round-trips a plaintext key', () => {
    const plaintext = 'sk-ant-api03-abcdef';
    const { ciphertext, nonce } = encryptApiKey(plaintext);
    expect(ciphertext).toBeInstanceOf(Buffer);
    expect(nonce).toBeInstanceOf(Buffer);
    expect(nonce.length).toBe(12);
    expect(decryptApiKey(ciphertext, nonce)).toBe(plaintext);
  });

  it('produces a different nonce on each call', () => {
    const a = encryptApiKey('x');
    const b = encryptApiKey('x');
    expect(a.nonce.equals(b.nonce)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it('refuses to decrypt a tampered ciphertext', () => {
    const { ciphertext, nonce } = encryptApiKey('sk-ant-test');
    const tampered = Buffer.from(ciphertext);
    tampered[0] = (tampered[0] ?? 0) ^ 0x01;
    expect(() => decryptApiKey(tampered, nonce)).toThrow();
  });

  it('extracts last 4 chars for display', () => {
    const { last4 } = encryptApiKey('sk-ant-api03-xyzWXYZ');
    expect(last4).toBe('WXYZ');
  });
});
