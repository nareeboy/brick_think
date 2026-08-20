import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor, within } from '@testing-library/react';

import type { OrgSummary } from '@/lib/orgs/types';

const createDesign = vi.fn();
const listOrgSessions = vi.fn();
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
}));
// Server action modules ('use server' + Supabase) — stubbed so the dialog's
// async plumbing is driven by hand-controlled promises.
vi.mock('./actions', () => ({
  createDesignAction: (...args: unknown[]) => createDesign(...(args as [unknown])),
}));
vi.mock('./listSessionsAction', () => ({
  listOrgSessionsAction: (...args: unknown[]) => listOrgSessions(...(args as [unknown])),
}));
vi.mock('@/app/(authed)/app/sessions/actions', () => ({
  createSession: vi.fn(),
}));

import { NewDesignDialog } from './NewDesignDialog';

const org: OrgSummary = {
  id: 'org-1',
  name: 'Test workshop',
  slug: 'test-workshop',
  role: 'owner',
};

/** A promise plus the handles to settle it from the test body. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  createDesign.mockReset();
  listOrgSessions.mockReset();
  push.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('NewDesignDialog pending feedback', () => {
  it('swaps the Personal row arrow for a spinner while the design is created', async () => {
    const created = deferred<string>();
    createDesign.mockReturnValue(created.promise);
    render(<NewDesignDialog orgs={[]} onClose={() => {}} />);

    const personal = screen.getByTestId('destination-personal') as HTMLButtonElement;
    expect(within(personal).queryByTestId('row-spinner')).toBeNull();
    expect(personal.textContent).toContain('→');

    await act(async () => {
      fireEvent.click(personal);
    });

    expect(within(personal).getByTestId('row-spinner')).toBeTruthy();
    expect(personal.textContent).not.toContain('→');
    expect(personal.getAttribute('aria-busy')).toBe('true');
    expect(personal.disabled).toBe(true);

    await act(async () => {
      created.resolve('design-1');
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/designs/design-1'));
    // The spinner deliberately survives the redirect — the route change is the
    // slow part, so the row must keep signalling until the page swaps.
    expect(
      within(screen.getByTestId('destination-personal')).getByTestId('row-spinner'),
    ).toBeTruthy();
  });

  it('locks the organisation rows while Personal is in flight, without spinning them', async () => {
    const created = deferred<string>();
    createDesign.mockReturnValue(created.promise);
    render(<NewDesignDialog orgs={[org]} onClose={() => {}} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('destination-personal'));
    });

    const orgRow = screen.getByTestId(`destination-org-${org.id}`) as HTMLButtonElement;
    expect(orgRow.disabled).toBe(true);
    expect(within(orgRow).queryByTestId('row-spinner')).toBeNull();
    expect(orgRow.textContent).toContain('→');

    await act(async () => {
      created.resolve('design-1');
    });
  });

  it('restores the arrow and shows the error when creation fails', async () => {
    const created = deferred<string>();
    createDesign.mockReturnValue(created.promise);
    render(<NewDesignDialog orgs={[]} onClose={() => {}} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('destination-personal'));
    });
    await act(async () => {
      created.reject(new Error('Nope'));
    });

    const personal = screen.getByTestId('destination-personal') as HTMLButtonElement;
    await waitFor(() => expect(within(personal).queryByTestId('row-spinner')).toBeNull());
    expect(personal.textContent).toContain('→');
    expect(personal.disabled).toBe(false);
    expect(personal.getAttribute('aria-busy')).toBe('false');
    expect(screen.getByTestId('new-design-error').textContent).toContain('Nope');
  });

  it('spins only the session row that was clicked', async () => {
    listOrgSessions.mockResolvedValue([
      { id: 's1', title: 'Session one' },
      { id: 's2', title: 'Session two' },
    ]);
    const created = deferred<string>();
    createDesign.mockReturnValue(created.promise);
    render(<NewDesignDialog orgs={[org]} onClose={() => {}} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId(`destination-org-${org.id}`));
    });
    await waitFor(() => expect(screen.getByTestId('session-option-s1')).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByTestId('session-option-s1'));
    });

    const first = screen.getByTestId('session-option-s1') as HTMLButtonElement;
    const second = screen.getByTestId('session-option-s2') as HTMLButtonElement;
    expect(within(first).getByTestId('row-spinner')).toBeTruthy();
    expect(within(second).queryByTestId('row-spinner')).toBeNull();
    expect(second.disabled).toBe(true);
    expect(second.textContent).toContain('→');

    await act(async () => {
      created.resolve('design-2');
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/designs/design-2'));
  });
});
