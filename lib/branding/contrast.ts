// Pick a readable ink colour for text sitting on a brand-colour background.
// Uses the WCAG relative-luminance formula and a 0.5 threshold so a light brand
// colour gets black text and a dark one gets white.

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance (0–1) of a #rrggbb hex string. */
export function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** '#000' on a light background, '#fff' on a dark one. */
export function inkOn(hex: string): string {
  return relativeLuminance(hex) > 0.5 ? '#000000' : '#ffffff';
}
