'use client';

import { useEffect, useRef, useState } from 'react';
import { useBuilderState } from './builderState';

interface Props {
  modelId: string;
  canvasState: object;
  onClose: () => void;
  onSaved: () => void;
}

export function SaveVersionModal({ modelId, canvasState, onClose, onSaved }: Props) {
  const [label, setLabel] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { captureAndUploadThumbnail } = useBuilderState();

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/models/${modelId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || null, canvas_state: canvasState }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Fire-and-forget: the upload races a possible immediate navigation to
      // /app/my-designs. If the user reloads the list page within ~1 s, they
      // may see the previous thumbnail until the next refresh. Awaiting here
      // would block the modal close on a network round-trip; keep it snappy.
      void captureAndUploadThumbnail();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save version');
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-version-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-900/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id="save-version-title" className="text-[16px] font-semibold text-zinc-950">
          Save version
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
          A snapshot of the current canvas you can return to later.
        </p>
        <label className="mt-4 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Label (optional)
          </span>
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={200}
            placeholder="e.g. Before refactor"
            className="mt-1 w-full rounded-md border border-zinc-900/15 px-2.5 py-1.5 text-[14px] text-zinc-900 outline-none focus:border-[#a8482a]"
          />
        </label>
        {error ? (
          <p role="alert" className="mt-2 text-[12px] text-red-600">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save version'}
          </button>
        </div>
      </div>
    </div>
  );
}
