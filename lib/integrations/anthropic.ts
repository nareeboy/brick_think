import Anthropic from '@anthropic-ai/sdk';

import { getServiceSupabaseClient } from '@/lib/db/service';

export type ServerAnthropicResult =
  | { ok: true; client: Anthropic }
  | { ok: false; code: 'no_claude_key' };

/**
 * Anthropic client backed by the single server-side ANTHROPIC_API_KEY. This is
 * the key source for the paid features (PDF report, narration cleanup): on the
 * hosted instance BrickThink pays the tokens (recovered by the subscription);
 * self-hosters set their own ANTHROPIC_API_KEY. Returns no_claude_key when the
 * env var is unset so callers degrade gracefully. Server-only env — never NEXT_PUBLIC_.
 */
export function getServerAnthropicClient(): ServerAnthropicResult {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length === 0) return { ok: false, code: 'no_claude_key' };
  return { ok: true, client: new Anthropic({ apiKey }) };
}
import { decryptApiKey } from '@/lib/integrations/crypto';

export type AnthropicLookupFailure =
  | { ok: false; code: 'no_claude_key' }
  | { ok: false; code: 'decrypt_failed'; message: string };

export type AnthropicLookupResult = { ok: true; client: Anthropic } | AnthropicLookupFailure;

/**
 * Look up the profile's encrypted Anthropic key, decrypt it, and return a
 * configured Anthropic client. Decryption runs only here — the plaintext key
 * never leaves the server boundary and is never logged.
 */
export async function getAnthropicClientForProfile(
  profileId: string,
): Promise<AnthropicLookupResult> {
  const svc = getServiceSupabaseClient();
  const { data, error } = await svc
    .from('user_integrations')
    .select('anthropic_api_key_ciphertext, anthropic_api_key_nonce')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`user_integrations lookup failed: ${error.message}`);
  }
  if (!data?.anthropic_api_key_ciphertext || !data.anthropic_api_key_nonce) {
    return { ok: false, code: 'no_claude_key' };
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(
      Buffer.from(data.anthropic_api_key_ciphertext, 'base64'),
      Buffer.from(data.anthropic_api_key_nonce, 'base64'),
    );
  } catch (err) {
    return {
      ok: false,
      code: 'decrypt_failed',
      message: err instanceof Error ? err.message : 'unknown',
    };
  }

  return { ok: true, client: new Anthropic({ apiKey }) };
}

/**
 * Quick live-test of a raw key — used by the account UI to validate before
 * persisting. Sends a 1-token Haiku call (cheapest possible round-trip).
 */
export async function testAnthropicKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; code: 'invalid_key' | 'network_error'; message: string }> {
  const client = new Anthropic({ apiKey });
  try {
    await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, code: 'invalid_key', message };
    }
    return { ok: false, code: 'network_error', message };
  }
}
