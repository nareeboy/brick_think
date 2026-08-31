/**
 * Stand-in for a design thumbnail that doesn't exist (yet). Shared by the
 * my-designs grid, the workshops list, and the sessions grid so an empty card
 * looks intentional everywhere instead of broken.
 *
 * The scene is a small stack of studded bricks with one dashed empty slot —
 * the same illustration language as the 404/500 pages (ErrorPageShell): "the
 * next brick goes here". Inline SVG on the dot-grid ground; decorative and
 * self-contained, so no third-party image service can ever break these cards
 * again.
 */

const STUD_FILL = 'rgba(0,0,0,0.18)';

function BrickRect({ x, y, studs, fill }: { x: number; y: number; studs: number; fill: string }) {
  const width = studs * 28;
  return (
    <g>
      <rect x={x} y={y} width={width} height={26} rx={6} fill={fill} />
      {Array.from({ length: studs }).map((_, i) => (
        <circle
          key={i}
          cx={x + (width / (studs + 1)) * (i + 1)}
          cy={y + 8}
          r={3.5}
          fill={STUD_FILL}
        />
      ))}
    </g>
  );
}

export function DotGridPlaceholder() {
  return (
    <div
      aria-hidden="true"
      data-testid="design-thumb-placeholder"
      className="absolute inset-0 flex items-center justify-center"
      style={{
        backgroundImage: 'radial-gradient(rgba(60,30,15,0.10) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      <svg
        data-testid="placeholder-brick-scene"
        viewBox="0 0 204 56"
        className="w-[44%] max-w-[220px] opacity-80 drop-shadow-[0_6px_10px_rgba(60,30,15,0.10)]"
      >
        {/* Top course, offset like bricklaying. */}
        <BrickRect x={30} y={0} studs={2} fill="#d9a441" />
        <BrickRect x={90} y={0} studs={3} fill="#a8482a" />
        {/* Bottom course with the dashed slot waiting for the next brick. */}
        <BrickRect x={0} y={30} studs={3} fill="#44546e" />
        <rect
          x={89}
          y={31}
          width={54}
          height={24}
          rx={6}
          fill="none"
          stroke="#a8482a"
          strokeOpacity={0.45}
          strokeWidth={2}
          strokeDasharray="5 4"
        />
        <BrickRect x={148} y={30} studs={2} fill="#6a9455" />
      </svg>
    </div>
  );
}
