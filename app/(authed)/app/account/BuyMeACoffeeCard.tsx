const BMC_URL = 'https://buymeacoffee.com/brickthink';

export function BuyMeACoffeeCard() {
  return (
    <section className="rounded-2xl border border-zinc-900/10 bg-white p-6">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Tip jar</p>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">Buy me a coffee</h2>
        <p className="text-[12px] text-zinc-500">
          BrickThink is free and always will be. If it&rsquo;s saved you time, a coffee keeps the
          lights on and is genuinely appreciated.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-900/10 bg-[#FBF7F1] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-zinc-900">
              buymeacoffee.com/brickthink
            </span>
            <span className="inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
              Optional
            </span>
          </div>
          <p className="mt-1 text-[12px] text-zinc-500">
            One-off or recurring — every coffee helps.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#FFDD00] px-3 text-[12px] font-semibold text-black transition-colors hover:bg-[#ffe533]"
          >
            <CoffeeGlyph className="h-3.5 w-3.5" />
            Buy me a coffee
          </a>
        </div>
      </div>
    </section>
  );
}

function CoffeeGlyph({ className = '' }: { className?: string }) {
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
      <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
      <path d="M17 10h2a2 2 0 0 1 0 4h-2" />
      <path d="M8 2c0 1.5 1 2 1 3.5S8 7 8 8.5" />
      <path d="M12 2c0 1.5 1 2 1 3.5S12 7 12 8.5" />
    </svg>
  );
}
