import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { OrgRole, OrgSummary } from '@/lib/orgs/types';

export const metadata: Metadata = { title: 'Organisations' };
export const dynamic = 'force-dynamic';

interface OrgWithCount extends OrgSummary {
  member_count: number;
}

export default async function OrgsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Forgs');

  const { data, error } = await supabase
    .from('org_memberships')
    .select('role, organisations:org_id ( id, name, slug )')
    .eq('profile_id', user.id);
  if (error) throw new Error(`Failed to load organisations: ${error.message}`);

  const summaries: OrgSummary[] = (data ?? [])
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
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            BrickThink
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-950">
            Organisations
          </h1>
        </div>
        <Link
          href="/app/orgs/new"
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white shadow-[0_20px_30px_-15px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47]"
        >
          New organisation
        </Link>
      </header>

      {orgs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-900/15 p-8 text-center text-[13px] text-zinc-500">
          No organisations yet. Create one to share designs with teammates.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl border border-zinc-900/10 bg-white p-4 transition-colors hover:bg-[#FAF7F1]"
            >
              <Link href={`/app/orgs/${o.id}`} className="block">
                <p className="truncate text-[15px] font-semibold text-zinc-950">{o.name}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {o.slug} · {o.role}
                </p>
                <p className="mt-2 text-[12px] text-zinc-600">
                  {o.member_count} member{o.member_count === 1 ? '' : 's'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
