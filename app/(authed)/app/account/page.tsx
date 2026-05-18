import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

import { AccountForm } from './AccountForm';
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
    .select('full_name, email, created_at, avatar_url')
    .eq('id', user.id)
    .single();
  if (profileRes.error) {
    throw new Error(`Failed to load profile: ${profileRes.error.message}`);
  }

  const email = profileRes.data.email;
  const fullName = profileRes.data.full_name?.trim() || null;
  const initialAvatarUrl = profileRes.data.avatar_url ?? null;
  const createdAt = new Date(profileRes.data.created_at);
  const createdLabel = createdAt.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[640px] flex-col gap-8 px-5 py-10">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            BrickThink
          </p>
          <h1
            data-testid="account-heading"
            className="text-[26px] font-semibold tracking-tight text-zinc-950"
          >
            Account
          </h1>
          <p className="text-[13px] text-zinc-500">Joined {createdLabel}.</p>
        </header>

        <section className="rounded-2xl border border-zinc-900/10 bg-white p-6">
          <AccountForm
            initialFullName={fullName}
            email={email}
            initialAvatarUrl={initialAvatarUrl}
          />
        </section>

        <ReplayWalkthroughCard />

        <ContributionCard />

        <DangerZone email={email} />
      </div>
    </main>
  );
}
