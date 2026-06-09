import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PageBanner } from '@/components/app/PageBanner';
import { FacilitatorChecklist } from '@/components/onboarding/FacilitatorChecklist';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { computeFacilitatorChecklistProgress } from '@/lib/onboarding/facilitatorProgress';
import type { OrgRole, OrgSummary } from '@/lib/orgs/types';

export const metadata: Metadata = { title: 'Workshops' };
export const dynamic = 'force-dynamic';

interface OrgWithCount extends OrgSummary {
  member_count: number;
}

export default async function OrgsPage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Forgs');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Forgs');

  const { data, error } = await supabase
    .from('org_memberships')
    .select('role, organisations:org_id ( id, name, slug )')
    .eq('profile_id', user.id);
  if (error) throw new Error(`Failed to load workshops: ${error.message}`);

  const summaries: OrgSummary[] = (data ?? [])
    .map((row): OrgSummary | null => {
      const org = (row as { organisations: { id: string; name: string; slug: string } | null })
        .organisations;
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

  const counts = await Promise.all(
    summaries.map(async (o) => {
      const { count } = await supabase
        .from('org_memberships')
        .select('profile_id', { count: 'exact', head: true })
        .eq('org_id', o.id);
      return [o.id, count ?? 0] as const;
    }),
  );
  const countByOrg = new Map(counts);
  const orgs: OrgWithCount[] = summaries.map((o) => ({
    ...o,
    member_count: countByOrg.get(o.id) ?? 0,
  }));

  // Onboarding walkthrough — the orgs list is where step 1 (create an org)
  // happens. We already have the user's orgs, so pass them in to skip a
  // duplicate membership query.
  const onboardingProgress = await computeFacilitatorChecklistProgress(supabase, user.id, {
    orgIds: summaries.map((o) => o.id),
    firstOrgId: summaries[0]?.id ?? null,
  });

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <PageBanner
        eyebrow="BrickThink"
        title="Workshops"
        actions={
          <Link
            href="/app/workshops/new"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white shadow-[0_20px_30px_-15px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47]"
          >
            New workshop
          </Link>
        }
      />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10">
        <FacilitatorChecklist progress={onboardingProgress} />

        {orgs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-900/15 p-8 text-center text-[13px] text-zinc-500">
            No workshops yet. Create one to share designs with teammates.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((o) => (
              <li
                key={o.id}
                data-scroll-target=""
                className="rounded-2xl border border-zinc-900/10 bg-white p-4 transition-colors hover:bg-[#FAF7F1]"
              >
                <Link
                  href={`/app/workshops/${o.id}`}
                  aria-label={`Open ${o.name}`}
                  className="block"
                >
                  <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl border border-zinc-900/5 bg-[#FBF7F1]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> per CLAUDE.md to avoid host whitelist */}
                    <img
                      src={`https://picsum.photos/seed/${o.id}/640/480`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex max-w-full items-center gap-1.5">
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
                        o.role === 'owner'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-orange-100 text-orange-900'
                      }`}
                    >
                      {o.role}
                    </span>
                    <span className="truncate text-[12px] text-zinc-600">{o.name}</span>
                  </div>
                  <p className="mt-2 text-[12px] text-zinc-600">
                    {o.member_count} member{o.member_count === 1 ? '' : 's'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
