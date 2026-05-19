import { describe, expect, test } from 'vitest';

import { composeRoomCanvas, EMPTY_LANE_WIDTH_PX, LANE_GAP_PX } from './stage-rooms';

function brick(id: string, groupId: string, x: number, width = 100) {
  return {
    id,
    groupId,
    code: 'test',
    image: '/test.png',
    width,
    height: 40,
    x,
    y: 0,
    rotation: 0,
    visible: true,
  };
}

function group(id: string, name: string) {
  return { id, name, collapsed: false, visible: true };
}

describe('composeRoomCanvas', () => {
  test('returns empty canvas for zero lanes', () => {
    const out = composeRoomCanvas([]);
    expect(out).toEqual({ groups: [], bricks: [] });
  });

  test('regenerates ids and translates each lane to its own x-origin', () => {
    const out = composeRoomCanvas([
      {
        displayName: 'Alice',
        source: { groups: [group('g1', 'Build')], bricks: [brick('b1', 'g1', 10, 100)] },
      },
      {
        displayName: 'Bob',
        source: { groups: [group('g2', 'Build')], bricks: [brick('b2', 'g2', 50, 100)] },
      },
    ]);

    expect(out.groups).toHaveLength(2);
    expect(out.groups[0]?.name).toBe("Alice's Build");
    expect(out.groups[1]?.name).toBe("Bob's Build");

    expect(out.bricks).toHaveLength(2);
    // Lane 1 starts at x=0: its single brick (originally x=10) lands at x=0.
    expect(out.bricks[0]?.x).toBe(0);
    // Lane 2 starts at (laneWidth=100) + LANE_GAP_PX. Bob's brick (originally
    // x=50, width=100) had minX=50, so it shifts by (cursor - 50) to land at
    // x = cursor.
    expect(out.bricks[1]?.x).toBe(100 + LANE_GAP_PX);

    // Ids must be regenerated so appending into a shared canvas is collision-free.
    expect(out.bricks[0]?.id).not.toBe('b1');
    expect(out.bricks[1]?.id).not.toBe('b2');
    expect(out.bricks[0]?.groupId).toBe(out.groups[0]?.id);
    expect(out.bricks[1]?.groupId).toBe(out.groups[1]?.id);
  });

  test('empty lanes still advance the cursor by EMPTY_LANE_WIDTH_PX', () => {
    const out = composeRoomCanvas([
      { displayName: 'Empty1', source: { groups: [], bricks: [] } },
      {
        displayName: 'Charlie',
        source: { groups: [group('g3', 'Build')], bricks: [brick('b3', 'g3', 0, 80)] },
      },
    ]);

    // Empty lane contributes nothing to groups/bricks but reserves width.
    expect(out.groups).toHaveLength(1);
    expect(out.bricks).toHaveLength(1);
    expect(out.bricks[0]?.x).toBe(EMPTY_LANE_WIDTH_PX + LANE_GAP_PX);
  });

  test('preserves y-coordinates across lanes', () => {
    const out = composeRoomCanvas([
      {
        displayName: 'Dee',
        source: {
          groups: [group('g4', 'Build')],
          bricks: [{ ...brick('b4', 'g4', 0, 50), y: 200 }],
        },
      },
    ]);
    expect(out.bricks[0]?.y).toBe(200);
  });
});
