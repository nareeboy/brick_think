// TrueType magic bytes. @react-pdf reliably embeds TrueType-outline TTFs:
//   0x00010000  → TrueType
//   'true'      → legacy Apple TrueType
// We REJECT 'OTTO' (OpenType/CFF) and 'wOF2'/'wOFF' — react-pdf handles them
// poorly or not at all. Single-weight files only (no synthetic bold).
const TTF_SFNT = new Uint8Array([0x00, 0x01, 0x00, 0x00]);
const TTF_TRUE = new Uint8Array([0x74, 0x72, 0x75, 0x65]); // 'true'

export async function isTtf(file: Blob): Promise<boolean> {
  if (file.size < 4) return false;
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const matches = (sig: Uint8Array) => sig.every((b, i) => head[i] === b);
  return matches(TTF_SFNT) || matches(TTF_TRUE);
}
