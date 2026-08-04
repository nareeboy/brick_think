'use client';

import { useId, useMemo, useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';
import { CANONICAL_STAGE_TYPES, type StageType } from '@/lib/sessions/types';
import { DURATION_BUCKETS, SCENARIO_SCOPES, filterScenarios } from '@/lib/scenarios/filter';
import { STAGE_CHIP_LABEL } from '@/lib/scenarios/stageChip';
import type {
  DurationBucket,
  Scenario,
  ScenarioFilter,
  ScenarioScope,
} from '@/lib/scenarios/types';

import { deleteScenarioAction } from './actions';
import { ScenarioCard } from './ScenarioCard';
import { ScenarioDetailModal } from './ScenarioDetailModal';
import { ScenarioEditorDialog, type OrgOption } from './ScenarioEditorDialog';

interface Props {
  scenarios: Scenario[];
  myProfileId: string;
  /** org_id → workshop name for the caller's memberships (custom-chip labels). */
  orgNames: Record<string, string>;
  /** Workshops the caller can author into — threaded to the edit dialog. */
  orgs: OrgOption[];
}

const DURATION_LABELS: Record<DurationBucket, string> = {
  any: 'Any',
  short: '≤10 min',
  medium: '10–30 min',
  long: '30+ min',
};

const SCOPE_LABELS: Record<ScenarioScope, string> = {
  all: 'All',
  library: 'Library',
  custom: 'Custom',
};

const DEFAULT_FILTER: ScenarioFilter = { stage: 'all', duration: 'any', search: '', scope: 'all' };

export function ScenariosList({ scenarios, myProfileId, orgNames, orgs }: Props) {
  const [filter, setFilter] = useState<ScenarioFilter>(DEFAULT_FILTER);
  const [open, setOpen] = useState<Scenario | null>(null);
  const [editing, setEditing] = useState<Scenario | null>(null);
  const [deleting, setDeleting] = useState<Scenario | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const stageGroupId = useId();
  const durationGroupId = useId();
  const scopeGroupId = useId();

  const filtered = useMemo(() => filterScenarios(scenarios, filter), [scenarios, filter]);

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteScenarioAction(target.id);
      if (result.ok) {
        setDeleting(null);
      } else {
        setDeleting(null);
        setDeleteError(
          result.code === 'not_found_or_not_creator'
            ? 'Only the creator can delete this scenario.'
            : 'Something went wrong deleting the scenario. Please try again.',
        );
      }
    });
  }

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
        <ChipGroup<ScenarioScope>
          ariaLabel="Filter by source"
          groupId={scopeGroupId}
          value={filter.scope}
          onChange={(v) => setFilter((f) => ({ ...f, scope: v }))}
          options={SCENARIO_SCOPES.map((s) => ({ value: s, label: SCOPE_LABELS[s] }))}
        />
        <label className="ml-auto flex items-center gap-2 text-[13px] text-zinc-600">
          <span className="sr-only">Search scenarios</span>
          <input
            type="search"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search…"
            className="h-10 w-56 rounded-xl border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-500 focus:outline focus:outline-2 focus:outline-[#a8482a]/40"
          />
        </label>
      </div>

      {deleteError && (
        <p role="alert" className="mb-4 text-[12px] text-red-700">
          {deleteError}
        </p>
      )}

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
            <ScenarioCard
              key={s.id}
              scenario={s}
              orgName={s.org_id !== null ? (orgNames[s.org_id] ?? 'Workshop') : null}
              canManage={s.created_by !== null && s.created_by === myProfileId}
              onOpen={setOpen}
              onEdit={setEditing}
              onDelete={(sc) => {
                setDeleteError(null);
                setDeleting(sc);
              }}
            />
          ))}
        </div>
      )}

      {open && (
        <ScenarioDetailModal
          scenario={open}
          orgName={open.org_id !== null ? (orgNames[open.org_id] ?? 'Workshop') : null}
          onClose={() => setOpen(null)}
        />
      )}

      {editing && (
        <ScenarioEditorDialog
          mode="edit"
          scenario={editing}
          orgs={orgs}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteConfirmDialog
          title="Delete scenario?"
          description={
            <>
              <span className="font-medium text-zinc-900">{deleting.title}</span> will be removed
              {deleting.org_id !== null ? ' for everyone in the workshop' : ' from your library'}.
              Sessions that picked it keep running — the stage just loses its scenario link.
            </>
          }
          pending={pending}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
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
