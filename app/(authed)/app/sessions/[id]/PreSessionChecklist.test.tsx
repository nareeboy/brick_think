import { afterEach, describe, test, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PreSessionChecklist } from './PreSessionChecklist';
import type { StageType } from '@/lib/sessions/types';

vi.mock('@/app/(authed)/app/sessions/scenario-actions', () => ({
  updateSessionBriefAction: vi.fn(async () => ({ ok: true })),
  updatePreSessionCheckAction: vi.fn(async () => ({ ok: true })),
}));

afterEach(cleanup);

const baseStages: {
  id: string;
  stage_type: StageType;
  scenarioId: string | null;
  title: string | null;
}[] = [
  { id: 'st1', stage_type: 'skill_building', scenarioId: null, title: null },
  { id: 'st2', stage_type: 'individual_model', scenarioId: null, title: null },
  { id: 'st3', stage_type: 'shared_model', scenarioId: null, title: null },
  { id: 'st4', stage_type: 'system_model', scenarioId: null, title: null },
  { id: 'st5', stage_type: 'guiding_principles', scenarioId: null, title: null },
];

const defaultProps = {
  sessionId: 'sess-1',
  sessionStatus: 'draft' as const,
  briefText: '',
  preSessionCheck: {},
  stages: baseStages,
  canManage: true,
  scenariosByStageType: {},
};

describe('PreSessionChecklist', () => {
  test('renders the four items', () => {
    render(<PreSessionChecklist {...defaultProps} />);
    screen.getByText(/Write a brief/i);
    screen.getByText(/Pick a scenario for each stage/i);
    screen.getByText(/Recording consent/i);
    screen.getByText(/Review accessibility/i);
  });

  test('brief item ticks when text length ≥ 40 chars', () => {
    render(<PreSessionChecklist {...defaultProps} briefText={'a'.repeat(40)} />);
    expect(screen.getByTestId('checklist-item-brief').getAttribute('data-status')).toBe('done');
  });

  test('brief item stays open when text < 40 chars', () => {
    render(<PreSessionChecklist {...defaultProps} briefText="short" />);
    expect(screen.getByTestId('checklist-item-brief').getAttribute('data-status')).toBe('open');
  });

  test('scenarios item ticks when every stage has scenario_id', () => {
    const stages = baseStages.map((s) => ({ ...s, scenarioId: 'scen-x' }));
    render(<PreSessionChecklist {...defaultProps} stages={stages} />);
    expect(screen.getByTestId('checklist-item-scenarios').getAttribute('data-status')).toBe(
      'done',
    );
  });

  test('consent item is rendered disabled', () => {
    render(<PreSessionChecklist {...defaultProps} />);
    expect(screen.getByTestId('checklist-item-consent').getAttribute('data-status')).toBe(
      'disabled',
    );
  });

  test('a11y manual toggle ticks when pre_session_check.a11y_reviewed === true', () => {
    render(<PreSessionChecklist {...defaultProps} preSessionCheck={{ a11y_reviewed: true }} />);
    expect(screen.getByTestId('checklist-item-a11y').getAttribute('data-status')).toBe('done');
  });

  test('"Ready to start" pill appears at 3/3 (brief + scenarios + a11y)', () => {
    const stages = baseStages.map((s) => ({ ...s, scenarioId: 'scen-x' }));
    render(
      <PreSessionChecklist
        {...defaultProps}
        briefText={'a'.repeat(40)}
        preSessionCheck={{ a11y_reviewed: true }}
        stages={stages}
      />,
    );
    screen.getByText(/Ready to start/i);
  });

  test('hidden when session status is live', () => {
    render(<PreSessionChecklist {...defaultProps} sessionStatus="live" />);
    expect(screen.queryByTestId('presession-fullbody')).toBeNull();
  });

  test('toggling a11y calls updatePreSessionCheckAction', async () => {
    const { updatePreSessionCheckAction } = await import(
      '@/app/(authed)/app/sessions/scenario-actions'
    );
    render(<PreSessionChecklist {...defaultProps} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Review accessibility/i }));
    expect(updatePreSessionCheckAction).toHaveBeenCalledWith('sess-1', 'a11y_reviewed', true);
  });
});
