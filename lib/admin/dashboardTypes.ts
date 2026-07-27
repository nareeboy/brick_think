export type DashboardRange = '24h' | '7d' | '30d' | '90d';

export type SeriesPoint = {
  /** Short axis label, e.g. "09:00" or "12 Jul" */
  label: string;
  /** Full label for tooltips and the table view */
  longLabel: string;
  value: number;
};

export type RecentSignup = {
  name: string;
  email: string;
  joined: string;
};

export type DashboardStats = {
  range: DashboardRange;
  /** e.g. "last 7 days" */
  periodLabel: string;
  /** e.g. "vs previous 7 days" */
  deltaLabel: string;
  totalUsers: number;
  /** Sign-ups in the last 30 days, shown as growth on the Total users tile */
  totalUsersDelta: number;
  newSignups: number;
  newSignupsDelta: number;
  signupSparkline: number[];
  onlineNow: number;
  onlineSeries: SeriesPoint[];
  /** ISO timestamp of the first sample when sampling began after the range start, else null */
  collectingSince: string | null;
  recentSignups: RecentSignup[];
};

export const RANGE_OPTIONS: Array<{ value: DashboardRange; label: string }> = [
  { value: '24h', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export function isDashboardRange(v: string): v is DashboardRange {
  return v === '24h' || v === '7d' || v === '30d' || v === '90d';
}
