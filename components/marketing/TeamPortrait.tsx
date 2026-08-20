'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * Initials for the monogram fallback — the first letter of the first and last
 * word, so "Dana Patrascoiu" becomes "DP" and a single-word name one letter.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0]?.charAt(0) ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

interface TeamPortraitProps {
  /** Site-relative image path, e.g. "/team/dana-patrascoiu.jpg". */
  src?: string;
  /**
   * Only used to build the monogram fallback. The portrait itself is decorative
   * — the name and role sit next to it in the figcaption.
   */
  name: string;
}

/**
 * Square portrait frame for the team grid. A missing or broken image degrades
 * to a monogram tile rather than a broken-image box, so the page reads fine
 * before every portrait has landed in `public/team/`.
 */
export function TeamPortrait({ src, name }: TeamPortraitProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-square overflow-hidden rounded-[20px] border border-zinc-900/10 bg-gradient-to-br from-[#F6EFE4] to-[#E9DAC4]">
      {src && !failed ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="(min-width: 1024px) 18vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-display text-[44px] font-medium tracking-tight text-[#a8482a]"
        >
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}
