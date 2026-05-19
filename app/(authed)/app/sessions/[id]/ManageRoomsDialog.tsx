'use client';

import { useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { setSharedModelRooms, type StageRoomError } from '../stage-room-actions';

export interface OrgMemberSummary {
  id: string;
  label: string;
}

export interface RoomDraft {
  /** Existing room id if mirrored from the live data; null for newly-added drafts. */
  id: string | null;
  title: string;
  memberIds: string[];
}

interface Props {
  stageId: string;
  orgMembers: OrgMemberSummary[];
  initialRooms: RoomDraft[];
  onClose: () => void;
}

function errorMessage(code: StageRoomError): string {
  switch (code) {
    case 'invalid_uuid':
      return 'One of the ids is invalid. Refresh and try again.';
    case 'stage_not_found':
      return 'Stage not found. Refresh the session page.';
    case 'unsupported_stage_type':
      return 'Rooms are only available on the shared model stage.';
    case 'not_facilitator':
      return 'Only the session facilitator can manage rooms.';
    case 'duplicate_member':
      return 'A participant cannot be in two rooms at once.';
    case 'empty_partition':
      return 'Add at least one room before saving.';
    case 'unknown_member':
      return 'A selected participant is no longer a member of this org.';
    case 'unauthenticated':
      return 'You have been signed out. Refresh to sign in again.';
  }
}

export function ManageRoomsDialog({ stageId, orgMembers, initialRooms, onClose }: Props) {
  const [rooms, setRooms] = useState<RoomDraft[]>(() =>
    initialRooms.length > 0 ? initialRooms : [{ id: null, title: '', memberIds: [] }],
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Assignment lookup: every member is in at most one room (by index) or unassigned.
  const assignment = useMemo(() => {
    const map = new Map<string, number>();
    rooms.forEach((room, idx) => {
      for (const pid of room.memberIds) map.set(pid, idx);
    });
    return map;
  }, [rooms]);

  const unassignedMembers = orgMembers.filter((m) => !assignment.has(m.id));

  function moveMember(profileId: string, target: number | null) {
    setRooms((prev) =>
      prev.map((room) => ({
        ...room,
        memberIds: room.memberIds.filter((id) => id !== profileId),
      })).map((room, idx) =>
        target !== null && idx === target ? { ...room, memberIds: [...room.memberIds, profileId] } : room,
      ),
    );
  }

  function addRoom() {
    setRooms((prev) => [...prev, { id: null, title: '', memberIds: [] }]);
  }

  function removeRoom(idx: number) {
    setRooms((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTitle(idx: number, title: string) {
    setRooms((prev) => prev.map((room, i) => (i === idx ? { ...room, title } : room)));
  }

  function save() {
    setError(null);
    const payload = rooms.map((room) => ({
      title: room.title.trim() || null,
      profileIds: room.memberIds,
    }));
    start(async () => {
      const result = await setSharedModelRooms({ stageId, rooms: payload });
      if (result.ok) {
        onClose();
      } else {
        setError(errorMessage(result.code));
      }
    });
  }

  return (
    <ModalBackdrop
      dataTestid="manage-rooms-dialog"
      titleId={titleId}
      onClose={onClose}
      panelClassName="w-full max-w-3xl"
    >
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Manage rooms
        </h2>
        <p className="mt-1 text-[13px] text-zinc-600">
          Partition participants into breakout rooms. Each room gets a shared canvas seeded with
          its members&rsquo; individual models, laid out side by side.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[260px,1fr]">
          {/* Unassigned column */}
          <div className="rounded-xl border border-zinc-900/10 bg-zinc-50 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Unassigned ({unassignedMembers.length})
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {unassignedMembers.length === 0 ? (
                <li className="text-[12px] text-zinc-500">Everyone is in a room.</li>
              ) : (
                unassignedMembers.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[13px] ring-1 ring-zinc-900/10"
                  >
                    <span className="min-w-0 truncate">{m.label}</span>
                    <RoomPicker
                      value={null}
                      roomCount={rooms.length}
                      onChange={(t) => moveMember(m.id, t)}
                    />
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Rooms column */}
          <div className="flex flex-col gap-3">
            {rooms.map((room, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-900/10 bg-white p-3"
                data-testid={`room-draft-${idx}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Room {idx + 1}
                  </span>
                  <input
                    ref={idx === 0 ? firstInputRef : undefined}
                    type="text"
                    value={room.title}
                    onChange={(e) => updateTitle(idx, e.target.value)}
                    placeholder={`Room ${idx + 1}`}
                    maxLength={80}
                    className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-[13px] text-zinc-900 outline-none focus:border-zinc-900/15 focus:bg-zinc-900/5"
                  />
                  <button
                    type="button"
                    onClick={() => removeRoom(idx)}
                    disabled={rooms.length === 1}
                    className="cursor-pointer rounded-md p-1 text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900 disabled:cursor-default disabled:opacity-30"
                    aria-label={`Remove Room ${idx + 1}`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className="size-4"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {room.memberIds.length === 0 ? (
                    <li className="text-[12px] text-zinc-500">No members yet.</li>
                  ) : (
                    room.memberIds.map((pid) => {
                      const m = orgMembers.find((om) => om.id === pid);
                      if (!m) return null;
                      return (
                        <li
                          key={pid}
                          className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-[13px]"
                        >
                          <span className="min-w-0 truncate">{m.label}</span>
                          <RoomPicker
                            value={idx}
                            roomCount={rooms.length}
                            onChange={(t) => moveMember(pid, t)}
                          />
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            ))}
            <button
              type="button"
              onClick={addRoom}
              className="inline-flex h-9 cursor-pointer items-center justify-center self-start rounded-xl border border-dashed border-zinc-900/20 px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-900/5"
              data-testid="add-room-button"
            >
              + Add room
            </button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-900/5 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            data-testid="save-rooms-button"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save rooms'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

function RoomPicker({
  value,
  roomCount,
  onChange,
}: {
  value: number | null;
  roomCount: number;
  onChange: (target: number | null) => void;
}) {
  return (
    <select
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : Number.parseInt(e.target.value, 10))}
      className="h-7 cursor-pointer rounded-md border border-zinc-900/10 bg-white px-1.5 font-mono text-[11px] text-zinc-700 outline-none hover:bg-zinc-900/5"
      aria-label="Move to room"
    >
      <option value="">Unassigned</option>
      {Array.from({ length: roomCount }, (_, i) => (
        <option key={i} value={String(i)}>
          Room {i + 1}
        </option>
      ))}
    </select>
  );
}
