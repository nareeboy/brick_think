import Link from 'next/link';

import { getOrgPlan, PLAN_DISPLAY_NAME, type PlanTier } from '@/lib/billing/plans';
import { createServerSupabaseClient } from '@/lib/db/server';

import { BillingRowActions } from './BillingActions';

interface OwnedOrg {
  id: string;
  name: string;
  slug: string;
}

interface BillingRow {
  org: OwnedOrg;
  tier: PlanTier;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
}

function formatPeriodEnd(value: string | null, cancelAtPeriodEnd: boolean): string | null {
  if (!value) return null;
  const date = new Date(value);
  const label = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return cancelAtPeriodEnd ? `Cancels on ${label}` : `Renews ${label}`;
}

function statusLabel(status: string | null): string | null {
  if (!status || status === 'active' || status === 'trialing') return null;
  return status.replace(/_/g, ' ');
}

export async function BillingCard({ userId }: { userId: string }) {
  const supabase = await createServerSupabaseClient();
  const orgsRes = await supabase
    .from('organisations')
    .select('id, name, slug')
    .eq('owner_id', userId)
    .order('name', { ascending: true });
  if (orgsRes.error) throw new Error(`Failed to load orgs: ${orgsRes.error.message}`);
  const orgs = (orgsRes.data ?? []) as OwnedOrg[];

  const rows: BillingRow[] = await Promise.all(
    orgs.map(async (org) => {
      const plan = await getOrgPlan(org.id);
      return {
        org,
        tier: plan.tier,
        status: plan.status,
        currentPeriodEnd: plan.currentPeriodEnd,
        cancelAtPeriodEnd: plan.cancelAtPeriodEnd,
        hasStripeCustomer: plan.hasStripeCustomer,
      };
    }),
  );

  return (
    <section className="rounded-2xl border border-zinc-900/10 bg-white p-6">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Plan &amp; billing
        </p>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Subscriptions
        </h2>
        <p className="text-[12px] text-zinc-500">
          Subscriptions are billed per organisation. Each row below is an organisation you own.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-zinc-900/10 bg-[#FBF7F1] px-4 py-3 text-[13px] text-zinc-600">
          You don&rsquo;t own an organisation yet.{' '}
          <Link
            href="/app/orgs/new"
            className="font-semibold text-[#c0613d] underline-offset-4 hover:underline"
          >
            Create one
          </Link>{' '}
          to subscribe to a paid plan.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3" data-testid="account-billing-list">
          {rows.map((row) => {
            const periodLabel = formatPeriodEnd(row.currentPeriodEnd, row.cancelAtPeriodEnd);
            const status = statusLabel(row.status);
            return (
              <li
                key={row.org.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-900/10 bg-[#FBF7F1] p-4 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`account-billing-row-${row.org.slug}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/orgs/${row.org.id}`}
                      className="truncate text-[14px] font-semibold text-zinc-900 underline-offset-4 hover:underline"
                    >
                      {row.org.name}
                    </Link>
                    <span className="inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                      {PLAN_DISPLAY_NAME[row.tier]}
                    </span>
                    {status ? (
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-800">
                        {status}
                      </span>
                    ) : null}
                  </div>
                  {periodLabel ? (
                    <p className="mt-1 text-[12px] text-zinc-500">{periodLabel}</p>
                  ) : (
                    <p className="mt-1 text-[12px] text-zinc-500">
                      No active subscription.
                    </p>
                  )}
                </div>
                <BillingRowActions
                  orgId={row.org.id}
                  tier={row.tier}
                  hasStripeCustomer={row.hasStripeCustomer}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
