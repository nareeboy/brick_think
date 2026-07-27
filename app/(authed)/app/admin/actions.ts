'use server';

import { getAdminDashboardStats } from '@/lib/admin/dashboard';
import { isDashboardRange, type DashboardStats } from '@/lib/admin/dashboardTypes';

export type DashboardStatsResult =
  | { ok: true; stats: DashboardStats }
  | { ok: false; code: 'forbidden' | 'invalid_range' };

export async function fetchDashboardStatsAction(range: string): Promise<DashboardStatsResult> {
  if (!isDashboardRange(range)) return { ok: false, code: 'invalid_range' };
  const stats = await getAdminDashboardStats(range);
  if (!stats) return { ok: false, code: 'forbidden' };
  return { ok: true, stats };
}
