'use client';

import { useState } from 'react';

import { RichTextEditor } from '@/components/careers/RichTextEditor';
import { createRoleAction, updateRoleAction, type RoleActionResult } from './actions';

interface RoleEditorProps {
  mode: 'create' | 'edit';
  initial?: {
    id: string;
    title: string;
    slug: string;
    location: string;
    employmentType: string;
    summary: string;
    descriptionHtml: string;
  };
}

const inputClass =
  'mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#c0613d] focus:outline-none focus:ring-1 focus:ring-[#c0613d]';

export function RoleEditor({ mode, initial }: RoleEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const action = mode === 'create' ? createRoleAction : updateRoleAction;
    let result: RoleActionResult | undefined;
    try {
      result = await action(form);
    } catch (err) {
      // create redirects on success -> Next throws NEXT_REDIRECT; let it bubble.
      if (err && typeof err === 'object' && 'digest' in err) throw err;
      setError('Something went wrong.');
      setSaving(false);
      return;
    }
    if (result && !result.ok) {
      setError(result.code);
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
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-zinc-800">
          Slug <span className="text-zinc-500">(leave blank to auto-generate)</span>
        </label>
        <input id="slug" name="slug" defaultValue={initial?.slug} className={inputClass} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-zinc-800">
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={initial?.location}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="employmentType" className="block text-sm font-medium text-zinc-800">
            Employment type
          </label>
          <input
            id="employmentType"
            name="employmentType"
            defaultValue={initial?.employmentType}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-zinc-800">
          Summary <span className="text-zinc-500">(one line on the careers list)</span>
        </label>
        <input id="summary" name="summary" defaultValue={initial?.summary} className={inputClass} />
      </div>
      <div>
        <span className="block text-sm font-medium text-zinc-800">Description</span>
        <div className="mt-1.5">
          <RichTextEditor name="descriptionHtml" initialHtml={initial?.descriptionHtml} />
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
        {saving ? 'Saving…' : mode === 'create' ? 'Create role' : 'Save changes'}
      </button>
    </form>
  );
}
