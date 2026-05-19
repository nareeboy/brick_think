'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { importDesignAction } from './actions';

const MAX_BYTES = 5 * 1024 * 1024;

export function ImportDesignButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5"
      >
        Import design
      </button>
      {open ? <ImportDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const inputId = useId();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!file) {
      setError('Choose a .json file first.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File too large (max 5 MB).');
      return;
    }
    setError(null);
    start(async () => {
      try {
        const text = await file.text();
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          setError('That file is not valid JSON.');
          return;
        }
        const { modelId } = await importDesignAction(raw);
        router.push(`/app/designs/${modelId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed.');
      }
    });
  }

  return (
    <ModalBackdrop titleId={titleId} onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="text-[18px] font-semibold text-zinc-950">
          Import design
        </h2>
        <p className="mt-2 text-[13px] text-zinc-600">
          Choose a <code>.brickthink.json</code> file exported from BrickThink. The imported design
          lands as a new Personal design.
        </p>
        <label htmlFor={inputId} className="sr-only">
          Design file
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".json,application/json,.brickthink.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-4 w-full text-[13px]"
        />
        {error ? (
          <p role="alert" className="mt-3 rounded-md bg-red-50 p-2 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-9 cursor-pointer items-center rounded-md border border-zinc-900/10 bg-white px-3 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !file}
            className="inline-flex h-9 cursor-pointer items-center rounded-md bg-[#c0613d] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
