'use client';

import { useEffect, useState, useTransition } from 'react';

import type { ModelVersionSummary } from '@/lib/models/types';

import { restoreVersionAction } from '@/app/(authed)/app/designs/actions';

interface Props {
  modelId: string;
  open: boolean;
  onClose: () => void;
}

export function VersionHistoryPanel({ modelId, open, onClose }: Props) {
  const [versions, setVersions] = useState<ModelVersionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ModelVersionSummary | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setVersions(null);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/models/${modelId}/versions`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { versions } = (await res.json()) as { versions: ModelVersionSummary[] };
        if (!cancelled) setVersions(versions);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, modelId]);

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-history-title"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-zinc-900/10 bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
    >
      <header className="flex items-center justify-between border-b border-zinc-900/5 px-5 py-4">
        <h2 id="version-history-title" className="text-[16px] font-semibold text-zinc-950">
          Version history
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close history"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900"
        >
          ×
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
        {!versions && !error ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Loading…
          </p>
        ) : null}
        {versions && versions.length === 0 ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            No snapshots yet
          </p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {versions?.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900/10 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-zinc-900">
                  {v.label ?? 'Untitled snapshot'}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {new Date(v.created_at).toLocaleString('en-GB')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirming(v)}
                className="inline-flex h-8 cursor-pointer items-center rounded-md border border-zinc-900/10 px-2 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      </div>

      {confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setConfirming(null)}
            className="absolute inset-0 cursor-default bg-zinc-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
            <h3 className="text-[16px] font-semibold text-zinc-950">Restore this version?</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
              Your current state will be saved as &ldquo;Before restore&rdquo;, then this snapshot
              will become the live canvas.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={pending}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    await restoreVersionAction(modelId, confirming.id);
                    setConfirming(null);
                    window.location.reload();
                  })
                }
                disabled={pending}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
              >
                {pending ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
