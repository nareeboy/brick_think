import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { ModelSummary } from '@/lib/models/types';

import { DesignList } from './DesignList';
import { NewDesignButton } from './NewDesignButton';

export const metadata: Metadata = { title: 'Designs' };
export const dynamic = 'force-dynamic';

export default async function DesignsPage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Fdesigns');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fdesigns');

  const [listRes, trashRes] = await Promise.all([
    supabase
      .from('models')
      .select('id, title, updated_at')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('models')
      .select('id', { count: 'exact', head: true })
      .not('deleted_at', 'is', null),
  ]);
  if (listRes.error) throw new Error(`Failed to load designs: ${listRes.error.message}`);
  if (trashRes.error) throw new Error(`Failed to load trash count: ${trashRes.error.message}`);
  const models: ModelSummary[] = listRes.data ?? [];
  const trashCount = trashRes.count ?? 0;

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              BrickThink
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-950">
              My designs
            </h1>
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
            <NewDesignButton />
          </div>
        </header>
        <DesignList models={models} />
      </div>
    </main>
  );
}
