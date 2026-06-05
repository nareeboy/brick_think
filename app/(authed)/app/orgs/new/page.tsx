import type { Metadata } from 'next';

import { PageBanner } from '@/components/app/PageBanner';

import { CreateOrgForm } from './CreateOrgForm';

export const metadata: Metadata = { title: 'New organisation' };
export const dynamic = 'force-dynamic';

export default function NewOrgPage() {
  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <PageBanner
        eyebrow="BrickThink"
        title="New organisation"
        subtitle="Organisations let you share designs with teammates as read-only."
        maxWidthClassName="max-w-[480px]"
      />
      <div className="mx-auto flex max-w-[480px] flex-col gap-6 px-5 py-10">
        <CreateOrgForm />
      </div>
    </main>
  );
}
