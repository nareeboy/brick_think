const JPEG_SOI = new Uint8Array([0xff, 0xd8, 0xff]);

// JPEG files start with the SOI (Start Of Image) marker `FF D8 FF`. That's the
// universal three-byte sniff used by browsers and `file(1)` — anything else
// (PNG, GIF, WebP, SVG-with-script) is rejected. Mirrors `lib/images/validatePng.ts`.
export async function isJpeg(file: Blob): Promise<boolean> {
  if (file.size < 3) return false;
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  for (let i = 0; i < 3; i++) {
    if (head[i] !== JPEG_SOI[i]) return false;
  }
  return true;
}
