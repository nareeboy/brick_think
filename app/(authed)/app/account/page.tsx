import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

import { normaliseA11yPreferences } from '@/lib/a11y/preferences';

import { isBillingEnabled } from '@/lib/billing/env';

import { BrandingSettingsSlot } from '@/lib/premium/client';

import { A11yPreferencesCard } from './A11yPreferencesCard';
import { AccountForm } from './AccountForm';
import { AccountTabs } from './AccountTabs';
import { BuyMeACoffeeCard } from './BuyMeACoffeeCard';
import { ContributionCard } from './ContributionCard';
import { DangerZone } from './DangerZone';
import { ReplayWalkthroughCard } from './ReplayWalkthroughCard';

export const metadata: Metadata = { title: 'Account' };
export const dynamic = 'force-dynamic';

/** Section divider title between the stacked utility cards in the left column. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-3 px-1 font-display text-xl text-zinc-900">{children}</h2>;
}

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
      <div className="mb-6">
        <AccountTabs showBilling={isBillingEnabled()} />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Left column — profile anchor, then the titled utility sections beneath it. */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SectionTitle>Profile</SectionTitle>
          <section className="rounded-2xl border border-zinc-900/10 bg-white p-6">
            <AccountForm
              initialFullName={fullName}
              email={email}
              initialAvatarUrl={initialAvatarUrl}
            />
          </section>

          <SectionTitle>Preferences</SectionTitle>
          <A11yPreferencesCard
            initialColourblindMode={
              normaliseA11yPreferences(profileRes.data.a11y_preferences).colourblindMode
            }
          />

          <SectionTitle>Onboarding</SectionTitle>
          <ReplayWalkthroughCard />

          <SectionTitle>Support</SectionTitle>
          <BuyMeACoffeeCard />
        </div>

        {/* Right rail — brand presets + contribution, each under a section title. */}
        <div className="flex flex-col gap-4">
          <BrandingSettingsSlot />

          <SectionTitle>Open source</SectionTitle>
          <ContributionCard />
        </div>

        {/* Danger zone — matches the left container width. */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SectionTitle>Danger zone</SectionTitle>
          <DangerZone email={email} />
        </div>
      </div>
    </div>
  );
}
