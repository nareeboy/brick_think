import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { GlobalHeader } from '@/components/app/GlobalHeader';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { OrgRole, OrgSummary } from '@/lib/orgs/types';

export const dynamic = 'force-dynamic';

export default async function AuthedAppLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp');

  const [profileRes, membershipsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('active_org_id, full_name, email')
      .eq('id', user.id)
      .single(),
    supabase
      .from('org_memberships')
      .select('role, organisations:org_id ( id, name, slug )')
      .eq('profile_id', user.id),
  ]);

  if (profileRes.error) {
    throw new Error(`Failed to load profile: ${profileRes.error.message}`);
  }

  const orgs: OrgSummary[] = (membershipsRes.data ?? [])
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

  const activeOrgId = profileRes.data?.active_org_id ?? null;
  const email = profileRes.data?.email ?? user.email ?? null;
  // When profiles.full_name happens to equal the email's local part (e.g.
  // Google OAuth backfilled "mail" from "mail@naresh-shan.com"), the name
  // looks like a truncated email in the header. Fall through to the full
  // email in that case. Legitimate names (containing a space, or distinct
  // from the local part) are still preferred.
  const fullName = profileRes.data?.full_name?.trim() || null;
  const emailLocalPart = email?.split('@')[0]?.toLowerCase() ?? null;
  const fullNameLooksLikeEmailPrefix =
    fullName !== null &&
    emailLocalPart !== null &&
    fullName.toLowerCase() === emailLocalPart;
  const userName =
    (fullNameLooksLikeEmailPrefix ? null : fullName) || email || 'You';

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FAF7F1] text-zinc-900">
      <GlobalHeader
        orgs={orgs}
        activeOrgId={activeOrgId}
        userName={userName}
        userEmail={email}
      />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
