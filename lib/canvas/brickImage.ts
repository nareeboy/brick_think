const cache = new Map<string, Promise<HTMLImageElement>>();

export function loadBrickImage(path: string): Promise<HTMLImageElement> {
  let entry = cache.get(path);
  if (!entry) {
    entry = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image ${path}`));
      img.src = path;
    });
    cache.set(path, entry);
  }
  return entry;
}

export function clearBrickImageCache(): void {
  cache.clear();
}
