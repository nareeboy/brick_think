'use client';

import { STAGE_CHIP_LABEL, stageChipClasses } from '@/lib/scenarios/stageChip';
import type { Scenario } from '@/lib/scenarios/types';

const NEUTRAL_CHIP =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-zinc-900/5 text-zinc-600';

interface Props {
  scenario: Scenario;
  onOpen: (s: Scenario) => void;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function ScenarioCard({ scenario, onOpen }: Props) {
  const visibleTags = scenario.tags.slice(0, 3);
  const overflow = scenario.tags.length - visibleTags.length;

  return (
    <button
      type="button"
      onClick={() => onOpen(scenario)}
      aria-label={scenario.title}
      data-scroll-target=""
      className="group flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 text-left transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8482a]/40 active:scale-[0.99]"
    >
      <h3 className="font-serif text-[20px] leading-tight text-zinc-900">{scenario.title}</h3>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={stageChipClasses(scenario.stage_type)}>
          {STAGE_CHIP_LABEL[scenario.stage_type]}
        </span>
        <span className={NEUTRAL_CHIP}>{scenario.duration_minutes} min</span>
        {visibleTags.map((t) => (
          <span key={t} className={NEUTRAL_CHIP}>
            {t}
          </span>
        ))}
        {overflow > 0 && <span className={NEUTRAL_CHIP}>+{overflow} more</span>}
      </div>

      <p data-testid="scenario-card-body" className="text-[13px] leading-relaxed text-zinc-600">
        {truncate(scenario.body, 120)}
      </p>
    </button>
  );
}
