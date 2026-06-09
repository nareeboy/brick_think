'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import type { BrandProfileSummary } from '@/lib/branding/types';

import { BrandProfileEditor } from '@/app/(authed)/app/account/branding/BrandProfileEditor';
import { LiveBrandPreview } from '@/app/(authed)/app/account/branding/LiveBrandPreview';

type FontOption = { key: string; label: string };

interface Props {
  profiles: BrandProfileSummary[];
  fontOptions: FontOption[];
  /** Currently-applied preset id, or null for the BrickThink default. */
  selectedId: string | null;
  /** Apply the chosen preset (id) or the default (null) to the report. */
  onApply: (id: string | null) => void;
  onClose: () => void;
}

export function BrandPickerDialog({ profiles, fontOptions, selectedId, onApply, onClose }: Props) {
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

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-lg">
      <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="font-display text-lg font-medium text-zinc-900">
          Choose branding
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Pick a preset to white-label this report, or use the BrickThink default.
        </p>

        <div
          role="radiogroup"
          aria-label="Brand preset"
          className="mt-4 flex max-h-[50vh] flex-col gap-2 overflow-auto"
        >
          <ChoiceRow selected={choice === null} onSelect={() => setChoice(null)}>
            <div className="flex min-w-0 flex-1 flex-col text-left">
              <span className="text-[14px] font-medium text-zinc-900">BrickThink default</span>
              <span className="text-[13px] text-zinc-600">No branding — the standard report</span>
            </div>
          </ChoiceRow>

          {profiles.map((p) => (
            <ChoiceRow key={p.id} selected={choice === p.id} onSelect={() => setChoice(p.id)}>
              <div className="w-24 shrink-0">
                <LiveBrandPreview
                  previewKey={`pick-${p.id}`}
                  brandColour={p.brandColour}
                  accentColour={p.accentColour}
                  displayName={p.displayName}
                  logoUrl={p.logoUrl}
                  headingChoice={p.headingFont}
                  bodyChoice={p.bodyFont}
                  headingFontUrl={p.headingFontUrl}
                  bodyFontUrl={p.bodyFontUrl}
                />
              </div>
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
          data-testid="brand-add-preset"
          className="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <span aria-hidden="true" className="text-base leading-none">
            +
          </span>
          Add preset
        </button>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-zinc-900/15 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(choice);
              onClose();
            }}
            className="cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            Use preset
          </button>
        </div>
      </div>
    </ModalBackdrop>
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
      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
        selected
          ? 'border-zinc-900 ring-1 ring-zinc-900'
          : 'cursor-pointer border-zinc-900/10 hover:bg-zinc-50'
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
