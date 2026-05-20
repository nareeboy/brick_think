'use client';

import { useEffect, useRef, useState } from 'react';

import {
  addCommentAction,
  softDeleteCommentAction,
} from '@/app/(authed)/app/sessions/brick-feedback-actions';
import { COMMENT_BODY_MAX } from '@/lib/brickFeedback/palette';
import type { CommentRow } from '@/lib/brickFeedback/loadInitial';

interface Props {
  modelId: string;
  brickId: string;
  comments: CommentRow[];
  myProfileId: string;
  disabled?: boolean;
  onClose: () => void;
}

/**
 * Anchored thread + composer for a single brick. Mounts as a sibling of the
 * indicator button (`absolute right-0 top-6`) so it positions itself relative
 * to the brick's top-right corner. Escape and outside-click both dismiss.
 *
 * Posting is optimistic-from-realtime: the server-action insert fires the
 * realtime INSERT event the `useBrickComments` hook listens to, so the new
 * row appears in the thread without local state munging. Soft-delete works
 * the same way through the UPDATE listener.
 */
export function BrickCommentPopover({
  modelId,
  brickId,
  comments,
  myProfileId,
  disabled,
  onClose,
}: Props) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label="Comments"
      className="absolute right-0 top-6 z-30 w-80 rounded-md border border-zinc-200 bg-white p-3 shadow-lg"
    >
      <header className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-900">Comments</h4>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer text-zinc-400 hover:text-zinc-700"
        >
          ✕
        </button>
      </header>

      <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto">
        {comments.length === 0 ? (
          <li className="text-xs italic text-zinc-500">No comments yet — be the first.</li>
        ) : null}
        {comments.map((c) => (
          <li key={c.id} className="text-xs">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="font-medium text-zinc-700">{c.full_name ?? 'Removed user'}</div>
                <div className="whitespace-pre-wrap text-zinc-600">{c.body}</div>
                <div className="text-[10px] text-zinc-400">
                  {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
              {c.profile_id === myProfileId ? (
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => {
                    void softDeleteCommentAction(c.id);
                  }}
                  className="cursor-pointer text-zinc-400 hover:text-red-600"
                >
                  ×
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {!disabled ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!draft.trim() || busy) return;
            setBusy(true);
            const result = await addCommentAction(modelId, brickId, draft);
            setBusy(false);
            if (result.ok) setDraft('');
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={COMMENT_BODY_MAX}
            rows={3}
            placeholder="Add a comment…"
            className="w-full resize-none rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
            <span>
              {draft.length} / {COMMENT_BODY_MAX}
            </span>
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="cursor-pointer rounded bg-zinc-900 px-2 py-0.5 text-white disabled:cursor-default disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
