'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { ReactNode } from 'react';

import { fetchDashboardStatsAction } from './actions';
import { OnlineUsersChart } from './OnlineUsersChart';
import {
  RANGE_OPTIONS,
  type DashboardRange,
  type DashboardStats,
} from '@/lib/admin/dashboardTypes';

const POLL_INTERVAL_MS = 60 * 1000;

function formatCount(value: number): string {
  return value.toLocaleString('en-GB');
}

function Delta({ value, label }: { value: number; label: string }) {
  const up = value >= 0;
  return (
    <p className="flex items-center gap-1 text-[12px]">
      <span
        className={`flex items-center gap-0.5 font-medium ${up ? 'text-emerald-700' : 'text-red-700'}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3 w-3 ${up ? '' : 'rotate-180'}`}
          aria-hidden="true"
        >
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
        {up ? '+' : '−'}
        {formatCount(Math.abs(value))}
      </span>
      <span className="text-zinc-500">{label}</span>
    </p>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 96;
  const h = 28;
  const max = Math.max(...values, 1);
  const x = (i: number) => (i / (values.length - 1)) * (w - 6) + 3;
  const y = (v: number) => h - 4 - (v / max) * (h - 8);
  const path = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ');
  const last = values.length - 1;
  const lastValue = values[last] ?? 0;
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="#d4d4d8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(last)}
        cy={y(lastValue)}
        r="3.5"
        fill="#a8482a"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );
}

function StatTile({
  label,
  value,
  footer,
  aside,
}: {
  label: string;
  value: string;
  footer: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-zinc-600">{label}</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
        </div>
        {aside}
      </div>
      <div className="mt-2">{footer}</div>
    </div>
  );
}

export function AdminDashboard({ initialStats }: { initialStats: DashboardStats }) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [range, setRange] = useState<DashboardRange>(initialStats.range);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const [, startTransition] = useTransition();

  const refresh = (r: DashboardRange) => {
    startTransition(async () => {
      const res = await fetchDashboardStatsAction(r);
      // Ignore forbidden/invalid results and out-of-date responses — the
      // previous stats stay rendered.
      if (res.ok && res.stats.range === rangeRef.current) setStats(res.stats);
    });
  };

  const changeRange = (r: DashboardRange) => {
    setRange(r);
    refresh(r);
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      refresh(rangeRef.current);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Date range" className="flex flex-wrap gap-1.5">
        {RANGE_OPTIONS.map((option) => {
          const selected = option.value === range;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => changeRange(option.value)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
                selected
                  ? 'border-[#a8482a]/30 bg-[#a8482a]/10 text-[#a8482a]'
                  : 'border-zinc-900/10 bg-white text-zinc-600 hover:border-zinc-900/20 hover:text-zinc-900'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label={`New sign-ups (${stats.periodLabel})`}
          value={formatCount(stats.newSignups)}
          footer={<Delta value={stats.newSignupsDelta} label={stats.deltaLabel} />}
          aside={<Sparkline values={stats.signupSparkline} />}
        />
        <StatTile
          label="Total users"
          value={formatCount(stats.totalUsers)}
          footer={<Delta value={stats.totalUsersDelta} label="vs previous 30 days" />}
        />
        <StatTile
          label="Online now"
          value={formatCount(stats.onlineNow)}
          footer={
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-500">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live · updates every minute
            </p>
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] xl:col-span-2">
          <header className="mb-4">
            <h2 className="text-[15px] font-semibold text-zinc-900">Online users</h2>
            <p className="text-[13px] text-zinc-500">
              Concurrent users, {stats.periodLabel}
              {stats.collectingSince
                ? ` · collecting data since ${new Date(stats.collectingSince).toLocaleDateString(
                    'en-GB',
                    {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'UTC',
                    },
                  )}`
                : ''}
            </p>
          </header>
          <OnlineUsersChart
            points={stats.onlineSeries}
            ariaLabel={`Concurrent online users, ${stats.periodLabel}`}
          />
        </section>

        <section className="rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <header className="mb-3">
            <h2 className="text-[15px] font-semibold text-zinc-900">Recent sign-ups</h2>
            <p className="text-[13px] text-zinc-500">Latest accounts created</p>
          </header>
          <ul className="divide-y divide-zinc-900/5">
            {stats.recentSignups.map((person) => {
              const initials = person.name
                .split(' ')
                .map((part) => part.charAt(0))
                .slice(0, 2)
                .join('')
                .toUpperCase();
              return (
                <li key={person.email} className="flex items-center gap-3 py-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#a8482a]/10 text-[12px] font-semibold text-[#a8482a]"
                  >
                    {initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-zinc-900">
                      {person.name}
                    </span>
                    <span className="block truncate text-[12px] text-zinc-500">{person.email}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-zinc-500">{person.joined}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
