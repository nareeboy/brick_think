import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { AggregateDesignRow, MyDesignsFilterValue } from '@/lib/my-designs/types';
import { parseFilter } from '@/lib/my-designs/types';
import type { OrgRole, OrgSummary } from '@/lib/orgs/types';

import { DesignList } from './DesignList';
import { MyDesignsFilter } from './MyDesignsFilter';
import { NewDesignDialogButton } from './NewDesignDialogButton';

export const metadata: Metadata = { title: 'My Designs' };
export const dynamic = 'force-dynamic';

interface SearchParams {
  filter?: string | string[];
}

interface RawRow {
  id: string;
  title: string;
  updated_at: string;
  thumbnail_path: string | null;
  thumbnail_updated_at: string | null;
  session_id: string | null;
  sessions: {
    id: string;
    title: string;
    org_id: string;
    organisations: { id: string; name: string } | null;
  } | null;
}

export default async function MyDesignsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Fmy-designs');
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fmy-designs');

  const raw = (await searchParams).filter;
  const filterRaw: string | null = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  const filter: MyDesignsFilterValue = parseFilter(filterRaw);

  const membershipsRes = await supabase
    .from('org_memberships')
    .select('role, organisations:org_id ( id, name, slug )')
    .eq('profile_id', user.id);
  if (membershipsRes.error) {
    throw new Error(`Failed to load orgs: ${membershipsRes.error.message}`);
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

  let query = supabase
    .from('models')
    .select(
      'id, title, updated_at, thumbnail_path, thumbnail_updated_at, session_id, sessions:session_id ( id, title, org_id, organisations:org_id ( id, name ) )',
    )
    .eq('owner_profile_id', user.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (filter.kind === 'personal') {
    query = query.is('session_id', null);
  } else if (filter.kind === 'org') {
    const { data: sessionIds, error: sErr } = await supabase
      .from('sessions')
      .select('id')
      .eq('org_id', filter.orgId);
    if (sErr) throw new Error(`Session lookup failed: ${sErr.message}`);
    const ids = (sessionIds ?? []).map((r) => r.id);
    if (ids.length === 0) {
      query = query.in('session_id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      query = query.in('session_id', ids);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load designs: ${error.message}`);
  const rows = (data ?? []) as unknown as RawRow[];

  const paths = rows
    .map((r) => r.thumbnail_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await supabase.storage
      .from('model-thumbnails')
      .createSignedUrls(paths, 60 * 60);
    if (signed.error) {
      console.error('thumbnail signing failed', signed.error);
    } else {
      for (const s of signed.data ?? []) {
        if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
      }
    }
  }

  function thumbnailUrl(r: RawRow): string | null {
    if (!r.thumbnail_path || !urlByPath.has(r.thumbnail_path)) return null;
    const base = urlByPath.get(r.thumbnail_path)!;
    const v = encodeURIComponent(r.thumbnail_updated_at ?? '');
    return `${base}&v=${v}`;
  }

  const cards: AggregateDesignRow[] = rows.map((r): AggregateDesignRow => {
    if (r.session_id && r.sessions && r.sessions.organisations) {
      return {
        id: r.id,
        title: r.title,
        updated_at: r.updated_at,
        thumbnail_url: thumbnailUrl(r),
        badge: {
          kind: 'org-session',
          orgId: r.sessions.organisations.id,
          orgName: r.sessions.organisations.name,
          sessionId: r.sessions.id,
          sessionTitle: r.sessions.title,
        },
      };
    }
    return {
      id: r.id,
      title: r.title,
      updated_at: r.updated_at,
      thumbnail_url: thumbnailUrl(r),
      badge: { kind: 'personal' },
    };
  });

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10">
        <header className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                BrickThink
              </p>
              <h1
                data-testid="my-designs-heading"
                className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-950"
              >
                My Designs
              </h1>
            </div>
            <NewDesignDialogButton orgs={orgs} />
          </div>
          <div className="flex items-center gap-3">
            <label
              htmlFor="my-designs-filter"
              className="text-[13px] font-medium text-zinc-600"
            >
              Filter:
            </label>
            <MyDesignsFilter
              buttonId="my-designs-filter"
              orgs={orgs}
              value={filter}
            />
          </div>
        </header>
        <DesignList designs={cards} orgs={orgs} />
      </div>
    </main>
  );
}
