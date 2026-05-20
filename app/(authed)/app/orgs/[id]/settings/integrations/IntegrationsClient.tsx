'use client';

import { useState, useTransition } from 'react';

import {
  saveAnthropicKey,
  testStoredAnthropicKey,
  removeAnthropicKey,
} from './actions';

interface Props {
  orgId: string;
  existingLast4: string | null;
  existingUpdatedAt: string | null;
}

export default function IntegrationsClient({
  orgId,
  existingLast4,
  existingUpdatedAt,
}: Props) {
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
      const res = await saveAnthropicKey(orgId, inputValue);
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
      const res = await testStoredAnthropicKey(orgId);
      if (res.ok) flash('Connection OK.');
      else flash(messageForCode(res.code, res.message), true);
    });
  }

  function handleRemove() {
    if (!confirm('Remove the stored Anthropic key for this org?')) return;
    setMessage(null);
    startTransition(async () => {
      const res = await removeAnthropicKey(orgId);
      if (res.ok) flash('Key removed.');
      else flash(messageForCode(res.code, res.message), true);
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg text-zinc-900">Anthropic API key</h2>
        <p className="text-sm text-zinc-600">
          Used by session report generation. Stored encrypted; never exposed to the browser.
        </p>
      </div>

      {existingLast4 ? (
        <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3">
          <div>
            <p className="text-sm text-zinc-900">
              Connected · <span className="font-mono">sk-ant-…••••{existingLast4}</span>
            </p>
            {existingUpdatedAt ? (
              <p className="text-xs text-zinc-500">
                Updated {new Date(existingUpdatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={pending}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              Test
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="key" className="block text-sm font-medium text-zinc-900">
          {existingLast4 ? 'Replace key' : 'Add key'}
        </label>
        <input
          id="key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="sk-ant-…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || inputValue.length === 0}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
        >
          {pending ? 'Verifying…' : 'Save'}
        </button>
      </div>

      {message ? (
        <p
          className={`text-sm ${tone === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}
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
    case 'not_org_admin':
      return 'You need to be an org admin to manage integrations.';
    default:
      return fallback ?? 'Something went wrong.';
  }
}
