import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StageController, type StageActionsBundle } from './StageController';

// No @testing-library/jest-dom in this repo — assert via vanilla DOM API
// (same pattern as BuilderBreadcrumb.test.tsx).
// vitest.config.ts sets globals: false, so @testing-library/react's
// auto-cleanup (which checks `typeof afterEach === 'function'`) doesn't fire.
// We wire it manually here.
afterEach(() => cleanup());

const stage = (overrides: Record<string, unknown> = {}) => ({
  id: 'a',
  session_id: 's',
  stage_type: 'skill_building' as const,
  position: 0,
  title: null,
  description: null,
  duration_seconds: 600,
  started_at: null,
  ended_at: null,
  status: 'pending' as const,
  paused_at: null,
  total_paused_ms: 0,
  extended_seconds: 0,
  ...overrides,
});

// A dummy second stage so the first stage is NOT the last (Advance must appear).
const pendingNextStage = () => stage({ id: 'z', position: 99, status: 'pending' });

const sessionRow = { id: 's', current_stage_id: null, status: 'draft' };

function mockActions() {
  return {
    start: vi.fn().mockResolvedValue({ ok: true }),
    pause: vi.fn().mockResolvedValue({ ok: true }),
    resume: vi.fn().mockResolvedValue({ ok: true }),
    extend: vi.fn().mockResolvedValue({ ok: true }),
    advance: vi.fn().mockResolvedValue({ ok: true }),
    rollback: vi.fn().mockResolvedValue({ ok: true }),
  };
}

describe('StageController', () => {
  it('shows Start button on pending stage', () => {
    render(<StageController stages={[stage()]} session={sessionRow} canManage actions={mockActions()} />);
    // getByRole throws if absent — its return value is the assertion
    screen.getByRole('button', { name: /^start$/i });
  });

  it('shows Pause, Extend, Advance on active stage', () => {
    render(
      <StageController
        stages={[stage({ status: 'active', started_at: new Date().toISOString() }), pendingNextStage()]}
        session={{ ...sessionRow, current_stage_id: 'a' }}
        canManage
        actions={mockActions()}
      />,
    );
    screen.getByRole('button', { name: /^pause$/i });
    screen.getByRole('button', { name: /extend/i });
    screen.getByRole('button', { name: /^advance$/i });
  });

  it('shows Resume, Extend, Advance on paused stage', () => {
    render(
      <StageController
        stages={[stage({ status: 'paused', started_at: new Date().toISOString(), paused_at: new Date().toISOString() }), pendingNextStage()]}
        session={{ ...sessionRow, current_stage_id: 'a' }}
        canManage
        actions={mockActions()}
      />,
    );
    screen.getByRole('button', { name: /^resume$/i });
    screen.getByRole('button', { name: /extend/i });
    screen.getByRole('button', { name: /^advance$/i });
  });

  it('shows Rollback only on the most-recently-completed stage', () => {
    const stages = [
      stage({ id: 'a', status: 'completed' }),
      stage({ id: 'b', position: 1, status: 'completed' }),
      stage({ id: 'c', position: 2, status: 'active', started_at: new Date().toISOString() }),
    ];
    render(<StageController stages={stages} session={{ ...sessionRow, current_stage_id: 'c' }} canManage actions={mockActions()} />);
    const rollbackButtons = screen.getAllByRole('button', { name: /^rollback/i });
    expect(rollbackButtons).toHaveLength(1);
  });

  it('hides all verb buttons when canManage is false', () => {
    render(
      <StageController
        stages={[stage({ status: 'active', started_at: new Date().toISOString() })]}
        session={{ ...sessionRow, current_stage_id: 'a' }}
        canManage={false}
        actions={mockActions()}
      />,
    );
    expect(screen.queryAllByRole('button', { name: /pause|resume|advance|start|rollback/i })).toHaveLength(0);
  });

  it('calls advance when Advance clicked', async () => {
    const actions = mockActions();
    render(
      <StageController
        stages={[stage({ status: 'active', started_at: new Date().toISOString() }), pendingNextStage()]}
        session={{ ...sessionRow, current_stage_id: 'a' }}
        canManage
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^advance$/i }));
    await waitFor(() => expect(actions.advance).toHaveBeenCalledWith('a'));
  });

  it('calls extend with 300 seconds (default +5m)', async () => {
    const actions = mockActions();
    render(
      <StageController
        stages={[stage({ status: 'active', started_at: new Date().toISOString() })]}
        session={{ ...sessionRow, current_stage_id: 'a' }}
        canManage
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /extend/i }));
    await waitFor(() => expect(actions.extend).toHaveBeenCalledWith('a', 300));
  });

  it('hides Advance button on the last stage', () => {
    const stages = [
      stage({ id: 'a', status: 'completed' }),
      stage({ id: 'b', position: 1, status: 'active', started_at: new Date().toISOString() }),
    ];
    render(<StageController stages={stages} session={{ ...sessionRow, current_stage_id: 'b' }} canManage actions={mockActions()} />);
    expect(screen.queryByRole('button', { name: /^advance$/i })).toBeNull();
  });

  it('shows an error message when the action fails', async () => {
    const actions = {
      ...mockActions(),
      advance: vi.fn().mockResolvedValue({ ok: false, code: 'invalid_transition' }),
    };
    render(
      <StageController
        stages={[stage({ status: 'active', started_at: new Date().toISOString() }), pendingNextStage()]}
        session={{ ...sessionRow, current_stage_id: 'a' }}
        canManage
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^advance$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('Stage state changed');
  });

  it('disables button while action is pending', async () => {
    let resolveAdvance: ((v: { ok: boolean }) => void) | null = null;
    const actions: StageActionsBundle = {
      ...mockActions(),
      advance: (_id: string) =>
        new Promise<{ ok: boolean }>((res) => {
          resolveAdvance = res;
        }),
    };
    render(
      <StageController
        stages={[stage({ status: 'active', started_at: new Date().toISOString() }), pendingNextStage()]}
        session={{ ...sessionRow, current_stage_id: 'a' }}
        canManage
        actions={actions}
      />,
    );
    const button = screen.getByRole('button', { name: /^advance$/i });
    fireEvent.click(button);
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(true));
    if (resolveAdvance !== null) (resolveAdvance as (v: { ok: boolean }) => void)({ ok: true });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  });
});
