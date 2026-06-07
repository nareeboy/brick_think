import { afterEach, describe, test, expect, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

// usePathname is read at render time; mutate `nav.pathname` to simulate a route change.
const nav = vi.hoisted(() => ({ pathname: '/app/scenarios' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
}));

import { ScrollContainer } from './ScrollContainer';

afterEach(() => {
  cleanup();
  nav.pathname = '/app/scenarios';
});

describe('ScrollContainer', () => {
  test('resets scroll to the top when the pathname changes', () => {
    nav.pathname = '/app/my-designs';
    const { getByTestId, rerender } = render(
      <ScrollContainer>
        <div>page</div>
      </ScrollContainer>,
    );
    const el = getByTestId('authed-scroll');

    // The shared layout scroll container persists across authed routes, so a
    // prior page can leave it scrolled down. Simulate that.
    el.scrollTop = 800;

    // Client-navigate into a new authed route (e.g. Scenarios).
    nav.pathname = '/app/scenarios';
    rerender(
      <ScrollContainer>
        <div>page</div>
      </ScrollContainer>,
    );

    // The banner sits at the top of this container, so entering the route must
    // start at the top — not wherever the previous page was scrolled.
    expect(el.scrollTop).toBe(0);
  });

  test('does not fight a same-route re-render (no pathname change)', () => {
    nav.pathname = '/app/scenarios';
    const { getByTestId, rerender } = render(
      <ScrollContainer>
        <div>page</div>
      </ScrollContainer>,
    );
    const el = getByTestId('authed-scroll');

    // User scrolled down, then something on the same route re-renders (e.g. a
    // query-string filter change — usePathname excludes the query string).
    el.scrollTop = 450;
    rerender(
      <ScrollContainer>
        <div>page changed in place</div>
      </ScrollContainer>,
    );

    expect(el.scrollTop).toBe(450);
  });
});
