'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { setActiveContextAction } from '@/app/(authed)/app/orgs/actions';
import type { OrgSummary } from '@/lib/orgs/types';

interface Props {
  orgs: OrgSummary[];
  activeOrgId: string | null;
}

export function ContextSwitcher({ orgs, activeOrgId }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? null;
  const activeLabel = activeOrg ? activeOrg.name : 'Personal';

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      window.addEventListener('mousedown', onClick);
      window.addEventListener('keydown', onKey);
      firstOptionRef.current?.focus();
    }
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(orgId: string | null) {
    if (orgId === activeOrgId) {
      setOpen(false);
      return;
    }
    start(async () => {
      await setActiveContextAction(orgId);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={pending}
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-zinc-900/10 bg-white px-3 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Context
        </span>
        <span>{activeLabel}</span>
        <ChevronIcon />
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Switch context"
          className="absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
        >
          <ContextItem
            label="Personal"
            sub="Your private designs"
            active={activeOrgId === null}
            onSelect={() => pick(null)}
            buttonRef={firstOptionRef}
          />
          {orgs.map((o) => (
            <ContextItem
              key={o.id}
              label={o.name}
              sub={`${o.slug} · ${o.role}`}
              active={o.id === activeOrgId}
              onSelect={() => pick(o.id)}
            />
          ))}
          <Link
            href="/app/orgs/new"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-zinc-900/5 px-4 py-3 text-[13px] font-semibold text-[#c0613d] transition-colors hover:bg-[#FAF7F1]"
          >
            New organisation
            <span aria-hidden="true">+</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function ContextItem({
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
      className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#FAF7F1] ${
        active ? 'bg-[#FAF7F1]' : ''
      }`}
    >
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold text-zinc-900">{label}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {sub}
        </span>
      </span>
      {active ? <CheckIcon /> : null}
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4 text-[#c0613d]"
      aria-hidden="true"
    >
      <path d="m5 13 4 4 10-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
