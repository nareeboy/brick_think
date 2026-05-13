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
  thumbnail_url: string | null;
}

export interface ModelDetail extends ModelSummary {
  canvas_state: CanvasState;
}

export interface ModelVersionSummary {
  id: string;
  label: string | null;
  created_at: string;
}

export interface TrashedModelSummary {
  id: string;
  title: string;
  deleted_at: string;
}
