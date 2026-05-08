export const RECOLOUR_PALETTE = [
  '#c0613d',
  '#7a8b66',
  '#9bb7d4',
  '#d6a04b',
  '#a8557a',
  '#525c69',
] as const;

export type PaletteColour = (typeof RECOLOUR_PALETTE)[number];
