import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

import { normaliseA11yPreferences } from '@/lib/a11y/preferences';

import { A11yPreferencesCard } from './A11yPreferencesCard';
import { AccountForm } from './AccountForm';
import { BuyMeACoffeeCard } from './BuyMeACoffeeCard';
import { ContributionCard } from './ContributionCard';
import { DangerZone } from './DangerZone';
import { ReplayWalkthroughCard } from './ReplayWalkthroughCard';

export const metadata: Metadata = { title: 'Account' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Faccount');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount');

  const profileRes = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, a11y_preferences')
    .eq('id', user.id)
    .single();
  if (profileRes.error) {
    throw new Error(`Failed to load profile: ${profileRes.error.message}`);
  }

  const email = profileRes.data.email;
  const fullName = profileRes.data.full_name?.trim() || null;
  const initialAvatarUrl = profileRes.data.avatar_url ?? null;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Left column — profile anchor tile with the contribution tile beneath it. */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <section className="rounded-2xl border border-zinc-900/10 bg-white p-6">
            <AccountForm
              initialFullName={fullName}
              email={email}
              initialAvatarUrl={initialAvatarUrl}
            />
          </section>

          {/* Contribution — sits directly under the profile section. */}
          <ContributionCard />
        </div>

        {/* Right rail — stacked preference + walkthrough + tip-jar tiles. */}
        <div className="flex flex-col gap-4">
          <A11yPreferencesCard
            initialColourblindMode={
              normaliseA11yPreferences(profileRes.data.a11y_preferences).colourblindMode
            }
          />
          <ReplayWalkthroughCard />
          <BuyMeACoffeeCard />
        </div>

        {/* Danger zone — full-width footer tile. */}
        <div className="lg:col-span-3">
          <DangerZone email={email} />
        </div>
      </div>
    </div>
  );
}
