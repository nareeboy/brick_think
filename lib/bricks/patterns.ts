export type Pattern =
  | 'diagonal-up'
  | 'diagonal-down'
  | 'dots'
  | 'cross-hatch'
  | 'vertical'
  | 'horizontal'
  | 'checker'
  | 'solid';

const COLOR_PATTERN: Record<string, Pattern> = {
  red: 'diagonal-up',
  green: 'cross-hatch',
  navy: 'dots',
  blue: 'dots', // alias — same family
  yellow: 'horizontal',
  pink: 'vertical',
  grey: 'diagonal-down',
  white: 'checker',
  black: 'checker',
  orange: 'diagonal-up', // alias — same family
  brown: 'cross-hatch', // alias — same family
};

/**
 * Returns the visual pattern paired with a colour token for colourblind
 * mode. `''` (empty) or unknown colours fall back to `'solid'` so the
 * overlay is a no-op for bricks without a colour token (Connector
 * bracket, Window arched 1x2, etc.).
 */
export function patternForColor(color: string): Pattern {
  if (!color) return 'solid';
  return COLOR_PATTERN[color] ?? 'solid';
}
