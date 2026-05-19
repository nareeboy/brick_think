'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import { moveRowFocus } from '@/lib/a11y/moveRowFocus';

import { useBuilderState, type BrickInstance, type LayerGroup } from './builderState';

const NAME_BY_CODE = new Map<string, string>(CANONICAL_BRICKS.map((b) => [b.code, b.name]));

const MIME_BRICK = 'application/x-brick';
const MIME_GROUP = 'application/x-group';

type DropHint =
  | { kind: 'brick-edge'; brickId: string; side: 'before' | 'after' }
  | { kind: 'group-top'; groupId: string }
  | { kind: 'group-edge'; groupId: string; side: 'before' | 'after' };

export function LayersPanel() {
  const {
    groups,
    bricks,
    activeGroupId,
    selectedId,
    selectBrick,
    setActiveGroup,
    addGroup,
    renameGroup,
    deleteGroup,
    toggleGroupVisible,
    toggleGroupCollapsed,
    moveGroup,
    deleteBrick,
    toggleBrickVisible,
    moveBrick,
  } = useBuilderState();

  const [hint, setHint] = useState<DropHint | null>(null);
  const [dragKind, setDragKind] = useState<'brick' | 'group' | null>(null);
  const [open, setOpen] = useState(true);

  const bricksByGroup = useMemo(() => {
    const m = new Map<string, BrickInstance[]>();
    for (const g of groups) m.set(g.id, []);
    for (const b of bricks) m.get(b.groupId)?.push(b);
    return m;
  }, [groups, bricks]);

  function clearDrag() {
    setHint(null);
    setDragKind(null);
  }

  function handleBrickDragStart(brickId: string, e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData(MIME_BRICK, brickId);
    e.dataTransfer.effectAllowed = 'move';
    setDragKind('brick');
  }

  function handleGroupDragStart(groupId: string, e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData(MIME_GROUP, groupId);
    e.dataTransfer.effectAllowed = 'move';
    setDragKind('group');
  }

  function handleBrickRowDragOver(e: DragEvent<HTMLDivElement>, brick: BrickInstance) {
    if (dragKind !== 'brick') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const side: 'before' | 'after' = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
    setHint({ kind: 'brick-edge', brickId: brick.id, side });
  }

  function handleBrickRowDrop(e: DragEvent<HTMLDivElement>, brick: BrickInstance) {
    const draggedId = e.dataTransfer.getData(MIME_BRICK);
    if (!draggedId || draggedId === brick.id) {
      clearDrag();
      return;
    }
    e.preventDefault();
    const groupBricks = bricksByGroup.get(brick.groupId) ?? [];
    const ownIdx = groupBricks.findIndex((b) => b.id === brick.id);
    const side = hint?.kind === 'brick-edge' ? hint.side : 'before';
    const beforeId = side === 'before' ? brick.id : (groupBricks[ownIdx + 1]?.id ?? null);
    moveBrick(draggedId, brick.groupId, beforeId);
    clearDrag();
  }

  function handleGroupHeaderDragOver(e: DragEvent<HTMLDivElement>, group: LayerGroup) {
    if (dragKind === 'brick') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setHint({ kind: 'group-top', groupId: group.id });
    } else if (dragKind === 'group') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const side: 'before' | 'after' = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
      setHint({ kind: 'group-edge', groupId: group.id, side });
    }
  }

  function handleGroupHeaderDrop(e: DragEvent<HTMLDivElement>, group: LayerGroup) {
    const brickId = e.dataTransfer.getData(MIME_BRICK);
    if (brickId) {
      e.preventDefault();
      const first = bricksByGroup.get(group.id)?.[0];
      moveBrick(brickId, group.id, first?.id ?? null);
      clearDrag();
      return;
    }
    const groupId = e.dataTransfer.getData(MIME_GROUP);
    if (groupId && groupId !== group.id) {
      e.preventDefault();
      const targetIdx = groups.findIndex((g) => g.id === group.id);
      const sourceIdx = groups.findIndex((g) => g.id === groupId);
      const side = hint?.kind === 'group-edge' ? hint.side : 'before';
      let to = side === 'before' ? targetIdx : targetIdx + 1;
      if (sourceIdx >= 0 && sourceIdx < to) to -= 1;
      moveGroup(groupId, to);
      clearDrag();
      return;
    }
    clearDrag();
  }

  function handleConfirmDeleteGroup(group: LayerGroup) {
    const count = bricksByGroup.get(group.id)?.length ?? 0;
    if (count > 0) {
      const ok = window.confirm(
        `Delete "${group.name}" and ${count} piece${count === 1 ? '' : 's'} inside? This cannot be undone.`,
      );
      if (!ok) return;
    }
    deleteGroup(group.id);
  }

  return (
    <section
      className={`flex min-h-0 flex-col ${open ? 'flex-1' : 'shrink-0'}`}
      aria-label="Layers"
    >
      <div className="flex shrink-0 items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <span className="text-[14px] font-semibold text-zinc-900">Layers</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="New group"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addGroup();
            }}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Collapse layers' : 'Expand layers'}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`}
            />
          </button>
        </div>
      </div>

      {open ? (
        <div
          data-testid="layers-panel"
          className="-mr-2 mt-4 min-h-0 flex-1 overflow-y-auto pr-2"
          onDragLeave={(e) => {
            const related = e.relatedTarget as Node | null;
            if (!related || !e.currentTarget.contains(related)) setHint(null);
          }}
          onDrop={() => clearDrag()}
          onDragEnd={() => clearDrag()}
        >
          {groups.map((g) => (
            <GroupBlock
              key={g.id}
              group={g}
              bricks={bricksByGroup.get(g.id) ?? []}
              active={g.id === activeGroupId}
              selectedId={selectedId}
              hint={hint}
              onSetActive={setActiveGroup}
              onToggleCollapsed={toggleGroupCollapsed}
              onToggleVisible={toggleGroupVisible}
              onRename={renameGroup}
              onDelete={handleConfirmDeleteGroup}
              onSelectBrick={selectBrick}
              onToggleBrickVisible={toggleBrickVisible}
              onDeleteBrick={deleteBrick}
              onGroupDragStart={handleGroupDragStart}
              onGroupHeaderDragOver={handleGroupHeaderDragOver}
              onGroupHeaderDrop={handleGroupHeaderDrop}
              onBrickDragStart={handleBrickDragStart}
              onBrickDragOver={handleBrickRowDragOver}
              onBrickDrop={handleBrickRowDrop}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

interface GroupBlockProps {
  group: LayerGroup;
  bricks: BrickInstance[];
  active: boolean;
  selectedId: string | null;
  hint: DropHint | null;
  onSetActive: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (g: LayerGroup) => void;
  onSelectBrick: (id: string | null) => void;
  onToggleBrickVisible: (id: string) => void;
  onDeleteBrick: (id: string) => void;
  onGroupDragStart: (groupId: string, e: DragEvent<HTMLDivElement>) => void;
  onGroupHeaderDragOver: (e: DragEvent<HTMLDivElement>, g: LayerGroup) => void;
  onGroupHeaderDrop: (e: DragEvent<HTMLDivElement>, g: LayerGroup) => void;
  onBrickDragStart: (id: string, e: DragEvent<HTMLDivElement>) => void;
  onBrickDragOver: (e: DragEvent<HTMLDivElement>, b: BrickInstance) => void;
  onBrickDrop: (e: DragEvent<HTMLDivElement>, b: BrickInstance) => void;
}

function GroupBlock({
  group,
  bricks,
  active,
  selectedId,
  hint,
  onSetActive,
  onToggleCollapsed,
  onToggleVisible,
  onRename,
  onDelete,
  onSelectBrick,
  onToggleBrickVisible,
  onDeleteBrick,
  onGroupDragStart,
  onGroupHeaderDragOver,
  onGroupHeaderDrop,
  onBrickDragStart,
  onBrickDragOver,
  onBrickDrop,
}: GroupBlockProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const dimmed = !group.visible;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function handleHeaderKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSetActive(group.id);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(group);
    } else if (e.key === 'F2') {
      e.preventDefault();
      setDraft(group.name);
      setEditing(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveRowFocus(e.currentTarget, e.key === 'ArrowDown' ? 'down' : 'up');
    }
  }

  return (
    <div className="mt-3 first:mt-1">
      {hint?.kind === 'group-edge' && hint.groupId === group.id && hint.side === 'before' ? (
        <div className="mx-2 mb-1 h-[2px] rounded-full bg-[#c0613d]" />
      ) : null}
      <div
        role="button"
        tabIndex={0}
        draggable={!editing}
        onDragStart={(e) => onGroupDragStart(group.id, e)}
        onDragOver={(e) => onGroupHeaderDragOver(e, group)}
        onDrop={(e) => onGroupHeaderDrop(e, group)}
        onClick={() => onSetActive(group.id)}
        onKeyDown={handleHeaderKeyDown}
        className={`flex w-full cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors ${
          active ? 'bg-[#c0613d]/10 text-zinc-900' : 'text-zinc-800 hover:bg-zinc-900/5'
        } ${dimmed ? 'opacity-60' : ''} ${
          hint?.kind === 'group-top' && hint.groupId === group.id ? 'ring-2 ring-[#c0613d]/50' : ''
        }`}
      >
        <button
          type="button"
          draggable={false}
          aria-label={group.collapsed ? 'Expand group' : 'Collapse group'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapsed(group.id);
          }}
          className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${group.collapsed ? '-rotate-90' : ''}`}
          />
        </button>
        <FolderIcon className="h-3.5 w-3.5 text-[#c0613d]" />
        {editing ? (
          <input
            ref={inputRef}
            draggable={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onRename(group.id, draft);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRename(group.id, draft);
                setEditing(false);
              } else if (e.key === 'Escape') {
                setDraft(group.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded border border-[#c0613d]/40 bg-white px-1 py-0.5 text-[12px] outline-none"
          />
        ) : (
          <span
            className="flex-1 truncate font-medium"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setDraft(group.name);
              setEditing(true);
            }}
          >
            {group.name}
          </span>
        )}
        <span className="font-mono text-[10px] text-zinc-500">{bricks.length}</span>
        <IconButton
          aria-label={group.visible ? 'Hide group' : 'Show group'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible(group.id);
          }}
        >
          {group.visible ? (
            <EyeIcon className="h-3.5 w-3.5" />
          ) : (
            <EyeOffIcon className="h-3.5 w-3.5" />
          )}
        </IconButton>
        <IconButton
          aria-label="Delete group"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(group);
          }}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      {!group.collapsed ? (
        <div className="mt-0.5 space-y-0.5 pl-4">
          {bricks.length === 0 ? (
            /* WCAG 1.4.3 — was text-zinc-400 (2.56:1), bumped to text-zinc-500 for 4.83:1 on white */
            <p className="px-2 py-1 text-[11px] text-zinc-500">Drop a piece on the canvas.</p>
          ) : (
            bricks.map((b) => (
              <BrickRow
                key={b.id}
                brick={b}
                selected={selectedId === b.id}
                groupHidden={!group.visible}
                hint={hint}
                onSelect={onSelectBrick}
                onToggleVisible={onToggleBrickVisible}
                onDelete={onDeleteBrick}
                onDragStart={onBrickDragStart}
                onDragOver={onBrickDragOver}
                onDrop={onBrickDrop}
              />
            ))
          )}
        </div>
      ) : null}

      {hint?.kind === 'group-edge' && hint.groupId === group.id && hint.side === 'after' ? (
        <div className="mx-2 mt-1 h-[2px] rounded-full bg-[#c0613d]" />
      ) : null}
    </div>
  );
}

function BrickRow({
  brick,
  selected,
  groupHidden,
  hint,
  onSelect,
  onToggleVisible,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  brick: BrickInstance;
  selected: boolean;
  groupHidden: boolean;
  hint: DropHint | null;
  onSelect: (id: string | null) => void;
  onToggleVisible: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, b: BrickInstance) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, b: BrickInstance) => void;
}) {
  const dimmed = !brick.visible || groupHidden;
  const showBefore =
    hint?.kind === 'brick-edge' && hint.brickId === brick.id && hint.side === 'before';
  const showAfter =
    hint?.kind === 'brick-edge' && hint.brickId === brick.id && hint.side === 'after';
  const baseName = NAME_BY_CODE.get(brick.code) ?? brick.code;
  const label = `${baseName} · ${brick.id.slice(-4)}`;
  return (
    <div>
      {showBefore ? <div className="mx-2 h-[2px] rounded-full bg-[#c0613d]" /> : null}
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(e) => onDragStart(brick.id, e)}
        onDragOver={(e) => onDragOver(e, brick)}
        onDrop={(e) => onDrop(e, brick)}
        onClick={() => onSelect(brick.id)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(brick.id);
          } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            onDelete(brick.id);
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            moveRowFocus(e.currentTarget, e.key === 'ArrowDown' ? 'down' : 'up');
          }
        }}
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors ${
          selected ? 'bg-[#c0613d]/12 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-900/5'
        } ${dimmed ? 'opacity-50' : ''}`}
      >
        <span
          className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-50"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(60,30,15,0.06)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brick.image}
            alt=""
            draggable={false}
            className="pointer-events-none max-h-[80%] max-w-[80%] select-none"
          />
        </span>
        <span className="flex-1 truncate">{label}</span>
        <IconButton
          aria-label={brick.visible ? 'Hide piece' : 'Show piece'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible(brick.id);
          }}
        >
          {brick.visible ? (
            <EyeIcon className="h-3.5 w-3.5" />
          ) : (
            <EyeOffIcon className="h-3.5 w-3.5" />
          )}
        </IconButton>
        <IconButton
          aria-label="Delete piece"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(brick.id);
          }}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      {showAfter ? <div className="mx-2 h-[2px] rounded-full bg-[#c0613d]" /> : null}
    </div>
  );
}

function IconButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      draggable={false}
      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
      {...props}
    >
      {children}
    </button>
  );
}

function ChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FolderIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H3V7Z" />
    </svg>
  );
}

function EyeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c6.5 0 10 6 10 6a17.5 17.5 0 0 1-3.2 3.9" />
      <path d="M6.3 7.3A17.6 17.6 0 0 0 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="m5 6 1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
