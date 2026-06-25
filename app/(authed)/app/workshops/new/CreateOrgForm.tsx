'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { createOrgAction, type CreateOrgResult } from '@/app/(authed)/app/workshops/actions';
import { isValidSlug, suggestSlug } from '@/lib/orgs/slug';

export function CreateOrgForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(suggestSlug(value));
  }

  function onSlugChange(value: string) {
    setSlug(value);
    setSlugTouched(true);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    if (trimmedName.length < 1 || trimmedName.length > 80) {
      setError('Name must be 1–80 characters.');
      return;
    }
    if (!isValidSlug(trimmedSlug)) {
      setError('Slug must be 2–40 chars, lowercase letters, digits, or hyphens.');
      return;
    }
    const fd = new FormData();
    fd.set('name', trimmedName);
    fd.set('slug', trimmedSlug);
    start(async () => {
      const result: CreateOrgResult = await createOrgAction(fd);
      if (result.kind === 'ok') {
        router.push(`/app/workshops/${result.orgId}`);
        return;
      }
      if (result.kind === 'slug_taken') {
        setError('That slug is already taken. Try another.');
        return;
      }
      if (result.kind === 'invalid_input') {
        setError(`Invalid ${result.field}.`);
        return;
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Name
        </span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={80}
          autoComplete="off"
          className="h-10 rounded-xl border border-zinc-900/10 bg-white px-3 text-[14px] text-zinc-900 outline-none focus:border-[#a8482a]"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Slug
        </span>
        <input
          type="text"
          required
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          maxLength={40}
          pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
          autoComplete="off"
          className="h-10 rounded-xl border border-zinc-900/10 bg-white px-3 font-mono text-[13px] text-zinc-900 outline-none focus:border-[#a8482a]"
        />
        <span className="text-[12px] text-zinc-500">
          Lowercase letters, digits, hyphens. Used in URLs (not yet exposed publicly).
        </span>
      </label>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Create workshop'}
      </button>
    </form>
  );
}
