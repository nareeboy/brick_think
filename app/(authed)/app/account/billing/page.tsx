import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/db/server';
import { isBillingEnabled } from '@/lib/billing/env';
import { subscriptionTierFromRow } from '@/lib/billing/entitlements';
import { type Tier } from '@/lib/billing/plans';
import { listInvoicesForProfile } from '@/lib/billing/invoices';
import { AccountTabs } from '../AccountTabs';
import BillingActions from './BillingActions';
import { InvoiceList, InvoiceListSkeleton } from './InvoiceList';

export const metadata: Metadata = { title: 'Billing' };
export const dynamic = 'force-dynamic';

/**
 * Invoices come from a live Stripe API call. Isolating it in its own async
 * component lets the page shell (tabs + subscription summary, both DB-only)
 * paint immediately while this streams in behind <Suspense> — instead of the
 * whole page blocking on Stripe's latency.
 */
async function BillingInvoices({ profileId }: { profileId: string }) {
  const invoices = await listInvoicesForProfile(profileId);
  return <InvoiceList invoices={invoices} />;
}

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
  let cancelAtPeriodEnd = false;

  if (billingOn) {
    const { data: sub } = await supabase
      .from('facilitator_subscriptions')
      .select('status, current_period_end, tier, cancel_at_period_end')
      .eq('profile_id', user.id)
      .maybeSingle();
    currentTier = subscriptionTierFromRow(sub ?? null, new Date());
    status = sub?.status ?? null;
    cancelAtPeriodEnd = sub?.cancel_at_period_end ?? false;
    renewsLabel = sub?.current_period_end
      ? new Date(sub.current_period_end).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <div className="mb-6">
        <AccountTabs showBilling={billingOn} />
      </div>
      {!billingOn ? (
        <p className="text-sm text-zinc-600">
          Billing is not enabled on this instance — all features are available for free.
        </p>
      ) : (
        <div className="space-y-8">
          <BillingActions
            currentTier={currentTier}
            status={status}
            renewsLabel={renewsLabel}
            cancelAtPeriodEnd={cancelAtPeriodEnd}
          />
          <Suspense fallback={<InvoiceListSkeleton />}>
            <BillingInvoices profileId={user.id} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
