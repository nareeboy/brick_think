import { CANONICAL_BRICKS } from './canonical';

export const KNOWN_BRICK_CODES: ReadonlySet<string> = new Set(CANONICAL_BRICKS.map((b) => b.code));

export function isKnownBrickCode(code: string): boolean {
  return KNOWN_BRICK_CODES.has(code);
}
