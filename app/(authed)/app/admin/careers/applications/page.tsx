import { createServerSupabaseClient } from '@/lib/db/server';
import { ApplicationRowActions } from './ApplicationRowActions';

export const dynamic = 'force-dynamic';

function daysLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `${days}d left`;
}

export default async function ApplicationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('careers_applications')
    .select(
      'id, first_name, last_name, address, phone, linkedin_url, cv_path, status, created_at, expires_at, careers_roles(title)',
    )
    .order('created_at', { ascending: false });
  const apps = data ?? [];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-zinc-950">Applications</h1>
      {apps.length === 0 ? (
        <p className="text-zinc-600">No applications yet.</p>
      ) : (
        <div className="space-y-4">
          {apps.map((a) => {
            const roleArr = (a as unknown as { careers_roles: { title: string }[] | null })
              .careers_roles;
            const role = Array.isArray(roleArr) ? (roleArr[0] ?? null) : roleArr;
            return (
              <div key={a.id} className="rounded-lg border border-zinc-900/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-zinc-900">
                      {a.first_name} {a.last_name}
                      <span className="ml-2 text-sm font-normal text-zinc-500">
                        · {role?.title ?? 'Role removed'}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-sm text-zinc-600">
                      <div>{a.phone}</div>
                      <div>{a.address}</div>
                      <a
                        href={a.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c0613d] hover:underline"
                      >
                        LinkedIn profile
                      </a>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    {daysLeft(a.expires_at)}
                  </span>
                </div>
                <div className="mt-3">
                  <ApplicationRowActions
                    id={a.id}
                    hasCv={Boolean(a.cv_path)}
                    status={a.status as 'new' | 'reviewed' | 'shortlisted' | 'rejected'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
