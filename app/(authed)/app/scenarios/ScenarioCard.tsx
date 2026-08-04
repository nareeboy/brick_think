'use client';

import { STAGE_CHIP_LABEL, stageChipClasses } from '@/lib/scenarios/stageChip';
import type { Scenario } from '@/lib/scenarios/types';

const NEUTRAL_CHIP =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-zinc-900/5 text-zinc-600';

// My-Designs org-chip convention: warm brand tone marks a shared/team-scoped
// row; templates get the neutral library chip instead.
export const CUSTOM_CHIP =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-orange-100 text-orange-900';

interface Props {
  scenario: Scenario;
  /** Workshop name for custom rows; null for library templates. */
  orgName: string | null;
  /** True when the signed-in user authored this scenario. */
  canManage: boolean;
  onOpen: (s: Scenario) => void;
  onEdit: (s: Scenario) => void;
  onDelete: (s: Scenario) => void;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function ScenarioCard({ scenario, orgName, canManage, onOpen, onEdit, onDelete }: Props) {
  const visibleTags = scenario.tags.slice(0, 3);
  const overflow = scenario.tags.length - visibleTags.length;

  return (
    <div className="group relative rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]">
      <button
        type="button"
        onClick={() => onOpen(scenario)}
        aria-label={scenario.title}
        data-scroll-target=""
        className="flex w-full flex-col gap-3 rounded-2xl p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8482a]/40 active:scale-[0.99]"
      >
        <h3 className="pr-16 font-serif text-[20px] leading-tight text-zinc-900">
          {scenario.title}
        </h3>

        <div className="flex flex-wrap items-center gap-1.5">
          {orgName !== null ? (
            <span className={CUSTOM_CHIP}>{orgName}</span>
          ) : (
            <span className={NEUTRAL_CHIP}>BrickThink library</span>
          )}
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

      {canManage && (
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(scenario)}
            aria-label="Edit scenario"
            title="Edit scenario"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-zinc-600 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(scenario)}
            aria-label="Delete scenario"
            title="Delete scenario"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-zinc-600 ring-1 ring-zinc-200 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
