// lib/my-designs/types.ts

export type AggregateBadge =
  | { kind: 'personal' }
  | {
      kind: 'org-session';
      orgId: string;
      orgName: string;
      sessionId: string;
      sessionTitle: string;
    };

export interface AggregateDesignRow {
  id: string;
  title: string;
  updated_at: string;
  thumbnail_url: string | null;
  badge: AggregateBadge;
  tags: string[];
}

export type MyDesignsFilterValue =
  | { kind: 'all' }
  | { kind: 'personal' }
  | { kind: 'org'; orgId: string };

export function parseFilter(raw: string | null): MyDesignsFilterValue {
  if (!raw || raw === 'all') return { kind: 'all' };
  if (raw === 'personal') return { kind: 'personal' };
  if (raw.startsWith('org-')) {
    const orgId = raw.slice('org-'.length);
    // Defensive: only accept UUID-shaped values to avoid query injection
    // surfaces (the value is also used to build a Supabase eq() filter).
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
      return { kind: 'org', orgId };
    }
  }
  return { kind: 'all' };
}

export function serializeFilter(value: MyDesignsFilterValue): string {
  switch (value.kind) {
    case 'all':
      return 'all';
    case 'personal':
      return 'personal';
    case 'org':
      return `org-${value.orgId}`;
  }
}

export type MyDesignsSort = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

export const DEFAULT_SORT: MyDesignsSort = 'newest';

export function parseSort(raw: string | null): MyDesignsSort {
  if (raw === 'oldest' || raw === 'title-asc' || raw === 'title-desc') return raw;
  return 'newest';
}

export function serializeSort(value: MyDesignsSort): string {
  return value;
}

export function sortLabel(value: MyDesignsSort): string {
  switch (value) {
    case 'newest':
      return 'Newest';
    case 'oldest':
      return 'Oldest';
    case 'title-asc':
      return 'Title A–Z';
    case 'title-desc':
      return 'Title Z–A';
  }
}

const TAG_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

export function isValidTag(tag: string): boolean {
  return TAG_RE.test(tag);
}

export function normaliseTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

const MAX_TAG_FILTER = 8;

export function parseTagList(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(',')) {
    const t = piece.trim();
    if (t.length === 0) continue;
    if (!isValidTag(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_TAG_FILTER) break;
  }
  return out;
}

export function serializeTagList(value: string[]): string {
  return value.join(',');
}

export const MAX_PAGE_NUMBER = 10_000;

export function parsePageNumber(raw: string | null): number {
  if (raw === null) return 1;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE_NUMBER);
}

// --- Grouping -------------------------------------------------------------

/**
 * The two scopes My Designs renders under separate headings. `workshop`
 * covers every session-scoped design (badge kind `org-session`) — a session
 * always belongs to a workshop, so the two are the same set from the grid's
 * point of view.
 */
export type DesignGroupKind = 'personal' | 'workshop';

export interface DesignGroup {
  kind: DesignGroupKind;
  designs: AggregateDesignRow[];
}

/**
 * Split a page of designs into its personal and workshop halves.
 *
 * Order inside each group is preserved exactly as the query returned it, so
 * the active Sort still reads correctly within a section — grouping is layered
 * on top of the sort, not a replacement for it. Grouping is per page by
 * design: paging happens in Postgres, so a section header can reappear on the
 * next page, which reads the same way a printed index does.
 *
 * Personal comes first: those are the designs the owner can fully act on
 * (trash, send into a session). Workshop designs follow, under a heading that
 * spells out why the trash action is missing on them. Empty groups are
 * omitted so a filtered view never renders a bare heading.
 */
export function groupDesigns(designs: AggregateDesignRow[]): DesignGroup[] {
  const personal = designs.filter((d) => d.badge.kind === 'personal');
  const workshop = designs.filter((d) => d.badge.kind === 'org-session');
  const groups: DesignGroup[] = [];
  if (personal.length > 0) groups.push({ kind: 'personal', designs: personal });
  if (workshop.length > 0) groups.push({ kind: 'workshop', designs: workshop });
  return groups;
}
