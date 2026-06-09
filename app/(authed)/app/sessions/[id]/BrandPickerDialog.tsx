'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import type { BrandProfileSummary } from '@/lib/branding/types';

import { BrandProfileEditor } from '@/app/(authed)/app/account/branding/BrandProfileEditor';
import { inkOn } from '@/lib/branding/contrast';

type FontOption = { key: string; label: string };

interface Props {
  profiles: BrandProfileSummary[];
  fontOptions: FontOption[];
  /** Currently-applied preset id, or null for the BrickThink default. */
  selectedId: string | null;
  /** Signed URL of the already-generated report, if any (download from here). */
  currentPdfUrl: string | null;
  /** Brand the current report was generated with (preset id, or null for default). */
  currentBrandId: string | null;
  /** True while a generation request is in flight. */
  generating: boolean;
  /** Error from the last generation attempt, shown inline. */
  genError: string | null;
  /** Generate (or regenerate) the report with the chosen preset (id) or default (null). */
  onGenerate: (id: string | null) => void;
  onClose: () => void;
}

export function BrandPickerDialog({
  profiles,
  fontOptions,
  selectedId,
  currentPdfUrl,
  currentBrandId,
  generating,
  genError,
  onGenerate,
  onClose,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const [choice, setChoice] = useState<string | null>(selectedId);
  const [adding, setAdding] = useState(false);
  // After creating a preset we don't have the refreshed list yet; remember the
  // new id and auto-select it once `profiles` (server prop) catches up.
  const [pendingSelect, setPendingSelect] = useState<string | null>(null);

  useEffect(() => {
    if (pendingSelect && profiles.some((p) => p.id === pendingSelect)) {
      setChoice(pendingSelect);
      setPendingSelect(null);
    }
  }, [profiles, pendingSelect]);

  // Only one modal (with its focus trap) is mounted at a time: while adding, the
  // editor replaces the picker entirely. The picker's state survives because this
  // component stays mounted — only its render output switches.
  if (adding) {
    return (
      <BrandProfileEditor
        existing={null}
        fontOptions={fontOptions}
        onClose={() => setAdding(false)}
        onSaved={(savedId) => {
          setAdding(false);
          setPendingSelect(savedId);
          router.refresh();
        }}
      />
    );
  }

  const generateLabel = currentPdfUrl
    ? generating
      ? 'Regenerating…'
      : 'Regenerate report'
    : generating
      ? 'Generating…'
      : 'Generate report';

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-lg">
      <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="font-display text-lg font-medium text-zinc-900">
          {currentPdfUrl ? 'Your report' : 'Generate report'}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          White-label this report with a brand preset, or use the BrickThink default.
        </p>

        {currentPdfUrl ? (
          <a
            href={currentPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-900/10 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            <span className="flex flex-col">
              <span className="font-medium">Download the latest report (PDF)</span>
              <span className="text-xs text-zinc-500">
                ({profiles.find((p) => p.id === currentBrandId)?.name ?? 'BrickThink default'})
              </span>
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 shrink-0 text-zinc-500"
              aria-hidden="true"
            >
              <path
                d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        ) : null}

        <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
          Branding
        </p>
        <div
          role="radiogroup"
          aria-label="Brand preset"
          className="mt-2 flex max-h-[42vh] flex-col gap-2 overflow-auto"
        >
          <ChoiceRow selected={choice === null} onSelect={() => setChoice(null)}>
            <div className="flex min-w-0 flex-1 flex-col text-left">
              <span className="text-[14px] font-medium text-zinc-900">BrickThink default</span>
              <span className="text-[13px] text-zinc-600">No branding — the standard report</span>
            </div>
          </ChoiceRow>

          {profiles.map((p) => (
            <ChoiceRow key={p.id} selected={choice === p.id} onSelect={() => setChoice(p.id)}>
              <BrandSwatch
                brandColour={p.brandColour}
                accentColour={p.accentColour}
                logoUrl={p.logoUrl}
                label={p.displayName || p.name}
              />
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-[14px] font-medium text-zinc-900">{p.name}</span>
                <span className="truncate text-[13px] text-zinc-600">{p.displayName}</span>
                {p.footerContact ? (
                  <span className="truncate text-[12px] text-zinc-500">{p.footerContact}</span>
                ) : null}
              </div>
            </ChoiceRow>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={generating}
          data-testid="brand-add-preset"
          className="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          <span aria-hidden="true" className="text-base leading-none">
            +
          </span>
          Add preset
        </button>

        {genError ? (
          <p className="mt-4 text-sm text-red-600" role="status">
            {genError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="cursor-pointer rounded-full border border-zinc-900/15 bg-white px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onGenerate(choice)}
            disabled={generating}
            data-testid="brand-generate"
            className="cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {generateLabel}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

// Compact brand identity tile for a picker row — brand colour, an accent stripe,
// and the logo (or the brand initial). Keeps rows short; the full report-style
// preview lives on the /app/account/branding page.
function BrandSwatch({
  brandColour,
  accentColour,
  logoUrl,
  label,
}: {
  brandColour: string;
  accentColour: string;
  logoUrl: string | null;
  label: string;
}) {
  const initial = label.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      aria-hidden="true"
      className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-900/10"
      style={{ backgroundColor: brandColour }}
    >
      <div style={{ height: 4, backgroundColor: accentColour }} />
      <div className="flex h-[calc(100%-4px)] items-center justify-center p-1.5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span
            className="font-display text-lg font-semibold leading-none"
            style={{ color: inkOn(brandColour) }}
          >
            {initial}
          </span>
        )}
      </div>
    </div>
  );
}

function ChoiceRow({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors ${
        selected ? 'border-zinc-900' : 'cursor-pointer border-zinc-900/10 hover:bg-zinc-50'
      }`}
    >
      {children}
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300'
        }`}
      >
        {selected ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-3 w-3"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}
