import { afterEach, describe, test, expect, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ScenariosList } from './ScenariosList';
import type { Scenario } from '@/lib/scenarios/types';

// The list imports the server-actions module (delete flow); stub it so the
// component tree renders without a server-action runtime.
vi.mock('./actions', () => ({
  deleteScenarioAction: vi.fn(async () => ({ ok: true, id: 'x' })),
  createScenarioAction: vi.fn(async () => ({ ok: true, id: 'x' })),
  updateScenarioAction: vi.fn(async () => ({ ok: true, id: 'x' })),
}));

afterEach(cleanup);

const fixtures: Scenario[] = [
  {
    id: '1',
    org_id: null,
    stage_type: 'skill_building',
    title: 'Tower of any height',
    body: 'Build a tower.',
    tags: ['warmup'],
    duration_minutes: 5,
    is_template: true,
    created_by: null,
    created_at: '',
  },
  {
    id: '2',
    org_id: null,
    stage_type: 'individual_model',
    title: 'Your role today',
    body: 'Show your role.',
    tags: ['identity'],
    duration_minutes: 20,
    is_template: true,
    created_by: null,
    created_at: '',
  },
  {
    id: '3',
    org_id: null,
    stage_type: 'shared_model',
    title: 'Combine into landscape',
    body: 'Merge.',
    tags: ['merge'],
    duration_minutes: 45,
    is_template: true,
    created_by: null,
    created_at: '',
  },
  {
    id: '4',
    org_id: 'org-1',
    stage_type: 'individual_model',
    title: 'Our quarterly ritual',
    body: 'Model the ritual.',
    tags: ['custom'],
    duration_minutes: 15,
    is_template: false,
    created_by: 'me',
    created_at: '',
  },
];

function renderList(props: Partial<Parameters<typeof ScenariosList>[0]> = {}) {
  return render(
    <ScenariosList
      scenarios={fixtures}
      myProfileId="me"
      orgNames={{ 'org-1': 'Acme Team' }}
      orgs={[{ id: 'org-1', name: 'Acme Team' }]}
      {...props}
    />,
  );
}

describe('ScenariosList', () => {
  test('renders all scenarios initially', () => {
    renderList();
    screen.getByText('Tower of any height');
    screen.getByText('Your role today');
    screen.getByText('Combine into landscape');
    screen.getByText('Our quarterly ritual');
  });

  test('stage filter narrows results', async () => {
    renderList();
    const stageGroup = screen.getByRole('radiogroup', { name: 'Filter by stage' });
    await userEvent.click(within(stageGroup).getByRole('radio', { name: /Individual/i }));
    expect(screen.queryByText('Tower of any height')).toBeNull();
    screen.getByText('Your role today');
    expect(screen.queryByText('Combine into landscape')).toBeNull();
  });

  test('duration filter narrows results', async () => {
    renderList();
    await userEvent.click(screen.getByRole('radio', { name: /≤10 min/i }));
    screen.getByText('Tower of any height');
    expect(screen.queryByText('Your role today')).toBeNull();
  });

  test('scope filter separates library from custom', async () => {
    renderList();
    const scopeGroup = screen.getByRole('radiogroup', { name: 'Filter by source' });
    await userEvent.click(within(scopeGroup).getByRole('radio', { name: 'Custom' }));
    screen.getByText('Our quarterly ritual');
    expect(screen.queryByText('Tower of any height')).toBeNull();

    await userEvent.click(within(scopeGroup).getByRole('radio', { name: 'Library' }));
    screen.getByText('Tower of any height');
    expect(screen.queryByText('Our quarterly ritual')).toBeNull();
  });

  test('custom card shows the workshop chip; templates show the library chip', () => {
    renderList();
    screen.getByText('Acme Team');
    // 3 template-card chips + the library section heading.
    expect(screen.getAllByText('BrickThink library')).toHaveLength(4);
  });

  test('custom scenarios render in a top section above the library', () => {
    const { container } = renderList();
    screen.getByRole('heading', { name: 'Your scenarios' });
    screen.getByRole('heading', { name: 'BrickThink library' });
    const text = container.textContent ?? '';
    expect(text.indexOf('Our quarterly ritual')).toBeGreaterThan(-1);
    expect(text.indexOf('Our quarterly ritual')).toBeLessThan(text.indexOf('Tower of any height'));
  });

  test('with no custom scenarios the top section shows the create hint', () => {
    renderList({ scenarios: fixtures.filter((s) => s.is_template) });
    screen.getByRole('heading', { name: 'Your scenarios' });
    expect(screen.getByTestId('custom-empty-label').textContent).toMatch(/No custom scenarios yet/);
  });

  test('delete opens the confirm dialog', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'Delete scenario' }));
    screen.getByText('Delete scenario?');
  });

  test('search narrows results case-insensitively', async () => {
    renderList();
    await userEvent.type(screen.getByRole('searchbox'), 'TOWER');
    screen.getByText('Tower of any height');
    expect(screen.queryByText('Your role today')).toBeNull();
  });

  test('empty result shows the empty state with a Clear filters button', async () => {
    renderList();
    await userEvent.type(screen.getByRole('searchbox'), 'no-such-scenario');
    screen.getByText(/No scenarios match/i);
    const clear = screen.getByRole('button', { name: /Clear filters/i });
    await userEvent.click(clear);
    screen.getByText('Tower of any height');
  });

  test('clicking a card opens the detail modal', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: /Tower of any height/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    // "Copy text" CTA is unique to the modal — confirms it rendered.
    screen.getByRole('button', { name: /Copy text/i });
  });
});
