// app/(authed)/app/admin/changelog/ChangelogEditor.tsx
'use client';

import { useState } from 'react';

import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { CHANGELOG_CATEGORIES, CATEGORY_LABELS } from '@/lib/changelog/constants';
import type { AdminChangelogEntry } from '@/lib/changelog/types';

import { createEntryAction, updateEntryAction, type ChangelogActionResult } from './actions';
import { BannerImageField } from './BannerImageField';

const inputClass =
  'mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#a8482a] focus:outline-none focus:ring-1 focus:ring-[#a8482a]';

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
  initialDate = '',
}: {
  mode: 'create' | 'edit';
  initial?: AdminChangelogEntry;
  // Prefill for the Date field, as yyyy-mm-dd. The caller resolves it server-side
  // (today's date for a new entry, the existing published_at for an edit) so the
  // value is stable across SSR/hydration.
  initialDate?: string;
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
    <div className="max-w-2xl space-y-5">
      {initial?.id ? (
        <BannerImageField entryId={initial.id} initialUrl={initial.bannerUrl} />
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-[12px] text-zinc-500">
          Save this entry first — the banner image upload appears once the entry exists.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-5">
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
        <div>
          <label htmlFor="publishedDate" className="block text-sm font-medium text-zinc-800">
            Date <span className="text-zinc-500">(used to order and group entries)</span>
          </label>
          <input
            id="publishedDate"
            name="publishedDate"
            type="date"
            defaultValue={initialDate}
            className={inputClass}
          />
        </div>
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
          className="inline-flex cursor-pointer items-center rounded-md bg-[#a8482a] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a8512f] disabled:opacity-60"
        >
          {saving ? 'Saving…' : mode === 'create' ? 'Create entry' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
