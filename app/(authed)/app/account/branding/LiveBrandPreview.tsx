'use client';

import type { FontChoice } from '@/lib/branding/types';

import { BrandPreviewCard } from './BrandPreviewCard';
import { usePreviewFontFamily } from './usePreviewFontFamily';

interface Props {
  // Unique per rendered preview so concurrent FontFaces don't collide on a name
  // (e.g. each list row passes its profile id; the editor passes "editor").
  previewKey: string;
  brandColour: string;
  accentColour: string;
  displayName: string;
  logoUrl: string | null;
  headingChoice: FontChoice;
  bodyChoice: FontChoice;
  headingFile?: File | null;
  bodyFile?: File | null;
  headingFontUrl?: string | null;
  bodyFontUrl?: string | null;
}

/**
 * BrandPreviewCard plus live font resolution: reflects curated picks (app CSS
 * vars), a freshly-picked TTF (FontFace from the file), and an existing custom
 * font (FontFace from its signed URL).
 */
export function LiveBrandPreview({
  previewKey,
  brandColour,
  accentColour,
  displayName,
  logoUrl,
  headingChoice,
  bodyChoice,
  headingFile = null,
  bodyFile = null,
  headingFontUrl = null,
  bodyFontUrl = null,
}: Props) {
  const headingFontFamily = usePreviewFontFamily(
    `${previewKey}-heading`,
    headingChoice,
    headingFile,
    headingFontUrl,
  );
  const bodyFontFamily = usePreviewFontFamily(
    `${previewKey}-body`,
    bodyChoice,
    bodyFile,
    bodyFontUrl,
  );

  return (
    <BrandPreviewCard
      brandColour={brandColour}
      accentColour={accentColour}
      displayName={displayName}
      logoUrl={logoUrl}
      headingFontFamily={headingFontFamily}
      bodyFontFamily={bodyFontFamily}
    />
  );
}
