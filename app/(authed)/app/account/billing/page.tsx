import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { isBillingEnabled } from '@/lib/billing/env';
import { isSubscriptionEntitled } from '@/lib/billing/entitlements';
import { PageBanner } from '@/components/app/PageBanner';
import BillingActions from './BillingActions';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount%2Fbilling');

  const billingOn = isBillingEnabled();
  const { data: sub } = await supabase
    .from('facilitator_subscriptions')
    .select('status, current_period_end')
    .eq('profile_id', user.id)
    .maybeSingle();
  const entitled = isSubscriptionEntitled(sub ?? null, new Date());

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <PageBanner eyebrow="Account" title="Billing" maxWidthClassName="max-w-[640px]" />
      <div className="mx-auto max-w-[640px] px-5 py-10">
        {!billingOn ? (
          <p className="text-sm text-zinc-600">
            Billing is not enabled on this instance — all features are available for free.
          </p>
        ) : (
          <BillingActions
            entitled={entitled}
            status={sub?.status ?? null}
            periodEnd={sub?.current_period_end ?? null}
          />
        )}
      </div>
    </main>
  );
}
