import type { ReactNode } from 'react';

export function ComingSoon({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl tracking-tight text-zinc-900">{title}</h1>
        <p className="text-[14px] text-zinc-600">{description}</p>
      </header>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-900/10 bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#a8482a]/10 text-[#a8482a]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            {icon}
          </svg>
        </span>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Coming soon
        </p>
        <p className="mt-2 max-w-sm text-[13px] text-zinc-600">
          This section is reserved in the admin navigation but hasn&apos;t been built yet.
        </p>
      </div>
    </div>
  );
}
