import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { PageBanner } from '@/components/app/PageBanner';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

export const dynamic = 'force-dynamic';

/**
 * Shared chrome for the account area: just the page banner. Each route renders
 * its own body content (and the Settings/Billing tab bar lives in the body,
 * top-left, on the settings and billing pages).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
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
    .select('created_at')
    .eq('id', user.id)
    .single();
  const createdLabel = profileRes.data?.created_at
    ? new Date(profileRes.data.created_at).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <PageBanner
        eyebrow="BrickThink"
        title="Account"
        titleTestId="account-heading"
        subtitle={createdLabel ? `Joined ${createdLabel}.` : undefined}
      />
      {children}
    </main>
  );
}
