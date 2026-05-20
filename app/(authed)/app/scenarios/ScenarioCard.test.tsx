import { afterEach, describe, test, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ScenarioCard } from './ScenarioCard';
import type { Scenario } from '@/lib/scenarios/types';

afterEach(cleanup);

const baseScenario: Scenario = {
  id: 's1',
  org_id: null,
  stage_type: 'individual_model',
  title: 'Your role today',
  body: 'Build a model of the role you play in this team right now — not the title on the org chart, but what you actually do day to day. ',
  tags: ['identity', 'role'],
  duration_minutes: 15,
  is_template: true,
  created_at: '',
};

describe('ScenarioCard', () => {
  test('renders title, stage label, duration, and tag chips', () => {
    render(<ScenarioCard scenario={baseScenario} onOpen={() => undefined} />);
    // getByText throws on absence — its return value IS the assertion.
    screen.getByText('Your role today');
    screen.getByText('Individual');
    screen.getByText('15 min');
    screen.getByText('identity');
    screen.getByText('role');
  });

  test('shows "+N more" when there are more than 3 tags', () => {
    const s = { ...baseScenario, tags: ['a', 'b', 'c', 'd', 'e'] };
    render(<ScenarioCard scenario={s} onOpen={() => undefined} />);
    screen.getByText('a');
    screen.getByText('b');
    screen.getByText('c');
    expect(screen.queryByText('d')).toBeNull();
    screen.getByText('+2 more');
  });

  test('clicking the card calls onOpen with the scenario', async () => {
    const onOpen = vi.fn();
    render(<ScenarioCard scenario={baseScenario} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: /Your role today/ }));
    expect(onOpen).toHaveBeenCalledWith(baseScenario);
  });

  test('body preview truncates to ≤ 120 chars and appends ellipsis', () => {
    const long = 'a'.repeat(400);
    render(<ScenarioCard scenario={{ ...baseScenario, body: long }} onOpen={() => undefined} />);
    const preview = screen.getByTestId('scenario-card-body');
    expect(preview.textContent?.length).toBeLessThanOrEqual(121);
    expect(preview.textContent?.endsWith('…')).toBe(true);
  });
});
