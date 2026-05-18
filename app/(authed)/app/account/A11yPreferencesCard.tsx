'use client';

import { useState, useTransition } from 'react';

import { updateA11yPreferencesAction } from './actions';

interface Props {
  initialColourblindMode: boolean;
}

export function A11yPreferencesCard({ initialColourblindMode }: Props) {
  const [colourblindMode, setColourblindMode] = useState(initialColourblindMode);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onToggle(next: boolean) {
    setColourblindMode(next);
    setError(null);
    const fd = new FormData();
    if (next) fd.set('colourblindMode', 'on');
    startTransition(async () => {
      const res = await updateA11yPreferencesAction(fd);
      if (!res.ok) {
        setError(res.error);
        // Roll back optimistic state so the checkbox reflects truth.
        setColourblindMode(!next);
      }
    });
  }

  return (
    <section
      data-testid="a11y-preferences"
      className="rounded-2xl border border-zinc-900/10 bg-white p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Accessibility
      </p>
      <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-950">
        Pattern overlays on bricks
      </h2>
      <p className="mt-1 text-[13px] text-zinc-600">
        Show distinct visual patterns on top of each brick (diagonal stripes, dots,
        cross-hatch, and so on) so bricks are distinguishable by pattern as well as
        colour. Useful for participants with colour vision differences.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-zinc-800">
          <input
            type="checkbox"
            name="colourblindMode"
            checked={colourblindMode}
            disabled={pending}
            onChange={(e) => onToggle(e.target.checked)}
            data-testid="colourblind-mode-toggle"
            className="h-4 w-4 cursor-pointer rounded border-zinc-300"
          />
          <span>Show pattern overlays</span>
        </label>
        {pending ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Saving…
          </span>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[12px] text-red-600">
          {error}
        </p>
      ) : null}
    </section>
  );
}
