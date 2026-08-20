import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';

import type { AggregateDesignRow } from '@/lib/my-designs/types';
import type { OrgSummary } from '@/lib/orgs/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// Server action module ('use server' + Supabase) — never invoked by these tests.
vi.mock('@/app/(authed)/app/designs/actions', () => ({
  deleteModelAction: vi.fn(),
}));
// The export menu renders Konva-backed download plumbing that is irrelevant to
// how the grid groups its cards.
vi.mock('@/components/exports/ExportMenu', () => ({
  ExportMenu: () => <div data-testid="export-menu-stub" />,
}));
// Both card dialogs talk to server actions on mount. Stub them: these tests are
// about the card wiring — which action opens which dialog, and where focus
// lands when it closes — not about what the dialogs do once open.
vi.mock('./TagEditor', () => ({
  TagEditor: ({ onClose, onSaved }: { onClose: () => void; onSaved: (next: string[]) => void }) => (
    <div data-testid="tag-editor-stub">
      <button type="button" onClick={() => onSaved(['renamed'])}>
        stub save tags
      </button>
      <button type="button" onClick={onClose}>
        stub close tags
      </button>
    </div>
  ),
}));
vi.mock('./SendToSessionDialog', () => ({
  SendToSessionDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="send-dialog-stub">
      <button type="button" onClick={onClose}>
        stub close send
      </button>
    </div>
  ),
}));

import { deleteModelAction } from '@/app/(authed)/app/designs/actions';

import { DesignList } from './DesignList';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.mocked(deleteModelAction).mockClear();
});

function personal(id: string, title = id): AggregateDesignRow {
  return {
    id,
    title,
    updated_at: '2026-08-20T10:00:00.000Z',
    thumbnail_url: null,
    badge: { kind: 'personal' },
    tags: [],
  };
}

function workshop(id: string, title = id): AggregateDesignRow {
  return {
    id,
    title,
    updated_at: '2026-08-20T10:00:00.000Z',
    thumbnail_url: null,
    badge: {
      kind: 'org-session',
      orgId: 'org-1',
      orgName: 'Acme Workshop',
      sessionId: 'session-1',
      sessionTitle: 'Kickoff session',
    },
    tags: [],
  };
}

function renderList(designs: AggregateDesignRow[], orgs: OrgSummary[] = []) {
  return render(<DesignList designs={designs} orgs={orgs} allTags={['ideas']} />);
}

const ACME: OrgSummary = { id: 'org-1', name: 'Acme Workshop', slug: 'acme', role: 'owner' };

async function flushMicrotasks() {
  await act(async () => {});
}

