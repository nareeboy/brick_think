import type { BrickInstance, LayerGroup } from '@/components/builder/builderState';

export interface CanvasState {
  groups: LayerGroup[];
  bricks: BrickInstance[];
}

export const EMPTY_CANVAS_STATE: CanvasState = { groups: [], bricks: [] };

export interface ModelSummary {
  id: string;
  title: string;
  updated_at: string;
}

export interface ModelDetail extends ModelSummary {
  canvas_state: CanvasState;
}

export interface ModelVersionSummary {
  id: string;
  label: string | null;
  created_at: string;
}
