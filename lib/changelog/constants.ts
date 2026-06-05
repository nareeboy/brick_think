// lib/changelog/constants.ts

export const CHANGELOG_TITLE_MAX = 200;
export const CHANGELOG_BODY_MAX = 200_000;
export const CHANGELOG_VERSION_MAX = 40;

// Banner image upload cap. Stays under next.config's serverActions.bodySizeLimit
// (4 MB) with multipart overhead headroom — see app/(authed)/CLAUDE.md.
export const CHANGELOG_BANNER_MAX_BYTES = 2 * 1024 * 1024;

export const CHANGELOG_CATEGORIES = [
  'feature',
  'improvement',
  'fix',
  'breaking',
  'release',
] as const;
export type ChangelogCategory = (typeof CHANGELOG_CATEGORIES)[number];

export function isChangelogCategory(value: string): value is ChangelogCategory {
  return (CHANGELOG_CATEGORIES as readonly string[]).includes(value);
}

export const CATEGORY_LABELS: Record<ChangelogCategory, string> = {
  feature: 'Feature',
  improvement: 'Improvement',
  fix: 'Fix',
  breaking: 'Breaking',
  release: 'Release',
};

// Tailwind classes — all combinations clear WCAG 2.2 AA on a light surface
// (see app/(authed)/CLAUDE.md palette tables). Colour reinforces the always-
// present label; it is never the sole signal.
export const CATEGORY_STYLES: Record<ChangelogCategory, string> = {
  feature: 'bg-orange-100 text-orange-900',
  improvement: 'bg-emerald-50 text-emerald-800',
  fix: 'bg-sky-50 text-sky-800',
  breaking: 'bg-rose-50 text-rose-800',
  release: 'bg-violet-100 text-violet-900',
};
