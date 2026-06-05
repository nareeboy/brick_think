'use client';

import { useRef, useState, useTransition, type ChangeEvent } from 'react';

import { removeBannerImageAction, uploadBannerImageAction } from './actions';

interface Props {
  entryId: string;
  initialUrl: string | null;
}

export function BannerImageField({ entryId, initialUrl }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png' && file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      setError('Banner must be a PNG or JPG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Banner must be ≤ 2 MB.');
      return;
    }
    const fd = new FormData();
    fd.set('id', entryId);
    fd.set('banner', file);
    startTransition(async () => {
      const result = await uploadBannerImageAction(fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Show the freshly-picked file immediately without waiting for the CDN.
      setUrl(URL.createObjectURL(file));
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeBannerImageAction(entryId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setUrl(null);
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Banner image
      </div>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase storage host kept off next.config image domains
        <img
          src={url}
          alt="Changelog banner"
          className="mb-3 aspect-[3/1] w-full rounded-xl object-cover"
        />
      ) : (
        <div className="mb-3 flex aspect-[3/1] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500">
          <span className="text-[12px]">No banner yet</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]">3 : 1</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
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
          {pending ? 'Working…' : 'Remove banner'}
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-red-700">
          {error}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        PNG or JPG, max 2 MB. Recommended <span className="font-mono">1800 × 600</span> (3:1). The
        public page crops to 3:1, so off-ratio uploads lose top/bottom edges.
      </p>
    </div>
  );
}
