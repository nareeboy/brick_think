// app/(authed)/app/admin/changelog/[id]/page.tsx
import { notFound } from 'next/navigation';

import { getEntryForAdmin } from '@/lib/changelog/queries';

import { ChangelogEditor } from '../ChangelogEditor';
import { ChangelogStatusPill } from '../ChangelogStatusPill';
import { DeleteEntryButton } from '../DeleteEntryButton';
import { PublishToggleButton } from '../PublishToggleButton';

export const dynamic = 'force-dynamic';

export default async function EditChangelogEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntryForAdmin(id);
  if (!entry) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-zinc-950">Edit entry</h1>
        <div className="flex items-center gap-3">
          <ChangelogStatusPill status={entry.status} />
          <PublishToggleButton id={entry.id} status={entry.status} />
          <DeleteEntryButton id={entry.id} />
        </div>
      </div>
      <ChangelogEditor
        mode="edit"
        initial={entry}
        initialDate={entry.publishedAt ? entry.publishedAt.slice(0, 10) : ''}
      />
    </div>
  );
}
