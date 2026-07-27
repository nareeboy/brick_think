// Placeholder metrics for the admin dashboard. Deterministic (seeded PRNG, no
// Date.now) so server and client render identical markup; swap for real queries
// when the dashboard is wired to the database.

export type DashboardRange = '24h' | '7d' | '30d' | '90d';

export type SeriesPoint = {
  /** Short axis label, e.g. "09:00" or "12 Jul" */
  label: string;
  /** Full label for tooltips and the table view, e.g. "Sunday 12 July, 09:00" */
  longLabel: string;
  value: number;
};

export type RangeMetrics = {
  /** Copy for the range, e.g. "last 7 days" */
  periodLabel: string;
  /** Copy for the comparison period, e.g. "vs previous 7 days" */
  deltaLabel: string;
  newSignups: number;
  newSignupsDelta: number;
  signupSparkline: number[];
  onlineSeries: SeriesPoint[];
};

export type RecentSignup = {
  name: string;
  email: string;
  joined: string;
};

export const RANGE_OPTIONS: Array<{ value: DashboardRange; label: string }> = [
  { value: '24h', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export const TOTAL_USERS = 2847;
export const TOTAL_USERS_DELTA = 164;
export const ONLINE_NOW = 132;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

const DAYS_7 = [
  ['Mon', 'Monday 20 July'],
  ['Tue', 'Tuesday 21 July'],
  ['Wed', 'Wednesday 22 July'],
  ['Thu', 'Thursday 23 July'],
  ['Fri', 'Friday 24 July'],
  ['Sat', 'Saturday 25 July'],
  ['Sun', 'Sunday 26 July'],
] as const;

/** Diurnal curve: quiet overnight, working-hours peak with a lunchtime dip. */
function hourlyShape(hour: number): number {
  if (hour < 6) return 0.12;
  if (hour < 9) return 0.35 + (hour - 6) * 0.15;
  if (hour < 12) return 0.85;
  if (hour < 14) return 0.7;
  if (hour < 18) return 1;
  if (hour < 21) return 0.6;
  return 0.3;
}

function buildHourly(seed: number, peak: number): SeriesPoint[] {
  const rand = mulberry32(seed);
  return HOURS.map((label, hour) => ({
    label,
    longLabel: `Today, ${label}`,
    value: Math.round(peak * hourlyShape(hour) * (0.85 + rand() * 0.3)),
  }));
}

function buildDaily(
  seed: number,
  days: Array<readonly [string, string]>,
  peak: number,
): SeriesPoint[] {
  const rand = mulberry32(seed);
  return days.map(([label, longLabel], i) => {
    const weekend = /Sat|Sun/.test(longLabel);
    const trend = 0.75 + (i / Math.max(days.length - 1, 1)) * 0.25;
    return {
      label,
      longLabel,
      value: Math.round(peak * trend * (weekend ? 0.45 : 1) * (0.85 + rand() * 0.3)),
    };
  });
}

const JULY_DAYS: Array<readonly [string, string]> = Array.from({ length: 30 }, (_, i) => {
  const day = i - 3; // 27 June … 26 July
  const date = day < 1 ? `${27 + i} Jun` : `${day} Jul`;
  const weekday = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i % 7];
  return [date, `${weekday} ${date}`] as const;
});

const WEEKS_13: Array<readonly [string, string]> = Array.from({ length: 13 }, (_, i) => {
  const label = `W${i + 1}`;
  return [label, `Week ${i + 1} (of last 13)`] as const;
});

export const RANGE_METRICS: Record<DashboardRange, RangeMetrics> = {
  '24h': {
    periodLabel: 'today',
    deltaLabel: 'vs yesterday',
    newSignups: 18,
    newSignupsDelta: 5,
    signupSparkline: [1, 0, 2, 1, 3, 2, 1, 2, 3, 1, 2, 0],
    onlineSeries: buildHourly(11, 160),
  },
  '7d': {
    periodLabel: 'last 7 days',
    deltaLabel: 'vs previous 7 days',
    newSignups: 86,
    newSignupsDelta: 12,
    signupSparkline: [9, 11, 8, 14, 12, 6, 5, 13, 15, 12, 17, 14],
    onlineSeries: buildDaily(23, [...DAYS_7], 190),
  },
  '30d': {
    periodLabel: 'last 30 days',
    deltaLabel: 'vs previous 30 days',
    newSignups: 341,
    newSignupsDelta: 47,
    signupSparkline: [22, 25, 21, 30, 28, 24, 31, 27, 33, 29, 36, 35],
    onlineSeries: buildDaily(37, JULY_DAYS, 205),
  },
  '90d': {
    periodLabel: 'last 90 days',
    deltaLabel: 'vs previous 90 days',
    newSignups: 918,
    newSignupsDelta: -34,
    signupSparkline: [88, 74, 91, 82, 96, 78, 84, 90, 71, 79, 86, 75],
    onlineSeries: buildDaily(53, WEEKS_13, 220),
  },
};

export const RECENT_SIGNUPS: RecentSignup[] = [
  { name: 'Amara Osei', email: 'amara.osei@example.com', joined: '12 min ago' },
  { name: 'Jonas Weber', email: 'jonas.weber@example.com', joined: '48 min ago' },
  { name: 'Priya Nair', email: 'priya.nair@example.com', joined: '2 h ago' },
  { name: 'Tomás Herrera', email: 'tomas.herrera@example.com', joined: '5 h ago' },
  { name: 'Ingrid Solberg', email: 'ingrid.solberg@example.com', joined: '9 h ago' },
  { name: 'Kofi Mensah', email: 'kofi.mensah@example.com', joined: 'yesterday' },
];
