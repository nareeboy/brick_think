'use client';

// Shared presentational avatar primitive. Renders either an <img> at the
// passed URL or an initials chip fallback using the first character of `name`.
// Caller is responsible for resolving the URL string (including any cache
// buster querystring) and for picking the right `name` fallback chain
// (e.g. profile.full_name ?? profile.email).

import { useState } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  url: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
}

interface SizeSpec {
  box: string;
  text: string;
}

const SIZE_MAP: Record<AvatarSize, SizeSpec> = {
  sm: { box: 'h-8 w-8', text: 'text-xs' },
  md: { box: 'h-10 w-10', text: 'text-sm' },
  lg: { box: 'h-11 w-11', text: 'text-[15px]' },
  xl: { box: 'h-20 w-20', text: 'text-2xl' },
};

function initialFor(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export function Avatar({ url, name, size = 'md', className = '' }: AvatarProps) {
  const spec = SIZE_MAP[size];
  const base = `${spec.box} shrink-0 rounded-full`;
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${base} object-cover ${className}`.trim()}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={`${base} inline-flex items-center justify-center bg-[#c0613d]/15 ${spec.text} font-semibold text-[#c0613d] ${className}`.trim()}
    >
      {initialFor(name)}
    </span>
  );
}
