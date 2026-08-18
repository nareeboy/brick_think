'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { CloseIcon } from '@/components/icons';

import { importDesignAction } from './actions';

const MAX_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();

  function handlePickedFile(picked: File) {
    if (!picked.name.toLowerCase().endsWith('.json')) {
      setError('Please choose a .json file exported from BrickThink.');
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError('File too large (max 5 MB).');
      return;
    }
    setError(null);
    setFile(picked);
  }

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
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) handlePickedFile(picked);
            e.target.value = '';
          }}
          className="sr-only"
        />
        {file === null ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!dragging) setDragging(true);
            }}
            onDragEnter={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) handlePickedFile(dropped);
            }}
            data-testid="import-drop-zone"
            className={`mt-4 flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-[#FBF7F1] px-6 text-center transition-colors ${
              dragging
                ? 'border-[#a8482a] bg-[#a8482a]/10'
                : 'border-zinc-300 hover:border-[#a8482a]/40 hover:bg-[#a8482a]/5'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-6 w-6 text-[#a8482a]"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V7.5m0 0l-3.75 3.75M12 7.5l3.75 3.75M4.5 19.5h15"
              />
            </svg>
            <span className="text-[14px] text-zinc-700">
              Drag your file here, or{' '}
              <span className="font-semibold text-[#a8482a]">choose a file</span>
            </span>
            <span className="text-[12px] text-zinc-500">.brickthink.json · up to 5 MB</span>
          </button>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-900/10 bg-[#FBF7F1] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#a8482a] shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m5.25 3H9M7.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-zinc-800">
                {file.name}
              </span>
              <span className="block text-[12px] text-zinc-500">{formatBytes(file.size)}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setError(null);
              }}
              disabled={pending}
              aria-label="Remove file"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-800"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )}
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
            className="inline-flex h-9 cursor-pointer items-center rounded-md bg-[#a8482a] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
