'use client';

import { useId } from 'react';

import { isValidHexColour } from '@/lib/branding/validate';

interface Props {
  label: string;
  value: string;
  onChange: (next: string) => void;
}

// A colour swatch (<input type="color">) paired with a hex text input for paste.
// Validates live; an invalid hex shows an inline error and is reported via the
// shared isValidHexColour predicate (the parent re-checks before submit).
export function ColourField({ label, value, onChange }: Props) {
  const id = useId();
  const valid = isValidHexColour(value);
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-zinc-800">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} swatch`}
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded-lg border border-zinc-300 bg-white p-0.5"
        />
        <input
          id={id}
          type="text"
          inputMode="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1f1f1f"
          className="h-9 w-32 rounded-lg border border-zinc-300 px-2 font-mono text-[13px] text-zinc-900 focus:border-[#c0613d] focus:outline-none"
        />
      </div>
      {!valid ? (
        <p className="mt-1 text-[12px] text-[#c0613d]">Enter a hex colour like #1f1f1f.</p>
      ) : null}
    </div>
  );
}
