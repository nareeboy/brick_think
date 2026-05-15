'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import type { OrgSummary } from '@/lib/orgs/types';

import { createDesignAction } from './actions';
import { listOrgSessionsAction, type SessionOption } from './listSessionsAction';
import { createSession } from '@/app/(authed)/app/sessions/actions';

type Destination = { kind: 'personal' } | { kind: 'org'; org: OrgSummary };

interface Props {
  orgs: OrgSummary[];
  onClose: () => void;
}

export function NewDesignDialog({ orgs, onClose }: Props) {
  const router = useRouter();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [createInline, setCreateInline] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (destination?.kind !== 'org') return;
    setSessionsLoading(true);
    listOrgSessionsAction(destination.org.id)
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setSessionsLoading(false));
  }, [destination]);

  function submitPersonal() {
    start(async () => {
      try {
        const id = await createDesignAction({ orgId: null, sessionId: null });
        router.push(`/app/designs/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create design');
      }
    });
  }

  function submitOrgSession(sessionId: string) {
    if (destination?.kind !== 'org') return;
    const orgId = destination.org.id;
    start(async () => {
      try {
        const id = await createDesignAction({ orgId, sessionId });
        router.push(`/app/designs/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create design');
      }
    });
  }

  function submitInlineSession() {
    if (destination?.kind !== 'org') return;
    if (newSessionTitle.trim().length === 0) {
      setError('Session title is required');
      return;
    }
    const orgId = destination.org.id;
    start(async () => {
      try {
        const fd = new FormData();
        fd.set('title', newSessionTitle.trim());
        fd.set('orgId', orgId);
        await createSession(fd);
        // createSession redirects to /app/sessions/<id>, which terminates the
        // server action with a NEXT_REDIRECT. Next.js client-side action call
        // does NOT throw — but it does NOT return either. To navigate the
        // builder of the new design, we re-fetch sessions, pick the newest,
        // then create the design.
        const fresh = await listOrgSessionsAction(orgId);
        const newest = fresh[0];
        if (!newest) throw new Error('Failed to find the new session');
        const id = await createDesignAction({ orgId, sessionId: newest.id });
        router.push(`/app/designs/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create session');
      }
    });
  }

  return (
    // The outer div doubles as a click-outside-to-close backdrop. ARIA role
    // "dialog" makes it non-interactive to a11y linters, but the click is
    // guarded by `e.target === e.currentTarget` (i.e. clicks on inner content
    // bubble through without firing). Escape-to-close covers keyboard users.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      data-testid="new-design-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
      >
        <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
          {destination ? 'Pick a session' : 'New design'}
        </h2>
        <p className="mt-1 text-[13px] text-zinc-600">
          {destination ? `In ${destination.kind === 'org' ? destination.org.name : 'Personal'}` : 'Where should this design live?'}
        </p>

        {!destination ? (
          <ul data-testid="destination-list" className="mt-4 flex flex-col gap-2">
            <li>
              <button
                type="button"
                data-testid="destination-personal"
                onClick={() => submitPersonal()}
                disabled={pending}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-900/10 px-4 py-3 text-left text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-[#FAF7F1] disabled:opacity-60"
              >
                Personal
                <span aria-hidden="true">→</span>
              </button>
            </li>
            {orgs.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  data-testid={`destination-org-${o.id}`}
                  onClick={() => setDestination({ kind: 'org', org: o })}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-900/10 px-4 py-3 text-left text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-[#FAF7F1]"
                >
                  {o.name}
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {sessionsLoading ? (
              <p className="text-[13px] text-zinc-500">Loading sessions…</p>
            ) : (
              <>
                <ul data-testid="session-list" className="flex flex-col gap-2">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        data-testid={`session-option-${s.id}`}
                        onClick={() => submitOrgSession(s.id)}
                        disabled={pending}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-900/10 px-4 py-3 text-left text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-[#FAF7F1] disabled:opacity-60"
                      >
                        {s.title}
                        <span aria-hidden="true">→</span>
                      </button>
                    </li>
                  ))}
                  {sessions.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-zinc-900/15 px-4 py-3 text-[13px] text-zinc-500">
                      No sessions yet.
                    </li>
                  ) : null}
                </ul>
                {!createInline ? (
                  <button
                    type="button"
                    data-testid="new-session-inline-toggle"
                    onClick={() => setCreateInline(true)}
                    className="mt-2 inline-flex cursor-pointer items-center justify-start gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-[#c0613d] hover:bg-[#FAF7F1]"
                  >
                    + New session
                  </button>
                ) : (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl border border-zinc-900/10 p-3">
                    <input
                      type="text"
                      data-testid="new-session-title-input"
                      placeholder="Session title"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      className="rounded-md border border-zinc-900/10 px-3 py-2 text-[14px]"
                      // autoFocus is intentional: the input only appears after a
                      // deliberate user click on "+ New session", so it doesn't
                      // ambush screen-reader users on page load.
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                    />
                    <button
                      type="button"
                      data-testid="new-session-submit"
                      onClick={submitInlineSession}
                      disabled={pending}
                      className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#c0613d] px-3 text-[13px] font-semibold text-white hover:bg-[#cf6e47] disabled:opacity-60"
                    >
                      {pending ? 'Creating…' : 'Create and continue'}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDestination(null);
                    setCreateInline(false);
                    setNewSessionTitle('');
                  }}
                  className="mt-2 self-start text-[13px] text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        )}

        {error ? (
          <p data-testid="new-design-error" className="mt-4 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[13px] font-medium text-zinc-500 hover:text-zinc-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
