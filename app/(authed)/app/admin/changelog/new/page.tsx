// app/(authed)/app/admin/changelog/new/page.tsx
import { ChangelogEditor } from '../ChangelogEditor';

export const dynamic = 'force-dynamic';

export default function NewChangelogEntryPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-zinc-950">New entry</h1>
      <ChangelogEditor mode="create" />
    </div>
  );
}
