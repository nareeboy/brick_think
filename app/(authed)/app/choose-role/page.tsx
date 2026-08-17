import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { RoleChooserCards } from '@/components/onboarding/RoleChooserCards';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { isTutorialGuest } from '@/lib/onboarding/guestGate';

export const metadata: Metadata = { title: 'Welcome' };
export const dynamic = 'force-dynamic';

/**
 * First-run role question as a full page (not an overlay). Unanswered users
 * are steered here from the hub pages by RoleChooserRedirect; answering (or
 * arriving already-answered) routes to /app/my-designs.
 */
export default async function ChooseRolePage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Fmy-designs');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fmy-designs');

  const guest = await isTutorialGuest(supabase, user.id);

  return (
    <main className="flex min-h-[100dvh] items-start justify-center bg-[#FAF7F1] text-zinc-900">
      <RoleChooserCards guest={guest} />
    </main>
  );
}
