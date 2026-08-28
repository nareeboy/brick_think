'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { useOnboardingState } from '@/components/onboarding/useOnboardingState';
import { resetOnboarding } from '@/lib/onboarding/actions';

export function ReplayWalkthroughCard() {
  const router = useRouter();
  const { replayAll } = useOnboardingState();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function replay() {
    startTransition(async () => {
      setError(null);
      try {
        // Server first: clearing profiles.onboarding before the local caches
        // means the hydrator cannot re-fill them from stale server state.
        const res = await resetOnboarding();
        if (!res.ok) {
          setError('Could not reset the walkthrough. Please try again.');
          return;
        }
        replayAll();
        router.refresh();
        // Everything is cleared, so the configuration flow starts at step 1.
        router.push('/app/welcome');
      } catch {
        setError('Could not reset the walkthrough. Please try again.');
      }
    });
  }

  return (
    <section
      data-testid="replay-walkthrough"
      className="rounded-2xl border border-zinc-900/10 bg-white p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Walkthrough</p>
      <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-950">
        Replay the welcome tour
      </h2>
      <p className="mt-1 text-[13px] text-zinc-600">
        Run the welcome questions again from the start, and re-arm the welcome modal and the
        workshop, session and canvas tours.
      </p>
      {error ? (
        <p data-testid="replay-walkthrough-error" className="mt-2 text-[12px] text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4">
        <button
          type="button"
          onClick={replay}
          disabled={pending}
          data-testid="replay-walkthrough-button"
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? 'Resetting…' : 'Replay walkthrough'}
        </button>
      </div>
    </section>
  );
}
