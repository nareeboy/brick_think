'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { inviteParticipantsByEmailAction } from '@/app/(authed)/app/sessions/roster-actions';
import { rotateJoinCodeAction } from '@/app/(authed)/app/sessions/join-actions';
import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';

interface Props {
  sessionId: string;
  joinCode: string;
}

function getSiteUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://www.brickthink.io';
}

export function RosterInviteBlock({ sessionId, joinCode }: Props) {
  const router = useRouter();
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<Array<{ email: string; status: string }> | null>(null);
  const [pending, startTransition] = useTransition();
  const [rotateConfirming, setRotateConfirming] = useState(false);
  const [rotatePending, setRotatePending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const inviteUrl = `${getSiteUrl()}/app/join/${joinCode}`;

  function handleRotate() {
    setRotatePending(true);
    void (async () => {
      const result = await rotateJoinCodeAction(sessionId);
      if (result.ok) {
        setRotateConfirming(false);
        // Re-fetch the session page so the new join_code flows back
        // through the prop chain (page.tsx → RosterButton → modal).
        router.refresh();
      }
      setRotatePending(false);
    })();
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (
      e.key === 'Enter' ||
      e.key === ',' ||
      e.key === ' ' ||
      (e.key === 'Enter' && e.ctrlKey) ||
      (e.key === 'Enter' && e.metaKey)
    ) {
      e.preventDefault();
      const value = inputValue.trim();
      if (value) {
        // Split by comma or newline if pasted
        const candidates = value.split(/[,\n]/).map((s) => s.trim());
        const newEmails = candidates.filter((c) => c && !emails.includes(c));
        if (newEmails.length > 0) {
          setEmails([...emails, ...newEmails]);
          setInputValue('');
        }
      }
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      e.preventDefault();
      setEmails(emails.slice(0, -1));
    }
  }

  function removeEmail(email: string) {
    setEmails(emails.filter((e) => e !== email));
  }

  function handleSendInvites() {
    if (emails.length === 0) return;

    startTransition(async () => {
      const result = await inviteParticipantsByEmailAction(sessionId, emails);
      if (result.ok) {
        setResults(result.results);
        setEmails([]);
        setInputValue('');
      }
    });
  }

  function friendlyStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      sent_invite: 'sent invite',
      sent_magiclink: 'sent magic link',
      duplicate: 'duplicate',
      invalid_email: 'invalid email',
      already_member: 'already a member',
      failed: 'failed',
    };
    return labels[status] || status;
  }

  function statusColor(status: string): string {
    const colors: Record<string, string> = {
      sent_invite: 'text-emerald-700',
      sent_magiclink: 'text-emerald-700',
      duplicate: 'text-amber-700',
      invalid_email: 'text-red-700',
      already_member: 'text-sky-700',
      failed: 'text-red-700',
    };
    return colors[status] || 'text-zinc-600';
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Copy invite link section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-zinc-700">Invite link</p>
          <span className="font-mono text-[11px] tracking-[0.18em] text-zinc-500">
            CODE · <span className="text-zinc-900">{joinCode}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyToClipboard}
            className="h-9 flex-1 cursor-pointer rounded-lg border border-zinc-900/10 bg-white px-3 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-900/5"
          >
            {copied ? '✓ Copied!' : 'Copy invite link'}
          </button>
          <button
            type="button"
            onClick={() => setRotateConfirming(true)}
            title="Generate a new code — any pending email invites stop working"
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-900/10 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 0 1 15.5-6.36L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.5 6.36L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            Rotate
          </button>
        </div>
      </div>

      {rotateConfirming && (
        <DeleteConfirmDialog
          title="Rotate join code?"
          description={
            <>
              A new code will replace{' '}
              <span className="font-mono font-semibold text-zinc-900">{joinCode}</span>. Any
              previously-shared invite links and unclaimed email invites will stop working. You can
              resend invites with the new code afterwards.
            </>
          }
          confirmLabel="Rotate code"
          confirmPendingLabel="Rotating…"
          pending={rotatePending}
          onCancel={() => setRotateConfirming(false)}
          onConfirm={handleRotate}
        />
      )}

      {/* Email invite section */}
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-zinc-700">Invite by email</p>
        <p className="text-[12px] text-zinc-500">
          Anyone with the code can join. Or send a magic-link invite to specific emails.
        </p>

        {/* Chip list + input */}
        <div className="flex min-h-9 flex-wrap gap-2 rounded-lg border border-zinc-900/10 bg-white p-2">
          {emails.map((email) => (
            <div
              key={email}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-900/5 px-2 py-1 font-mono text-[11px] text-zinc-700"
            >
              <span>{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(email)}
                aria-label={`Remove ${email}`}
                className="ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded hover:bg-zinc-900/10"
              >
                ×
              </button>
            </div>
          ))}
          <input
            ref={inputRef}
            type="email"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={emails.length === 0 ? 'Enter email addresses...' : ''}
            className="flex-1 bg-white px-2 py-1 font-mono text-[12px] text-zinc-900 placeholder:text-zinc-500 focus:outline-none"
            autoComplete="off"
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSendInvites}
          disabled={emails.length === 0 || pending}
          className="h-9 w-full cursor-pointer rounded-lg bg-[#a8482a] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#a4502e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Send invites'}
        </button>
      </div>

      {/* Results display */}
      {results && results.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-semibold text-zinc-700">Invite results</p>
          <ul className="flex flex-col gap-1">
            {results.map(({ email, status }) => (
              <li
                key={email}
                className="flex items-center justify-between text-[12px] text-zinc-700"
              >
                <span className="truncate font-mono text-[11px]">{email}</span>
                <span className={`whitespace-nowrap ${statusColor(status)}`}>
                  {friendlyStatusLabel(status)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
