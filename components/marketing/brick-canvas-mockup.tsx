type Tile = {
  id: string;
  brick: string;
  fill: string;
  col: number;
  row: number;
  w: number;
  h: number;
  rotate?: number;
};

const BRICK_FILL_VAR = '--brick-fill';

const TILES: Tile[] = [
  { id: 'a', brick: 'plate-2x6', fill: '#d8a85d', col: 1, row: 8, w: 6, h: 1 },
  { id: 'b', brick: 'plate-2x4', fill: '#8a9a78', col: 7, row: 8, w: 4, h: 1 },
  { id: 'c', brick: 'brick-2x4', fill: '#c0613d', col: 2, row: 5, w: 4, h: 2 },
  { id: 'd', brick: 'brick-1x2', fill: '#3b6f8a', col: 6, row: 5, w: 2, h: 2 },
  { id: 'e', brick: 'brick-2x2', fill: '#5b3a8a', col: 8, row: 5, w: 2, h: 2 },
  { id: 'f', brick: 'brick-1x4', fill: '#1f1f1f', col: 3, row: 3, w: 4, h: 1 },
  { id: 'g', brick: 'plate-1x2', fill: '#d8a85d', col: 7, row: 3, w: 2, h: 1 },
  { id: 'h', brick: 'antenna-1x1', fill: '#c0613d', col: 4, row: 2, w: 1, h: 1 },
];

const PALETTE = ['#c0613d', '#d8a85d', '#3b6f8a', '#8a9a78', '#1f1f1f', '#e8d9b8'];

export function BrickCanvasMockup() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[28px] border border-zinc-200/80 bg-[#FBF7F1] shadow-[0_30px_60px_-30px_rgba(60,30,15,0.35),0_8px_20px_-8px_rgba(60,30,15,0.18)]"
      aria-hidden="true"
    >
      {/* canvas chrome */}
      <div className="flex items-center justify-between border-b border-zinc-200/70 bg-[#F5EFE6]/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
          <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            session · stage 03 — shared model
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums text-zinc-500">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[#c0613d]" />
          <span>17:42 remaining</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-0">
        {/* left rail: brick library */}
        <div className="col-span-3 border-r border-zinc-200/70 bg-white/40 p-3">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-400">
            Brick library
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PALETTE.map((c, i) => (
              <div
                key={c}
                className="group relative aspect-square rounded-md border border-zinc-200/70 bg-white"
                style={{ [BRICK_FILL_VAR]: c } as React.CSSProperties}
              >
                <div
                  className="absolute inset-1 rounded-[3px]"
                  style={{
                    background: c,
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)',
                  }}
                >
                  <div className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-black/10" />
                  <div
                    className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/10"
                    style={{ display: i % 2 === 0 ? 'block' : 'none' }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-400">
            52 tile types
          </p>
        </div>

        {/* canvas grid */}
        <div className="relative col-span-9">
          <div
            className="relative aspect-[4/3] w-full"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(60,30,15,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(60,30,15,0.06) 1px, transparent 1px)',
              backgroundSize: 'calc(100%/12) calc(100%/10)',
            }}
          >
            {/* placed bricks */}
            {TILES.map((t) => (
              <div
                key={t.id}
                className="absolute rounded-[4px]"
                style={{
                  left: `calc(${t.col} / 12 * 100%)`,
                  top: `calc(${t.row} / 10 * 100%)`,
                  width: `calc(${t.w} / 12 * 100%)`,
                  height: `calc(${t.h} / 10 * 100% + ${t.h} * 4px)`,
                  background: t.fill,
                  boxShadow:
                    'inset 0 0 0 1px rgba(0,0,0,0.22), 0 1px 0 rgba(255,255,255,0.35) inset, 0 6px 10px -6px rgba(60,30,15,0.35)',
                }}
              >
                {/* studs */}
                <div className="flex h-full items-center justify-evenly px-[6%]">
                  {Array.from({ length: t.w }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.18)' }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* planted flag — real piece on top of brick 'e' */}
            <img
              src="/marketing/pieces/flag-banner.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute select-none"
              style={{
                left: '60%',
                top: '30%',
                width: '18%',
                transform: 'rotate(-6deg)',
                transformOrigin: 'bottom left',
                filter: 'drop-shadow(0 6px 8px rgba(60,30,15,0.25))',
              }}
            />

            {/* presence cursors */}
            <div className="pointer-events-none absolute left-[58%] top-[28%] flex items-center gap-1.5">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="#3b6f8a">
                <path d="M2 2 L14 8 L8 9 L7 14 Z" />
              </svg>
              <span className="rounded-md bg-[#3b6f8a] px-1.5 py-0.5 font-mono text-[9px] font-medium text-white shadow">
                Maren
              </span>
            </div>
            <div className="pointer-events-none absolute left-[20%] top-[72%] flex items-center gap-1.5">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="#c0613d">
                <path d="M2 2 L14 8 L8 9 L7 14 Z" />
              </svg>
              <span className="rounded-md bg-[#c0613d] px-1.5 py-0.5 font-mono text-[9px] font-medium text-white shadow">
                Idris
              </span>
            </div>

            {/* story bubble */}
            <div className="absolute -right-2 bottom-3 max-w-[58%] rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2 shadow-[0_12px_24px_-12px_rgba(60,30,15,0.35)] backdrop-blur">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-400">
                Idris · stage 03 narration
              </p>
              <p className="mt-1 text-[12px] leading-snug text-zinc-700">
                “The black bar at the top is the constraint we never name. Everything below it is
                what the team carries.”
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[9px] text-zinc-400">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                transcript ready · 24s
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* stage rail */}
      <div className="grid grid-cols-5 border-t border-zinc-200/70 bg-white/60 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-400">
        {['Skill-build', 'Individual', 'Shared', 'System', 'Principles'].map((label, i) => {
          const active = i === 2;
          return (
            <div
              key={label}
              className={`flex items-center justify-center border-r border-zinc-200/70 px-2 py-2 last:border-r-0 ${
                active ? 'bg-[#c0613d] text-white' : ''
              }`}
            >
              <span className="tabular-nums">0{i + 1}</span>
              <span className="mx-1.5">·</span>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
