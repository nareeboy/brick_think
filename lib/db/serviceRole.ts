import 'server-only';

import { getServiceSupabaseClient, type ServiceSupabaseClient } from './service';

// Compatibility alias over lib/db/service.ts — the single service-role client
// factory. Kept so existing call sites (and the premium overlay) keep working;
// prefer importing getServiceSupabaseClient from lib/db/service directly.
export type ServiceRoleSupabaseClient = ServiceSupabaseClient;

export function createServiceRoleSupabaseClient(): ServiceRoleSupabaseClient {
  return getServiceSupabaseClient();
}
