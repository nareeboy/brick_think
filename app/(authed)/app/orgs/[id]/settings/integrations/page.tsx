import { notFound, redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';

import IntegrationsClient from './IntegrationsClient';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // is_org_admin is the canonical authz gate; non-admins get a 404 rather
  // than a 403 to avoid leaking the route's existence.
  const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_org_admin', { p_org_id: id });
  if (rpcErr) throw new Error(rpcErr.message);
  if (!isAdmin) notFound();

  const svc = getServiceSupabaseClient();
  const { data: org } = await svc
    .from('organisations')
    .select('id, name')
    .eq('id', id)
    .single();
  if (!org) notFound();

  const { data: integration } = await svc
    .from('org_integrations')
    .select('anthropic_api_key_last4, updated_at')
    .eq('org_id', id)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{org.name}</p>
        <h1 className="font-display text-3xl text-zinc-900">Integrations</h1>
        <p className="text-sm text-zinc-600">
          Connect an Anthropic API key so this org can generate session reports.
        </p>
      </header>

      <IntegrationsClient
        orgId={org.id}
        existingLast4={integration?.anthropic_api_key_last4 ?? null}
        existingUpdatedAt={integration?.updated_at ?? null}
      />
    </main>
  );
}
