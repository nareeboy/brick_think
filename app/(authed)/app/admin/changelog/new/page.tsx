// app/(authed)/app/admin/changelog/new/page.tsx
import { ChangelogEditor } from '../ChangelogEditor';

export const dynamic = 'force-dynamic';

export default function NewChangelogEntryPage() {
  // Prefill the Date field with today (UTC, matching the noon-UTC storage +
  // date-only public render). Computed server-side so it's stable on hydration.
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-zinc-950">New entry</h1>
      <ChangelogEditor mode="create" initialDate={today} />
    </div>
  );
}
