import { CANONICAL_BRICKS } from './canonical';

// Best-effort extraction of a brick's primary colour from its canonical code.
// Returns '' when the code doesn't include a known colour token.
const KNOWN_COLORS = [
  'red',
  'green',
  'navy',
  'blue',
  'yellow',
  'pink',
  'grey',
  'white',
  'black',
  'orange',
  'brown',
];

export function extractColorFromCode(code: string): string {
  for (const c of KNOWN_COLORS) {
    if (code.includes(`-${c}-`) || code.startsWith(`${c}-`) || code.endsWith(`-${c}`)) {
      return c;
    }
  }
  return '';
}

/**
 * Produces a stable skeleton from a brick code by replacing the colour token
 * with the literal string `*`. Returns null when the code has no colour token.
 */
function colorSkeleton(code: string, color: string): string | null {
  if (code.includes(`-${color}-`)) return code.replace(`-${color}-`, '-*-');
  if (code.startsWith(`${color}-`)) return code.replace(`${color}-`, '*-');
  if (code.endsWith(`-${color}`)) return code.replace(`-${color}`, '-*');
  return null;
}

/**
 * Given a brick code, return the next canonical code that shares the same
 * shape skeleton but a different colour token. Returns `null` if the brick
 * has no colour variants in CANONICAL_BRICKS.
 *
 * Example: 'block-red-medium-left' cycles through
 *   block-green-medium-left → block-navy-medium-left → block-pink-medium-left →
 *   block-red-medium-left → block-yellow-medium-left → (wraps back to green)
 */
export function nextColorVariant(code: string): string | null {
  const currentColor = extractColorFromCode(code);
  if (!currentColor) return null;

  const skeleton = colorSkeleton(code, currentColor);
  if (!skeleton) return null;

  const variants = CANONICAL_BRICKS.filter((b) => {
    const c = extractColorFromCode(b.code);
    if (!c) return false;
    return colorSkeleton(b.code, c) === skeleton;
  })
    .map((b) => b.code)
    .sort();

  if (variants.length <= 1) return null;
  const idx = variants.indexOf(code);
  if (idx === -1) return null;
  return variants[(idx + 1) % variants.length] ?? null;
}
