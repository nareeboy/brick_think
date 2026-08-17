'use client';

import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, useTransition } from 'react';

import {
  ScenarioEditorDialog,
  type OrgOption,
} from '@/app/(authed)/app/scenarios/ScenarioEditorDialog';
import { setStageScenarioAction } from '@/app/(authed)/app/sessions/scenario-actions';
import { ChipGroup } from '@/components/app/ChipGroup';
import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { filterScenarios } from '@/lib/scenarios/filter';
import { STAGE_CHIP_LABEL, stageChipClasses } from '@/lib/scenarios/stageChip';
import type { Scenario } from '@/lib/scenarios/types';
import { CANONICAL_STAGE_TYPES, type StageType } from '@/lib/sessions/types';

const NEUTRAL_CHIP =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-zinc-900/5 text-zinc-600';

// Matches the custom-scenario chip on /app/scenarios (My-Designs org-chip
// tone) so authored rows are recognisable inside the picker too.
const CUSTOM_CHIP =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-orange-100 text-orange-900';

const SECTION_HEADING =
  'mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500';

interface Props {
  stageId: string;
  stageType: StageType;
  /** ALL caller-visible scenarios (every stage_type) — the picker filters. */
  scenarios: Scenario[];
  currentScenarioId: string | null;
  /** Workshops the caller can author into — threaded to the create dialog. */
  orgs: OrgOption[];
  onClose: () => void;
}

export function ScenarioPickerDialog({
  stageId,
  stageType,
  scenarios,
  currentScenarioId,
  orgs,
  onClose,
}: Props) {
  const titleId = useId();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  // Scenarios from any stage are pickable — the stage_type is a category
  // label, not a restriction. The filter just defaults to this stage's own
  // exercises so the common case needs no extra click.
  const [stageFilter, setStageFilter] = useState<StageType | 'all'>(stageType);

  // Same matcher the /app/scenarios library uses.
  const filtered = useMemo(
    () => filterScenarios(scenarios, { stage: stageFilter, duration: 'any', search, scope: 'all' }),
    [scenarios, stageFilter, search],
  );
  // Custom scenarios lead; the ready-made library sits below, mirroring the
  // section order on /app/scenarios.
  const customRows = useMemo(() => filtered.filter((s) => !s.is_template), [filtered]);
  const libraryRows = useMemo(() => filtered.filter((s) => s.is_template), [filtered]);

  function pick(scenarioId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await setStageScenarioAction(stageId, scenarioId);
      if (result.ok) {
        onClose();
      } else {
        setError(messageForCode(result.code));
      }
    });
  }

  function renderRows(rows: Scenario[]) {
    return (
      <ul className="flex flex-col gap-2">
        {rows.map((s) => (
          <li
            key={s.id}
            className={`rounded-2xl border p-4 ${
              s.id === currentScenarioId
                ? 'border-[#a8482a] bg-[#a8482a]/5'
                : 'border-zinc-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-[18px] leading-tight text-zinc-900">{s.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {!s.is_template && <span className={CUSTOM_CHIP}>Custom</span>}
                  <span className={stageChipClasses(s.stage_type)}>
                    {STAGE_CHIP_LABEL[s.stage_type]}
                  </span>
                  <span className={NEUTRAL_CHIP}>{s.duration_minutes} min</span>
                  {s.tags.slice(0, 3).map((t) => (
                    <span key={t} className={NEUTRAL_CHIP}>
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{s.body}</p>
              </div>
              <button
                type="button"
                onClick={() => pick(s.id)}
                disabled={pending}
                data-testid="scenario-picker-confirm"
                className="inline-flex h-9 shrink-0 items-center rounded-xl bg-[#a8482a] px-3 text-[12px] font-medium text-white transition-colors hover:bg-[#a85432] disabled:opacity-50"
              >
                {s.id === currentScenarioId ? 'Selected' : 'Pick'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <ModalBackdrop
        // While the nested create dialog is open, its own Escape/backdrop
        // handlers close it; the picker's must not also fire (both listen at
        // the window level) or one Escape would dismiss both layers.
        onClose={creating ? () => {} : onClose}
        titleId={titleId}
        panelClassName="w-full max-w-2xl"
      >
        <div className="flex max-h-[80vh] flex-col rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-serif text-[22px] leading-tight text-zinc-900">
              Pick a scenario for {STAGE_CHIP_LABEL[stageType]}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-900/5"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex flex-1 items-center gap-2 text-[13px] text-zinc-600">
              <span className="sr-only">Search scenarios</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-500 focus:outline focus:outline-2 focus:outline-[#a8482a]/40"
              />
            </label>
            <button
              type="button"
              onClick={() => setCreating(true)}
              data-testid="picker-new-scenario"
              className="inline-flex h-10 shrink-0 items-center rounded-xl border border-zinc-200 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
            >
              New scenario
            </button>
          </div>

          <div className="mt-3">
            <ChipGroup<StageType | 'all'>
              ariaLabel="Filter by stage"
              value={stageFilter}
              onChange={setStageFilter}
              options={[
                { value: 'all', label: 'All' },
                ...CANONICAL_STAGE_TYPES.map((st) => ({
                  value: st,
                  label: STAGE_CHIP_LABEL[st],
                })),
              ]}
            />
          </div>

          <div className="mt-4 flex-1 overflow-y-auto pr-1" data-scroll-target="">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-zinc-500">
                {scenarios.length === 0
                  ? 'No scenarios available yet — create one with “New scenario”.'
                  : 'No scenarios match your filters.'}
              </p>
            ) : customRows.length > 0 ? (
              <div className="flex flex-col gap-6">
                <section aria-label="Your scenarios">
                  <h3 className={SECTION_HEADING}>Your scenarios</h3>
                  {renderRows(customRows)}
                </section>
                {libraryRows.length > 0 && (
                  <section aria-label="BrickThink library">
                    <h3 className={SECTION_HEADING}>BrickThink library</h3>
                    {renderRows(libraryRows)}
                  </section>
                )}
              </div>
            ) : (
              renderRows(libraryRows)
            )}
          </div>

          {currentScenarioId && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => pick(null)}
                disabled={pending}
                className="text-[12px] font-medium text-zinc-500 underline-offset-2 hover:underline disabled:opacity-50"
              >
                Clear pick
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-[12px] text-red-700">
              {error}
            </p>
          )}
        </div>
      </ModalBackdrop>

      {creating && (
        <ScenarioEditorDialog
          mode="create"
          orgs={orgs}
          initialStageType={stageFilter === 'all' ? stageType : stageFilter}
          // The picker's list comes from server props — refresh re-renders the
          // session page so the new scenario appears in the (still open) list.
          onSaved={() => router.refresh()}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

function messageForCode(code: string): string {
  switch (code) {
    case 'not_facilitator':
      return 'Only the facilitator can pick a scenario.';
    case 'scenario_not_found':
      return 'That scenario no longer exists. Refresh and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
