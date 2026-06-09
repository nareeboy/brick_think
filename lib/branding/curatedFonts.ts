import path from 'node:path';

// Server-only: this module touches the filesystem (curatedFontFilePath uses
// process.cwd()). The pure catalog data lives in curatedFontsCatalog.ts so
// client code can import keys/metadata without dragging `node:path` into a
// client bundle. Re-export the catalog here for existing server-side callers.
export {
  type CuratedFont,
  CURATED_FONTS,
  CURATED_FONT_KEYS,
  curatedFontByKey,
} from './curatedFontsCatalog';

const FONT_DIR = 'lib/reports/pdf/fonts';

/** Absolute path to a curated font file (server-side only). */
export function curatedFontFilePath(rel: string): string {
  return path.join(process.cwd(), FONT_DIR, rel);
}
