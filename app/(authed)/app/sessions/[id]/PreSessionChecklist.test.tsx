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
  test('renders all four visible items (including recording consent)', () => {
    render(<PreSessionChecklist {...defaultProps} />);
    screen.getByText(/Write a brief/i);
    screen.getByText(/Pick a scenario for each stage/i);
    screen.getByText(/Accessibility for the pieces/i);
    screen.getByText(/Confirm recording consent/i);
  });

  test('recording-consent item ticks when pre_session_check.recording_consent === true', () => {
    render(<PreSessionChecklist {...defaultProps} preSessionCheck={{ recording_consent: true }} />);
    expect(screen.getByTestId('checklist-item-recording').getAttribute('data-status')).toBe('done');
  });

  test('recording consent is NOT part of the "Ready to start" gate', () => {
    const stages = baseStages.map((s) => ({ ...s, scenarioId: 'scen-x' }));
    render(<PreSessionChecklist {...defaultProps} briefText={'a'.repeat(40)} stages={stages} />);
    // Consent left unchecked, yet the pill still appears at 2/2 (brief + scenarios).
    screen.getByText(/Ready to start/i);
    expect(screen.getByTestId('checklist-item-recording').getAttribute('data-status')).toBe('open');
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
    expect(screen.getByTestId('checklist-item-scenarios').getAttribute('data-status')).toBe('done');
  });

  test('accessibility switch shows "on" when pre_session_check.colourblind_mode === true', () => {
    render(<PreSessionChecklist {...defaultProps} preSessionCheck={{ colourblind_mode: true }} />);
    expect(screen.getByTestId('checklist-item-a11y').getAttribute('data-status')).toBe('done');
    expect(
      screen
        .getByRole('switch', { name: /Accessibility for the pieces/i })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });

  test('"Ready to start" pill appears at 2/2 (brief + scenarios), without the a11y switch', () => {
    const stages = baseStages.map((s) => ({ ...s, scenarioId: 'scen-x' }));
    render(<PreSessionChecklist {...defaultProps} briefText={'a'.repeat(40)} stages={stages} />);
    // Accessibility switch left off, yet the session is already ready.
    screen.getByText(/Ready to start/i);
    expect(screen.getByTestId('checklist-item-a11y').getAttribute('data-status')).toBe('open');
  });

  test('accessibility switch is NOT part of the "Ready to start" gate', () => {
    // Only the a11y switch is on; brief + scenarios are incomplete → not ready.
    render(<PreSessionChecklist {...defaultProps} preSessionCheck={{ colourblind_mode: true }} />);
    expect(screen.queryByText(/Ready to start/i)).toBeNull();
  });

  test('hidden when session status is live', () => {
    render(<PreSessionChecklist {...defaultProps} sessionStatus="live" />);
    expect(screen.queryByTestId('presession-fullbody')).toBeNull();
  });

  test('toggling the accessibility switch calls updatePreSessionCheckAction', async () => {
    const { updatePreSessionCheckAction } =
      await import('@/app/(authed)/app/sessions/scenario-actions');
    render(<PreSessionChecklist {...defaultProps} />);
    await userEvent.click(screen.getByRole('switch', { name: /Accessibility for the pieces/i }));
    expect(updatePreSessionCheckAction).toHaveBeenCalledWith('sess-1', 'colourblind_mode', true);
  });
});
