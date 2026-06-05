'use client';

import Link from 'next/link';
import { useState } from 'react';

import { stageLabel } from '@/lib/sessions/stage-labels';
import type { StageType } from '@/lib/sessions/types';
import type { CombinedNarration } from '@/lib/sessions/modelNarration';
import { useSpotlightTarget } from '@/components/session/useSpotlightTarget';
import { TranscriptViewModal } from '@/components/session/TranscriptViewModal';
import { NarrationRowControl } from '@/components/session/NarrationRowControl';

import { ManageRoomsDialog, type OrgMemberSummary } from './ManageRoomsDialog';
import {
  ManageDownstreamRoomsDialog,
  type UpstreamRoomSummary,
} from './ManageDownstreamRoomsDialog';

export interface StageRoomSummary {
  id: string;
  position: number;
  title: string | null;
  modelId: string;
  /** Direct memberships (shared_model). Empty for downstream rooms. */
  memberIds: string[];
  /** Upstream room ids this room composes (system_model / guiding_principles). */
  sourceRoomIds: string[];
  /** Combined narration for this room's canvas (all members); facilitator-only. */
  narration: CombinedNarration | null;
}

interface Props {
  sessionId: string;
  stageId: string;
  stageType: StageType;
  rooms: StageRoomSummary[];
  /** Populated for shared_model only — drives the member-picker modal. */
  orgMembers: OrgMemberSummary[];
  /** Populated for downstream stages only — upstream stage's rooms. */
  upstreamRooms: UpstreamRoomSummary[];
  upstreamStageType: StageType | null;
  canManageSession: boolean;
  currentUserId: string;
  /** Pre-computed server-side: room id this participant belongs to on this
   *  stage (direct membership for shared_model, transitive for downstream). */
  myRoomId: string | null;
}

export function RoomsPanel({
  sessionId,
  stageId,
  stageType,
  rooms,
  orgMembers,
  upstreamRooms,
  upstreamStageType,
  canManageSession,
  myRoomId,
}: Props) {
  const [editing, setEditing] = useState(false);
  // Spotlight targets the room's canvas (model id) so the facilitator can
  // invite everyone to a room's model — including after the timer stops.
  const { targetModelId, pendingModelId, toggle } = useSpotlightTarget(sessionId);
  const [viewing, setViewing] = useState<{
    title: string;
    body: string;
    polished: boolean;
  } | null>(null);

  const isDownstream = stageType === 'system_model' || stageType === 'guiding_principles';
  const myRoom = rooms.find((r) => r.id === myRoomId) ?? null;

  return (
    <div className="rounded-xl border border-zinc-900/10 bg-zinc-50 p-3" data-testid="rooms-panel">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Rooms ({rooms.length})
        </p>
        {canManageSession ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            data-testid="manage-rooms-button"
            className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 bg-white px-2.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-900/5"
          >
            {rooms.length === 0 ? 'Create rooms' : 'Manage rooms'}
          </button>
        ) : null}
      </div>

      {rooms.length === 0 ? (
        <p className="mt-2 text-[12px] text-zinc-500">
          {canManageSession
            ? isDownstream
              ? 'Click "Create rooms" to combine upstream rooms.'
              : 'Click "Create rooms" to partition participants.'
            : 'Waiting for the facilitator to set up rooms.'}
        </p>
      ) : canManageSession ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {rooms.map((room) => (
            <li
              key={room.id}
              data-testid={`room-row-${room.position}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-zinc-900/10"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-zinc-800">
                  {room.title?.trim() || `Room ${room.position + 1}`}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {isDownstream
                    ? `combines ${room.sourceRoomIds.length} ${
                        upstreamStageType ? stageLabel(upstreamStageType).toLowerCase() : 'upstream'
                      } room${room.sourceRoomIds.length === 1 ? '' : 's'}`
                    : `${room.memberIds.length} members`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(() => {
                  const isSpotlit = targetModelId === room.modelId;
                  const busy = pendingModelId === room.modelId;
                  return (
                    <button
                      type="button"
                      onClick={() => void toggle(room.modelId)}
                      disabled={busy}
                      title={
                        isSpotlit
                          ? 'Stop spotlighting this room'
                          : "Spotlight this room — everyone else sees a banner inviting them to view this room's canvas"
                      }
                      aria-pressed={isSpotlit}
                      data-testid={`spotlight-room-${room.position}`}
                      className={`inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border px-3 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isSpotlit
                          ? 'border-[#c0613d] bg-[#c0613d] text-white hover:bg-[#a8543a]'
                          : 'border-zinc-900/10 bg-white text-zinc-700 hover:bg-zinc-900/5'
                      }`}
                    >
                      {isSpotlit ? 'Remove spotlight' : 'Spotlight'}
                    </button>
                  );
                })()}
                <NarrationRowControl
                  modelId={room.modelId}
                  label={room.title?.trim() || `Room ${room.position + 1}`}
                  size="sm"
                />
                {(() => {
                  const narration = room.narration;
                  if (!narration) return null;
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        setViewing({
                          title: `${room.title?.trim() || `Room ${room.position + 1}`} narration`,
                          body: narration.combinedText,
                          polished: narration.anyCleaned,
                        })
                      }
                      data-testid={`transcript-room-${room.position}`}
                      title="View this room's combined narration transcript"
                      className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-900/10 bg-white px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-900/5"
                    >
                      Transcript
                    </button>
                  );
                })()}
                <Link
                  href={`/app/designs/${room.modelId}`}
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-900/10 bg-white px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-900/5"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : myRoom ? (
        <div
          className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-zinc-900/10"
          data-testid="my-room-row"
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-zinc-800">
              Your room · {myRoom.title?.trim() || `Room ${myRoom.position + 1}`}
            </p>
          </div>
          <Link
            href={`/app/designs/${myRoom.modelId}`}
            data-testid="open-my-room"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white hover:bg-[#cf6e47]"
          >
            Open my room
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-zinc-500" data-testid="no-room-assigned">
          Waiting for the facilitator to assign you to a room.
        </p>
      )}

      {editing && stageType === 'shared_model' ? (
        <ManageRoomsDialog
          stageId={stageId}
          orgMembers={orgMembers}
          initialRooms={rooms.map((r) => ({
            id: r.id,
            title: r.title ?? '',
            memberIds: r.memberIds,
          }))}
          onClose={() => setEditing(false)}
        />
      ) : null}

      {editing && isDownstream ? (
        <ManageDownstreamRoomsDialog
          stageId={stageId}
          upstreamStageLabel={upstreamStageType ? stageLabel(upstreamStageType) : 'Upstream'}
          upstreamRooms={upstreamRooms}
          initialRooms={rooms.map((r) => ({
            id: r.id,
            title: r.title ?? '',
            sourceRoomIds: r.sourceRoomIds,
          }))}
          onClose={() => setEditing(false)}
        />
      ) : null}

      {viewing ? (
        <TranscriptViewModal
          title={viewing.title}
          body={viewing.body}
          polished={viewing.polished}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </div>
  );
}
