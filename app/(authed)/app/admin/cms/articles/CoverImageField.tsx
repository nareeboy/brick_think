'use client';

import { useRef, useState, useTransition, type ChangeEvent } from 'react';

import { removeCoverImageAction, uploadCoverImageAction } from './actions';

interface Props {
  articleId: string;
  initialUrl: string | null;
}

export function CoverImageField({ articleId, initialUrl }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      setError('Cover image must be a PNG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Cover image must be ≤ 2 MB.');
      return;
    }
    const fd = new FormData();
    fd.set('id', articleId);
    fd.set('cover', file);
    startTransition(async () => {
      const result = await uploadCoverImageAction(fd);
      if (!result.ok) {
        setError(result.message ?? 'Upload failed.');
        return;
      }
      // Cache-busted URL — bump on every successful upload so the new image
      // shows immediately.
      const reload = URL.createObjectURL(file);
      setUrl(reload);
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeCoverImageAction(articleId);
      if (!result.ok) {
        setError(result.message ?? 'Could not remove cover.');
        return;
      }
      setUrl(null);
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Cover image
      </div>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase storage host kept off next.config image domains
        <img
          src={url}
          alt="Article cover"
          className="mb-3 aspect-[16/9] w-full rounded-xl object-cover"
        />
      ) : (
        <div className="mb-3 flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500">
          <span className="text-[12px]">No cover yet</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]">16 : 9</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        onChange={handleFile}
        disabled={pending}
        className="block w-full text-[12px] text-zinc-700 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-zinc-200 file:bg-white file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-zinc-800 hover:file:bg-zinc-50"
      />

      {url ? (
        <button
          type="button"
          onClick={handleRemove}
          disabled={pending}
          className="mt-3 inline-flex h-9 cursor-pointer items-center rounded-md border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          {pending ? 'Working…' : 'Remove cover'}
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-red-700">
          {error}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        PNG only, max 2 MB. Recommended <span className="font-mono">1600 × 900</span> (16:9).
        Anything smaller works; the public page crops to 16:9 so off-ratio uploads lose top/bottom
        edges.
      </p>
    </div>
  );
}
