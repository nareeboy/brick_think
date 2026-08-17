'use client';

// Single-select chip row. Follows the app-wide a11y idiom for chip groups:
// role="radiogroup" container + role="radio" per chip with aria-checked
// (see app/(authed)/CLAUDE.md). Extracted from the /app/scenarios filter row
// so the scenario picker can reuse the exact same control.

interface Props<T extends string> {
  ariaLabel: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}

export function ChipGroup<T extends string>({ ariaLabel, value, onChange, options }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex h-9 items-center rounded-full px-3 text-[12px] font-medium transition-colors ${
              active
                ? 'bg-[#a8482a] text-white'
                : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-900/5'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
