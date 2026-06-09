'use client';

import { useCallback, useRef, useState } from 'react';

import { Toast, type ToastVariant } from '@/components/notifications/Toast';

/**
 * Dev/QA harness for the redesigned in-app toast. Shows a static gallery of
 * each variant (matching the agreed reference) plus live "fire" buttons that
 * stack real <Toast> instances bottom-centre. Mapping the app's actual
 * notifications (org added, session started, …) onto these variants is the
 * next step — this page is the design review surface.
 */

interface DemoSpec {
  variant: ToastVariant;
  title: string;
  description: string;
  /** Whether the demo card carries a "Try again"-style action button. */
  withAction?: boolean;
  /** Whether the demo card is dismissible (renders the × ). */
  withDismiss?: boolean;
}

const DEMOS: DemoSpec[] = [
  {
    variant: 'error',
    title: 'Error Occurred',
    description: 'Sorry, please try again later.',
    withAction: true,
  },
  {
    variant: 'success',
    title: 'Message Sent',
    description: "Your message has been sent. We'll get back to you soon.",
    withDismiss: true,
  },
  {
    variant: 'info',
    title: 'Attention',
    description: 'Our website will be undergoing scheduled maintenance tonight from 10 PM to 2 AM.',
  },
  {
    variant: 'warning',
    title: 'Heads up',
    description: 'Your session will expire in 5 minutes unless there is activity.',
    withDismiss: true,
  },
];

interface LiveToast {
  id: number;
  variant: ToastVariant;
  title: string;
  description: string;
  withAction: boolean;
  withDismiss: boolean;
}

export function ToastTestClient() {
  const [live, setLive] = useState<LiveToast[]>([]);
  const idRef = useRef(0);

  const fire = useCallback((spec: DemoSpec) => {
    idRef.current += 1;
    const id = idRef.current;
    setLive((prev) => [
      ...prev,
      {
        id,
        variant: spec.variant,
        title: spec.title,
        description: spec.description,
        withAction: spec.withAction ?? false,
        // Anything fired into the live stack is dismissible so it can be cleared.
        withDismiss: true,
      },
    ]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setLive((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">Variants</h2>
            <p className="text-[12px] text-zinc-500">
              The redesigned toast. Each variant carries its own tint, icon chip, and live-region
              politeness. Errors can offer an action; any toast can be dismissible.
            </p>
          </div>
          <button
            type="button"
            onClick={() => DEMOS.forEach(fire)}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-xl bg-[#a8482a] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#8f3c22] active:scale-[0.98]"
          >
            Fire all
          </button>
        </div>

        <div className="flex max-w-xl flex-col gap-5">
          {DEMOS.map((demo) => (
            <div key={demo.variant} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {demo.variant}
                </span>
                <button
                  type="button"
                  onClick={() => fire(demo)}
                  className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-lg border border-zinc-900/10 bg-white px-2.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
                >
                  Fire as toast
                </button>
              </div>
              <Toast
                variant={demo.variant}
                title={demo.title}
                description={demo.description}
                action={
                  demo.withAction ? { label: 'Try again', onClick: () => fire(demo) } : undefined
                }
                onDismiss={demo.withDismiss ? () => {} : undefined}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Live bottom-centre stack — fired toasts land here, newest at the bottom. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-3 px-4">
        {live.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            title={t.title}
            description={t.description}
            action={t.withAction ? { label: 'Try again', onClick: () => dismiss(t.id) } : undefined}
            onDismiss={t.withDismiss ? () => dismiss(t.id) : undefined}
            className="pointer-events-auto w-full max-w-md"
          />
        ))}
      </div>
    </div>
  );
}
