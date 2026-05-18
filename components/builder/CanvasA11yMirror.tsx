'use client';

import { useEffect, useRef } from 'react';

export type MirrorBrick = {
  id: string;
  name: string;
  color: string;
  row: number;
  col: number;
};

type Props = {
  bricks: MirrorBrick[];
  rows: number;
  cols: number;
  focusedId: string | null;
  selectedId: string | null;
  onFocusBrick: (id: string) => void;
  onSelectBrick: (id: string) => void;
  onMoveFocus: (id: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  onDelete: (id: string) => void;
  onRotate: (id: string) => void;
  onCycleColor: (id: string) => void;
};

export function CanvasA11yMirror({
  bricks,
  rows,
  cols,
  focusedId,
  selectedId,
  onFocusBrick,
  onSelectBrick,
  onMoveFocus,
  onDelete,
  onRotate,
  onCycleColor,
}: Props) {
  const cellRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (focusedId) {
      cellRefs.current.get(focusedId)?.focus();
    }
  }, [focusedId]);

  return (
    <div
      role="grid"
      aria-label="Builder canvas"
      aria-rowcount={rows}
      aria-colcount={cols}
      className="pointer-events-none absolute inset-0 z-0"
    >
      {bricks.map((b) => {
        const accessibleName = b.color
          ? `${b.name}, ${b.color}, row ${b.row} column ${b.col}`
          : `${b.name}, row ${b.row} column ${b.col}`;
        return (
          <div
            key={b.id}
            ref={(el) => {
              if (el) cellRefs.current.set(b.id, el);
              else cellRefs.current.delete(b.id);
            }}
            role="gridcell"
            tabIndex={0}
            aria-rowindex={b.row}
            aria-colindex={b.col}
            aria-label={accessibleName}
            aria-selected={selectedId === b.id ? 'true' : 'false'}
            data-testid="placed-brick"
            data-brick-id={b.id}
            onFocus={() => onFocusBrick(b.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectBrick(b.id);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                onMoveFocus(b.id, 'right');
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                onMoveFocus(b.id, 'left');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                onMoveFocus(b.id, 'down');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                onMoveFocus(b.id, 'up');
              } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                onDelete(b.id);
              } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                onRotate(b.id);
              } else if (e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                onCycleColor(b.id);
              }
            }}
            className="pointer-events-auto absolute left-0 top-0 h-px w-px overflow-hidden outline-none"
          />
        );
      })}
    </div>
  );
}
