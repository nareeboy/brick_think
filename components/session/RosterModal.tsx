'use client';

import { useId } from 'react';
import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { RosterInviteBlock } from './RosterInviteBlock';
import { RosterList } from './RosterList';
import { RosterPendingInvitesList } from './RosterPendingInvitesList';
import { RosterRemovedList } from './RosterRemovedList';

interface Props {
  sessionId: string;
  joinCode: string;
  open: boolean;
  onClose: () => void;
}

export function RosterModal({ sessionId, joinCode, open, onClose }: Props) {
  const titleId = useId();

  if (!open) return null;

  return (
    <ModalBackdrop
      dataTestid="roster-modal"
      titleId={titleId}
      onClose={onClose}
      panelClassName="w-full max-w-2xl"
    >
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
            Roster
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close roster"
            className="-mr-2 -mt-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          <RosterInviteBlock sessionId={sessionId} joinCode={joinCode} />
          <RosterList sessionId={sessionId} />
          <RosterPendingInvitesList sessionId={sessionId} />
          <RosterRemovedList sessionId={sessionId} />
        </div>
      </div>
    </ModalBackdrop>
  );
}
