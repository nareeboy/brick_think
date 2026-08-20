import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { COPIED_RESET_MS, CopyConfirmToken } from './CopyConfirmToken';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
}

describe('CopyConfirmToken', () => {
  test('copies the exact phrase and flips to the tick, resetting after 3s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);

    render(<CopyConfirmToken value="test-workshop-a166e401" />);

    const chip = screen.getByRole('button', { name: 'Copy test-workshop-a166e401' });
    chip.click();

    // The clipboard gets the raw value — the label around it is uppercased by
    // CSS, but a pasted uppercase slug would fail the dialog's exact match.
    expect(writeText).toHaveBeenCalledWith('test-workshop-a166e401');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copied test-workshop-a166e401' })).toBeTruthy(),
    );
    expect(screen.getByRole('status').textContent).toContain('Copied');

    vi.advanceTimersByTime(COPIED_RESET_MS);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copy test-workshop-a166e401' })).toBeTruthy(),
    );
    expect(screen.getByRole('status').textContent).toBe('');
  });

  test('stays idle when the clipboard rejects (denied / insecure context)', async () => {
    stubClipboard(vi.fn(async () => Promise.reject(new Error('denied'))));

    render(<CopyConfirmToken value="owner@example.com" tone="danger" />);
    const chip = screen.getByRole('button', { name: 'Copy owner@example.com' });
    chip.click();

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(''));
    expect(screen.getByRole('button', { name: 'Copy owner@example.com' })).toBeTruthy();
  });

  test('no-ops when the clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    render(<CopyConfirmToken value="owner@example.com" />);
    screen.getByRole('button', { name: 'Copy owner@example.com' }).click();

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(''));
  });
});
