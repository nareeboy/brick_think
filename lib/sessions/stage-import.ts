import type { CanvasState } from '@/lib/models/types';
import type { StageType } from '@/lib/sessions/types';

export type ImportTargetStage =
  | 'individual_model'
  | 'shared_model'
  | 'system_model'
  | 'guiding_principles';

export interface SourceSelector {
  sourceMode: 'caller_own' | 'session_shared';
  sourceStageType: StageType;
}

// Every stage except skill_building has a "bring in my previous model" entry.
// `shared_model` is the only session-shared target — sourced by session-wide
// row; the rest are per-participant and sourced by caller_own.
export const IMPORT_RULES: Record<ImportTargetStage, SourceSelector> = {
  individual_model: { sourceMode: 'caller_own', sourceStageType: 'skill_building' },
  shared_model: { sourceMode: 'caller_own', sourceStageType: 'individual_model' },
  system_model: { sourceMode: 'session_shared', sourceStageType: 'shared_model' },
  guiding_principles: { sourceMode: 'caller_own', sourceStageType: 'system_model' },
};

export function isImportTarget(stageType: StageType): stageType is ImportTargetStage {
  return (
    stageType === 'individual_model' ||
    stageType === 'shared_model' ||
    stageType === 'system_model' ||
    stageType === 'guiding_principles'
  );
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * Returns a fresh canvas with regenerated ids so it can be appended into a
 * destination canvas (Yjs or autosave) without collision. Optionally renames
 * every group with the `"{displayName}'s {originalName}"` prefix so the
 * shared_model Layers panel disambiguates contributors.
 */
export function remapCanvasForImport(
  source: CanvasState,
  opts: { renameRootGroupTo?: string },
): CanvasState {
  const groupIdMap = new Map<string, string>();
  const groups = source.groups.map((g) => {
    const newId = makeId('g');
    groupIdMap.set(g.id, newId);
    const name = opts.renameRootGroupTo ? `${opts.renameRootGroupTo}'s ${g.name}` : g.name;
    return { ...g, id: newId, name };
  });
  const bricks = source.bricks
    .map((b) => {
      const newGroupId = groupIdMap.get(b.groupId);
      if (!newGroupId) return null;
      return { ...b, id: makeId('b'), groupId: newGroupId };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);
  return { groups, bricks };
}
