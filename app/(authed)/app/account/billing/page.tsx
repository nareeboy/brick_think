import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { isBillingEnabled } from '@/lib/billing/env';
import { isSubscriptionEntitled } from '@/lib/billing/entitlements';
import { PageBanner } from '@/components/app/PageBanner';
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

  let entitled = false;
  let status: string | null = null;
  let renewsLabel: string | null = null;

  if (billingOn) {
    const { data: sub } = await supabase
      .from('facilitator_subscriptions')
      .select('status, current_period_end')
      .eq('profile_id', user.id)
      .maybeSingle();
    entitled = isSubscriptionEntitled(sub ?? null, new Date());
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
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <PageBanner eyebrow="Account" title="Billing" maxWidthClassName="max-w-[640px]" />
      <div className="mx-auto max-w-[640px] px-5 py-10">
        {!billingOn ? (
          <p className="text-sm text-zinc-600">
            Billing is not enabled on this instance — all features are available for free.
          </p>
        ) : (
          <BillingActions entitled={entitled} status={status} renewsLabel={renewsLabel} />
        )}
      </div>
    </main>
  );
}