describe('DesignList grouping', () => {
  it('renders the empty state when there is nothing to group', () => {
    renderList([]);
    expect(screen.getByTestId('my-designs-empty')).toBeTruthy();
    expect(screen.queryByTestId('design-group-personal')).toBeNull();
    expect(screen.queryByTestId('design-group-workshop')).toBeNull();
  });

  it('splits a mixed page into a personal section and a workshop section', () => {
    renderList([workshop('w1'), personal('p1'), workshop('w2')]);

    const personalSection = screen.getByTestId('design-group-personal');
    const workshopSection = screen.getByTestId('design-group-workshop');

    expect(within(personalSection).getByTestId('design-card-p1')).toBeTruthy();
    expect(within(personalSection).queryByTestId('design-card-w1')).toBeNull();
    expect(within(workshopSection).getByTestId('design-card-w1')).toBeTruthy();
    expect(within(workshopSection).getByTestId('design-card-w2')).toBeTruthy();
    expect(within(workshopSection).queryByTestId('design-card-p1')).toBeNull();
  });

  it('orders personal before workshops in the DOM', () => {
    renderList([workshop('w1'), personal('p1')]);
    const sections = screen
      .getByTestId('my-designs-list')
      .querySelectorAll('section[data-testid^="design-group-"]');
    expect(Array.from(sections).map((s) => s.getAttribute('data-testid'))).toEqual([
      'design-group-personal',
      'design-group-workshop',
    ]);
  });

  it('labels each section with a heading and a count', () => {
    renderList([workshop('w1'), workshop('w2'), personal('p1')]);

    expect(screen.getByRole('heading', { name: /personal designs/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /from workshops/i })).toBeTruthy();
    expect(screen.getByTestId('design-group-personal-count').textContent).toBe('1');
    expect(screen.getByTestId('design-group-workshop-count').textContent).toBe('2');
  });

  it('spells out that workshop designs go only when their workshop does', () => {
    renderList([workshop('w1'), personal('p1')]);

    const note = screen.getByTestId('design-group-workshop-note');
    expect(note.textContent).toMatch(/only be deleted when their workshop or session is deleted/i);
    expect(screen.queryByTestId('design-group-personal-note')).toBeNull();
  });

  it('renders only the section that has designs', () => {
    renderList([personal('p1')]);
    expect(screen.getByTestId('design-group-personal')).toBeTruthy();
    expect(screen.queryByTestId('design-group-workshop')).toBeNull();

    cleanup();

    renderList([workshop('w1')]);
    expect(screen.getByTestId('design-group-workshop')).toBeTruthy();
    expect(screen.queryByTestId('design-group-personal')).toBeNull();
  });

  it('keeps the workshop chip on cards but drops the now-redundant personal chip', () => {
    renderList([workshop('w1'), personal('p1')]);

    const badges = screen.getAllByTestId('design-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]?.textContent).toContain('Acme Workshop');
    expect(badges[0]?.textContent).toContain('Kickoff session');
  });

  it('offers delete on personal cards only', () => {
    renderList([workshop('w1', 'Wall model'), personal('p1', 'Sketch')]);

    expect(screen.getByRole('button', { name: 'Delete Sketch' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete Wall model' })).toBeNull();
  });
});

describe('DesignCard actions', () => {
  it('opens the tag editor, applies the saved tags, and returns focus to its button', async () => {
    renderList([personal('p1', 'Sketch')]);
    const tagButton = screen.getByRole('button', { name: 'Edit tags for Sketch' });

    act(() => tagButton.click());
    expect(screen.getByTestId('tag-editor-stub')).toBeTruthy();

    // onSaved overrides the card's tags without a server round-trip.
    act(() => screen.getByRole('button', { name: 'stub save tags' }).click());
    expect(screen.getByTestId('card-tags-p1').textContent).toContain('#renamed');

    act(() => screen.getByRole('button', { name: 'stub close tags' }).click());
    await flushMicrotasks();
    expect(screen.queryByTestId('tag-editor-stub')).toBeNull();
    // Focus restoration is queueMicrotask'd so it lands after the dialog unmounts.
    expect(document.activeElement).toBe(tagButton);
  });

  it('offers send-to-session only when the user belongs to a workshop', () => {
    const { unmount } = renderList([personal('p1', 'Sketch')]);
    expect(screen.queryByRole('button', { name: 'Send Sketch to a session' })).toBeNull();
    unmount();

    renderList([personal('p1', 'Sketch')], [ACME]);
    act(() => screen.getByRole('button', { name: 'Send Sketch to a session' }).click());
    expect(screen.getByTestId('send-dialog-stub')).toBeTruthy();

    act(() => screen.getByRole('button', { name: 'stub close send' }).click());
    expect(screen.queryByTestId('send-dialog-stub')).toBeNull();
  });

  it('confirms before deleting, and Cancel restores focus to the trash button', async () => {
    renderList([personal('p1', 'Sketch')]);
    const trash = screen.getByRole('button', { name: 'Delete Sketch' });

    act(() => trash.click());
    expect(screen.getByText('Delete this design?')).toBeTruthy();

    act(() => screen.getByRole('button', { name: 'Cancel' }).click());
    await flushMicrotasks();
    expect(screen.queryByText('Delete this design?')).toBeNull();
    expect(document.activeElement).toBe(trash);
    expect(deleteModelAction).not.toHaveBeenCalled();
  });

  it('soft-deletes the design when the confirm dialog is accepted', async () => {
    renderList([personal('p1', 'Sketch')]);

    act(() => screen.getByRole('button', { name: 'Delete Sketch' }).click());
    await act(async () => {
      screen.getByRole('button', { name: 'Delete' }).click();
    });

    expect(deleteModelAction).toHaveBeenCalledWith('p1');
    expect(screen.queryByText('Delete this design?')).toBeNull();
  });
});
