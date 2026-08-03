import type { BrickInstance } from '@/components/builder/builderState';

export type ReorderDirection = 'front' | 'forward' | 'backward' | 'back';

/**
 * Reorder the given bricks within their layer groups. The `bricks` array is
 * z-order: index 0 is the top of the Layers panel and the front-most brick on
 * the canvas (drawn last). Reordering never crosses a group boundary — each
 * brick moves only inside its own group's run, so the grouped-runs invariant
 * of the array is preserved.
 *
 * Multi-selections keep their relative order, and a selected brick never
 * jumps over another selected brick (Figma semantics: a block of selected
 * bricks at the front stays put on "bring forward").
 *
 * Returns the new array, or null when the move is a no-op — callers use null
 * both to skip the state commit and to disable the menu item.
 */
export function reorderBricksWithinGroups(
  bricks: BrickInstance[],
  ids: string[],
  direction: ReorderDirection,
): BrickInstance[] | null {
  const selected = new Set(ids);
  if (selected.size === 0) return null;

  const next = [...bricks];
  // Operate per group on the index slots that group occupies, so bricks of
  // other groups are untouched even if a run were ever non-contiguous.
  const groupIds = new Set(bricks.filter((b) => selected.has(b.id)).map((b) => b.groupId));

  for (const groupId of groupIds) {
    const slots: number[] = [];
    for (let i = 0; i < next.length; i++) {
      const brick = next[i];
      if (brick && brick.groupId === groupId) slots.push(i);
    }
    const run = slots.map((i) => next[i]!);

    if (direction === 'front' || direction === 'back') {
      const chosen = run.filter((b) => selected.has(b.id));
      const rest = run.filter((b) => !selected.has(b.id));
      const reordered = direction === 'front' ? [...chosen, ...rest] : [...rest, ...chosen];
      reordered.forEach((b, j) => {
        next[slots[j]!] = b;
      });
    } else if (direction === 'forward') {
      for (let j = 1; j < run.length; j++) {
        const brick = run[j]!;
        const ahead = run[j - 1]!;
        if (selected.has(brick.id) && !selected.has(ahead.id)) {
          run[j - 1] = brick;
          run[j] = ahead;
        }
      }
      run.forEach((b, j) => {
        next[slots[j]!] = b;
      });
    } else {
      for (let j = run.length - 2; j >= 0; j--) {
        const brick = run[j]!;
        const behind = run[j + 1]!;
        if (selected.has(brick.id) && !selected.has(behind.id)) {
          run[j + 1] = brick;
          run[j] = behind;
        }
      }
      run.forEach((b, j) => {
        next[slots[j]!] = b;
      });
    }
  }

  for (let i = 0; i < bricks.length; i++) {
    if (next[i] !== bricks[i]) return next;
  }
  return null;
}
