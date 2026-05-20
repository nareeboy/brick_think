'use client';

import { useState, useTransition } from 'react';

import {
  removeAnthropicKey,
  saveAnthropicKey,
  testStoredAnthropicKey,
} from './integrations-actions';

interface Props {
  existingLast4: string | null;
  existingUpdatedAt: string | null;
}

export function IntegrationsCard({ existingLast4, existingUpdatedAt }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'ok' | 'err'>('ok');
  const [pending, startTransition] = useTransition();

  function flash(text: string, isErr = false) {
    setTone(isErr ? 'err' : 'ok');
    setMessage(text);
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const res = await saveAnthropicKey(inputValue);
      if (res.ok) {
        flash('Key saved and verified.');
        setInputValue('');
      } else {
        flash(messageForCode(res.code, res.message), true);
      }
    });
  }

  function handleTest() {
    setMessage(null);
    startTransition(async () => {
      const res = await testStoredAnthropicKey();
      if (res.ok) flash('Connection OK.');
      else flash(messageForCode(res.code, res.message), true);
    });
  }

  function handleRemove() {
    if (!confirm('Remove your stored Anthropic key?')) return;
    setMessage(null);
    startTransition(async () => {
      const res = await removeAnthropicKey();
      if (res.ok) flash('Key removed.');
      else flash(messageForCode(res.code, res.message), true);
    });
  }

  return (
    <section
      data-testid="integrations-card"
      className="rounded-2xl border border-zinc-900/10 bg-white p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Integrations
      </p>
      <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-950">
        Anthropic API key
      </h2>
      <p className="mt-1 text-[13px] text-zinc-600">
        Used to generate session reports. Stored encrypted; never exposed to the
        browser. Generation cost (~$0.05 per report) is billed directly to your
        Anthropic account.
      </p>

      {existingLast4 ? (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3">
          <div>
            <p className="text-[13px] text-zinc-900">
              Connected · <span className="font-mono">sk-ant-…••••{existingLast4}</span>
            </p>
            {existingUpdatedAt ? (
              <p className="text-[11px] text-zinc-500">
                Updated {new Date(existingUpdatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={pending}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[13px] hover:bg-zinc-50 disabled:opacity-50"
            >
              Test
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-[13px] text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <label htmlFor="anthropic-key" className="block text-[13px] font-medium text-zinc-900">
          {existingLast4 ? 'Replace key' : 'Add key'}
        </label>
        <input
          id="anthropic-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="sk-ant-…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-[13px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || inputValue.length === 0}
          className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand/90 disabled:opacity-50"
        >
          {pending ? 'Verifying…' : 'Save'}
        </button>
      </div>

      {message ? (
        <p
          className={`mt-3 text-[13px] ${tone === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

function messageForCode(code: string, fallback?: string): string {
  switch (code) {
    case 'invalid_key_format':
      return "That doesn't look like an Anthropic key (sk-ant-…).";
    case 'invalid_key':
      return 'Anthropic rejected this key.';
    case 'network_error':
      return "Couldn't reach Anthropic. Try again.";
    case 'unauthenticated':
      return 'Sign in to manage integrations.';
    default:
      return fallback ?? 'Something went wrong.';
  }
}
