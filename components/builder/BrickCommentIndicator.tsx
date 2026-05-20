'use client';

import { useState } from 'react';

import { BrickCommentPopover } from './BrickCommentPopover';
import type { CommentMap } from './useBrickComments';

interface Props {
  modelId: string;
  brickId: string;
  /**
   * World-space bounds of the underlying brick (already pan/zoom-applied by
   * the parent layer). The indicator anchors to the top-right corner.
   */
  bounds: { x: number; y: number; width: number; height: number };
  comments: CommentMap[string] | undefined;
  myProfileId: string;
  /** Read-only / non-member view — composer + author-side delete are hidden. */
  disabled?: boolean;
}

/**
 * Speech-bubble icon at the brick's top-right corner. Two visual states:
 *
 * - count > 0 → always-visible chip carrying the count, click to open the
 *   thread (read-only viewers can still inspect the thread).
 * - count = 0 → tiny "+" button, hidden by default and revealed on hover /
 *   focus / touch so the canvas doesn't get peppered with empty affordances.
 *
 * The popover is rendered as a child here (not a portal) so the dialog's
 * outside-click handler can scope to the dialog's own DOM tree.
 */
export function BrickCommentIndicator({
  modelId,
  brickId,
  bounds,
  comments,
  myProfileId,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const count = comments?.length ?? 0;

  // Hide the empty-state opener entirely when the caller can't post — a "+"
  // that does nothing is just clutter.
  if (count === 0 && disabled) return null;

  return (
    <div
      className="pointer-events-auto absolute"
      style={{ left: bounds.x + bounds.width - 20, top: bounds.y + 4 }}
      data-testid={`brick-comment-indicator-${brickId}`}
    >
      {count > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${count} comment${count === 1 ? '' : 's'}`}
          className="inline-flex cursor-pointer items-center gap-0.5 rounded-full bg-white/95 px-1.5 py-0.5 text-xs shadow-sm ring-1 ring-zinc-200/60 transition-colors hover:bg-white"
        >
          <span aria-hidden="true">💬</span>
          <span className="text-zinc-600">{count}</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          aria-label="Add comment"
          className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-white/95 text-xs text-zinc-500 opacity-0 shadow-sm ring-1 ring-zinc-200/60 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:cursor-default disabled:opacity-50 [@media(hover:none)]:opacity-100"
        >
          +
        </button>
      )}
      {open ? (
        <BrickCommentPopover
          modelId={modelId}
          brickId={brickId}
          comments={comments ?? []}
          myProfileId={myProfileId}
          disabled={disabled}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
