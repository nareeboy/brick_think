'use client';

import { useEffect, useState } from 'react';

import type { FontChoice } from '@/lib/branding/types';

// Curated keys → the CSS family the app already loads via next/font (app/layout.tsx).
// A key not in this map falls back to undefined → the preview keeps its default look.
const CURATED_CSS_FAMILY: Record<string, string> = {
  geist: 'var(--font-geist-sans), sans-serif',
  fraunces: 'var(--font-fraunces), serif',
};

/**
 * Resolve a CSS font-family for a preview, reflecting the current font choice:
 *  - a freshly-picked TTF File → loaded live via the FontFace API (object URL)
 *  - an existing custom font → loaded from its signed storage URL
 *  - a curated key → the app's loaded CSS variable
 * Returns undefined until a custom font has loaded (caller falls back to default).
 *
 * `roleKey` must be unique per concurrent preview slot (e.g. "heading"/"body", or
 * prefixed per list row) so two FontFaces don't collide on one family name.
 */
export function usePreviewFontFamily(
  roleKey: string,
  choice: FontChoice,
  file: File | null,
  existingUrl: string | null,
): string | undefined {
  const [customFamily, setCustomFamily] = useState<string | undefined>(undefined);
  const choiceKind = choice.kind;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof FontFace === 'undefined') return;

    const src = file ? URL.createObjectURL(file) : choiceKind === 'custom' ? existingUrl : null;
    if (!src) {
      setCustomFamily(undefined);
      return;
    }

    const familyName = `bt-preview-${roleKey}`;
    const objectUrl = file ? src : null;
    const fontFace = new FontFace(familyName, `url("${src}")`);
    let cancelled = false;

    fontFace
      .load()
      .then((loaded) => {
        if (cancelled) return;
        document.fonts.add(loaded);
        setCustomFamily(`"${familyName}"`);
      })
      .catch(() => {
        if (!cancelled) setCustomFamily(undefined);
      });

    return () => {
      cancelled = true;
      document.fonts.delete(fontFace);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [roleKey, choiceKind, file, existingUrl]);

  if (customFamily) return customFamily;
  if (choice.kind === 'curated') return CURATED_CSS_FAMILY[choice.key];
  return undefined;
}
