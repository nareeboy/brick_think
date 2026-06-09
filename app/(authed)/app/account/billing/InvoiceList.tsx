import type { InvoiceSummary } from '@/lib/billing/invoices';

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-700',
  open: 'bg-amber-500/10 text-amber-700',
  uncollectible: 'bg-red-500/10 text-red-700',
  void: 'bg-zinc-900/5 text-zinc-500',
};

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(total: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(total / 100);
}

export function InvoiceList({ invoices }: { invoices: InvoiceSummary[] }) {
  return (
    <section className="rounded-2xl border border-zinc-900/10 bg-white p-6">
      <h2 className="text-[15px] font-semibold text-zinc-950">Billing history</h2>
      <p className="mt-1 text-[13px] text-zinc-600">Your invoices and receipts.</p>

      {invoices.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No invoices yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-900/10 border-t border-zinc-900/10">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">
                  {formatDate(inv.created)}
                  {inv.number ? (
                    <span className="font-normal text-zinc-500"> · {inv.number}</span>
                  ) : null}
                </p>
                <p className="text-[13px] text-zinc-600">{formatAmount(inv.total, inv.currency)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
                    STATUS_STYLES[inv.status] ?? 'bg-zinc-900/5 text-zinc-600'
                  }`}
                >
                  {inv.status}
                </span>
                {inv.hostedUrl ? (
                  <a
                    href={inv.hostedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="cursor-pointer text-[13px] font-medium text-zinc-900 underline-offset-2 hover:underline"
                  >
                    View
                  </a>
                ) : null}
                {inv.pdfUrl ? (
                  <a
                    href={inv.pdfUrl}
                    className="cursor-pointer text-[13px] font-medium text-zinc-600 underline-offset-2 hover:underline"
                  >
                    PDF
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
