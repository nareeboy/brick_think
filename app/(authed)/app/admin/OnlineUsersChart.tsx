'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import type { SeriesPoint } from './dashboardData';

const SERIES_COLOR = '#a8482a';
const CHART_HEIGHT = 280;
const PAD = { top: 12, right: 16, bottom: 28, left: 44 };
const TICK_COUNT = 4;

/** Round up to a clean axis maximum (1/2/2.5/5 × 10^n). */
function niceCeil(value: number): number {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (value <= candidate) return candidate;
  }
  return 10 * magnitude;
}

export function OnlineUsersChart({
  points,
  ariaLabel,
}: {
  points: SeriesPoint[];
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tableId = useId();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(Math.max(280, next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const innerWidth = width - PAD.left - PAD.right;
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  const yMax = useMemo(() => niceCeil(Math.max(...points.map((p) => p.value))), [points]);

  const xFor = useCallback(
    (i: number) =>
      PAD.left + (points.length === 1 ? innerWidth / 2 : (i / (points.length - 1)) * innerWidth),
    [innerWidth, points.length],
  );
  const yFor = useCallback(
    (value: number) => PAD.top + innerHeight - (value / yMax) * innerHeight,
    [innerHeight, yMax],
  );

  const linePath = useMemo(
    () =>
      points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`)
        .join(' '),
    [points, xFor, yFor],
  );
  const areaPath = useMemo(() => {
    const baseline = PAD.top + innerHeight;
    return `${linePath} L${xFor(points.length - 1).toFixed(1)},${baseline} L${xFor(0).toFixed(1)},${baseline} Z`;
  }, [linePath, points.length, xFor, innerHeight]);

  const xTickIndices = useMemo(() => {
    const target = Math.max(2, Math.min(7, Math.floor(innerWidth / 90)));
    const step = Math.max(1, Math.ceil((points.length - 1) / (target - 1)));
    const indices: number[] = [];
    for (let i = 0; i < points.length; i += step) indices.push(i);
    if (indices[indices.length - 1] !== points.length - 1) indices.push(points.length - 1);
    return indices;
  }, [innerWidth, points.length]);

  const indexForClientX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const x = clientX - rect.left - PAD.left;
      const ratio = innerWidth <= 0 ? 0 : x / innerWidth;
      return Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
    },
    [innerWidth, points.length],
  );

  const active = activeIndex === null ? null : points[activeIndex];
  const tooltipOnRight = activeIndex !== null && xFor(activeIndex) < width / 2;
  const lastIndex = points.length - 1;

  return (
    <div>
      <div
        ref={containerRef}
        className="relative cursor-crosshair rounded-lg"
        onPointerMove={(e) => setActiveIndex(indexForClientX(e.clientX))}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {/* Keyboard scrubber: a visually-hidden native slider drives the same
            crosshair + tooltip the pointer does. */}
        <input
          type="range"
          min={0}
          max={lastIndex}
          step={1}
          value={activeIndex ?? lastIndex}
          aria-label={`${ariaLabel}. Arrow keys inspect each period; full data in the table below.`}
          aria-describedby={tableId}
          aria-valuetext={
            active ? `${active.longLabel}: ${active.value} online` : 'No period selected'
          }
          onChange={(e) => setActiveIndex(Number(e.target.value))}
          onFocus={(e) => setActiveIndex(Number(e.currentTarget.value))}
          onBlur={() => setActiveIndex(null)}
          className="absolute inset-x-0 top-0 h-1 w-full appearance-none rounded-full bg-transparent opacity-0 focus-visible:bg-zinc-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8482a]/50"
        />
        <svg width={width} height={CHART_HEIGHT} className="block" aria-hidden="true">
          {Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
            const value = (yMax / TICK_COUNT) * i;
            const y = yFor(value);
            return (
              <g key={i}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="#e4e4e7"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-zinc-500 text-[10px] [font-variant-numeric:tabular-nums]"
                >
                  {value.toLocaleString('en-GB')}
                </text>
              </g>
            );
          })}
          {xTickIndices.map((i) => {
            const point = points[i];
            if (!point) return null;
            return (
              <text
                key={i}
                x={xFor(i)}
                y={CHART_HEIGHT - 8}
                textAnchor={i === 0 ? 'start' : i === lastIndex ? 'end' : 'middle'}
                className="fill-zinc-500 text-[10px]"
              >
                {point.label}
              </text>
            );
          })}

          <path d={areaPath} fill={SERIES_COLOR} fillOpacity="0.08" />
          <path
            d={linePath}
            fill="none"
            stroke={SERIES_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points[lastIndex] ? (
            <circle
              cx={xFor(lastIndex)}
              cy={yFor(points[lastIndex].value)}
              r="4"
              fill={SERIES_COLOR}
              stroke="white"
              strokeWidth="2"
            />
          ) : null}

          {active && activeIndex !== null ? (
            <g>
              <line
                x1={xFor(activeIndex)}
                x2={xFor(activeIndex)}
                y1={PAD.top}
                y2={PAD.top + innerHeight}
                stroke="#d4d4d8"
                strokeWidth="1"
              />
              <circle
                cx={xFor(activeIndex)}
                cy={yFor(active.value)}
                r="4"
                fill={SERIES_COLOR}
                stroke="white"
                strokeWidth="2"
              />
            </g>
          ) : null}
        </svg>

        {active && activeIndex !== null ? (
          <div
            className="pointer-events-none absolute z-10 -translate-y-1/2 rounded-lg border border-zinc-900/10 bg-white px-3 py-2 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]"
            style={{
              top: yFor(active.value),
              ...(tooltipOnRight
                ? { left: xFor(activeIndex) + 12 }
                : { right: width - xFor(activeIndex) + 12 }),
            }}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-0.5 w-3 rounded-full"
                style={{ background: SERIES_COLOR }}
              />
              <span className="text-[13px] font-semibold text-zinc-900 [font-variant-numeric:tabular-nums]">
                {active.value.toLocaleString('en-GB')}
              </span>
              <span className="text-[12px] text-zinc-500">online</span>
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{active.longLabel}</div>
          </div>
        ) : null}
      </div>

      <table id={tableId} className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Users online</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.longLabel}>
              <th scope="row">{p.longLabel}</th>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
