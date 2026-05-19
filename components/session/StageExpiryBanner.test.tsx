import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StageExpiryBanner, type StageExpiryBannerActions } from './StageExpiryBanner';

// vitest.config.ts sets globals: false, so @testing-library/react's auto-cleanup
// (which checks `typeof afterEach === 'function'`) doesn't fire. Wire it
// manually — same pattern as StageController.test.tsx.
afterEach(() => cleanup());

const STAGE_ID = 'stage-uuid-1';

function mockActions(): StageExpiryBannerActions & {
  extend: ReturnType<typeof vi.fn>;
  advance: ReturnType<typeof vi.fn>;
} {
  return {
    extend: vi.fn().mockResolvedValue({ ok: true }),
    advance: vi.fn().mockResolvedValue({ ok: true }),
  };
}

const messageForCode = (code: string) => `code: ${code}`;

describe('StageExpiryBanner', () => {
  it('renders Time’s up copy with Extend +5m and Advance buttons on non-last stage', () => {
    render(
      <StageExpiryBanner
        stageId={STAGE_ID}
        isLastStage={false}
        actions={mockActions()}
        messageForCode={messageForCode}
      />,
    );
    expect(screen.getByText(/time's up/i)).toBeTruthy();
    expect(screen.getByText(/extend or move on/i)).toBeTruthy();
    expect(screen.getByTestId('expiry-extend-button')).toBeTruthy();
    expect(screen.getByTestId('advance-stage-button')).toBeTruthy();
  });

  it('hides Advance and shows end-session prompt on the last stage', () => {
    render(
      <StageExpiryBanner
        stageId={STAGE_ID}
        isLastStage
        actions={mockActions()}
        messageForCode={messageForCode}
      />,
    );
    expect(screen.queryByTestId('advance-stage-button')).toBeNull();
    expect(screen.getByTestId('expiry-extend-button')).toBeTruthy();
    expect(screen.getByText(/end the session when you/i)).toBeTruthy();
  });

  it('calls extend(stageId, 300) when Extend +5m clicked', async () => {
    const actions = mockActions();
    render(
      <StageExpiryBanner
        stageId={STAGE_ID}
        isLastStage={false}
        actions={actions}
        messageForCode={messageForCode}
      />,
    );
    fireEvent.click(screen.getByTestId('expiry-extend-button'));
    await waitFor(() => expect(actions.extend).toHaveBeenCalledTimes(1));
    expect(actions.extend).toHaveBeenCalledWith(STAGE_ID, 300);
    expect(actions.advance).not.toHaveBeenCalled();
  });

  it('calls advance(stageId) when Advance clicked', async () => {
    const actions = mockActions();
    render(
      <StageExpiryBanner
        stageId={STAGE_ID}
        isLastStage={false}
        actions={actions}
        messageForCode={messageForCode}
      />,
    );
    fireEvent.click(screen.getByTestId('advance-stage-button'));
    await waitFor(() => expect(actions.advance).toHaveBeenCalledTimes(1));
    expect(actions.advance).toHaveBeenCalledWith(STAGE_ID);
    expect(actions.extend).not.toHaveBeenCalled();
  });

  it('surfaces an inline error message when the action returns a known code', async () => {
    const actions: StageExpiryBannerActions = {
      extend: vi.fn().mockResolvedValue({ ok: true }),
      advance: vi.fn().mockResolvedValue({ ok: false, code: 'invalid_transition' }),
    };
    render(
      <StageExpiryBanner
        stageId={STAGE_ID}
        isLastStage={false}
        actions={actions}
        messageForCode={messageForCode}
      />,
    );
    fireEvent.click(screen.getByTestId('advance-stage-button'));
    await waitFor(() => screen.getByRole('alert'));
    expect(screen.getByRole('alert').textContent).toBe('code: invalid_transition');
  });

  it('treats a thrown action as a generic error', async () => {
    const actions: StageExpiryBannerActions = {
      extend: vi.fn().mockResolvedValue({ ok: true }),
      advance: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <StageExpiryBanner
        stageId={STAGE_ID}
        isLastStage={false}
        actions={actions}
        messageForCode={messageForCode}
      />,
    );
    fireEvent.click(screen.getByTestId('advance-stage-button'));
    await waitFor(() => screen.getByRole('alert'));
    expect(screen.getByRole('alert').textContent).toMatch(/unexpected error/i);
    consoleError.mockRestore();
  });
});
