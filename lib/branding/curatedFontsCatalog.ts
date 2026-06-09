// Client-safe curated-font catalog: pure data, no `node:path` / `process.cwd()`.
// Split out from curatedFonts.ts so client code (validate.ts, the branding
// editor) can import the keys/metadata without pulling the server-only
// filesystem path helper (curatedFontFilePath) into a webpack client bundle.

/** One curated font family: the @react-pdf family name + its on-disk TTF files. */
export interface CuratedFont {
  key: string;
  label: string;
  /** @react-pdf family name used in styles. Must be globally unique. */
  family: string;
  files: Array<{ rel: string; fontWeight: number }>;
}

export const CURATED_FONTS: CuratedFont[] = [
  {
    key: 'fraunces',
    label: 'Fraunces (serif display)',
    family: 'Fraunces',
    files: [
      { rel: 'Fraunces-Regular.ttf', fontWeight: 400 },
      { rel: 'Fraunces-SemiBold.ttf', fontWeight: 600 },
    ],
  },
  {
    key: 'geist',
    label: 'Geist (sans)',
    family: 'Geist',
    files: [
      { rel: 'Geist-Regular.ttf', fontWeight: 400 },
      { rel: 'Geist-Medium.ttf', fontWeight: 500 },
    ],
  },
];

export const CURATED_FONT_KEYS = CURATED_FONTS.map((f) => f.key);

export function curatedFontByKey(key: string): CuratedFont | null {
  return CURATED_FONTS.find((f) => f.key === key) ?? null;
}
