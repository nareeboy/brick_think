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
  created_by: null,
  created_at: '',
};

const noop = () => undefined;

function renderCard(overrides: Partial<Parameters<typeof ScenarioCard>[0]> = {}) {
  return render(
    <ScenarioCard
      scenario={baseScenario}
      orgName={null}
      canManage={false}
      onOpen={noop}
      onEdit={noop}
      onDelete={noop}
      {...overrides}
    />,
  );
}

describe('ScenarioCard', () => {
  test('renders title, stage label, duration, and tag chips', () => {
    renderCard();
    // getByText throws on absence — its return value IS the assertion.
    screen.getByText('Your role today');
    screen.getByText('Individual');
    screen.getByText('15 min');
    screen.getByText('identity');
    screen.getByText('role');
  });

  test('template cards carry the BrickThink library chip', () => {
    renderCard();
    screen.getByText('BrickThink library');
  });

  test('custom cards carry the workshop-name chip instead of the library chip', () => {
    const custom = {
      ...baseScenario,
      org_id: 'org-1',
      is_template: false,
      created_by: 'user-1',
    };
    renderCard({ scenario: custom, orgName: 'Acme Team' });
    screen.getByText('Acme Team');
    expect(screen.queryByText('BrickThink library')).toBeNull();
  });

  test('personal custom cards carry the Personal chip', () => {
    const personal = {
      ...baseScenario,
      org_id: null,
      is_template: false,
      created_by: 'user-1',
    };
    renderCard({ scenario: personal, orgName: null });
    screen.getByText('Personal');
    expect(screen.queryByText('BrickThink library')).toBeNull();
  });

  test('edit/delete actions render only when canManage', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const custom = {
      ...baseScenario,
      org_id: 'org-1',
      is_template: false,
      created_by: 'user-1',
    };
    renderCard({ scenario: custom, orgName: 'Acme Team', canManage: true, onEdit, onDelete });
    await userEvent.click(screen.getByRole('button', { name: 'Edit scenario' }));
    expect(onEdit).toHaveBeenCalledWith(custom);
    await userEvent.click(screen.getByRole('button', { name: 'Delete scenario' }));
    expect(onDelete).toHaveBeenCalledWith(custom);
  });

  test('no edit/delete actions when canManage is false', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: 'Edit scenario' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete scenario' })).toBeNull();
  });

  test('shows "+N more" when there are more than 3 tags', () => {
    const s = { ...baseScenario, tags: ['a', 'b', 'c', 'd', 'e'] };
    renderCard({ scenario: s });
    screen.getByText('a');
    screen.getByText('b');
    screen.getByText('c');
    expect(screen.queryByText('d')).toBeNull();
    screen.getByText('+2 more');
  });

  test('clicking the card calls onOpen with the scenario', async () => {
    const onOpen = vi.fn();
    renderCard({ onOpen });
    await userEvent.click(screen.getByRole('button', { name: /Your role today/ }));
    expect(onOpen).toHaveBeenCalledWith(baseScenario);
  });

  test('body preview truncates to ≤ 120 chars and appends ellipsis', () => {
    const long = 'a'.repeat(400);
    renderCard({ scenario: { ...baseScenario, body: long } });
    const preview = screen.getByTestId('scenario-card-body');
    expect(preview.textContent?.length).toBeLessThanOrEqual(121);
    expect(preview.textContent?.endsWith('…')).toBe(true);
  });
});
