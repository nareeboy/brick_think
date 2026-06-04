// components/careers/ApplicationForm.tsx
'use client';

import { useState } from 'react';

import { PhoneInput } from './PhoneInput';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_first_name: 'Please enter your first name.',
  invalid_last_name: 'Please enter your last name.',
  invalid_address: 'Please enter your address.',
  invalid_phone: 'Please enter a valid contact number.',
  invalid_linkedin: 'Please enter a valid LinkedIn URL (https://…).',
  terms_required: 'Please accept the terms and conditions.',
  invalid_role: 'This role is no longer accepting applications.',
  cv_missing: 'Please attach your CV.',
  cv_too_large: 'Your CV must be 5 MB or smaller.',
  cv_bad_type: 'Your CV must be a PDF, DOC, or DOCX file.',
  bad_request: 'Something went wrong. Please try again.',
  unknown: 'Something went wrong. Please try again.',
};

const inputClass =
  'mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#c0613d] focus:outline-none focus:ring-1 focus:ring-[#c0613d]';

export function ApplicationForm({ roleId, roleTitle }: { roleId: string; roleTitle: string }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/careers/apply', { method: 'POST', body: form });
      const data = (await res.json()) as { ok: boolean; code?: string };
      if (data.ok) {
        setStatus('success');
        return;
      }
      setError(ERROR_MESSAGES[data.code ?? 'unknown'] ?? ERROR_MESSAGES['unknown']!);
      setStatus('idle');
    } catch {
      setError(ERROR_MESSAGES['unknown']!);
      setStatus('idle');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-[#c0613d]/30 bg-[#c0613d]/5 p-6">
        <h3 className="font-display text-xl text-zinc-950">Application received</h3>
        <p className="mt-2 text-sm text-zinc-700">
          Thanks for applying for {roleTitle}. We&apos;ll be in touch via the LinkedIn profile you
          shared.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="roleId" value={roleId} />
      {/* Honeypot — visually hidden, ignored by humans, filled by bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-zinc-800">
            First name
          </label>
          <input id="firstName" name="firstName" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-zinc-800">
            Last name
          </label>
          <input id="lastName" name="lastName" required className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-zinc-800">
          Address
        </label>
        <textarea id="address" name="address" required rows={2} className={inputClass} />
      </div>

      <PhoneInput />

      <div>
        <label htmlFor="linkedinUrl" className="block text-sm font-medium text-zinc-800">
          LinkedIn profile
        </label>
        <input
          id="linkedinUrl"
          name="linkedinUrl"
          type="url"
          required
          placeholder="https://www.linkedin.com/in/…"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="cv" className="block text-sm font-medium text-zinc-800">
          Upload CV <span className="text-zinc-500">(PDF, DOC, or DOCX · max 5 MB)</span>
        </label>
        <input
          id="cv"
          name="cv"
          type="file"
          required
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="mt-1.5 block w-full cursor-pointer text-sm text-zinc-700 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="terms"
          value="true"
          required
          className="mt-0.5 cursor-pointer"
        />
        <span>
          I accept the{' '}
          <a href="/terms" target="_blank" className="text-[#c0613d] underline">
            terms and conditions
          </a>{' '}
          and consent to BrickThink storing my application for the purpose of recruitment.
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex cursor-pointer items-center rounded-md bg-[#c0613d] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a8512f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}
