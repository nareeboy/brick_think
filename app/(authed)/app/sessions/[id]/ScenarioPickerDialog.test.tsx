import { afterEach, describe, test, expect, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ScenarioPickerDialog } from './ScenarioPickerDialog';
import type { Scenario } from '@/lib/scenarios/types';

vi.mock('@/app/(authed)/app/sessions/scenario-actions', () => ({
  setStageScenarioAction: vi.fn(async () => ({ ok: true, data: null })),
}));

// The nested create dialog imports the scenarios server-actions module; stub
// it so the tree renders without a server-action runtime.
vi.mock('@/app/(authed)/app/scenarios/actions', () => ({
  createScenarioAction: vi.fn(async () => ({ ok: true, data: { id: 'new-1' } })),
  updateScenarioAction: vi.fn(async () => ({ ok: true, data: { id: 'new-1' } })),
  deleteScenarioAction: vi.fn(async () => ({ ok: true, data: { id: 'new-1' } })),
}));

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function scenario(overrides: Partial<Scenario>): Scenario {
  return {
    id: 'template-1',
    org_id: null,
    stage_type: 'individual_model',
    title: 'Your role today',
    body: 'Show your role.',
    tags: ['identity'],
    duration_minutes: 20,
    is_template: true,
    created_by: null,
    created_at: '',
    ...overrides,
  };
}

const fixtures: Scenario[] = [
  scenario({}),
  scenario({ id: 'template-2', title: 'A hurdle you cleared', body: 'Model the hurdle.' }),
  scenario({
    id: 'custom-1',
    title: 'Our quarterly ritual',
    body: 'Model the ritual.',
    is_template: false,
    created_by: 'me',
  }),
  // A different stage's template — hidden by the default filter, pickable
  // once the facilitator widens it.
  scenario({
    id: 'template-skill',
    stage_type: 'skill_building',
    title: 'Tower of any height',
    body: 'Build a tower.',
  }),
];

function renderPicker(props: Partial<Parameters<typeof ScenarioPickerDialog>[0]> = {}) {
  return render(
    <ScenarioPickerDialog
      stageId="st1"
      stageType="individual_model"
      scenarios={fixtures}
      currentScenarioId={null}
      orgs={[{ id: 'org-1', name: 'Acme Team' }]}
      onClose={() => {}}
      {...props}
    />,
  );
}

describe('ScenarioPickerDialog', () => {
  test('custom scenarios lead under "Your scenarios"; templates sit under "BrickThink library"', () => {
    renderPicker();
    const custom = within(screen.getByRole('region', { name: 'Your scenarios' }));
    custom.getByText('Our quarterly ritual');
    const library = within(screen.getByRole('region', { name: 'BrickThink library' }));
    library.getByText('Your role today');
    library.getByText('A hurdle you cleared');
  });

  test('no section headings when the caller has no custom scenarios', () => {
    renderPicker({ scenarios: fixtures.filter((s) => s.is_template) });
    expect(screen.queryByRole('region', { name: 'Your scenarios' })).toBeNull();
    screen.getByText('Your role today');
  });

  test('search narrows across title/body/tags like the library page', async () => {
    renderPicker();
    await userEvent.type(screen.getByRole('searchbox', { name: /Search scenarios/i }), 'ritual');
    screen.getByText('Our quarterly ritual');
    expect(screen.queryByText('Your role today')).toBeNull();
    expect(screen.queryByText(/No scenarios match/i)).toBeNull();
  });

  test('search with no hits shows the empty-match message', async () => {
    renderPicker();
    await userEvent.type(screen.getByRole('searchbox', { name: /Search scenarios/i }), 'zzz');
    screen.getByText(/No scenarios match your filters/i);
  });

  test('"New scenario" opens the editor with the stage preselected', async () => {
    renderPicker();
    await userEvent.click(screen.getByTestId('picker-new-scenario'));
    screen.getByRole('heading', { name: 'New scenario' });
    const stageSelect = screen.getByLabelText('Stage') as HTMLSelectElement;
    expect(stageSelect.value).toBe('individual_model');
  });

  test('saving a new scenario refreshes the server-provided list', async () => {
    renderPicker();
    await userEvent.click(screen.getByTestId('picker-new-scenario'));
    await userEvent.type(screen.getByLabelText('Title'), 'Fresh custom');
    await userEvent.type(screen.getByLabelText('Prompt'), 'Build the fresh thing.');
    await userEvent.click(screen.getByTestId('scenario-editor-save'));
    expect(refresh).toHaveBeenCalled();
    // Editor closed; picker still open behind it.
    expect(screen.queryByRole('heading', { name: 'New scenario' })).toBeNull();
    screen.getByRole('heading', { name: /Pick a scenario for/i });
  });

  test("stage filter defaults to the stage's own type; other stages are one chip away", async () => {
    renderPicker();
    // Default: only individual_model rows.
    expect(screen.queryByText('Tower of any height')).toBeNull();
    screen.getByText('Your role today');
    // Switch to the other stage's chip.
    await userEvent.click(screen.getByRole('radio', { name: 'Skill-building' }));
    screen.getByText('Tower of any height');
    expect(screen.queryByText('Your role today')).toBeNull();
    // "All" shows every stage's scenarios together.
    await userEvent.click(screen.getByRole('radio', { name: 'All' }));
    screen.getByText('Tower of any height');
    screen.getByText('Your role today');
  });

  test('a scenario from another stage can be picked', async () => {
    const { setStageScenarioAction } = await import('@/app/(authed)/app/sessions/scenario-actions');
    renderPicker();
    await userEvent.click(screen.getByRole('radio', { name: 'Skill-building' }));
    await userEvent.click(screen.getByTestId('scenario-picker-confirm'));
    expect(setStageScenarioAction).toHaveBeenCalledWith('st1', 'template-skill');
  });

  test('picking a scenario calls setStageScenarioAction with the stage and scenario ids', async () => {
    const { setStageScenarioAction } = await import('@/app/(authed)/app/sessions/scenario-actions');
    renderPicker();
    const custom = within(screen.getByRole('region', { name: 'Your scenarios' }));
    await userEvent.click(custom.getByTestId('scenario-picker-confirm'));
    expect(setStageScenarioAction).toHaveBeenCalledWith('st1', 'custom-1');
  });
});
