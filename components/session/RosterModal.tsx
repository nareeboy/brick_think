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
        <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Roster
        </h2>

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
