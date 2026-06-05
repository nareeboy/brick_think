'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import type { NavSession } from '@/lib/sessions/navSessions';

interface Props {
  sessions: NavSession[];
}

// Matches the pill styling used by the other links in HeaderNav.
function pillClasses(active: boolean): string {
  return `inline-flex h-10 cursor-pointer items-center rounded-xl px-3 text-[13px] font-medium transition-colors ${
    active
      ? 'bg-[#c0613d]/10 text-[#c0613d]'
      : 'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900'
  }`;
}

export function SessionNavLink({ sessions }: Props) {
  const pathname = usePathname() ?? '';
  const onSessionRoute = pathname.startsWith('/app/sessions/');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

  // Close on outside-click and Escape; restore focus to the trigger on Escape.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (sessions.length === 0) return null;

  if (sessions.length === 1) {
    const [only] = sessions;
    return (
      <Link
        href={`/app/sessions/${only!.id}`}
        aria-current={onSessionRoute ? 'page' : undefined}
        data-testid="nav-session"
        className={pillClasses(onSessionRoute)}
      >
        Session
      </Link>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-testid="nav-session"
        onClick={() => setOpen((v) => !v)}
        className={pillClasses(onSessionRoute)}
      >
        Session
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className={`ml-1 h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Your sessions"
          className="absolute left-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-zinc-900/10 bg-white py-1 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.35)]"
        >
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/app/sessions/${s.id}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-[36px] items-center px-3 text-[13px] text-zinc-700 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 focus-visible:bg-zinc-900/5 focus-visible:outline-none"
            >
              <span className="truncate">{s.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
