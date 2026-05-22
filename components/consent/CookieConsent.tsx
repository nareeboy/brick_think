'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';

import {
  type ConsentDecision,
  readConsent,
  subscribeConsent,
  subscribeOpenPreferences,
  writeConsent,
} from '@/lib/consent/state';

type Mode = 'hidden' | 'banner' | 'preferences';

export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [decision, setDecision] = useState<ConsentDecision | null>(null);
  const [mode, setMode] = useState<Mode>('hidden');

  useEffect(() => {
    setMounted(true);
    const initial = readConsent();
    setDecision(initial);
    setMode(initial ? 'hidden' : 'banner');

    const unsubDecision = subscribeConsent((next) => setDecision(next));
    const unsubOpen = subscribeOpenPreferences(() => setMode('preferences'));
    return () => {
      unsubDecision();
      unsubOpen();
    };
  }, []);

  if (!mounted) return null;

  const onAcceptAll = () => {
    writeConsent(true);
    setMode('hidden');
  };
  const onRejectAll = () => {
    writeConsent(false);
    setMode('hidden');
  };
  const onClose = () => setMode('hidden');

  return (
    <>
      {mode !== 'hidden' && (
        <ConsentCard
          mode={mode}
          currentAnalytics={decision?.analytics ?? false}
          onAcceptAll={onAcceptAll}
          onRejectAll={onRejectAll}
          onClose={onClose}
        />
      )}
      {decision?.analytics ? <AnalyticsScripts /> : null}
    </>
  );
}

function ConsentCard({
  mode,
  currentAnalytics,
  onAcceptAll,
  onRejectAll,
  onClose,
}: {
  mode: Exclude<Mode, 'hidden'>;
  currentAnalytics: boolean;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
}) {
  const isPreferences = mode === 'preferences';
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="bt-consent-title"
      aria-describedby="bt-consent-body"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md sm:left-4 sm:right-auto sm:bottom-4"
    >
      <div className="rounded-2xl border border-zinc-900/10 bg-[#FAF7F1] p-5 text-zinc-800 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)]">
        <p
          id="bt-consent-title"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500"
        >
          {isPreferences ? 'Cookie preferences' : 'Cookies'}
        </p>
        <h2 className="mt-2 font-display text-[22px] font-medium leading-[1.15] tracking-[-0.01em] text-zinc-950">
          {isPreferences ? 'Manage your cookie choices' : 'Is anyone out there?'}
        </h2>
        <p id="bt-consent-body" className="mt-2 text-[13.5px] leading-relaxed text-zinc-700">
          BrickThink is free and open source. We&apos;d love to know if anyone&apos;s actually
          visiting — it&apos;s how we decide whether to keep building. May we turn on Google
          Analytics to count visits and see which pages get used? You can change your mind any time
          from the footer.{' '}
          <Link
            href="/privacy"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline"
          >
            Privacy policy
          </Link>
          .
        </p>

        {isPreferences && (
          <p className="mt-3 text-[12px] text-zinc-500">
            Current choice:{' '}
            <span className="font-medium text-zinc-700">
              Analytics {currentAnalytics ? 'enabled' : 'disabled'}
            </span>
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onAcceptAll}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-[#c0613d] px-4 text-[13px] font-medium text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] transition-colors hover:bg-[#a8512f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0613d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F1]"
          >
            Accept analytics
          </button>
          <button
            type="button"
            onClick={onRejectAll}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-zinc-900/15 bg-white px-4 text-[13px] font-medium text-zinc-900 transition-colors hover:border-zinc-900/30 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F1]"
          >
            Reject non-essential
          </button>
          {isPreferences && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 cursor-pointer items-center justify-center px-3 text-[13px] font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsScripts() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="bt-ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
