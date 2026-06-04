// app/(authed)/app/admin/changelog/ChangelogEditor.tsx
'use client';

import { useState } from 'react';

import { RichTextEditor } from '@/components/careers/RichTextEditor';
import { CHANGELOG_CATEGORIES, CATEGORY_LABELS } from '@/lib/changelog/constants';
import type { AdminChangelogEntry } from '@/lib/changelog/types';

import { createEntryAction, updateEntryAction, type ChangelogActionResult } from './actions';

const inputClass =
  'mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#c0613d] focus:outline-none focus:ring-1 focus:ring-[#c0613d]';

const CODE_MESSAGES: Record<string, string> = {
  forbidden: 'You do not have permission to do that.',
  unauthenticated: 'Please sign in again.',
  not_found: 'This entry no longer exists.',
  invalid_title: 'Title is required and must be under 200 characters.',
  invalid_category: 'Choose a valid category.',
  invalid_version: 'Version tag must be under 40 characters.',
  invalid_body: 'Body is too long.',
  invalid_published_date: 'Publish date must be a valid calendar date.',
  unknown: 'Something went wrong.',
};

export function ChangelogEditor({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial?: AdminChangelogEntry;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const action = mode === 'create' ? createEntryAction : updateEntryAction;
    let result: ChangelogActionResult | undefined;
    try {
      result = await action(form);
    } catch (err) {
      // create redirects on success → Next throws NEXT_REDIRECT; let it bubble.
      if (err && typeof err === 'object' && 'digest' in err) throw err;
      setError(CODE_MESSAGES.unknown ?? 'Something went wrong.');
      setSaving(false);
      return;
    }
    if (result && !result.ok) {
      setError(CODE_MESSAGES[result.code] ?? CODE_MESSAGES.unknown ?? 'Something went wrong.');
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-800">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial?.title}
          className={inputClass}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-zinc-800">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? 'feature'}
            className={inputClass}
          >
            {CHANGELOG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="versionTag" className="block text-sm font-medium text-zinc-800">
            Version tag <span className="text-zinc-500">(optional, e.g. v2.4)</span>
          </label>
          <input
            id="versionTag"
            name="versionTag"
            defaultValue={initial?.versionTag ?? ''}
            className={inputClass}
          />
        </div>
      </div>
      {initial?.status === 'published' ? (
        <div>
          <label htmlFor="publishedDate" className="block text-sm font-medium text-zinc-800">
            Publish date
          </label>
          <input
            id="publishedDate"
            name="publishedDate"
            type="date"
            defaultValue={initial?.publishedAt ? initial.publishedAt.slice(0, 10) : ''}
            className={inputClass}
          />
        </div>
      ) : null}
      <div>
        <span className="block text-sm font-medium text-zinc-800">Body</span>
        <div className="mt-1.5">
          <RichTextEditor name="bodyHtml" initialHtml={initial?.bodyHtml} />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex cursor-pointer items-center rounded-md bg-[#c0613d] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a8512f] disabled:opacity-60"
      >
        {saving ? 'Saving…' : mode === 'create' ? 'Create entry' : 'Save changes'}
      </button>
    </form>
  );
}
