import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { TRASH_RETENTION_DAYS, formatDaysRemaining } from '@/lib/models/trash';
import type { TrashedModelSummary } from '@/lib/models/types';

import { TrashList } from './TrashList';

export const metadata: Metadata = { title: 'Trash · Designs' };
export const dynamic = 'force-dynamic';

export default async function TrashPage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Fdesigns%2Ftrash');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fdesigns%2Ftrash');

  const { data, error } = await supabase
    .from('models')
    .select('id, title, deleted_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw new Error(`Failed to load trash: ${error.message}`);

  const now = new Date();
  const items = (data ?? [])
    .filter((row): row is TrashedModelSummary => row.deleted_at !== null)
    .map((row) => ({
      ...row,
      daysRemainingLabel: formatDaysRemaining(row.deleted_at, TRASH_RETENTION_DAYS, now),
    }));

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              BrickThink
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-950">Trash</h1>
          </div>
          <Link
            href="/app/my-designs"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5"
          >
            Back to designs
          </Link>
        </header>
        <TrashList items={items} />
      </div>
    </main>
  );
}
