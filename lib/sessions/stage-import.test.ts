import { describe, expect, it } from 'vitest';

import { parseCanvasState } from '@/lib/models/canvasState';
import {
  IMPORT_RULES,
  isImportTarget,
  remapCanvasForImport,
} from '@/lib/sessions/stage-import';
import type { StageType } from '@/lib/sessions/types';

const sampleCanvas = {
  groups: [
    { id: 'g1', name: 'Bricks', collapsed: false, visible: true },
    { id: 'g2', name: 'Annotations', collapsed: false, visible: true },
  ],
  bricks: [
    {
      id: 'b1',
      groupId: 'g1',
      code: 'red-2x2',
      image: '/bricks/red-2x2.png',
      width: 64,
      height: 64,
      x: 10,
      y: 20,
      rotation: 0,
      visible: true,
    },
    {
      id: 'b2',
      groupId: 'g2',
      code: 'blue-1x4',
      image: '/bricks/blue-1x4.png',
      width: 128,
      height: 32,
      x: 50,
      y: 80,
      rotation: 90,
      visible: true,
    },
  ],
};

describe('IMPORT_RULES', () => {
  it('covers exactly the two whitelisted target stages', () => {
    expect(Object.keys(IMPORT_RULES).sort()).toEqual(['shared_model', 'system_model']);
  });

  it('shared_model pulls caller_own individual_model', () => {
    expect(IMPORT_RULES.shared_model).toEqual({
      sourceMode: 'caller_own',
      sourceStageType: 'individual_model',
    });
  });

  it('system_model pulls session_shared shared_model', () => {
    expect(IMPORT_RULES.system_model).toEqual({
      sourceMode: 'session_shared',
      sourceStageType: 'shared_model',
    });
  });
});

describe('isImportTarget', () => {
  it.each<[StageType, boolean]>([
    ['skill_building', false],
    ['individual_model', false],
    ['shared_model', true],
    ['system_model', true],
    ['guiding_principles', false],
  ])('returns %s for %s', (stageType, expected) => {
    expect(isImportTarget(stageType)).toBe(expected);
  });
});

describe('remapCanvasForImport', () => {
  it('returns an empty canvas for an empty source', () => {
    expect(remapCanvasForImport({ groups: [], bricks: [] }, {})).toEqual({
      groups: [],
      bricks: [],
    });
  });

  it('regenerates every group.id and brick.id', () => {
    const out = remapCanvasForImport(sampleCanvas, {});
    const sourceGroupIds = new Set(sampleCanvas.groups.map((g) => g.id));
    const sourceBrickIds = new Set(sampleCanvas.bricks.map((b) => b.id));
    for (const g of out.groups) expect(sourceGroupIds.has(g.id)).toBe(false);
    for (const b of out.bricks) expect(sourceBrickIds.has(b.id)).toBe(false);
    expect(new Set(out.groups.map((g) => g.id)).size).toBe(out.groups.length);
    expect(new Set(out.bricks.map((b) => b.id)).size).toBe(out.bricks.length);
  });

  it('rewrites each brick.groupId to the remapped group id', () => {
    const out = remapCanvasForImport(sampleCanvas, {});
    const groupIdSet = new Set(out.groups.map((g) => g.id));
    for (const b of out.bricks) expect(groupIdSet.has(b.groupId)).toBe(true);
    expect(out.bricks[0]!.groupId).toBe(out.groups[0]!.id);
    expect(out.bricks[1]!.groupId).toBe(out.groups[1]!.id);
  });

  it('preserves brick spatial + visual fields exactly', () => {
    const out = remapCanvasForImport(sampleCanvas, {});
    for (let i = 0; i < sampleCanvas.bricks.length; i++) {
      const src = sampleCanvas.bricks[i]!;
      const dst = out.bricks[i]!;
      expect(dst.code).toBe(src.code);
      expect(dst.image).toBe(src.image);
      expect(dst.width).toBe(src.width);
      expect(dst.height).toBe(src.height);
      expect(dst.x).toBe(src.x);
      expect(dst.y).toBe(src.y);
      expect(dst.rotation).toBe(src.rotation);
      expect(dst.visible).toBe(src.visible);
    }
  });

  it('renames every group when renameRootGroupTo is set', () => {
    const out = remapCanvasForImport(sampleCanvas, { renameRootGroupTo: 'Alice' });
    expect(out.groups[0]!.name).toBe("Alice's Bricks");
    expect(out.groups[1]!.name).toBe("Alice's Annotations");
  });

  it('output round-trips through parseCanvasState unchanged', () => {
    const out = remapCanvasForImport(sampleCanvas, {});
    expect(parseCanvasState(out)).toEqual(out);
  });
});
