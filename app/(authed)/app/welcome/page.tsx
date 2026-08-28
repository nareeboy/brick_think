import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { normaliseOnboarding } from '@/lib/onboarding/config';
import { isTutorialGuest } from '@/lib/onboarding/guestGate';

import { WelcomeFlow } from './WelcomeFlow';

export const metadata: Metadata = { title: 'Welcome' };
export const dynamic = 'force-dynamic';

/**
 * The five-step configuration flow (replaces /app/choose-role). Full page, no
 * app chrome, no cookie banner. Asks questions and writes state; teaches
 * nothing and never points at UI — instruction stays with the tours.
 *
 * Auto-skip: join-link arrivals and guest-gate detections never see it, and a
 * completed configuration bounces straight to the hub — a returning user on a
 * new device hydrates from the server and never re-answers.
 */
export default async function WelcomePage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Fmy-designs');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fmy-designs');

  const [guest, profileRes] = await Promise.all([
    isTutorialGuest(supabase, user.id),
    supabase.from('profiles').select('onboarding').eq('id', user.id).single(),
  ]);
  if (guest) redirect('/app/my-designs');
  if (profileRes.error) {
    throw new Error(`Failed to load onboarding state: ${profileRes.error.message}`);
  }
  const onboarding = normaliseOnboarding(profileRes.data.onboarding);
  if (onboarding.config.completedAt !== null) redirect('/app/my-designs');

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <WelcomeFlow />
    </main>
  );
}
