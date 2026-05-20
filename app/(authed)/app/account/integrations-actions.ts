'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import {
  getAnthropicClientForProfile,
  testAnthropicKey,
} from '@/lib/integrations/anthropic';
import { encryptApiKey } from '@/lib/integrations/crypto';

const KEY_FORMAT_RE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

export type IntegrationsActionResult =
  | { ok: true }
  | { ok: false; code:
      | 'unauthenticated'
      | 'invalid_key_format'
      | 'invalid_key'
      | 'network_error';
      message?: string };

async function requireUserId(): Promise<
  { error: IntegrationsActionResult & { ok: false } } | { userId: string }
> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { ok: false, code: 'unauthenticated' } };
  return { userId: user.id };
}

export async function saveAnthropicKey(apiKey: string): Promise<IntegrationsActionResult> {
  const ctx = await requireUserId();
  if ('error' in ctx) return ctx.error;

  const trimmed = apiKey.trim();
  if (!KEY_FORMAT_RE.test(trimmed)) {
    return { ok: false, code: 'invalid_key_format' };
  }

  const test = await testAnthropicKey(trimmed);
  if (!test.ok) {
    return { ok: false, code: test.code, message: test.message };
  }

  const { ciphertext, nonce, last4 } = encryptApiKey(trimmed);
  const svc = getServiceSupabaseClient();
  // ciphertext + nonce are stored as base64 in text columns (see migration
  // 20260520170000) — bytea round-trip through supabase-js was unreliable
  // because Buffer JSON-serialised as {type:'Buffer',data:[...]}.
  const upsert = await svc
    .from('user_integrations')
    .upsert({
      profile_id: ctx.userId,
      anthropic_api_key_ciphertext: ciphertext.toString('base64'),
      anthropic_api_key_nonce: nonce.toString('base64'),
      anthropic_api_key_last4: last4,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' });
  if (upsert.error) throw new Error(`user_integrations upsert: ${upsert.error.message}`);

  revalidatePath('/app/account');
  return { ok: true };
}

export async function testStoredAnthropicKey(): Promise<IntegrationsActionResult> {
  const ctx = await requireUserId();
  if ('error' in ctx) return ctx.error;

  const lookup = await getAnthropicClientForProfile(ctx.userId);
  if (!lookup.ok) {
    if (lookup.code === 'no_claude_key') {
      return { ok: false, code: 'invalid_key', message: 'No key on file' };
    }
    return { ok: false, code: 'invalid_key', message: lookup.message };
  }
  try {
    await lookup.client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return { ok: false, code: 'invalid_key', message };
  }
}

export async function removeAnthropicKey(): Promise<IntegrationsActionResult> {
  const ctx = await requireUserId();
  if ('error' in ctx) return ctx.error;

  const svc = getServiceSupabaseClient();
  const del = await svc.from('user_integrations').delete().eq('profile_id', ctx.userId);
  if (del.error) throw new Error(`user_integrations delete: ${del.error.message}`);

  revalidatePath('/app/account');
  return { ok: true };
}
