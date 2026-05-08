const cache = new Map<string, Promise<HTMLImageElement>>();

const FILL_VAR_PATTERN = /var\(--brick-fill,\s*([^)]+)\)/g;

function recolour(svgText: string, colour: string): string {
  return svgText.replace(FILL_VAR_PATTERN, () => colour);
}

async function fetchSvg(code: string): Promise<string> {
  const res = await fetch(`/bricks/${code}.svg`);
  if (!res.ok) {
    throw new Error(`Failed to load /bricks/${code}.svg: ${res.status}`);
  }
  return res.text();
}

function loadImage(svgText: string): Promise<HTMLImageElement> {
  return new Promise((resolveImage, rejectImage) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolveImage(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rejectImage(new Error('SVG decode failed'));
    };
    img.src = url;
  });
}

export function loadBrickImage(code: string, colour?: string): Promise<HTMLImageElement> {
  const key = `${code}:${colour ?? 'default'}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = (async () => {
      const text = await fetchSvg(code);
      const recoloured = colour ? recolour(text, colour) : text;
      return loadImage(recoloured);
    })();
    cache.set(key, entry);
  }
  return entry;
}

export function clearBrickImageCache(): void {
  cache.clear();
}
