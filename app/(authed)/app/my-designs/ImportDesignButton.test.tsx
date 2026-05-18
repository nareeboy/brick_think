import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';

import { ImportDesignButton } from './ImportDesignButton';

const importAction = vi.fn();
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
}));
vi.mock('./actions', () => ({
  importDesignAction: (...args: unknown[]) => importAction(...(args as [unknown])),
}));

beforeEach(() => {
  importAction.mockReset();
  push.mockReset();
});

afterEach(() => {
  cleanup();
});

const validEnvelope = {
  format: 'brickthink.design',
  version: 1,
  exportedAt: '2026-05-18T00:00:00.000Z',
  title: 'Imported',
  canvasState: { groups: [], bricks: [] },
};

describe('ImportDesignButton', () => {
  it('renders the trigger button', () => {
    render(<ImportDesignButton />);
    expect(screen.getByRole('button', { name: /^import design$/i })).toBeTruthy();
  });

  it('opens the dialog on click', async () => {
    render(<ImportDesignButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^import design$/i }));
    });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('imports a valid envelope and redirects', async () => {
    importAction.mockResolvedValue({ modelId: 'new-id' });
    render(<ImportDesignButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^import design$/i }));
    });
    const file = new File([JSON.stringify(validEnvelope)], 'x.json', {
      type: 'application/json',
    });
    const input = screen.getByLabelText(/design file/i) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^import$/i }));
    });
    await waitFor(() => expect(importAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/designs/new-id'));
  });

  it('shows the error from importDesignAction', async () => {
    importAction.mockRejectedValue(new Error('Unsupported file version: 99'));
    render(<ImportDesignButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^import design$/i }));
    });
    const file = new File([JSON.stringify({ ...validEnvelope, version: 99 })], 'x.json', {
      type: 'application/json',
    });
    const input = screen.getByLabelText(/design file/i) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^import$/i }));
    });
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/unsupported file version: 99/i),
    );
  });
});
