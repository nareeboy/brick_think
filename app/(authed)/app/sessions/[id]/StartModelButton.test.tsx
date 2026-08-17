import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../actions', () => ({
  createModelInStage: vi.fn(),
}));

import { StartModelButton } from './StartModelButton';

afterEach(() => {
  cleanup();
});

describe('StartModelButton', () => {
  it('disables "Start your model" for participants while the stage is pending', () => {
    render(
      <StartModelButton
        sessionId="s1"
        stageId="st1"
        stageType="individual_model"
        stageStatus="pending"
      />,
    );
    const button = screen.getByRole('button', { name: 'Start your model' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('title')).toBe('Waiting for the facilitator to start this stage');
  });

  it('enables "Start your model" for participants once the stage is active', () => {
    render(
      <StartModelButton
        sessionId="s1"
        stageId="st1"
        stageType="individual_model"
        stageStatus="active"
      />,
    );
    const button = screen.getByRole('button', { name: 'Start your model' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('never locks the facilitator "Create Example Model" button, even on a pending stage', () => {
    render(
      <StartModelButton
        sessionId="s1"
        stageId="st1"
        stageType="individual_model"
        stageStatus="pending"
        canManage
      />,
    );
    const button = screen.getByRole('button', {
      name: 'Create Example Model',
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
