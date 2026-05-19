'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { setDownstreamStageRooms, type StageRoomError } from '../stage-room-actions';

export interface UpstreamRoomSummary {
  id: string;
  position: number;
  title: string | null;
}

export interface DownstreamRoomDraft {
  id: string | null;
  title: string;
  sourceRoomIds: string[];
}

interface Props {
  stageId: string;
  upstreamStageLabel: string;
  upstreamRooms: UpstreamRoomSummary[];
  initialRooms: DownstreamRoomDraft[];
  onClose: () => void;
}

function errorMessage(code: StageRoomError): string {
  switch (code) {
    case 'invalid_uuid':
      return 'One of the ids is invalid. Refresh and try again.';
    case 'stage_not_found':
      return 'Stage not found. Refresh the session page.';
    case 'unsupported_stage_type':
      return 'Rooms are not available on this stage.';
    case 'not_facilitator':
      return 'Only the session facilitator can manage rooms.';
    case 'empty_partition':
      return 'Add at least one room before saving.';
    case 'empty_sources':
      return 'Every room needs at least one upstream room to combine.';
    case 'unknown_source_room':
      return 'A selected upstream room no longer exists. Refresh and try again.';
    case 'upstream_stage_missing':
      return 'The upstream stage is missing from this session.';
    case 'unauthenticated':
      return 'You have been signed out. Refresh to sign in again.';
    case 'duplicate_member':
    case 'unknown_member':
      // Shared-model-only codes — never raised by this dialog.
      return 'Something went wrong. Refresh and try again.';
  }
}

export function ManageDownstreamRoomsDialog({
  stageId,
  upstreamStageLabel,
  upstreamRooms,
  initialRooms,
  onClose,
}: Props) {
  const [rooms, setRooms] = useState<DownstreamRoomDraft[]>(() =>
    initialRooms.length > 0 ? initialRooms : [{ id: null, title: '', sourceRoomIds: [] }],
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  function toggleSource(roomIdx: number, sourceRoomId: string) {
    setRooms((prev) =>
      prev.map((room, idx) => {
        if (idx !== roomIdx) return room;
        const has = room.sourceRoomIds.includes(sourceRoomId);
        return {
          ...room,
          sourceRoomIds: has
            ? room.sourceRoomIds.filter((id) => id !== sourceRoomId)
            : [...room.sourceRoomIds, sourceRoomId],
        };
      }),
    );
  }

  function addRoom() {
    setRooms((prev) => [...prev, { id: null, title: '', sourceRoomIds: [] }]);
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
      sourceRoomIds: room.sourceRoomIds,
    }));
    start(async () => {
      const result = await setDownstreamStageRooms({ stageId, rooms: payload });
      if (result.ok) {
        onClose();
      } else {
        setError(errorMessage(result.code));
      }
    });
  }

  return (
    <ModalBackdrop
      dataTestid="manage-downstream-rooms-dialog"
      titleId={titleId}
      onClose={onClose}
      panelClassName="w-full max-w-2xl"
    >
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Manage rooms
        </h2>
        <p className="mt-1 text-[13px] text-zinc-600">
          Each room combines one or more {upstreamStageLabel.toLowerCase()} rooms. The canvases are
          laid side by side; members of the combined rooms keep edit access.
        </p>

        {upstreamRooms.length === 0 ? (
          <p
            role="status"
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900"
          >
            No {upstreamStageLabel.toLowerCase()} rooms exist yet. Create them first on the
            {' '}{upstreamStageLabel.toLowerCase()} stage.
          </p>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {rooms.map((room, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-900/10 bg-white p-3"
                data-testid={`downstream-room-draft-${idx}`}
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
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Combine which {upstreamStageLabel.toLowerCase()} rooms?
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {upstreamRooms.map((src) => {
                    const checked = room.sourceRoomIds.includes(src.id);
                    return (
                      <li key={src.id}>
                        <button
                          type="button"
                          onClick={() => toggleSource(idx, src.id)}
                          data-testid={`source-toggle-${idx}-${src.position}`}
                          aria-pressed={checked}
                          className={`inline-flex h-8 cursor-pointer items-center rounded-lg border px-3 text-[12px] transition-colors ${
                            checked
                              ? 'border-[#c0613d] bg-[#c0613d] text-white hover:bg-[#cf6e47]'
                              : 'border-zinc-900/10 bg-white text-zinc-700 hover:bg-zinc-900/5'
                          }`}
                        >
                          {src.title?.trim() || `Room ${src.position + 1}`}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <button
              type="button"
              onClick={addRoom}
              data-testid="add-downstream-room-button"
              className="inline-flex h-9 cursor-pointer items-center justify-center self-start rounded-xl border border-dashed border-zinc-900/20 px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-900/5"
            >
              + Add room
            </button>
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
          >
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
            disabled={pending || upstreamRooms.length === 0}
            data-testid="save-downstream-rooms-button"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save rooms'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
