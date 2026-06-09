'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { addOrgMemberAction, type AddMemberResult } from '@/app/(authed)/app/workshops/actions';
import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { useNotifications } from '@/components/notifications/NotificationsProvider';

interface Props {
  orgId: string;
  onClose: () => void;
}

export function AddMemberDialog({ orgId, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const { pushToast } = useNotifications();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed.length === 0) return;
    setFeedback(null);
    start(async () => {
      const result: AddMemberResult = await addOrgMemberAction(orgId, trimmed);
      if (result.kind === 'ok') {
        setEmail('');
        setFeedback({
          kind: 'ok',
          text: `${result.recipientDisplay} was added to ${result.orgName}.`,
        });
        // Admin-side confirmation toast — surfaces a top-level toast in
        // addition to the inline dialog feedback, mirroring the recipient
        // experience. id/created_at are synthesised since this is a UI-only
        // ephemeral toast (no row in the notifications table — that's the
        // recipient's row).
        pushToast({
          id: `local-org-add-${Date.now()}`,
          recipient_profile_id: '',
          kind: 'org_added',
          title: `${result.recipientDisplay} was added to ${result.orgName}`,
          body: 'They have been notified.',
          link_url: `/app/workshops/${orgId}`,
          actor_profile_id: null,
          org_id: orgId,
          session_id: null,
          read_at: null,
          created_at: new Date().toISOString(),
        });
        return;
      }
      if (result.kind === 'invited') {
        setEmail('');
        setFeedback({
          kind: 'ok',
          text: `Invitation emailed to ${result.email}. They'll join ${result.orgName} when they sign up.`,
        });
        pushToast({
          id: `local-org-invite-${Date.now()}`,
          recipient_profile_id: '',
          kind: 'org_added',
          title: `Invite sent to ${result.email}`,
          body: `They'll join ${result.orgName} after signing up.`,
          link_url: null,
          actor_profile_id: null,
          org_id: orgId,
          session_id: null,
          read_at: null,
          created_at: new Date().toISOString(),
        });
        return;
      }
      if (result.kind === 'invite_pending') {
        setFeedback({
          kind: 'error',
          text: `An invitation is already pending for ${result.email}.`,
        });
        return;
      }
      if (result.kind === 'invite_failed') {
        setFeedback({
          kind: 'error',
          text: `Could not send invite email: ${result.message}`,
        });
        return;
      }
      if (result.kind === 'invalid_input') {
        setFeedback({ kind: 'error', text: 'Please enter an email address.' });
        return;
      }
      if (result.kind === 'already_member') {
        setFeedback({ kind: 'error', text: 'They are already a member.' });
        return;
      }
      if (result.kind === 'forbidden') {
        setFeedback({ kind: 'error', text: 'Only admins can add members.' });
      }
    });
  }

  return (
    <ModalBackdrop dataTestid="add-member-dialog" titleId={titleId} onClose={onClose}>
      <form
        onSubmit={submit}
        className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
      >
        <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Add a member
        </h2>
        <p className="mt-1 text-[13px] text-zinc-600">
          If they don&apos;t have an account yet, we&apos;ll email them an invite.
        </p>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Add by email
          </span>
          <input
            ref={inputRef}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            autoComplete="email"
            className="h-10 rounded-xl border border-zinc-900/10 bg-white px-3 text-[14px] text-zinc-900 outline-none focus:border-[#a8482a]"
          />
        </label>

        {feedback ? (
          <p
            role="status"
            className={`mt-3 rounded-xl px-3 py-2 text-[13px] ${
              feedback.kind === 'ok'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {feedback.text}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-900/5 disabled:opacity-60"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}
