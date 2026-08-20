import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';

import { ExampleWorkshopButton } from './ExampleWorkshopButton';

const createAction = vi.fn();

vi.mock('./example-workshop-actions', () => ({
  createExampleWorkshopAction: () => createAction(),
}));

beforeEach(() => {
  createAction.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ExampleWorkshopButton', () => {
  it('invites the user to see an example when they have none', () => {
    render(<ExampleWorkshopButton hasExample={false} />);
    expect(screen.getByRole('button', { name: /see an example workshop/i })).toBeTruthy();
  });

  it('offers to reopen the example the user already has', () => {
    render(<ExampleWorkshopButton hasExample />);
    expect(screen.getByRole('button', { name: /open example workshop/i })).toBeTruthy();
  });

  it('disables itself and explains the wait while seeding', async () => {
    let release: (value: unknown) => void = () => {};
    createAction.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    render(<ExampleWorkshopButton hasExample={false} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toMatch(/building/i);

    await act(async () => {
      release({ ok: false, code: 'seed_failed' });
    });
  });

  it('surfaces failure copy when seeding fails', async () => {
    createAction.mockResolvedValue({ ok: false, code: 'seed_failed' });
    render(<ExampleWorkshopButton hasExample={false} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/build the example/i);
    });
  });
});
