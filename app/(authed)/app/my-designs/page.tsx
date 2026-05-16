import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { AggregateDesignRow, MyDesignsFilterValue, MyDesignsSort } from '@/lib/my-designs/types';
import { parseFilter, parseSort } from '@/lib/my-designs/types';
import type { OrgRole, OrgSummary } from '@/lib/orgs/types';

import { DesignList } from './DesignList';
import { MyDesignsFilter } from './MyDesignsFilter';
import { NewDesignDialogButton } from './NewDesignDialogButton';
import { SearchInput } from './SearchInput';
import { SortDropdown } from './SortDropdown';
import { TagFilterBar } from './TagFilterBar';

export const metadata: Metadata = { title: 'My Designs' };
export const dynamic = 'force-dynamic';

interface SearchParams {
  filter?: string | string[];
  sort?: string | string[];
  q?: string | string[];
  tag?: string | string[];
}

interface RawRow {
  id: string;
  title: string;
  updated_at: string;
  thumbnail_path: string | null;
  thumbnail_updated_at: string | null;
  session_id: string | null;
}

interface SessionLookupRow {
  id: string;
  title: string;
  org_id: string;
  organisations: { id: string; name: string } | null;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const TAG_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

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

  const sp = await searchParams;
  const filter: MyDesignsFilterValue = parseFilter(firstParam(sp.filter));
  const sort: MyDesignsSort = parseSort(firstParam(sp.sort));
  const qRaw = firstParam(sp.q) ?? '';
  const q = qRaw.trim().slice(0, 100);
  const tagRaw = firstParam(sp.tag);
  const tag = tagRaw && TAG_RE.test(tagRaw) ? tagRaw : null;

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

  // If a tag filter is active, first resolve which of the user's owned
  // models carry that tag — keeps the subsequent models query as a simple
  // in() instead of joining through model_tags from PostgREST.
  let tagFilteredIds: string[] | null = null;
  if (tag) {
    const tagRes = await supabase
      .from('model_tags')
      .select('model_id, models!inner(owner_profile_id)')
      .eq('tag', tag)
      .eq('models.owner_profile_id', user.id);
    if (tagRes.error) throw new Error(`Tag filter failed: ${tagRes.error.message}`);
    tagFilteredIds = (tagRes.data ?? []).map((r) => (r as { model_id: string }).model_id);
  }

  // We avoid PostgREST embedding on models→sessions because models.session_id
  // is only tied to sessions through the composite FK (stage_id, session_id) →
  // stages, which PostgREST can't infer as a simple embeddable relationship.
  // Stitch sessions + organisations in JS after a second query keyed by the
  // distinct session_ids returned.
  let query = supabase
    .from('models')
    .select(
      'id, title, updated_at, thumbnail_path, thumbnail_updated_at, session_id',
    )
    .eq('owner_profile_id', user.id)
    .is('deleted_at', null);

  switch (sort) {
    case 'oldest':
      query = query.order('updated_at', { ascending: true });
      break;
    case 'title-asc':
      query = query.order('title', { ascending: true });
      break;
    case 'title-desc':
      query = query.order('title', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('updated_at', { ascending: false });
  }

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

  if (q.length > 0) {
    // Escape PostgREST ilike wildcards so a user's literal % or _ doesn't
    // bleed into the pattern. The pattern is wrapped in %…% by Supabase JS.
    const escaped = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.ilike('title', `%${escaped}%`);
  }

  if (tagFilteredIds !== null) {
    if (tagFilteredIds.length === 0) {
      query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      query = query.in('id', tagFilteredIds);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load designs: ${error.message}`);
  const rows = (data ?? []) as unknown as RawRow[];

  const sessionIdsToLookup = Array.from(
    new Set(
      rows
        .map((r) => r.session_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  );
  const sessionById = new Map<string, SessionLookupRow>();
  if (sessionIdsToLookup.length > 0) {
    const sRes = await supabase
      .from('sessions')
      .select('id, title, org_id, organisations:org_id ( id, name )')
      .in('id', sessionIdsToLookup);
    if (sRes.error) {
      throw new Error(`Failed to load sessions: ${sRes.error.message}`);
    }
    for (const row of (sRes.data ?? []) as unknown as SessionLookupRow[]) {
      sessionById.set(row.id, row);
    }
  }

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

  // Tags: one query for every row in the result, plus a second pass for the
  // full universe of tags the user owns (so the filter bar can render every
  // option, not just the ones already visible under the current filter set).
  const modelIds = rows.map((r) => r.id);
  const tagsByModel = new Map<string, string[]>();
  if (modelIds.length > 0) {
    const tagsRes = await supabase
      .from('model_tags')
      .select('model_id, tag')
      .in('model_id', modelIds)
      .order('tag', { ascending: true });
    if (tagsRes.error) throw new Error(`Failed to load tags: ${tagsRes.error.message}`);
    for (const row of tagsRes.data ?? []) {
      const r = row as { model_id: string; tag: string };
      const list = tagsByModel.get(r.model_id) ?? [];
      list.push(r.tag);
      tagsByModel.set(r.model_id, list);
    }
  }

  const allTagsRes = await supabase
    .from('model_tags')
    .select('tag, models!inner(owner_profile_id)')
    .eq('models.owner_profile_id', user.id);
  if (allTagsRes.error) throw new Error(`Tag universe failed: ${allTagsRes.error.message}`);
  const allTags = Array.from(
    new Set((allTagsRes.data ?? []).map((r) => (r as { tag: string }).tag)),
  ).sort();

  function thumbnailUrl(r: RawRow): string | null {
    if (!r.thumbnail_path || !urlByPath.has(r.thumbnail_path)) return null;
    const base = urlByPath.get(r.thumbnail_path)!;
    const v = encodeURIComponent(r.thumbnail_updated_at ?? '');
    return `${base}&v=${v}`;
  }

  const cards: AggregateDesignRow[] = rows.map((r): AggregateDesignRow => {
    const session = r.session_id ? sessionById.get(r.session_id) : null;
    const tags = tagsByModel.get(r.id) ?? [];
    if (r.session_id && session && session.organisations) {
      return {
        id: r.id,
        title: r.title,
        updated_at: r.updated_at,
        thumbnail_url: thumbnailUrl(r),
        badge: {
          kind: 'org-session',
          orgId: session.organisations.id,
          orgName: session.organisations.name,
          sessionId: session.id,
          sessionTitle: session.title,
        },
        tags,
      };
    }
    return {
      id: r.id,
      title: r.title,
      updated_at: r.updated_at,
      thumbnail_url: thumbnailUrl(r),
      badge: { kind: 'personal' },
      tags,
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
          <SearchInput initialValue={q} inputId="my-designs-search-input" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
            <div className="flex items-center gap-3">
              <label
                htmlFor="my-designs-sort"
                className="text-[13px] font-medium text-zinc-600"
              >
                Sort:
              </label>
              <SortDropdown buttonId="my-designs-sort" value={sort} />
            </div>
          </div>
          {allTags.length > 0 ? <TagFilterBar tags={allTags} active={tag} /> : null}
        </header>
        <DesignList designs={cards} orgs={orgs} allTags={allTags} />
      </div>
    </main>
  );
}
