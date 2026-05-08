import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/spike', label: 'Index' },
  { href: '/spike/konva', label: 'Konva demo' },
  { href: '/spike/konva/bench', label: 'Konva bench' },
  { href: '/spike/pixi', label: 'Pixi demo' },
  { href: '/spike/pixi/bench', label: 'Pixi bench' },
];

interface SpikeShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SpikeShell({ title, subtitle, children }: SpikeShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <nav
          aria-label="Spike navigation"
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 text-sm"
        >
          <span className="font-semibold tracking-tight">Canvas spike</span>
          <span aria-hidden className="text-muted-foreground">
            /
          </span>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
