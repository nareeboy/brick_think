'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { seedExampleWorkshop } from '@/lib/exampleWorkshop/seed';

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export interface CreateExampleWorkshopFailure {
  ok: false;
  code: 'unauthenticated' | 'seed_failed';
}

// The example org holds exactly one session. Returns null when the caller has
// no example yet, or when they deleted its session — in both cases the caller
// should seed a fresh one rather than dead-end on a missing page.
async function findExistingExampleSessionId(
  supabase: ServerClient,
  userId: string,
): Promise<string | null> {
  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_example', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!org) return null;

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('org_id', org.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return session?.id ?? null;
}

// Seeds the caller a complete example workshop (completed session, filled
// stages, participants, narrations) and redirects to it. On success the
// redirect throws, so callers only ever see the failure union.
//
// Open to every signed-in user — it is how someone sees what a finished
// workshop looks like before running one. Regular users get exactly one:
// a later click reopens it instead of piling up demo orgs. Site admins are
// exempt from that rule, because a fresh seed each time is what makes this
// usable as the fixture for the paid post-session flows.
export async function createExampleWorkshopAction(): Promise<CreateExampleWorkshopFailure> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  // RLS-scoped read of the caller's own row — same gate postLoginDestination
  // uses.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_site_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isSiteAdmin = profile?.is_site_admin === true;

  if (!isSiteAdmin) {
    // Outside the try: redirect() signals by throwing.
    const existingSessionId = await findExistingExampleSessionId(supabase, user.id);
    if (existingSessionId) redirect(`/app/sessions/${existingSessionId}`);
  }

  let sessionId: string;
  try {
    ({ sessionId } = await seedExampleWorkshop(getServiceSupabaseClient(), {
      facilitatorId: user.id,
    }));
  } catch (err) {
    console.error('createExampleWorkshopAction failed', err);
    return { ok: false, code: 'seed_failed' };
  }

  revalidatePath('/app/workshops');
  redirect(`/app/sessions/${sessionId}`);
}
