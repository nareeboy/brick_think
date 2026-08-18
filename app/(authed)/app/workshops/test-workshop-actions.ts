'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { seedTestWorkshop } from '@/lib/testWorkshop/seed';

export interface CreateTestWorkshopFailure {
  ok: false;
  code: 'unauthenticated' | 'not_site_admin' | 'seed_failed';
}

// Site-admin-only: seeds a complete test workshop (completed session, filled
// stages, participants, narrations) and redirects to it. On success the
// redirect throws, so callers only ever see the failure union.
export async function createTestWorkshopAction(): Promise<CreateTestWorkshopFailure> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  // RLS-scoped read of the caller's own row — same gate postLoginDestination
  // uses. The service client below is only reached by verified site admins.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_site_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.is_site_admin !== true) return { ok: false, code: 'not_site_admin' };

  let sessionId: string;
  try {
    ({ sessionId } = await seedTestWorkshop(getServiceSupabaseClient(), {
      facilitatorId: user.id,
    }));
  } catch (err) {
    console.error('createTestWorkshopAction failed', err);
    return { ok: false, code: 'seed_failed' };
  }

  revalidatePath('/app/workshops');
  redirect(`/app/sessions/${sessionId}`);
}
