import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ModalBackdrop } from './ModalBackdrop';

afterEach(cleanup);

describe('ModalBackdrop', () => {
  // Regression: PageBanner uses `isolation: isolate`, which creates a stacking
  // context. When a modal is rendered inside that subtree, its `fixed z-40`
  // layer is trapped and design cards (later in tree order) paint on top of it.
  // Portaling the dialog to document.body lifts it into the root stacking
  // context so it sits above the page regardless of an isolated ancestor.
  test('portals the dialog to document.body, escaping an isolated ancestor', () => {
    render(
      <div data-testid="host" style={{ isolation: 'isolate' }}>
        <ModalBackdrop onClose={() => {}} ariaLabel="Test dialog" dataTestid="md">
          <p>Body</p>
        </ModalBackdrop>
      </div>,
    );

    const dialog = screen.getByTestId('md');
    const host = screen.getByTestId('host');

    // Must NOT be nested inside the isolated host (that's what traps z-index).
    expect(host.contains(dialog)).toBe(false);
    // Must be attached under document.body (root stacking context).
    expect(document.body.contains(dialog)).toBe(true);
  });

  test('renders the close backdrop and children, and Escape closes', () => {
    const onClose = vi.fn();
    render(
      <ModalBackdrop onClose={onClose} ariaLabel="Test dialog" dataTestid="md">
        <p>Hello modal</p>
      </ModalBackdrop>,
    );

    expect(screen.getByText('Hello modal')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
