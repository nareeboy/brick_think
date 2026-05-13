const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function isPng(file: Blob): Promise<boolean> {
  if (file.size < 8) return false;
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  for (let i = 0; i < 8; i++) {
    if (head[i] !== PNG_MAGIC[i]) return false;
  }
  return true;
}
