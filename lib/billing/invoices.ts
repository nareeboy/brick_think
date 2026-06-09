import 'server-only';
import { getStripe } from './stripe';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';

export interface InvoiceSummary {
  id: string;
  number: string | null;
  created: number; // unix seconds
  total: number; // smallest currency unit (cents)
  currency: string;
  status: string; // 'paid' | 'open' | 'void' | 'uncollectible'
  hostedUrl: string | null;
  pdfUrl: string | null;
}

/**
 * Stripe invoices for a facilitator's billing history. Resolves the customer via
 * the service-role-only `stripe_customers` table (clients can't read it), then
 * lists invoices newest-first. Returns [] when there's no customer or on any
 * Stripe error — the billing page renders an empty state rather than failing.
 */
export async function listInvoicesForProfile(
  profileId: string,
  limit = 12,
): Promise<InvoiceSummary[]> {
  const svc = createServiceRoleSupabaseClient();
  const { data, error } = await svc
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error || !data?.stripe_customer_id) return [];

  try {
    const res = await getStripe().invoices.list({ customer: data.stripe_customer_id, limit });
    return res.data
      .filter((inv) => inv.status !== 'draft')
      .map((inv) => ({
        id: inv.id ?? '',
        number: inv.number ?? null,
        created: inv.created,
        total: inv.total,
        currency: inv.currency,
        status: inv.status ?? 'open',
        hostedUrl: inv.hosted_invoice_url ?? null,
        pdfUrl: inv.invoice_pdf ?? null,
      }));
  } catch (err) {
    console.error('[billing] listInvoicesForProfile failed', err);
    return [];
  }
}
