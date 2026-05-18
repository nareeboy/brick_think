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
