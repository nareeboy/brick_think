// app/(authed)/app/admin/banner/BannerSettingsForm.tsx
'use client';

import { useState } from 'react';

import { BannerIcon } from '@/components/banner/BannerIcon';
import {
  BANNER_MESSAGE_MAX,
  BANNER_TYPES,
  BANNER_TYPE_LABELS,
  BANNER_TYPE_STYLES,
  type BannerType,
} from '@/lib/banner/constants';
import type { AdminSiteBanner } from '@/lib/banner/types';

import { saveBannerAction, type BannerActionResult } from './actions';

const inputClass =
  'mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#c0613d] focus:outline-none focus:ring-1 focus:ring-[#c0613d]';

const CODE_MESSAGES: Record<string, string> = {
  forbidden: 'You do not have permission to do that.',
  unauthenticated: 'Please sign in again.',
  invalid_type: 'Choose a valid banner type.',
  invalid_message: `Message must be under ${BANNER_MESSAGE_MAX} characters.`,
  unknown: 'Something went wrong.',
};

export function BannerSettingsForm({ initial }: { initial: AdminSiteBanner }) {
  const [active, setActive] = useState(initial.isActive);
  const [type, setType] = useState<BannerType>(initial.type);
  const [message, setMessage] = useState(initial.message);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const form = new FormData();
    form.set('isActive', active ? 'true' : 'false');
    form.set('type', type);
    form.set('message', message);
    let result: BannerActionResult;
    try {
      result = await saveBannerAction(form);
    } catch {
      setError(CODE_MESSAGES.unknown ?? 'Something went wrong.');
      setSaving(false);
      return;
    }
    if (!result.ok) {
      setError(CODE_MESSAGES[result.code] ?? CODE_MESSAGES.unknown ?? 'Something went wrong.');
      setSaving(false);
      return;
    }
    setSaved(true);
    setSaving(false);
  }

  const styles = BANNER_TYPE_STYLES[type];

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      {/* Active toggle */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-zinc-800">Banner Active</div>
          <div className="text-xs text-zinc-500">Toggle to show/hide the banner site-wide</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="Banner Active"
          onClick={() => setActive((v) => !v)}
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            active ? 'bg-[#c0613d]' : 'bg-zinc-300'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              active ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-zinc-800">
          Banner Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as BannerType)}
          className={inputClass}
        >
          {BANNER_TYPES.map((t) => (
            <option key={t} value={t}>
              {BANNER_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-zinc-800">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={BANNER_MESSAGE_MAX}
          rows={3}
          className={inputClass}
        />
        <div className="mt-1 text-right text-xs text-zinc-400">
          {message.length}/{BANNER_MESSAGE_MAX}
        </div>
      </div>

      {/* Live preview */}
      <div>
        <div className="mb-1.5 text-sm font-medium text-zinc-800">Preview</div>
        <div
          className={`flex items-center gap-3 rounded-md border px-4 py-2.5 text-sm ${styles.container}`}
        >
          <BannerIcon type={type} className={`shrink-0 ${styles.icon}`} />
          <span className="min-w-0 flex-1">
            {message || 'Your banner message will appear here.'}
          </span>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">Saved.</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="cursor-pointer rounded-md bg-[#c0613d] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save banner'}
      </button>
    </form>
  );
}
