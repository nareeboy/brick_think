import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { BrandEyebrow } from '@/components/app/BrandEyebrow';
import { PageBanner } from '@/components/app/PageBanner';
import { ExampleWorkshopButton } from './ExampleWorkshopButton';
import { WorkshopsEmptyState } from './WorkshopsEmptyState';
import { CreateWorkshopSpotlight } from '@/components/onboarding/CreateWorkshopSpotlight';
import { loadDisplayName } from '@/lib/account/displayName';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { AssistantEntrySlot } from '@/lib/premium/server-slots';
import type { OrgRole, OrgSummary } from '@/lib/orgs/types';

export const metadata: Metadata = { title: 'Workshops' };
export const dynamic = 'force-dynamic';

interface OrgWithExample extends OrgSummary {
  is_example: boolean;
}

interface OrgWithCount extends OrgWithExample {
  member_count: number;
}

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string; intent?: string }>;
}) {
  // When the create-workshop tour is running, the New workshop link carries
  // the params to /app/workshops/new so the form spotlight continues there.
  // `intent=session` marks a session-pathway detour (the user clicked "Start
  // a session" with no workshop yet): skips then tick the session card, and
  // after creation the chain goes straight to the create-session spotlight.
  const { onboarding, intent } = await searchParams;
  const intentSuffix = intent === 'session' ? '&intent=session' : '';
  const newWorkshopHref =
    onboarding === 'create-workshop'
      ? `/app/workshops/new?onboarding=create-workshop${intentSuffix}`
      : '/app/workshops/new';
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Forgs');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Forgs');

  const displayName = await loadDisplayName(supabase, user);

  const { data, error } = await supabase
    .from('org_memberships')
    .select('role, organisations:org_id ( id, name, slug, is_example )')
    .eq('profile_id', user.id);
  if (error) throw new Error(`Failed to load workshops: ${error.message}`);

  const summaries: OrgWithExample[] = (data ?? [])
    .map((row): OrgWithExample | null => {
      const org = (
        row as {
          organisations: {
            id: string;
            name: string;
            slug: string;
            is_example: boolean;
          } | null;
        }
      ).organisations;
      if (!org) return null;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        is_example: org.is_example,
        role: (row as { role: OrgRole }).role,
      };
    })
    .filter((o): o is OrgWithExample => o !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Drives the seeding button's verb: with an example already seeded it
  // reopens rather than creating a second one (site admins excepted — the
  // action lets them seed freely, and the button reads "Open" for them once
  // they have one, which is close enough for a testing fixture).
  const hasExample = summaries.some((o) => o.is_example && o.role === 'owner');

  // The welcome modal's session card links here with ?onboarding=create-session
  // (it has no server data of its own). Forward the param to the user's first
  // workshop so the create-session spotlight fires there. With no workshop yet
  // a session is impossible — hand the user to the create-workshop tour
  // instead of silently stripping the param (which looped them back to the
  // modal with nothing happening).
  if (onboarding === 'create-session') {
    const first = summaries[0];
    redirect(
      first
        ? `/app/workshops/${first.id}?onboarding=create-session`
        : '/app/workshops?onboarding=create-workshop&intent=session',
    );
  }

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

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <Suspense fallback={null}>
        <CreateWorkshopSpotlight />
      </Suspense>
      <PageBanner
        eyebrow={<BrandEyebrow name={displayName} />}
        title="Workshops"
        actions={
          <div className="flex items-start gap-2">
            {/* With nothing in the list the empty state carries this CTA —
                showing it here too would put the same button on screen
                twice. "New workshop" stays put either way: it is the
                create-workshop tour's spotlight anchor. */}
            {orgs.length > 0 ? <ExampleWorkshopButton hasExample={hasExample} /> : null}
            <Link
              href={newWorkshopHref}
              data-tour-id="new-workshop-button"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white shadow-[0_20px_30px_-15px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47]"
            >
              New workshop
            </Link>
          </div>
        }
      />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10">
        {orgs.length === 0 ? (
          <WorkshopsEmptyState
            newWorkshopHref={newWorkshopHref}
            hasExample={hasExample}
            assistantEntry={<AssistantEntrySlot profileId={user.id} />}
          />
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
                    {/* Seeded demo workshop — badged so it is never mistaken
                        for the team's real work. */}
                    {o.is_example ? (
                      <span className="inline-flex shrink-0 items-center rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.18em] text-zinc-700 uppercase">
                        Example
                      </span>
                    ) : null}
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
