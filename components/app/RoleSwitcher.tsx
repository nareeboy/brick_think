'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { useOnboardingState } from '@/components/onboarding/useOnboardingState';
import type { GlobalRole } from '@/lib/account/globalRole';

import { useEffectiveRole } from './useEffectiveRole';

/**
 * The header role pill, now interactive: a chevron opens a two-option menu
 * (Facilitator / Participant) that rewrites the first-run role choice.
 * Switching to Participant sets the sticky tutorial-guest flag (no tutorial
 * modal); switching to Facilitator clears it, so the tutorial resumes on the
 * next hub visit. Colours mirror SessionRoleChip's violet/teal semantics.
 */
export function RoleSwitcher({ serverRole }: { serverRole: GlobalRole }) {
  const effective = useEffectiveRole(serverRole);
  const { chooseRole } = useOnboardingState();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const facilitator = effective === 'facilitator';

  function pick(choice: 'facilitator' | 'guest') {
    chooseRole(choice);
    setOpen(false);
  }

  return (
    <span ref={rootRef} className="relative hidden sm:inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-testid="header-role-chip"
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
          facilitator
            ? 'bg-violet-100 text-violet-900 hover:bg-violet-200'
            : 'bg-teal-100 text-teal-900 hover:bg-teal-200'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${facilitator ? 'bg-violet-600' : 'bg-teal-600'}`}
        />
        {facilitator ? 'Facilitator' : 'Participant'}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Switch role"
          data-testid="role-switch-menu"
          className="absolute right-0 top-full z-40 mt-1.5 w-52 overflow-hidden rounded-xl border border-zinc-900/10 bg-white py-1 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.3)]"
        >
          <MenuItem
            testid="role-switch-facilitator"
            label="Facilitator"
            hint="Run workshops and sessions"
            checked={facilitator}
            onClick={() => pick('facilitator')}
          />
          <MenuItem
            testid="role-switch-participant"
            label="Participant"
            hint="Join someone else's workshop"
            checked={!facilitator}
            onClick={() => pick('guest')}
          />
        </div>
      ) : null}
    </span>
  );
}

function MenuItem({
  testid,
  label,
  hint,
  checked,
  onClick,
}: {
  testid: string;
  label: string;
  hint: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={onClick}
      data-testid={testid}
      className="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-zinc-900/5"
    >
      <span
        aria-hidden="true"
        className={`mt-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
          checked ? 'border-[#a8482a] bg-[#a8482a]' : 'border-zinc-300 bg-white'
        }`}
      >
        {checked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
      <span>
        <span className="block text-[13px] font-medium text-zinc-900">{label}</span>
        <span className="block text-[11px] leading-snug text-zinc-500">{hint}</span>
      </span>
    </button>
  );
}
