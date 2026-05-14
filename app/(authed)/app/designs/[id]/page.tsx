import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { Builder } from '@/components/builder/Builder';
import { UserBar } from '@/components/builder/UserBar';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { parseCanvasState } from '@/lib/models/canvasState';
import type { ModelDetail } from '@/lib/models/types';
import type { OrgRole, OrgSummary } from '@/lib/orgs/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: 'Builder' };
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('models')
    .select('title')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  return { title: data?.title ? `${data.title} · Builder` : 'Builder' };
}

export default async function DesignBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    redirect(`/sign-in?reason=unconfigured&next=%2Fapp%2Fdesigns%2F${id}`);
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=%2Fapp%2Fdesigns%2F${id}`);

  const { data, error } = await supabase
    .from('models')
    .select('id, title, canvas_state, updated_at, owner_profile_id, org_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error || !data) notFound();

  const initialModel: ModelDetail = {
    id: data.id,
    title: data.title,
    updated_at: data.updated_at,
    thumbnail_url: null,
    canvas_state: parseCanvasState(data.canvas_state),
  };

  const readOnly = data.owner_profile_id !== user.id;
  const ownerLabel = await loadOwnerLabel(supabase, data.owner_profile_id, readOnly);

  const { data: membershipRows, error: membershipError } = await supabase
    .from('org_memberships')
    .select('role, organisations:org_id ( id, name, slug )')
    .eq('profile_id', user.id);
  if (membershipError) {
    throw new Error(`Failed to load orgs: ${membershipError.message}`);
  }
  const orgs: OrgSummary[] = (membershipRows ?? [])
    .map((row): OrgSummary | null => {
      const org = (row as { organisations: { id: string; name: string; slug: string } | null }).organisations;
      if (!org) return null;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: (row as { role: OrgRole }).role,
      };
    })
    .filter((o): o is OrgSummary => o !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Builder
      userBar={<UserBar email={user.email} />}
      initialModel={initialModel}
      readOnly={readOnly}
      ownerLabel={ownerLabel}
      orgId={data.org_id ?? null}
      orgs={orgs}
    />
  );
}

async function loadOwnerLabel(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  ownerProfileId: string,
  readOnly: boolean,
): Promise<string | null> {
  if (!readOnly) return null;
  const { data } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', ownerProfileId)
    .single();
  return data?.full_name ?? data?.email ?? null;
}
