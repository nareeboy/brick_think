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
