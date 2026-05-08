import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Builder · BT0317',
};

export default function BuilderPage() {
  return (
    <div className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div
        className="mx-auto flex max-w-[1600px] flex-col gap-4 px-3 py-3 md:px-5 md:py-5"
        style={{ minHeight: '100dvh' }}
      >
        <TopBar />
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-12">
          <LeftPanel className="md:col-span-3" />
          <CanvasStage className="md:col-span-6" />
          <RightPanel className="md:col-span-3" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Top bar ---------------- */

function TopBar() {
  return (
    <header className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-900/10 bg-white px-4 py-3">
      <Link
        href="/app"
        className="group inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to library
      </Link>

      <div className="flex flex-1 items-baseline justify-center gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-950md:text-[26px]">
          Model — BT0317
        </h1>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Stage 03 · Shared model
        </span>
      </div>

      <ViewToggle />
    </header>
  );
}

function ViewToggle() {
  const items: { id: string; label: string; icon: React.ReactNode; active?: boolean }[] = [
    { id: 'grid', label: 'Top-down grid', icon: <GridIcon className="h-4 w-4" /> },
    {
      id: 'iso',
      label: 'Isometric',
      icon: <CubeIcon className="h-4 w-4" />,
      active: true,
    },
    { id: 'annot', label: 'Annotations', icon: <AnnotationIcon className="h-4 w-4" /> },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-900/10 bg-zinc-50 p-1">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          aria-label={it.label}
          aria-pressed={it.active}
          tabIndex={-1}
          className={`inline-flex h-8 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors ${
            it.active
              ? 'bg-zinc-900 text-white shadow-[0_4px_10px_-4px_rgba(0,0,0,0.3)]'
              : 'hover:text-zinc-900'
          }`}
        >
          {it.icon}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Left panel ---------------- */

function LeftPanel({ className = '' }: { className?: string }) {
  return (
    <aside className={`flex flex-col gap-4 ${className}`}>
      <Panel>
        <PanelHeader title="Selection" reset />
        <SubLabel>Position</SubLabel>
        <NumberRow
          values={[
            ['X', '138.5'],
            ['Y', '74'],
            ['Z', '137'],
          ]}
        />
        <SubLabel className="mt-4">Rotation</SubLabel>
        <NumberRow
          values={[
            ['X', '0'],
            ['Y', '0'],
            ['Z', '0'],
          ]}
        />
        <SubLabel className="mt-4 flex items-center justify-between">
          <span>Scale</span>
          <button
            type="button"
            tabIndex={-1}
            className="text-zinc-500 hover:text-zinc-700"
            aria-label="Reset scale"
          >
            <RotateIcon className="h-3.5 w-3.5" />
          </button>
        </SubLabel>
        <NumberRow
          values={[
            ['X', '0.68'],
            ['Y', '24.7'],
            ['Z', '48.9'],
          ]}
          highlightIndex={2}
        />
      </Panel>

      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-zinc-900">Parameters</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 font-mono text-[10px] text-white">
            <SparkleIcon className="h-3 w-3" />
            Cap 6.7 kg
          </span>
        </div>
        <Slider label="Wall thickness" value="5.44 cm" pct={36} />
        <Slider label="Flexibility" value="75°" pct={75} />
        <Slider label="Rotation" value="90°" pct={50} />
        <Slider label="Grip force" value="85%" pct={85} />

        <SubLabel className="mt-5">Weight distribution</SubLabel>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="Palm" value="65%" />
          <Stat label="Wrist" value="35%" />
        </div>
      </Panel>

      <button
        type="button"
        tabIndex={-1}
        className="group mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#c0613d] py-4 text-[15px] font-semibold text-white shadow-[0_20px_30px_-15px_rgba(192,97,61,0.6)] transition-all hover:bg-[#cf6e47] active:translate-y-[1px]"
      >
        Save build to canvas
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </aside>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-zinc-900/10 bg-white p-5">{children}</div>;
}

function PanelHeader({ title, reset }: { title: string; reset?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <p className="text-[14px] font-semibold text-zinc-900">{title}</p>
      {reset ? (
        <button
          type="button"
          tabIndex={-1}
          className="text-zinc-500 hover:text-zinc-700"
          aria-label="Reset"
        >
          <RotateIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function SubLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 ${className}`}>
      {children}
    </p>
  );
}

function NumberRow({
  values,
  highlightIndex,
}: {
  values: [string, string][];
  highlightIndex?: number;
}) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {values.map(([axis, val], i) => (
        <div
          key={axis + i}
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
            i === highlightIndex
              ? 'border-[#c0613d] bg-[#c0613d]/10'
              : 'border-zinc-900/10 bg-zinc-50 hover:border-zinc-900/20'
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {axis}
          </span>
          <span className="ml-auto font-mono text-[12px] tabular-nums text-zinc-900">{val}</span>
          {i === highlightIndex ? <ChevronDown className="h-3 w-3 text-[#c0613d]" /> : null}
        </div>
      ))}
    </div>
  );
}

function Slider({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] text-zinc-700">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-zinc-500">{value}</span>
      </div>
      <div className="relative h-1 rounded-full bg-zinc-900/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#c0613d]"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_rgba(60,30,15,0.18)] ring-1 ring-zinc-900/15"
          style={{ left: `calc(${pct}% - 7px)` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-900/10 bg-zinc-50 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-[14px] tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

/* ---------------- Center stage ---------------- */

function CanvasStage({ className = '' }: { className?: string }) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-zinc-900/10 bg-[#FBF7F1] ${className}`}
    >
      {/* subtle dot grid background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage: 'radial-gradient(rgba(60,30,15,0.10) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(192,97,61,0.06), transparent 55%)',
        }}
      />

      {/* Z axis on left */}
      <div className="absolute left-10 top-12 hidden flex-col items-center md:flex">
        <span className="font-mono text-[10px] tracking-[0.16em] text-[#3b6f8a]">Z</span>
        {[164, 154, 144, 134].map((tick, i) => (
          <div key={tick} className="flex items-center gap-1.5">
            <span
              className="block w-2.5"
              style={{ height: 1, background: 'rgba(59,111,138,0.45)' }}
            />
            <span className="font-mono text-[9px] tabular-nums text-zinc-500">{tick}</span>
            {i < 3 ? (
              <span
                className="absolute h-10 w-px"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(59,111,138,0.45), rgba(59,111,138,0.05))',
                }}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* X axis (bottom-left to top-right diagonal feel via labels) */}
      <AxisRail side="x" ticks={[14, 24, 34, 44, 54, 64, 74, 84]} color="#c0613d" label="X" />
      <AxisRail side="y" ticks={[154, 164, 174, 184, 194]} color="#7da97a" label="Y" />

      {/* the model */}
      <BrickModel />

      {/* annotation popover */}
      <div className="pointer-events-none absolute left-[20%] top-[36%] hidden md:block">
        <Annotation />
      </div>

      {/* bottom toolbar */}
      <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-2">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Add brick"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c0613d] text-white shadow-[0_10px_24px_-12px_rgba(192,97,61,0.8)] transition-colors hover:bg-[#cf6e47]"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
        <div className="inline-flex items-center gap-1 rounded-2xl border border-zinc-900/10 bg-white p-1.5">
          <ToolButton aria-label="Group selection">
            <FrameIcon className="h-4 w-4" />
          </ToolButton>
          <ToolButton aria-label="Cut">
            <ScissorsIcon className="h-4 w-4" />
          </ToolButton>
          <ToolButton aria-label="Duplicate">
            <DuplicateIcon className="h-4 w-4" />
          </ToolButton>
          <ToolButton aria-label="Lock">
            <LockIcon className="h-4 w-4" />
          </ToolButton>
        </div>
      </div>

      {/* gizmo bottom-right */}
      <div className="absolute bottom-5 right-5 hidden md:block">
        <Gizmo />
      </div>

      {/* status pill top-left */}
      <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 backdrop-blur">
        <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[#c0613d]" />
        17:42 remaining · 4 cursors
      </div>
    </section>
  );
}

function AxisRail({
  side,
  ticks,
  color,
  label,
}: {
  side: 'x' | 'y';
  ticks: number[];
  color: string;
  label: string;
}) {
  const isX = side === 'x';
  return (
    <div
      aria-hidden="true"
      className={`absolute font-mono text-[9px] tabular-nums text-zinc-500 ${
        isX ? 'bottom-20 left-12 right-1/3' : 'bottom-20 right-12 left-1/3'
      }`}
    >
      <div className="relative">
        <div
          className="h-px w-full"
          style={{
            background: `linear-gradient(${isX ? 'to right' : 'to left'}, ${color}99, ${color}11)`,
          }}
        />
        <div className={`mt-1 flex justify-between ${isX ? 'flex-row' : 'flex-row-reverse'}`}>
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <span
          className="absolute -top-3.5 font-mono text-[10px] tracking-[0.16em]"
          style={{
            color,
            [isX ? 'right' : 'left']: 0,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function BrickModel() {
  // Isometric stack of bricks, drawn with simple parallelograms
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        viewBox="0 0 600 480"
        className="h-[80%] w-auto max-w-[80%] drop-shadow-[0_30px_30px_rgba(0,0,0,0.5)]"
        aria-hidden="true"
      >
        <defs>
          <filter id="brick-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.35" />
          </filter>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2722" />
            <stop offset="100%" stopColor="#1A1714" />
          </linearGradient>
        </defs>

        {/* baseplate */}
        <IsoBrick cx={300} cy={400} cols={8} rows={6} h={10} fill="#1f1f1f" />

        {/* row 1 */}
        <IsoBrick cx={210} cy={350} cols={2} rows={2} h={28} fill="#c0613d" />
        <IsoBrick cx={310} cy={358} cols={4} rows={2} h={28} fill="#d8a85d" />
        <IsoBrick cx={420} cy={344} cols={2} rows={2} h={28} fill="#3b6f8a" />

        {/* row 2 */}
        <IsoBrick cx={250} cy={300} cols={3} rows={2} h={28} fill="#8a9a78" />
        <IsoBrick cx={380} cy={290} cols={3} rows={2} h={28} fill="#5b3a8a" />

        {/* row 3 */}
        <IsoBrick cx={310} cy={244} cols={4} rows={2} h={28} fill="#c0613d" highlight />

        {/* row 4 stud caps */}
        <IsoBrick cx={300} cy={196} cols={2} rows={1} h={20} fill="#1f1f1f" />
        <IsoBrick cx={350} cy={170} cols={1} rows={1} h={20} fill="#d8a85d" />

        {/* antenna */}
        <IsoBrick cx={355} cy={140} cols={1} rows={1} h={36} fill="#c0613d" />
      </svg>
    </div>
  );
}

function IsoBrick({
  cx,
  cy,
  cols,
  rows,
  h,
  fill,
  highlight,
}: {
  cx: number;
  cy: number;
  cols: number;
  rows: number;
  h: number;
  fill: string;
  highlight?: boolean;
}) {
  const w = cols * 22;
  const d = rows * 22;
  // isometric projection: x' = (col-row)*cos(30), y' = (col+row)*sin(30)
  const ix = w / 2;
  const iy = w / 4;
  const dx = d / 2;
  const dy = d / 4;

  type P = readonly [number, number];
  const A: P = [cx, cy - h / 2 - iy - dy];
  const B: P = [cx + ix, cy - h / 2 - iy + dy];
  const C: P = [cx + ix - dx, cy - h / 2 + dy + iy];
  const D: P = [cx - dx, cy - h / 2 + iy - dy];

  const Bb: P = [B[0], B[1] + h];
  const Cb: P = [C[0], C[1] + h];
  const Db: P = [D[0], D[1] + h];

  const lighten = adjust(fill, 18);
  const darken = adjust(fill, -22);

  return (
    <g filter="url(#brick-shadow)">
      {/* right face */}
      <polygon
        points={`${B[0]},${B[1]} ${C[0]},${C[1]} ${Cb[0]},${Cb[1]} ${Bb[0]},${Bb[1]}`}
        fill={darken}
      />
      {/* left face */}
      <polygon
        points={`${D[0]},${D[1]} ${C[0]},${C[1]} ${Cb[0]},${Cb[1]} ${Db[0]},${Db[1]}`}
        fill={adjust(fill, -10)}
      />
      {/* top face */}
      <polygon
        points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} ${D[0]},${D[1]}`}
        fill={lighten}
        stroke={highlight ? '#fff' : 'rgba(0,0,0,0.35)'}
        strokeWidth={highlight ? 1.5 : 0.6}
      />
      {/* studs */}
      {Array.from({ length: cols * rows }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const sx =
          A[0] +
          ((c + 0.5) * (B[0] - A[0])) / cols +
          ((r + 0.5) * (D[0] - A[0])) / rows -
          (D[0] - A[0]) / (2 * rows);
        const sy =
          A[1] +
          ((c + 0.5) * (B[1] - A[1])) / cols +
          ((r + 0.5) * (D[1] - A[1])) / rows -
          (D[1] - A[1]) / (2 * rows);
        return (
          <ellipse
            key={i}
            cx={sx}
            cy={sy}
            rx={5}
            ry={2.4}
            fill={lighten}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={0.5}
          />
        );
      })}
      {highlight ? (
        <polygon
          points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} ${D[0]},${D[1]}`}
          fill="none"
          stroke="#c0613d"
          strokeWidth={2}
        />
      ) : null}
    </g>
  );
}

function adjust(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  const num = parseInt(m, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function Annotation() {
  return (
    <div className="w-[260px] rounded-2xl border border-zinc-900/10 bg-white p-4 text-zinc-900 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
          <ArrowLeft className="h-3 w-3" /> Brick #14
        </div>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-zinc-900 text-white">
          <PinIcon className="h-3 w-3" />
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <MiniDim value="2.4" color="#7da97a" axis="—" />
        <MiniDim value="6.6" color="#c0613d" axis="|" />
        <MiniDim value="1.2" color="#3b6f8a" axis="•" />
      </div>
      <div className="mt-3 rounded-xl bg-[#FAF7F1] p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
          Idris · stage 03
        </p>
        <p className="mt-1 text-[12px] leading-snug text-zinc-700">
          “The terracotta brick is the constraint we never name. Anchored as a candidate principle.”
        </p>
      </div>
    </div>
  );
}

function MiniDim({ value, color, axis }: { value: string; color: string; axis: string }) {
  return (
    <div className="rounded-lg border border-zinc-900/10 bg-zinc-50 px-2 py-1.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color }}>
        {axis}
      </p>
      <p className="font-mono text-[12px] tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

function Gizmo() {
  return (
    <div className="relative h-20 w-20 rounded-full border border-zinc-900/10 bg-white/80 backdrop-blur">
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-700" />
      <Axis label="Z" color="#3b6f8a" rotate={-90} />
      <Axis label="X" color="#c0613d" rotate={210} />
      <Axis label="Y" color="#7da97a" rotate={330} />
    </div>
  );
}

function Axis({ label, color, rotate }: { label: string; color: string; rotate: number }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 h-px w-7 origin-left"
      style={{
        transform: `translate(0, -50%) rotate(${rotate}deg)`,
        background: color,
      }}
    >
      <span className="absolute -right-3 -top-1 font-mono text-[9px]" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

function ToolButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Right panel ---------------- */

function RightPanel({ className = '' }: { className?: string }) {
  return (
    <aside className={`flex flex-col gap-4 ${className}`}>
      <Panel>
        <PanelHeader title="Layers" />
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
            <SearchIcon className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            tabIndex={-1}
            placeholder="Search"
            className="w-full rounded-xl border border-zinc-900/10 bg-zinc-50 py-2 pl-8 pr-3 text-[12px] text-zinc-800 placeholder:text-zinc-500 outline-none focus:border-[#c0613d]/50"
          />
        </div>

        <Group title="Constraint cluster" expanded>
          <Layer icon={<SquareGlyph />} label="Brick / 2×4 wall" color="#c0613d" />
          <Layer
            icon={<CircleGlyph />}
            label="Annotation / connection"
            color="#c0613d"
            active
            visibleHint
          />
          <Layer icon={<TriangleGlyph />} label="Connector / joint 1" color="#c0613d" />
          <Layer icon={<TriangleGlyph />} label="Connector / joint 2" color="#c0613d" />
        </Group>

        <Group title="Foundation" />
        <Group title="Trust bridge" />
      </Panel>

      <Panel>
        <PanelHeader title="Modifiers" />
        <Modifier label="Lock layer" hint="⌘ L" />
        <Modifier label="Mirror" hint="M" />
        <Modifier label="Group" hint="⌘ G" />
      </Panel>

      <Panel>
        <PanelHeader title="Palette" />
        <div className="grid grid-cols-7 gap-1.5">
          {['#c0613d', '#d8a85d', '#3b6f8a', '#8a9a78', '#5b3a8a', '#1f1f1f', '#e8d9b8'].map(
            (c, i) => (
              <button
                type="button"
                key={c}
                tabIndex={-1}
                aria-label={`Colour ${c}`}
                className={`relative aspect-square rounded-lg ${
                  i === 0 ? 'ring-2 ring-white' : ''
                }`}
                style={{
                  background: c,
                  boxShadow:
                    'inset 0 0 0 1px rgba(60,30,15,0.20), 0 1px 0 rgba(255,255,255,0.35) inset',
                }}
              />
            ),
          )}
        </div>
      </Panel>
    </aside>
  );
}

function Group({
  title,
  expanded,
  children,
}: {
  title: string;
  expanded?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <button
        type="button"
        tabIndex={-1}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-zinc-800 hover:bg-zinc-900/5"
      >
        <FolderIcon className="h-3.5 w-3.5 text-[#c0613d]" />
        <span className="flex-1 font-medium">{title}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${
            expanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>
      {expanded ? <div className="mt-1 space-y-0.5 pl-4">{children}</div> : null}
    </div>
  );
}

function Layer({
  icon,
  label,
  color,
  active,
  visibleHint,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  active?: boolean;
  visibleHint?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors ${
        active ? 'bg-[#c0613d]/12 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-900/5'
      }`}
    >
      <span className="text-[10px]" style={{ color }}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {visibleHint ? <EyeIcon className="h-3.5 w-3.5 text-zinc-500" /> : null}
    </div>
  );
}

function Modifier({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-xl border border-zinc-900/10 bg-zinc-50 px-3 py-2 first:mt-0">
      <span className="text-[12px] text-zinc-800">{label}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        {hint}
      </span>
    </div>
  );
}

/* ---------------- Icons (inline) ---------------- */

function ArrowLeft({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
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

function ArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function RotateIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

function GridIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CubeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M4 7l8 4 8-4" />
      <path d="M12 11v10" />
    </svg>
  );
}

function AnnotationIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SparkleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2 13.5 8.5 20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z" />
    </svg>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function FrameIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7V4h3" />
      <path d="M20 7V4h-3" />
      <path d="M4 17v3h3" />
      <path d="M20 17v3h-3" />
    </svg>
  );
}

function ScissorsIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88" />
      <path d="M14.47 14.48 20 20" />
      <path d="M8.12 8.12 12 12" />
    </svg>
  );
}

function DuplicateIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function PinIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 4l6 6-3 1-2 2-1 5-2-2-5 5-1-1 5-5-2-2 5-1 2-3z" />
    </svg>
  );
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function FolderIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H3V7Z" />
    </svg>
  );
}

function EyeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SquareGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CircleGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
      <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function TriangleGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
      <polygon points="6,2 10,10 2,10" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
