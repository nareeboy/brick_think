// 12-color warm muted palette for peer cursors in the live (Yjs) builder.
// Brand-aligned, terracotta-led. See:
// docs/superpowers/specs/2026-05-16-yjs-presence-polish-design.md
export const PRESENCE_PALETTE = [
  '#c0613d', // terracotta (brand)
  '#5c8b9d', // dusty blue
  '#a3744d', // sand
  '#7a8c5b', // sage
  '#9b6a8c', // plum
  '#4d6b87', // deep slate-blue
  '#b88a4e', // ochre
  '#6f8a7e', // teal
  '#8a6356', // chestnut
  '#826d8e', // violet
  '#5d8579', // jade
  '#b46b6b', // clay
] as const;

export function colorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PRESENCE_PALETTE[h % PRESENCE_PALETTE.length]!;
}
