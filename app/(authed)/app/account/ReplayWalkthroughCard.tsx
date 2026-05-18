'use client';

import { useRouter } from 'next/navigation';

import { useOnboardingState } from '@/components/onboarding/useOnboardingState';

export function ReplayWalkthroughCard() {
  const router = useRouter();
  const { replayAll } = useOnboardingState();

  function replay() {
    replayAll();
    router.refresh();
    router.push('/app/my-designs');
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
        Show the welcome modal, get-started checklist, and session tour again from the start.
      </p>
      <div className="mt-4">
        <button
          type="button"
          onClick={replay}
          data-testid="replay-walkthrough-button"
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5"
        >
          Replay walkthrough
        </button>
      </div>
    </section>
  );
}
