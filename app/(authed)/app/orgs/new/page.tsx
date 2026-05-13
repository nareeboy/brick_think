import type { Metadata } from 'next';

import { CreateOrgForm } from './CreateOrgForm';

export const metadata: Metadata = { title: 'New organisation' };
export const dynamic = 'force-dynamic';

export default function NewOrgPage() {
  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[480px] flex-col gap-6 px-5 py-10">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            BrickThink
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-950">
            New organisation
          </h1>
          <p className="mt-2 text-[13px] text-zinc-600">
            Organisations let you share designs with teammates as read-only.
          </p>
        </header>
        <CreateOrgForm />
      </div>
    </main>
  );
}
