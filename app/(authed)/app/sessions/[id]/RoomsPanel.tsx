'use client';

import Link from 'next/link';
import { useState } from 'react';

import { stageLabel } from '@/lib/sessions/stage-labels';
import type { StageType } from '@/lib/sessions/types';

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
}

interface Props {
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
              <Link
                href={`/app/designs/${room.modelId}`}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-900/10 bg-white px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-900/5"
              >
                Open
              </Link>
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
    </div>
  );
}
