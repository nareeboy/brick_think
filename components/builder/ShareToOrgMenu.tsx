'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { setModelOrgVisibilityAction } from '@/app/(authed)/app/designs/actions';
import type { OrgSummary } from '@/lib/orgs/types';

interface Props {
  modelId: string;
  orgs: OrgSummary[];
  currentOrgId: string | null;
}

export function ShareToOrgMenu({ modelId, orgs, currentOrgId }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? null;
  const label = currentOrg ? `Shared with ${currentOrg.name}` : 'Share';

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      window.addEventListener('mousedown', onClick);
      window.addEventListener('keydown', onKey);
      firstItemRef.current?.focus();
    }
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(orgId: string | null) {
    if (orgId === currentOrgId) {
      setOpen(false);
      return;
    }
    start(async () => {
      await setModelOrgVisibilityAction(modelId, orgId);
      setOpen(false);
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={pending}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-900/10 px-3 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
      >
        {label}
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Share visibility"
          className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
        >
          <ShareItem
            label="Personal (unshared)"
            sub="Only you can see it"
            active={currentOrgId === null}
            onSelect={() => pick(null)}
            buttonRef={firstItemRef}
          />
          {orgs.length === 0 ? (
            <p className="px-4 py-3 text-[12px] text-zinc-500">
              You have no organisations yet.
            </p>
          ) : (
            orgs.map((o) => (
              <ShareItem
                key={o.id}
                label={o.name}
                sub={`${o.slug} · members get read-only access`}
                active={o.id === currentOrgId}
                onSelect={() => pick(o.id)}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function ShareItem({
  label,
  sub,
  active,
  onSelect,
  buttonRef,
}: {
  label: string;
  sub: string;
  active: boolean;
  onSelect: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={`flex w-full cursor-pointer flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-[#FAF7F1] ${
        active ? 'bg-[#FAF7F1]' : ''
      }`}
    >
      <span className="text-[13px] font-semibold text-zinc-900">{label}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {sub}
      </span>
    </button>
  );
}
