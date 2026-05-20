// Round-trip test for the user_integrations storage path. Catches the
// specific class of bug where Buffer values JSON-serialise through
// supabase-js into something Postgres can't store cleanly, and decrypt
// silently fails on read — which previously surfaced as a misleading
// "no Anthropic key" error on the Generate report button.
//
// The test does NOT touch Anthropic. It only exercises:
//   1. encryptApiKey produces ciphertext + nonce
//   2. base64-encoded values write cleanly into the text columns
//   3. service-client read returns the same base64 strings
//   4. base64-decoded buffers decrypt back to the original plaintext

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getServiceSupabaseClient } from '@/lib/db/service';
import { decryptApiKey, encryptApiKey } from '@/lib/integrations/crypto';
import {
  cleanupTestUser,
  createTestUser,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser();
});

afterAll(async () => {
  if (user) await cleanupTestUser(user.id);
});

beforeEach(() => {
  process.env.BRICKTHINK_ENCRYPTION_KEY = '00'.repeat(32);
});

describe('user_integrations round-trip', () => {
  it('encrypts, writes, reads, and decrypts a key without corruption', async () => {
    const plaintext = 'sk-ant-api03-' + 'A'.repeat(80);

    const { ciphertext, nonce, last4 } = encryptApiKey(plaintext);

    const svc = getServiceSupabaseClient();
    const upsert = await svc.from('user_integrations').upsert(
      {
        profile_id: user.id,
        anthropic_api_key_ciphertext: ciphertext.toString('base64'),
        anthropic_api_key_nonce: nonce.toString('base64'),
        anthropic_api_key_last4: last4,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    );
    expect(upsert.error).toBeNull();

    const read = await svc
      .from('user_integrations')
      .select('anthropic_api_key_ciphertext, anthropic_api_key_nonce')
      .eq('profile_id', user.id)
      .single();
    expect(read.error).toBeNull();
    expect(typeof read.data?.anthropic_api_key_ciphertext).toBe('string');
    expect(typeof read.data?.anthropic_api_key_nonce).toBe('string');

    const recovered = decryptApiKey(
      Buffer.from(read.data!.anthropic_api_key_ciphertext, 'base64'),
      Buffer.from(read.data!.anthropic_api_key_nonce, 'base64'),
    );

    expect(recovered).toBe(plaintext);
  });
});
