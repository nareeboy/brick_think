'use client';

import { useState } from 'react';

import { deleteApplicationAction, getCvUrlAction, setApplicationStatusAction } from './actions';

const STATUSES = ['new', 'reviewed', 'shortlisted', 'rejected'] as const;
type Status = (typeof STATUSES)[number];

export function ApplicationRowActions({
  id,
  hasCv,
  status,
}: {
  id: string;
  hasCv: boolean;
  status: Status;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setNote(null);
    const res = await getCvUrlAction(id);
    setBusy(false);
    if (res.ok) {
      window.open(res.url, '_blank', 'noopener');
    } else {
      setNote(res.code === 'gone' ? 'CV no longer available (expired)' : 'Not allowed');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={status}
        onChange={async (e) => {
          setBusy(true);
          await setApplicationStatusAction(id, e.target.value as Status);
          setBusy(false);
        }}
        disabled={busy}
        className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={download}
        disabled={busy || !hasCv}
        className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
      >
        Download CV
      </button>
      <button
        type="button"
        onClick={async () => {
          if (!confirm('Delete this application and its CV?')) return;
          setBusy(true);
          await deleteApplicationAction(id);
          setBusy(false);
        }}
        disabled={busy}
        className="cursor-pointer rounded-md px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
      {note ? <span className="text-xs text-zinc-500">{note}</span> : null}
    </div>
  );
}
