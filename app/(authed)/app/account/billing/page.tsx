import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { isBillingEnabled } from '@/lib/billing/env';
import { subscriptionTierFromRow } from '@/lib/billing/entitlements';
import { type Tier } from '@/lib/billing/plans';
import BillingActions from './BillingActions';

export const metadata: Metadata = { title: 'Billing' };
export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount%2Fbilling');

  const billingOn = isBillingEnabled();

  let currentTier: Tier | null = null;
  let status: string | null = null;
  let renewsLabel: string | null = null;

  if (billingOn) {
    const { data: sub } = await supabase
      .from('facilitator_subscriptions')
      .select('status, current_period_end, tier')
      .eq('profile_id', user.id)
      .maybeSingle();
    currentTier = subscriptionTierFromRow(sub ?? null, new Date());
    status = sub?.status ?? null;
    renewsLabel = sub?.current_period_end
      ? new Date(sub.current_period_end).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null;
  }

  return (
    <div className="mx-auto max-w-[1040px] px-5 py-10">
      {!billingOn ? (
        <p className="text-sm text-zinc-600">
          Billing is not enabled on this instance — all features are available for free.
        </p>
      ) : (
        <BillingActions currentTier={currentTier} status={status} renewsLabel={renewsLabel} />
      )}
    </div>
  );
}
