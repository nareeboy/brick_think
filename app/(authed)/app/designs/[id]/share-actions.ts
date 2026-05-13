'use server';

import { randomBytes } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/db/server';
import { isShareTtl, ttlToExpiresAt, type ShareTtl } from '@/lib/share/ttl';

// Forward-compat gate: v1 only deals with personal designs.
// When stream 1 (org-wide) adds models.org_id, uncomment the org check.
// When stream 2 (sessions) adds models.session_id, uncomment the session check.
// Session designs and org-shared designs are NOT shareable externally per Q7a/Q7b.
// FORWARD_COMPAT_GATE_BEGIN
// if (model.session_id !== null) throw new Error('Session designs are not shareable.');
// if (model.org_id !== null) throw new Error('Org-shared designs are not shareable.');
// FORWARD_COMPAT_GATE_END

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fdesigns');
  return { supabase, user };
}

function generateToken(): string {
  // 32 bytes → 43 chars base64url, ~256 bits of entropy.
  return randomBytes(32).toString('base64url');
}

export interface CreatedShareLink {
  id: string;
  token: string;
  expiresAt: string | null;
}

export async function createShareLink(
  modelId: string,
  ttl: ShareTtl,
): Promise<CreatedShareLink> {
  if (!isShareTtl(ttl)) throw new Error(`Invalid ttl: ${String(ttl)}`);

  const { supabase, user } = await requireUser();

  // Confirm ownership up front; RLS would block the insert anyway but this
  // gives a friendlier error and is where the forward-compat gate lives.
  const modelRes = await supabase
    .from('models')
    .select('id, owner_profile_id')
    .eq('id', modelId)
    .single();
  if (modelRes.error || !modelRes.data) {
    throw new Error('Model not found or not owned by you');
  }

  // Defence in depth. The user-scoped Supabase client + RLS already filters
  // out non-owner rows above, so this branch only fires if RLS is bypassed
  // (e.g. someone refactors to the service-role client). Keep it as a tripwire.
  if (modelRes.data.owner_profile_id !== user.id) {
    throw new Error('Model not found or not owned by you');
  }

  const token = generateToken();
  const expiresAt = ttlToExpiresAt(ttl);

  const insertRes = await supabase
    .from('model_share_links')
    .insert({
      model_id: modelId,
      created_by: user.id,
      token,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    })
    .select('id, token, expires_at')
    .single();
  if (insertRes.error || !insertRes.data) {
    throw new Error(`Failed to create share link: ${insertRes.error?.message}`);
  }

  revalidatePath(`/app/designs/${modelId}`);

  return {
    id: insertRes.data.id,
    token: insertRes.data.token,
    expiresAt: insertRes.data.expires_at,
  };
}
