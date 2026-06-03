'use client';

import { useState } from 'react';

import { toggleReactionAction } from '@/app/(authed)/app/sessions/brick-feedback-actions';
import { REACTION_PALETTE } from '@/lib/brickFeedback/palette';

import type { ReactionMap } from './useBrickReactions';

interface Props {
  modelId: string;
  brickId: string;
  /** Screen-space position (top-left of the chip cluster, already pan/zoom-applied). */
  position: { left: number; top: number };
  reactions: ReactionMap[string] | undefined;
  myProfileId: string;
  disabled?: boolean;
}

export function BrickReactionChips({
  modelId,
  brickId,
  position,
  reactions,
  myProfileId,
  disabled,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const entries = reactions ? Object.entries(reactions).filter(([, v]) => v.count > 0) : [];

  // Hide the cluster entirely when nothing is reacted and the user can't add
  // (read-only). The `+` opener would be a confusing no-op.
  if (disabled && entries.length === 0) return null;

  return (
    <div
      className="pointer-events-auto absolute flex -translate-x-1/2 items-center gap-1"
      style={{ left: position.left, top: position.top }}
      data-testid={`brick-reactions-${brickId}`}
    >
      {entries.map(([emoji, v]) => {
        const mine = v.profileIds.has(myProfileId);
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            aria-pressed={mine}
            aria-label={`${v.count} ${emoji} reaction${v.count === 1 ? '' : 's'}${mine ? ', you reacted' : ''}`}
            onClick={() => {
              void toggleReactionAction(modelId, brickId, emoji);
            }}
            className={`inline-flex cursor-pointer items-center gap-0.5 rounded-full bg-white/95 px-1.5 py-0.5 text-xs shadow-sm transition-colors hover:bg-white disabled:cursor-default disabled:opacity-60 ${
              mine ? 'ring-1 ring-zinc-500' : 'ring-1 ring-zinc-200/60'
            }`}
          >
            <span aria-hidden="true">{emoji}</span>
            <span className="text-zinc-600">{v.count}</span>
          </button>
        );
      })}
      {disabled ? null : (
        <div className="relative">
          <button
            type="button"
            aria-label="Add reaction"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((s) => !s)}
            data-testid={`brick-reactions-${brickId}-add`}
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/95 text-xs text-zinc-500 shadow-sm ring-1 ring-zinc-200/60 transition-colors hover:bg-white hover:text-zinc-900"
          >
            +
          </button>
          {pickerOpen ? (
            <div
              role="menu"
              aria-label="Pick a reaction"
              className="absolute bottom-full left-0 mb-1 flex gap-0.5 rounded-md bg-white p-1 shadow-md ring-1 ring-zinc-900/10"
            >
              {REACTION_PALETTE.map((p) => (
                <button
                  key={p.emoji}
                  type="button"
                  role="menuitem"
                  title={p.label}
                  aria-label={p.label}
                  onClick={async () => {
                    setPickerOpen(false);
                    await toggleReactionAction(modelId, brickId, p.emoji);
                  }}
                  className="cursor-pointer rounded p-0.5 text-base transition-colors hover:bg-zinc-100"
                >
                  {p.emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
