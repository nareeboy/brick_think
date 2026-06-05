'use client';

import { useEffect, useRef, useState } from 'react';

import { FACILITATOR_NOTES_MAX } from '@/lib/sessions/facilitatorNotesConstants';

interface Props {
  initialValue: string | null;
  onSave: (value: string | null) => Promise<{ ok: boolean }>;
  disabled?: boolean;
  ariaLabel?: string;
  // When true, the editor fills its parent's height and the textarea scrolls
  // internally rather than growing the page (sticky sidebar layout).
  fill?: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Debounced autosave editor for facilitator notes. The save state surface is
// deliberately tiny — a counter + a single status line — so it can live inside
// both the session-page collapsible card and the right-edge canvas drawer
// without competing with the surrounding chrome.
export function NotesEditor({ initialValue, onSave, disabled, ariaLabel, fill }: Props) {
  const [value, setValue] = useState(initialValue ?? '');
  const [savedAt, setSavedAt] = useState<number | null>(initialValue ? Date.now() : null);
  const [state, setState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(initialValue ?? '');

  useEffect(() => {
    if (value === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    setState('saving');
    timer.current = setTimeout(async () => {
      const payload = value === '' ? null : value;
      const result = await onSave(payload);
      if (result.ok) {
        lastSaved.current = value;
        setSavedAt(Date.now());
        setState('saved');
      } else {
        setState('error');
      }
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, onSave]);

  return (
    <div className={fill ? 'flex h-full min-h-0 flex-col gap-1.5' : 'space-y-1.5'}>
      <textarea
        aria-label={ariaLabel ?? 'Facilitator notes'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={FACILITATOR_NOTES_MAX}
        disabled={disabled}
        rows={fill ? undefined : 12}
        className={`w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-sans focus:border-zinc-400 focus:outline-none ${
          fill ? 'min-h-[14rem] flex-1 resize-none lg:min-h-0' : 'resize-y'
        }`}
      />
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {value.length} / {FACILITATOR_NOTES_MAX}
        </span>
        <span aria-live="polite">{stateLabel(state, savedAt)}</span>
      </div>
    </div>
  );
}

function stateLabel(state: SaveState, savedAt: number | null): string {
  if (state === 'saving') return 'Saving…';
  if (state === 'error') return 'Couldn’t save — try again';
  if (state === 'saved' && savedAt) return `Saved ${relative(savedAt)}`;
  return '';
}

function relative(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}
