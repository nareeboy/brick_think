'use client';

import { useState, useTransition } from 'react';

import { Avatar } from '@/components/app/Avatar';

import { removeAvatarAction, updateProfileAction, type UpdateProfileResult } from './actions';
import { AvatarUploadDialog } from './AvatarUploadDialog';

interface Props {
  initialFullName: string | null;
  email: string;
  initialAvatarUrl: string | null;
}

export function AccountForm({ initialFullName, email, initialAvatarUrl }: Props) {
  const [name, setName] = useState(initialFullName ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, startRemove] = useTransition();

  const baseline = initialFullName ?? '';
  const dirty = name !== baseline;
  const displayName = name.trim() || email;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    start(async () => {
      try {
        const result: UpdateProfileResult = await updateProfileAction(name);
        if (result.kind === 'ok') {
          setFeedback({ kind: 'ok', text: 'Saved.' });
        } else {
          setFeedback({ kind: 'error', text: result.reason });
        }
      } catch (e) {
        setFeedback({
          kind: 'error',
          text: e instanceof Error ? e.message : 'Failed to save',
        });
      }
    });
  }

  function handleRemove() {
    setFeedback(null);
    startRemove(async () => {
      const result = await removeAvatarAction();
      if (result.kind === 'ok') {
        setAvatarUrl(null);
        setConfirmRemove(false);
      } else {
        setFeedback({ kind: 'error', text: 'Could not remove your photo. Please try again.' });
      }
    });
  }

  return (
    <>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex items-center gap-5">
          <Avatar url={avatarUrl} name={displayName} size="xl" />
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Profile photo
            </span>
            {confirmRemove ? (
              <div className="flex items-center gap-3 text-[13px] text-zinc-700">
                <span>Remove your photo?</span>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing}
                  data-testid="avatar-remove-confirm"
                  className="cursor-pointer font-semibold text-[#c0613d] underline-offset-2 hover:underline disabled:opacity-40"
                >
                  {removing ? 'Removing…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  disabled={removing}
                  className="cursor-pointer text-zinc-600 underline-offset-2 hover:underline disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-[13px] text-zinc-700">
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  data-testid="avatar-change-button"
                  className="cursor-pointer font-medium underline-offset-2 hover:underline"
                >
                  Change photo
                </button>
                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                    data-testid="avatar-remove-button"
                    className="cursor-pointer text-zinc-600 underline-offset-2 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Email
          </span>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            aria-label="Email"
            data-testid="account-email"
            autoComplete="email"
            className="h-10 cursor-not-allowed rounded-xl border border-zinc-900/10 bg-[#FBF7F1] px-3 text-[14px] text-zinc-700"
          />
          <span className="text-[12px] text-zinc-500">
            Sign in with a different provider to change your email.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Display name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFeedback(null);
            }}
            placeholder="What should the app call you?"
            maxLength={80}
            aria-label="Display name"
            data-testid="account-name-input"
            autoComplete="name"
            className="h-10 rounded-xl border border-zinc-900/10 bg-white px-3 text-[14px] text-zinc-900 outline-none focus:border-[#c0613d]"
          />
          <span className="text-[12px] text-zinc-500">
            Shown in the header and on shared sessions. Leave blank to fall back to your email.
          </span>
        </label>

        <div className="flex items-center justify-between gap-4">
          <div aria-live="polite" className="min-h-[20px] text-[13px]">
            {feedback ? (
              <span className={feedback.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}>
                {feedback.text}
              </span>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={!dirty || pending}
            data-testid="account-save-button"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#a44f30] disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      <AvatarUploadDialog
        open={dialogOpen}
        currentName={displayName}
        onClose={() => setDialogOpen(false)}
        onUploaded={(url) => setAvatarUrl(url)}
      />
    </>
  );
}
