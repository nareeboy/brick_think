import type { Database } from '@/lib/db/types.generated';

export type OrgRole = Database['public']['Enums']['org_role'];

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
}

export interface OrgMember {
  profile_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: OrgRole;
}

export type ActiveContext =
  | { kind: 'personal' }
  | { kind: 'org'; org: OrgSummary };
