import Link from 'next/link';

import { createServerSupabaseClient } from '@/lib/db/server';
import { RoleStatusPill } from './RoleStatusPill';

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('careers_roles')
    .select('id, slug, title, location, is_open, created_at')
    .order('created_at', { ascending: false });
  const roles = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-zinc-950">Roles</h1>
        <Link
          href="/app/admin/careers/roles/new"
          className="inline-flex cursor-pointer items-center rounded-md bg-[#a8482a] px-4 py-2 text-sm font-medium text-white hover:bg-[#a8512f]"
        >
          New role
        </Link>
      </div>
      {roles.length === 0 ? (
        <p className="text-zinc-600">No roles yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-900/10 border-y border-zinc-900/10">
          {roles.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/admin/careers/roles/${r.id}`}
                className="flex items-center justify-between gap-4 py-4 hover:bg-zinc-900/[0.02]"
              >
                <div>
                  <span className="font-medium text-zinc-900">{r.title}</span>
                  {r.location ? (
                    <span className="ml-2 text-sm text-zinc-500">{r.location}</span>
                  ) : null}
                </div>
                <RoleStatusPill isOpen={r.is_open} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
