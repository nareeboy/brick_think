import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./actions', () => ({
  updateA11yPreferencesAction: vi.fn().mockResolvedValue({ ok: true }),
}));

import { updateA11yPreferencesAction } from './actions';
import { A11yPreferencesCard } from './A11yPreferencesCard';

const mockAction = updateA11yPreferencesAction as unknown as ReturnType<typeof vi.fn>;

afterEach(() => cleanup());

describe('<A11yPreferencesCard>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAction.mockResolvedValue({ ok: true });
  });

  it('renders with initialColourblindMode=false → checkbox unchecked', () => {
    render(<A11yPreferencesCard initialColourblindMode={false} />);
    const checkbox = screen.getByTestId('colourblind-mode-toggle') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('renders with initialColourblindMode=true → checkbox checked', () => {
    render(<A11yPreferencesCard initialColourblindMode={true} />);
    const checkbox = screen.getByTestId('colourblind-mode-toggle') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('toggling the checkbox to checked fires the action with colourblindMode=on', async () => {
    render(<A11yPreferencesCard initialColourblindMode={false} />);
    const checkbox = screen.getByTestId('colourblind-mode-toggle');
    await userEvent.click(checkbox);

    expect(mockAction).toHaveBeenCalledOnce();
    const calledFd = mockAction.mock.calls[0]?.[0] as FormData;
    expect(calledFd.get('colourblindMode')).toBe('on');
  });

  it('toggling the checkbox to unchecked fires the action without colourblindMode key', async () => {
    render(<A11yPreferencesCard initialColourblindMode={true} />);
    const checkbox = screen.getByTestId('colourblind-mode-toggle');
    await userEvent.click(checkbox);

    expect(mockAction).toHaveBeenCalledOnce();
    const calledFd = mockAction.mock.calls[0]?.[0] as FormData;
    expect(calledFd.get('colourblindMode')).toBeNull();
  });

  it('rolls back checkbox state and shows error when action returns { ok: false }', async () => {
    mockAction.mockResolvedValue({ ok: false, error: 'Save failed' });

    render(<A11yPreferencesCard initialColourblindMode={false} />);
    const checkbox = screen.getByTestId('colourblind-mode-toggle') as HTMLInputElement;
    await userEvent.click(checkbox);

    // After rollback the checkbox reverts to unchecked
    expect(checkbox.checked).toBe(false);
    // Error message surfaces in an alert
    expect(screen.getByRole('alert').textContent).toBe('Save failed');
  });
});
