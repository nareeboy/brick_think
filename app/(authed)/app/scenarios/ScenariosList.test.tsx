import { afterEach, describe, test, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ScenariosList } from './ScenariosList';
import type { Scenario } from '@/lib/scenarios/types';

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
    created_at: '',
  },
];

describe('ScenariosList', () => {
  test('renders all scenarios initially', () => {
    render(<ScenariosList scenarios={fixtures} />);
    screen.getByText('Tower of any height');
    screen.getByText('Your role today');
    screen.getByText('Combine into landscape');
  });

  test('stage filter narrows results', async () => {
    render(<ScenariosList scenarios={fixtures} />);
    await userEvent.click(screen.getByRole('radio', { name: /Individual/i }));
    expect(screen.queryByText('Tower of any height')).toBeNull();
    screen.getByText('Your role today');
    expect(screen.queryByText('Combine into landscape')).toBeNull();
  });

  test('duration filter narrows results', async () => {
    render(<ScenariosList scenarios={fixtures} />);
    await userEvent.click(screen.getByRole('radio', { name: /≤10 min/i }));
    screen.getByText('Tower of any height');
    expect(screen.queryByText('Your role today')).toBeNull();
  });

  test('search narrows results case-insensitively', async () => {
    render(<ScenariosList scenarios={fixtures} />);
    await userEvent.type(screen.getByRole('searchbox'), 'TOWER');
    screen.getByText('Tower of any height');
    expect(screen.queryByText('Your role today')).toBeNull();
  });

  test('empty result shows the empty state with a Clear filters button', async () => {
    render(<ScenariosList scenarios={fixtures} />);
    await userEvent.type(screen.getByRole('searchbox'), 'no-such-scenario');
    screen.getByText(/No scenarios match/i);
    const clear = screen.getByRole('button', { name: /Clear filters/i });
    await userEvent.click(clear);
    screen.getByText('Tower of any height');
  });

  test('clicking a card opens the detail modal', async () => {
    render(<ScenariosList scenarios={fixtures} />);
    await userEvent.click(screen.getByRole('button', { name: /Tower of any height/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    // "Copy text" CTA is unique to the modal — confirms it rendered.
    screen.getByRole('button', { name: /Copy text/i });
  });
});
