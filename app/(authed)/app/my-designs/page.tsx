import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Avatar } from '@/components/app/Avatar';
import { FacilitatorChecklist } from '@/components/onboarding/FacilitatorChecklist';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { AggregateDesignRow, MyDesignsFilterValue, MyDesignsSort } from '@/lib/my-designs/types';
import {
  parseFilter,
  parsePageNumber,
  parseSort,
  parseTagList,
  serializeFilter,
  serializeTagList,
} from '@/lib/my-designs/types';
import type { OrgRole, OrgSummary } from '@/lib/orgs/types';

import { DesignList } from './DesignList';
import { MyDesignsFilter } from './MyDesignsFilter';
import { NewDesignDialogButton } from './NewDesignDialogButton';
import { PaginationControls } from './PaginationControls';
import { SearchInput } from './SearchInput';
import { SortDropdown } from './SortDropdown';
import { TagFilterBar } from './TagFilterBar';

const PAGE_SIZE = 24;

export const metadata: Metadata = { title: 'My Designs' };
export const dynamic = 'force-dynamic';

interface SearchParams {
  filter?: string | string[];
  sort?: string | string[];
  q?: string | string[];
  tag?: string | string[];
  page?: string | string[];
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
  const activeTags = parseTagList(firstParam(sp.tag));
  const page = parsePageNumber(firstParam(sp.page));

  const profileRes = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single();
  if (profileRes.error) {
    throw new Error(`Failed to load profile: ${profileRes.error.message}`);
  }
  const profileName =
    profileRes.data?.full_name?.trim() ||
    profileRes.data?.email ||
    user.email ||
    'You';
  const profileAvatarUrl = profileRes.data?.avatar_url ?? null;

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

  const orgIds = orgs.map((o) => o.id);
  const firstOrgId = orgs[0]?.id ?? null;

  let hasSessionInAnyOrg = false;
  let firstSessionId: string | null = null;
  if (orgIds.length > 0) {
    const onboardingSessionRes = await supabase
      .from('sessions')
      .select('id')
      .in('org_id', orgIds)
      .order('created_at', { ascending: true })
      .limit(1);
    if (onboardingSessionRes.error) {
      throw new Error(
        `Onboarding session check failed: ${onboardingSessionRes.error.message}`,
      );
    }
    const first = onboardingSessionRes.data?.[0];
    if (first) {
      hasSessionInAnyOrg = true;
      firstSessionId = first.id;
    }
  }

  const onboardingDesignRes = await supabase
    .from('models')
    .select('id', { head: true, count: 'exact' })
    .eq('owner_profile_id', user.id)
    .not('session_id', 'is', null)
    .is('deleted_at', null)
    .limit(1);
  if (onboardingDesignRes.error) {
    throw new Error(
      `Onboarding design check failed: ${onboardingDesignRes.error.message}`,
    );
  }
  const hasOwnedSessionDesign = (onboardingDesignRes.count ?? 0) > 0;

  // If tag filters are active, first resolve which of the user's owned
  // models carry every requested tag (AND semantics) — keeps the subsequent
  // models query as a simple in() instead of building a multi-join with
  // GROUP BY through PostgREST.
  let tagFilteredIds: string[] | null = null;
  if (activeTags.length > 0) {
    const tagRes = await supabase
      .from('model_tags')
      .select('model_id, tag, models!inner(owner_profile_id)')
      .in('tag', activeTags)
      .eq('models.owner_profile_id', user.id);
    if (tagRes.error) throw new Error(`Tag filter failed: ${tagRes.error.message}`);
    const counts = new Map<string, number>();
    for (const row of tagRes.data ?? []) {
      const r = row as { model_id: string };
      counts.set(r.model_id, (counts.get(r.model_id) ?? 0) + 1);
    }
    tagFilteredIds = Array.from(counts.entries())
      .filter(([, c]) => c === activeTags.length)
      .map(([id]) => id);
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
      { count: 'exact' },
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

  const offset = (page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const trashCountPromise = supabase
    .from('models')
    .select('id', { count: 'exact', head: true })
    .eq('owner_profile_id', user.id)
    .not('deleted_at', 'is', null);

  const { data, error, count } = await query;
  if (error) {
    // PGRST103 = "Requested range not satisfiable". Fires when the offset is
    // past the end of the result set — e.g. a user bookmarks ?page=99, then
    // deletes designs so only 2 pages remain. Bounce them to page 1 rather
    // than serving a 500. Any other error is genuine; rethrow.
    if (error.code === 'PGRST103' && page > 1) {
      const params = new URLSearchParams();
      if (filter.kind !== 'all') params.set('filter', serializeFilter(filter));
      if (sort !== 'newest') params.set('sort', sort);
      if (q.length > 0) params.set('q', q);
      if (activeTags.length > 0) params.set('tag', serializeTagList(activeTags));
      const qs = params.toString();
      redirect(qs ? `/app/my-designs?${qs}` : '/app/my-designs');
    }
    throw new Error(`Failed to load designs: ${error.message}`);
  }
  const rows = (data ?? []) as unknown as RawRow[];
  const totalCount = count ?? rows.length;

  const trashRes = await trashCountPromise;
  if (trashRes.error) {
    throw new Error(`Failed to load trash count: ${trashRes.error.message}`);
  }
  const trashCount = trashRes.count ?? 0;

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

  // Short-circuit the `allTags` query: when no filter is active and the
  // first page returned zero rows, the user has no designs at all, which
  // means they have no tags either — skipping saves a round-trip on the
  // empty-state path. Any active filter (sort doesn't count) could mask
  // tagged models, so we only trust the empty-rows signal when the page is
  // truly unfiltered.
  const noFiltersActive =
    filter.kind === 'all' && q.length === 0 && activeTags.length === 0;
  let allTags: string[];
  if (rows.length === 0 && noFiltersActive) {
    allTags = [];
  } else {
    const allTagsRes = await supabase
      .from('model_tags')
      .select('tag, models!inner(owner_profile_id)')
      .eq('models.owner_profile_id', user.id);
    if (allTagsRes.error) throw new Error(`Tag universe failed: ${allTagsRes.error.message}`);
    allTags = Array.from(
      new Set((allTagsRes.data ?? []).map((r) => (r as { tag: string }).tag)),
    ).sort();
  }

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
        <WelcomeModal />
        <FacilitatorChecklist
          progress={{
            hasOrg: orgs.length > 0,
            hasSessionInAnyOrg,
            hasOwnedSessionDesign,
            firstOrgId,
            firstSessionId,
          }}
        />
        <header className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar url={profileAvatarUrl} name={profileName} size="md" />
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
            </div>
            <div className="flex items-center gap-2">
              {trashCount > 0 ? (
                <Link
                  href="/app/designs/trash"
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5"
                >
                  Trash ({trashCount})
                </Link>
              ) : null}
              <NewDesignDialogButton orgs={orgs} />
            </div>
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
          {allTags.length > 0 ? <TagFilterBar tags={allTags} active={activeTags} /> : null}
        </header>
        <DesignList designs={cards} orgs={orgs} allTags={allTags} />
        {totalCount > PAGE_SIZE ? (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
          />
        ) : null}
      </div>
    </main>
  );
}
