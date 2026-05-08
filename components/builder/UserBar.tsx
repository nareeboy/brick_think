import Link from 'next/link';

const SPIKE_LINKS = [
  { href: '/spike', label: 'Spikes' },
  { href: '/spike/konva', label: 'Konva' },
  { href: '/spike/konva/bench', label: 'Konva bench' },
  { href: '/spike/pixi', label: 'Pixi' },
  { href: '/spike/pixi/bench', label: 'Pixi bench' },
  { href: '/spike/yjs', label: 'Yjs PoC' },
];

interface UserBarProps {
  email: string | null | undefined;
}

export function UserBar({ email }: UserBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-900/10 bg-white/70 px-4 py-2.5 text-[12px] text-zinc-700 backdrop-blur">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Spikes
      </span>
      <nav aria-label="Phase 0 spikes" className="flex flex-wrap items-center gap-1.5">
        {SPIKE_LINKS.slice(1).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-zinc-900/10 bg-zinc-50 px-2.5 py-1 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/spike"
          className="rounded-full px-2.5 py-1 text-zinc-500 transition-colors hover:text-zinc-900"
        >
          Index
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        {email ? (
          <span className="hidden text-zinc-500 sm:inline" data-testid="current-user-email">
            {email}
          </span>
        ) : null}
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            data-testid="sign-out-button"
            className="rounded-full border border-zinc-900/10 bg-white px-3 py-1 font-medium text-zinc-800 transition-colors hover:bg-zinc-900/5"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
