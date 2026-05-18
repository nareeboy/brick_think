import { render, cleanup, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useFocusTrap } from './useFocusTrap';

// ---------------------------------------------------------------------------
// Fixture components
// ---------------------------------------------------------------------------

interface FixtureProps {
  active: boolean;
}

function Fixture({ active }: FixtureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, active);

  return (
    <div ref={containerRef} data-testid="container">
      <button data-testid="btn-a">A</button>
      <input data-testid="inp-b" type="text" />
      <button data-testid="btn-c">C</button>
    </div>
  );
}

function EmptyFixture({ active }: FixtureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, active);
  return <div ref={containerRef} data-testid="container" />;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * happy-dom's `offsetParent` is always null for elements not in a real layout
 * engine. The hook's visibility filter (`offsetParent !== null`) would therefore
 * treat every element as invisible and getTabbables() would always return [].
 *
 * Work around: make `offsetParent` non-null by stubbing it on the prototype
 * so that rendered elements pass the filter.
 */
function stubOffsetParent() {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return this.parentElement ?? null;
    },
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  stubOffsetParent();
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFocusTrap', () => {
  it('is inert when active === false — Tab does not get preventDefault', () => {
    const { getByTestId } = render(<Fixture active={false} />);
    const container = getByTestId('container');
    const btnA = getByTestId('btn-a');
    btnA.focus();

    const prevented = vi.fn();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: prevented });

    container.dispatchEvent(event);

    expect(prevented).not.toHaveBeenCalled();
  });

  it('cycles forward: Tab on the last tabbable wraps to the first', () => {
    const { getByTestId } = render(<Fixture active={true} />);
    const container = getByTestId('container');
    const btnA = getByTestId('btn-a');
    const btnC = getByTestId('btn-c') as HTMLButtonElement;

    // Focus the last tabbable
    btnC.focus();
    expect(document.activeElement).toBe(btnC);

    fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });

    expect(document.activeElement).toBe(btnA);
  });

  it('cycles backward: Shift+Tab on the first tabbable wraps to the last', () => {
    const { getByTestId } = render(<Fixture active={true} />);
    const container = getByTestId('container');
    const btnA = getByTestId('btn-a') as HTMLButtonElement;
    const btnC = getByTestId('btn-c');

    // Focus the first tabbable
    btnA.focus();
    expect(document.activeElement).toBe(btnA);

    fireEvent.keyDown(container, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(btnC);
  });

  it('does not intercept Tab when focus is mid-list', () => {
    const { getByTestId } = render(<Fixture active={true} />);
    const container = getByTestId('container');
    const inp = getByTestId('inp-b') as HTMLInputElement;
    inp.focus();

    const prevented = vi.fn();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: prevented });

    container.dispatchEvent(event);

    // Not at the boundary — should not prevent default
    expect(prevented).not.toHaveBeenCalled();
  });

  it('prevents default and does not move focus when there are no tabbables', () => {
    const { getByTestId } = render(<EmptyFixture active={true} />);
    const container = getByTestId('container');

    const prevented = vi.fn();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: prevented });

    container.dispatchEvent(event);

    expect(prevented).toHaveBeenCalledOnce();
  });

  it('removes the listener when active flips from true to false', () => {
    const { getByTestId, rerender } = render(<Fixture active={true} />);
    const container = getByTestId('container');
    const btnA = getByTestId('btn-a');
    const btnC = getByTestId('btn-c') as HTMLButtonElement;

    // Confirm the trap is active: Tab on last wraps to first
    btnC.focus();
    fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(btnA);

    // Deactivate the trap
    rerender(<Fixture active={false} />);

    // Tab on last should NOT wrap — no preventDefault
    btnC.focus();
    const prevented = vi.fn();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: prevented });
    container.dispatchEvent(event);

    expect(prevented).not.toHaveBeenCalled();
    // Focus stays on btnC — no wrap happened
    expect(document.activeElement).toBe(btnC);
  });
});
