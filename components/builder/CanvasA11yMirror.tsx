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
};

export function CanvasA11yMirror({
  bricks,
  rows,
  cols,
  focusedId,
  selectedId,
  onFocusBrick,
  onSelectBrick,
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
              }
            }}
            className="pointer-events-auto absolute left-0 top-0 h-px w-px overflow-hidden outline-none"
          />
        );
      })}
    </div>
  );
}
