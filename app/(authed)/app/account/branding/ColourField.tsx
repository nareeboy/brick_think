'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

import { isValidHexColour } from '@/lib/branding/validate';

interface Props {
  label: string;
  value: string;
  onChange: (next: string) => void;
}

// A colour swatch that opens a hex-first picker (saturation/hue area, no RGB
// inputs) paired with a hex text input for paste/typing. We deliberately avoid
// the native <input type="color">, whose popup is OS-controlled and defaults to
// RGB with no way to make hex the primary mode. Validates live via the shared
// isValidHexColour predicate (the parent re-checks before submit).
export function ColourField({ label, value, onChange }: Props) {
  const id = useId();
  const valid = isValidHexColour(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the picker on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-zinc-800">
        {label}
      </label>
      <div ref={containerRef} className="relative mt-1.5 flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label} — open colour picker`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="h-9 w-10 cursor-pointer rounded-lg border border-zinc-300 p-0.5"
        >
          <span
            className="block h-full w-full rounded-[5px]"
            style={{ backgroundColor: valid ? value : '#000000' }}
          />
        </button>
        <input
          id={id}
          type="text"
          inputMode="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1f1f1f"
          className="h-9 w-32 rounded-lg border border-zinc-300 px-2 font-mono text-[13px] text-zinc-900 focus:border-[#c0613d] focus:outline-none"
        />

        {open ? (
          <div className="absolute left-0 top-[calc(100%+6px)] z-10 rounded-xl border border-zinc-900/10 bg-white p-3 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.35)]">
            <HexColorPicker color={valid ? value : '#000000'} onChange={onChange} />
          </div>
        ) : null}
      </div>
      {!valid ? (
        <p className="mt-1 text-[12px] text-[#c0613d]">Enter a hex colour like #1f1f1f.</p>
      ) : null}
    </div>
  );
}
