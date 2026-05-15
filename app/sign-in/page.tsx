import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

import { MagicLinkForm } from './MagicLinkForm';
import { signInWithGoogle } from './actions';

export const metadata: Metadata = {
  title: 'Sign in',
};

interface SignInPageProps {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}

function safeNext(next: string | undefined): string {
  if (!next) return '/app/my-designs';
  return next.startsWith('/') ? next : '/app/my-designs';
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const errorMessage = params.error;
  const unconfigured = params.reason === 'unconfigured' || !isSupabaseConfigured();

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(next);
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <TopBar />
      <main
        id="main"
        className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 pb-16 pt-6 md:min-h-[calc(100dvh-56px)] md:grid-cols-12 md:items-center md:gap-14 md:py-16"
      >
        {/* form column */}
        <section
          aria-labelledby="signin-heading"
          className="md:col-span-6 md:col-start-1 lg:col-span-5"
        >
          <div className="max-w-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Facilitator access
            </p>
            <h1
              id="signin-heading"
              className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-950 md:text-5xl"
            >
              Sign in
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-zinc-600">
              Send yourself a one-time link, or continue with Google. Participants do not need an
              account for synchronous sessions — just a join code.
            </p>

            {errorMessage ? (
              <p
                role="alert"
                data-testid="auth-error"
                className="mt-6 inline-flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] leading-snug text-rose-800"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"
                />
                {errorMessage}
              </p>
            ) : null}

            {unconfigured ? (
              <p
                role="status"
                data-testid="auth-unconfigured"
                className="mt-6 inline-flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-snug text-amber-900"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                />
                Supabase is not configured for this environment yet. Sign-in stays disabled until
                the required env vars are set.
              </p>
            ) : null}

            <section aria-labelledby="magic-link-heading" className="mt-10">
              <h2
                id="magic-link-heading"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500"
              >
                Email magic link
              </h2>
              <div className="mt-4">
                <MagicLinkForm next={next} />
              </div>
            </section>

            <div
              className="my-8 flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-zinc-400"
              aria-hidden="true"
            >
              <span className="h-px flex-1 bg-zinc-900/10" />
              <span className="font-mono">or</span>
              <span className="h-px flex-1 bg-zinc-900/10" />
            </div>

            <section aria-labelledby="google-heading">
              <h2
                id="google-heading"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500"
              >
                Single sign-on
              </h2>
              <form action={signInWithGoogle} className="mt-4">
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  data-testid="google-sign-in"
                  disabled={unconfigured}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-900/15 bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleGlyph />
                  Continue with Google
                </button>
              </form>
            </section>

            <p className="mt-10 text-[12px] leading-relaxed text-zinc-500">
              By signing in you agree to the{' '}
              <Link
                href="/terms"
                className="underline-offset-2 hover:text-zinc-800 hover:underline"
              >
                Terms
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="underline-offset-2 hover:text-zinc-800 hover:underline"
              >
                Privacy Policy
              </Link>
              . AI processing is disclosed at the point of use.
            </p>
          </div>
        </section>

        {/* brand panel */}
        <aside
          aria-hidden="true"
          className="hidden md:col-span-6 md:col-start-7 md:block lg:col-span-6 lg:col-start-7"
        >
          <BrandPanel />
        </aside>
      </main>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-900/5 bg-[#FAF7F1]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-zinc-900"
          aria-label="Back to BrickThink home"
        >
          <span className="inline-flex items-center text-zinc-500 transition-colors group-hover:text-zinc-900">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          <BrickGlyph />
          <span className="text-[15px] font-semibold tracking-tight">BrickThink</span>
        </Link>
      </div>
    </header>
  );
}

function BrandPanel() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-zinc-900/10 bg-gradient-to-br from-[#FBF7F1] to-[#F2E8D8] p-8 shadow-[0_30px_60px_-30px_rgba(60,30,15,0.18)] md:p-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Virtual Serious Play, remote-native
      </p>
      <h2 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-tight text-zinc-950 md:text-4xl">
        Five stages.
        <br />
        Two hours.
        <br />
        <span className="text-[#c0613d]">One model</span>{' '}
        <span className="text-zinc-700">your team</span>
        <br />
        <span className="text-zinc-700">actually believes in.</span>
      </h2>

      <ul className="mt-7 space-y-2">
        {[
          ['01', 'Skill-building'],
          ['02', 'Individual model'],
          ['03', 'Shared model'],
          ['04', 'System model'],
          ['05', 'Guiding principles'],
        ].map(([n, label], i) => (
          <li
            key={n}
            className="flex items-center gap-3 rounded-xl border border-zinc-900/10 bg-white/60 px-3.5 py-2 backdrop-blur"
          >
            <span className="font-mono text-[10px] tabular-nums tracking-[0.18em] text-zinc-500">
              {n}
            </span>
            <span className="flex-1 text-[13px] font-medium text-zinc-800">{label}</span>
            {i === 2 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#c0613d] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white">
                <span className="inline-flex h-1 w-1 animate-pulse rounded-full bg-white" />
                Live
              </span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                ready
              </span>
            )}
          </li>
        ))}
      </ul>

      <figure className="mt-8 border-t border-zinc-900/10 pt-6">
        <blockquote className="text-[15px] leading-relaxed text-zinc-700">
          “The bridge between those two clusters is where the trust actually lives. We never would
          have surfaced that on a video call.”
        </blockquote>
        <figcaption className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#3b6f8a]" />
          Maren O. · certified facilitator · Berlin
        </figcaption>
      </figure>

      {/* decorative bricks */}
      <div className="pointer-events-none absolute -right-6 -top-6" aria-hidden="true">
        <Brick color="#c0613d" w={56} studs={2} />
      </div>
    </div>
  );
}

function Brick({ color, w, studs }: { color: string; w: number; studs: number }) {
  const h = Math.round(w * 0.42);
  return (
    <div
      className="rounded-md"
      style={{
        width: w,
        height: h,
        background: color,
        boxShadow:
          'inset 0 0 0 1px rgba(0,0,0,0.22), 0 1px 0 rgba(255,255,255,0.35) inset, 0 8px 16px -10px rgba(60,30,15,0.4)',
      }}
    >
      <div className="flex h-full items-center justify-evenly px-[10%]">
        {Array.from({ length: studs }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.18)' }}
          />
        ))}
      </div>
    </div>
  );
}

function BrickGlyph() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#c0613d] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),0_2px_0_rgba(255,255,255,0.4)_inset]">
      <span className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-black/20" />
      <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 translate-x-1/2 rounded-full bg-black/20" />
    </span>
  );
}

function ArrowLeft({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.27h2.9c1.7-1.56 2.69-3.87 2.69-6.64z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.46-.81 5.95-2.18l-2.9-2.27c-.8.54-1.83.86-3.05.86-2.35 0-4.34-1.59-5.05-3.71H.95v2.34A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.96H.95A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.95 4.04l3-2.34z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.81 11.43 0 9 0A8.997 8.997 0 0 0 .95 4.96l3 2.34C4.66 5.18 6.65 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
