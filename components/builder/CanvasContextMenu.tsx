'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

import type { ReorderDirection } from '@/lib/canvas/reorder';

export interface CanvasContextMenuProps {
  /** Container-relative pointer position where the menu opens. */
  left: number;
  top: number;
  targetCount: number;
  /** Directions that would be no-ops render as disabled items. */
  disabledDirections: ReadonlySet<ReorderDirection>;
  onFlipHorizontal: () => void;
  onReorder: (direction: ReorderDirection) => void;
  onClose: () => void;
}

const REORDER_ITEMS: Array<{ direction: ReorderDirection; label: string }> = [
  { direction: 'front', label: 'Bring to front' },
  { direction: 'forward', label: 'Bring forward' },
  { direction: 'backward', label: 'Send backward' },
  { direction: 'back', label: 'Send to back' },
];

export function CanvasContextMenu({
  left,
  top,
  targetCount,
  disabledDirections,
  onFlipHorizontal,
  onReorder,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Escape closes; outside pointerdown closes (the menu's own pointerdown
  // stops propagation, so any press that reaches window is outside).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    function onPointerDown() {
      onClose();
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose]);

  // Keep the menu inside the canvas container and focus the first enabled
  // item so keyboard users can drive it immediately.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const parent = el.offsetParent as HTMLElement | null;
    if (parent) {
      const overflowX = el.offsetLeft + el.offsetWidth - parent.clientWidth + 8;
      const overflowY = el.offsetTop + el.offsetHeight - parent.clientHeight + 8;
      if (overflowX > 0) el.style.left = `${Math.max(8, left - el.offsetWidth)}px`;
      if (overflowY > 0) el.style.top = `${Math.max(8, top - el.offsetHeight)}px`;
    }
    el.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [left, top]);

  function moveFocus(delta: 1 | -1) {
    const el = menuRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = items[(idx + delta + items.length) % items.length];
    next?.focus();
  }

  const suffix = targetCount > 1 ? ` (${targetCount} pieces)` : '';

  return (
    <div
      ref={menuRef}
      role="menu"
      // Focus lives on the menu items; -1 satisfies the "interactive role
      // must be focusable" contract without adding the wrapper to tab order.
      tabIndex={-1}
      aria-label={`Piece actions${suffix}`}
      data-testid="canvas-context-menu"
      style={{ left, top }}
      className="pointer-events-auto absolute z-40 w-48 rounded-xl border border-zinc-900/10 bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.35)]"
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveFocus(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveFocus(-1);
        }
      }}
    >
      <MenuItem
        label={`Flip horizontal${suffix}`}
        onSelect={() => {
          onFlipHorizontal();
          onClose();
        }}
      >
        <FlipHorizontalIcon className="h-4 w-4" />
      </MenuItem>
      <div aria-hidden="true" className="mx-1.5 my-1 h-px bg-zinc-900/10" />
      {REORDER_ITEMS.map(({ direction, label }) => (
        <MenuItem
          key={direction}
          label={label}
          disabled={disabledDirections.has(direction)}
          onSelect={() => {
            onReorder(direction);
            onClose();
          }}
        >
          <ReorderIcon direction={direction} className="h-4 w-4" />
        </MenuItem>
      ))}
    </div>
  );
}

function MenuItem({
  label,
  disabled = false,
  onSelect,
  children,
}: {
  label: string;
  disabled?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 focus-visible:bg-zinc-900/5 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
    >
      <span aria-hidden="true" className="text-zinc-400">
        {children}
      </span>
      {label}
    </button>
  );
}

function FlipHorizontalIcon({ className = '' }: { className?: string }) {
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
      <path d="M12 3v18" strokeDasharray="2.5 3" />
      <path d="M8 8H3v8h5z" />
      <path d="M16 8h5v8h-5z" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

function ReorderIcon({
  direction,
  className = '',
}: {
  direction: ReorderDirection;
  className?: string;
}) {
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
      {direction === 'front' && (
        <>
          <path d="M12 3 7 8h10z" fill="currentColor" stroke="none" />
          <path d="M12 9v12" />
        </>
      )}
      {direction === 'forward' && (
        <>
          <path d="m6 11 6-6 6 6" />
          <path d="M12 5v14" />
        </>
      )}
      {direction === 'backward' && (
        <>
          <path d="m6 13 6 6 6-6" />
          <path d="M12 19V5" />
        </>
      )}
      {direction === 'back' && (
        <>
          <path d="M12 21 7 16h10z" fill="currentColor" stroke="none" />
          <path d="M12 15V3" />
        </>
      )}
    </svg>
  );
}
