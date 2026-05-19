'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { encryptApiKey } from '@/lib/integrations/crypto';
import { testAnthropicKey } from '@/lib/integrations/anthropic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_FORMAT_RE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

export type IntegrationsActionResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'unauthenticated'
        | 'invalid_uuid'
        | 'not_org_admin'
        | 'invalid_key_format'
        | 'invalid_key'
        | 'network_error';
      message?: string;
    };

async function requireOrgAdmin(
  orgId: string,
): Promise<{ error: IntegrationsActionResult & { ok: false } } | { userId: string }> {
  if (!UUID_RE.test(orgId)) {
    return { error: { ok: false, code: 'invalid_uuid' } };
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { ok: false, code: 'unauthenticated' } };

  const { data, error } = await supabase.rpc('is_org_admin', { p_org_id: orgId });
  if (error) throw new Error(`is_org_admin failed: ${error.message}`);
  if (!data) return { error: { ok: false, code: 'not_org_admin' } };
  return { userId: user.id };
}

export async function saveAnthropicKey(
  orgId: string,
  apiKey: string,
): Promise<IntegrationsActionResult> {
  const ctx = await requireOrgAdmin(orgId);
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
  const upsert = await svc.from('org_integrations').upsert(
    {
      org_id: orgId,
      anthropic_api_key_ciphertext: ciphertext,
      anthropic_api_key_nonce: nonce,
      anthropic_api_key_last4: last4,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' },
  );
  if (upsert.error) throw new Error(`org_integrations upsert: ${upsert.error.message}`);

  revalidatePath(`/app/orgs/${orgId}/settings/integrations`);
  return { ok: true };
}

export async function testStoredAnthropicKey(
  orgId: string,
): Promise<IntegrationsActionResult> {
  const ctx = await requireOrgAdmin(orgId);
  if ('error' in ctx) return ctx.error;

  const { getAnthropicClientForOrg } = await import('@/lib/integrations/anthropic');
  const lookup = await getAnthropicClientForOrg(orgId);
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

export async function removeAnthropicKey(
  orgId: string,
): Promise<IntegrationsActionResult> {
  const ctx = await requireOrgAdmin(orgId);
  if ('error' in ctx) return ctx.error;

  const svc = getServiceSupabaseClient();
  const del = await svc.from('org_integrations').delete().eq('org_id', orgId);
  if (del.error) throw new Error(`org_integrations delete: ${del.error.message}`);

  revalidatePath(`/app/orgs/${orgId}/settings/integrations`);
  return { ok: true };
}
