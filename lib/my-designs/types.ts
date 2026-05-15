// lib/my-designs/types.ts

export type AggregateBadge =
  | { kind: 'personal' }
  | { kind: 'org-session'; orgId: string; orgName: string; sessionId: string; sessionTitle: string };

export interface AggregateDesignRow {
  id: string;
  title: string;
  updated_at: string;
  thumbnail_url: string | null;
  badge: AggregateBadge;
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
    case 'all': return 'all';
    case 'personal': return 'personal';
    case 'org': return `org-${value.orgId}`;
  }
}
