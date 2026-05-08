export const BRICK_BASE_UNIT = 16;

export type BrickCategory =
  | 'brick'
  | 'plate'
  | 'slope'
  | 'round'
  | 'window'
  | 'door'
  | 'decorative'
  | 'figure'
  | 'connector'
  | 'specialty';

export interface BrickDefinition {
  code: string;
  name: string;
  category: BrickCategory;
  studsX: number;
  studsY: number;
  defaultColour: string;
}

export interface BrickManifestEntry extends BrickDefinition {
  viewBox: string;
  path: string;
  hash: string;
}

export interface BrickManifest {
  version: number;
  ingestedAt: string;
  baseUnit: number;
  count: number;
  bricks: BrickManifestEntry[];
}
