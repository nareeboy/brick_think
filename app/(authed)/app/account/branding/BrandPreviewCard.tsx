'use client';

import { inkOn } from '@/lib/branding/contrast';

interface Props {
  brandColour: string;
  accentColour: string;
  displayName: string;
  logoUrl: string | null;
  // Resolved CSS font-family values for the heading / body text. When omitted the
  // preview keeps its default look (Fraunces display heading, app body font).
  headingFontFamily?: string;
  bodyFontFamily?: string;
}

// Presentational approximation of the report cover. Used both in the list
// (driven by a saved profile) and live in the editor (driven by form state).
export function BrandPreviewCard({
  brandColour,
  accentColour,
  displayName,
  logoUrl,
  headingFontFamily,
  bodyFontFamily,
}: Props) {
  const ink = inkOn(brandColour);
  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-900/10"
      style={{ backgroundColor: brandColour }}
      aria-hidden="true"
    >
      <div style={{ height: 6, backgroundColor: accentColour }} />
      <div className="flex flex-col gap-3 p-5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-8 w-auto max-w-[140px] object-contain object-left"
          />
        ) : null}
        <div
          className="font-display text-lg leading-tight"
          style={{ color: ink, fontFamily: headingFontFamily }}
        >
          {displayName || 'Your brand'}
        </div>
        <div
          className="text-[12px] leading-snug"
          style={{ color: ink, fontFamily: bodyFontFamily }}
        >
          The quick brown fox jumps over the lazy dog.
        </div>
        <div
          className="text-[11px] uppercase tracking-[0.18em]"
          style={{ color: ink, opacity: 0.7, fontFamily: bodyFontFamily }}
        >
          Report preview
        </div>
      </div>
    </div>
  );
}
