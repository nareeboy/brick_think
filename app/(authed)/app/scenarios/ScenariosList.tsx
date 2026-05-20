'use client';

import { useId, useMemo, useState } from 'react';

import { CANONICAL_STAGE_TYPES, type StageType } from '@/lib/sessions/types';
import { DURATION_BUCKETS, filterScenarios } from '@/lib/scenarios/filter';
import { STAGE_CHIP_LABEL } from '@/lib/scenarios/stageChip';
import type { DurationBucket, Scenario, ScenarioFilter } from '@/lib/scenarios/types';

import { ScenarioCard } from './ScenarioCard';
import { ScenarioDetailModal } from './ScenarioDetailModal';

interface Props {
  scenarios: Scenario[];
}

const DURATION_LABELS: Record<DurationBucket, string> = {
  any: 'Any',
  short: '≤10 min',
  medium: '10–30 min',
  long: '30+ min',
};

const DEFAULT_FILTER: ScenarioFilter = { stage: 'all', duration: 'any', search: '' };

export function ScenariosList({ scenarios }: Props) {
  const [filter, setFilter] = useState<ScenarioFilter>(DEFAULT_FILTER);
  const [open, setOpen] = useState<Scenario | null>(null);
  const stageGroupId = useId();
  const durationGroupId = useId();

  const filtered = useMemo(() => filterScenarios(scenarios, filter), [scenarios, filter]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <ChipGroup<StageType | 'all'>
          ariaLabel="Filter by stage"
          groupId={stageGroupId}
          value={filter.stage}
          onChange={(v) => setFilter((f) => ({ ...f, stage: v }))}
          options={[
            { value: 'all', label: 'All' },
            ...CANONICAL_STAGE_TYPES.map((st) => ({ value: st, label: STAGE_CHIP_LABEL[st] })),
          ]}
        />
        <ChipGroup<DurationBucket>
          ariaLabel="Filter by duration"
          groupId={durationGroupId}
          value={filter.duration}
          onChange={(v) => setFilter((f) => ({ ...f, duration: v }))}
          options={DURATION_BUCKETS.map((d) => ({ value: d, label: DURATION_LABELS[d] }))}
        />
        <label className="ml-auto flex items-center gap-2 text-[13px] text-zinc-600">
          <span className="sr-only">Search scenarios</span>
          <input
            type="search"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search…"
            className="h-10 w-56 rounded-xl border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-500 focus:outline focus:outline-2 focus:outline-[#c0613d]/40"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center text-[14px] text-zinc-600">
          <p>No scenarios match your filters.</p>
          <button
            type="button"
            onClick={() => setFilter(DEFAULT_FILTER)}
            className="mt-3 inline-flex h-10 items-center rounded-xl border border-zinc-200 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <ScenarioCard key={s.id} scenario={s} onOpen={setOpen} />
          ))}
        </div>
      )}

      {open && <ScenarioDetailModal scenario={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

interface ChipGroupProps<T extends string> {
  ariaLabel: string;
  groupId: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}

function ChipGroup<T extends string>({ ariaLabel, value, onChange, options }: ChipGroupProps<T>) {
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
                ? 'bg-[#c0613d] text-white'
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
