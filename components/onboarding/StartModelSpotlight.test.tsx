import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/app/sessions/s1',
  useSearchParams: () => new URLSearchParams('onboarding=start-model'),
}));
// The rect hook needs a live target + rAF; stub it so the dialog renders.
vi.mock('./useSpotlightRect', () => ({
  useSpotlightRect: () => ({
    left: 100,
    top: 100,
    right: 200,
    bottom: 120,
    width: 100,
    height: 20,
  }),
}));

import { StartModelSpotlight } from './StartModelSpotlight';

afterEach(() => {
  cleanup();
  replaceMock.mockClear();
});

describe('StartModelSpotlight', () => {
  it('advances both steps and strips the onboarding param exactly once on finish', () => {
    // finish() must run as an event-handler side effect, not inside the
    // setStepIndex updater (which would call router.replace during render).
    render(<StartModelSpotlight />);

    expect(screen.getByText('Step 1 of 2')).toBeTruthy();
    fireEvent.click(screen.getByTestId('start-model-spotlight-next'));

    expect(screen.getByText('Step 2 of 2')).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();

    // "Got it" on the last step finishes and strips ?onboarding=start-model.
    fireEvent.click(screen.getByTestId('start-model-spotlight-next'));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/app/sessions/s1', { scroll: false });
  });

  it('Skip finishes immediately and strips the param', () => {
    render(<StartModelSpotlight />);
    fireEvent.click(screen.getByTestId('start-model-spotlight-skip'));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/app/sessions/s1', { scroll: false });
  });

  it('finishing via the highlighted button strips the param without router.replace', () => {
    // Clicking "Start your model" fires the button's own server action, which
    // redirects (a router push) to the new design. A router.replace here would
    // race that push — on slow machines the replace resolves last and clobbers
    // the navigation, landing the user back on the session page. The target-
    // click finish must therefore strip the param synchronously via
    // history.replaceState and never issue a competing router navigation.
    const target = document.createElement('button');
    target.setAttribute('data-tour-id', 'start-model-button');
    document.body.appendChild(target);
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    try {
      render(<StartModelSpotlight />);
      fireEvent.click(screen.getByTestId('start-model-spotlight-next'));
      expect(screen.getByText('Step 2 of 2')).toBeTruthy();

      fireEvent.click(target);

      expect(replaceMock).not.toHaveBeenCalled();
      expect(replaceStateSpy).toHaveBeenCalledTimes(1);
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/app/sessions/s1');
      expect(screen.queryByTestId('start-model-spotlight')).toBeNull();
    } finally {
      replaceStateSpy.mockRestore();
      target.remove();
    }
  });
});
