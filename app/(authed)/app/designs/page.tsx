import type { Metadata } from 'next';
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

  const { data, error } = await supabase
    .from('models')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to load designs: ${error.message}`);
  const models: ModelSummary[] = data ?? [];

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
          <NewDesignButton />
        </header>
        <DesignList models={models} />
      </div>
    </main>
  );
}
