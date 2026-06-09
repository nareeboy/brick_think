'use client';

import { inkOn } from '@/lib/branding/contrast';

interface Props {
  brandColour: string;
  accentColour: string;
  displayName: string;
  logoUrl: string | null;
}

// Presentational approximation of the report cover. Used both in the list
// (driven by a saved profile) and live in the editor (driven by form state).
export function BrandPreviewCard({ brandColour, accentColour, displayName, logoUrl }: Props) {
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
        <div className="font-display text-lg leading-tight" style={{ color: ink }}>
          {displayName || 'Your brand'}
        </div>
        <div
          className="text-[11px] uppercase tracking-[0.18em]"
          style={{ color: ink, opacity: 0.7 }}
        >
          Report preview
        </div>
      </div>
    </div>
  );
}
