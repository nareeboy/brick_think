'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getBrowserSupabaseClient } from '@/lib/db/client';

// Auth-aware marketing CTA. The marketing pages are statically rendered, so
// auth state is read in the browser: SSR always paints "Sign in" and the
// button upgrades to "Start a session" once a Supabase session is found.
export function NavAuthCta() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      getBrowserSupabaseClient()
        .auth.getSession()
        .then(({ data }) => {
          if (!cancelled && data.session) setSignedIn(true);
        })
        .catch(() => {});
    } catch {
      // Missing public env (e.g. bare open-core preview) — keep "Sign in".
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href={signedIn ? '/app' : '/sign-in'}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
    >
      {signedIn ? 'Start a session' : 'Sign in'}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
