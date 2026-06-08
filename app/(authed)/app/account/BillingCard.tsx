import Link from 'next/link';

interface Props {
  billingEnabled: boolean;
  entitled: boolean;
}

export function BillingCard({ billingEnabled, entitled }: Props) {
  if (!billingEnabled) return null;
  return (
    <section className="rounded-2xl border border-zinc-900/10 bg-white p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Subscription
      </p>
      <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-950">
        {entitled ? 'Active' : 'Upgrade'}
      </h2>
      <p className="mt-1 text-[13px] text-zinc-600">
        {entitled
          ? 'PDF reports and transcript cleanup are unlocked.'
          : 'Unlock PDF session reports and automatic transcript cleanup.'}
      </p>
      <Link
        href="/app/account/billing"
        className="mt-4 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800"
      >
        {entitled ? 'Manage subscription' : 'View plans'}
      </Link>
    </section>
  );
}
