'use client';

import { useId, useState, useTransition } from 'react';

import {
  SESSION_MODES,
  SESSION_STATUSES,
  type SessionMode,
  type SessionStatus,
} from '@/lib/sessions/types';

import { updateSessionMeta } from '../actions';

interface SessionMetaFormProps {
  sessionId: string;
  initialStatus: SessionStatus;
  initialMode: SessionMode;
  // ISO timestamptz string from Postgres, or null when unscheduled.
  initialScheduledFor: string | null;
}

// `datetime-local` consumes "YYYY-MM-DDTHH:mm" in the user's local timezone.
// We convert the stored UTC timestamp by hand because toISOString() always
// returns UTC and slicing that into the input would shift the displayed time.
function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionMetaForm({
  sessionId,
  initialStatus,
  initialMode,
  initialScheduledFor,
}: SessionMetaFormProps) {
  const [status, setStatus] = useState<SessionStatus>(initialStatus);
  const [mode, setMode] = useState<SessionMode>(initialMode);
  const [scheduledFor, setScheduledFor] = useState<string>(
    toLocalDatetimeInput(initialScheduledFor),
  );
  const [pending, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statusId = useId();
  const modeId = useId();
  const scheduledId = useId();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        // `datetime-local` value is "YYYY-MM-DDTHH:mm" in local time. Pass it
        // straight to the action; new Date(localString) interprets in local
        // tz, which matches what the user typed.
        await updateSessionMeta({
          sessionId,
          status,
          mode,
          scheduledFor: scheduledFor === '' ? null : scheduledFor,
        });
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 1800);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      data-testid="session-meta-form"
      className="rounded-2xl border border-zinc-900/10 bg-white p-5"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Session settings
      </p>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1" htmlFor={statusId}>
          <span className="text-[12px] font-medium text-zinc-600">Status</span>
          <select
            id={statusId}
            data-testid="session-status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as SessionStatus)}
            disabled={pending}
            className="h-10 cursor-pointer rounded-xl border border-zinc-900/10 bg-white px-3 text-[13px] text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
          >
            {SESSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1" htmlFor={modeId}>
          <span className="text-[12px] font-medium text-zinc-600">Mode</span>
          <select
            id={modeId}
            data-testid="session-mode-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as SessionMode)}
            disabled={pending}
            className="h-10 cursor-pointer rounded-xl border border-zinc-900/10 bg-white px-3 text-[13px] text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
          >
            {SESSION_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1" htmlFor={scheduledId}>
          <span className="text-[12px] font-medium text-zinc-600">Scheduled for</span>
          <input
            id={scheduledId}
            type="datetime-local"
            data-testid="session-scheduled-input"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            disabled={pending}
            autoComplete="off"
            className="h-10 rounded-xl border border-zinc-900/10 bg-white px-3 text-[13px] text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-[12px]">
          {error ? (
            <p className="text-red-700" role="alert">
              {error}
            </p>
          ) : savedFlash ? (
            <p className="text-zinc-500" data-testid="session-meta-saved">
              Saved.
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={pending}
          data-testid="session-meta-save"
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
