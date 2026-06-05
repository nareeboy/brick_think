'use client';

import { useEffect, useState } from 'react';

import { updateFacilitatorNotesAction } from '@/app/(authed)/app/sessions/notes-actions';
import { NotesEditor } from '@/components/session/NotesEditor';

interface Props {
  sessionId: string;
  initialValue: string | null;
  // When true, the card fills its container's height (used in the sticky
  // sidebar) and the editor scrolls internally instead of growing the page.
  fillHeight?: boolean;
}

// Collapsible private-notes card. Lives under the pre-session checklist;
// rendered facilitator-only (the page already gates on canManageSession before
// mounting). Collapsed state is per-session in localStorage so the facilitator
// can keep it folded between visits without us bouncing them into a textarea
// every page load.
export function FacilitatorNotesCard({ sessionId, initialValue, fillHeight }: Props) {
  const storageKey = `bt:facilitator-notes-collapsed:${sessionId}`;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const v = window.localStorage.getItem(storageKey);
    if (v === '1') setCollapsed(true);
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, collapsed ? '1' : '0');
  }, [collapsed, storageKey]);

  return (
    <section
      className={`flex flex-col rounded-lg border border-zinc-200 bg-white p-4 ${
        fillHeight && !collapsed ? 'lg:h-full' : ''
      }`}
    >
      <header className="flex items-start justify-between">
        <div>
          <h3 className="font-serif text-[16px] text-zinc-900">Private notes</h3>
          <p className="text-xs text-zinc-500">Only you can see these.</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((s) => !s)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand notes' : 'Collapse notes'}
          className="inline-flex h-9 w-9 items-center justify-center rounded p-1 text-zinc-400 hover:text-zinc-700"
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </header>
      {!collapsed && (
        <div className={`mt-3 ${fillHeight ? 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col' : ''}`}>
          <NotesEditor
            initialValue={initialValue}
            onSave={(value) => updateFacilitatorNotesAction(sessionId, value)}
            fill={fillHeight}
          />
        </div>
      )}
    </section>
  );
}
