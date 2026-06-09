'use client';

import { useId, useState } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { STAGE_CHIP_LABEL, stageChipClasses } from '@/lib/scenarios/stageChip';
import type { Scenario } from '@/lib/scenarios/types';

const NEUTRAL_CHIP =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-zinc-900/5 text-zinc-600';

interface Props {
  scenario: Scenario;
  onClose: () => void;
}

export function ScenarioDetailModal({ scenario, onClose }: Props) {
  const titleId = useId();
  const [copied, setCopied] = useState(false);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(`${scenario.title}\n\n${scenario.body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard refused (insecure context, denied permission) — silently
      // leave the modal open so the user can try again.
    }
  }

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-xl">
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="font-serif text-[24px] leading-tight text-zinc-900">
          {scenario.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={stageChipClasses(scenario.stage_type)}>
            {STAGE_CHIP_LABEL[scenario.stage_type]}
          </span>
          <span className={NEUTRAL_CHIP}>{scenario.duration_minutes} min</span>
          {scenario.tags.map((t) => (
            <span key={t} className={NEUTRAL_CHIP}>
              {t}
            </span>
          ))}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-700">
          {scenario.body}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={copyText}
            className="inline-flex h-10 items-center rounded-xl border border-zinc-200 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
          >
            {copied ? 'Copied ✓' : 'Copy text'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl bg-[#a8482a] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#a85432]"
          >
            Close
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
