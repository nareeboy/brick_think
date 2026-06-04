// lib/careers/storage.ts
import 'server-only';

import type { ServiceRoleSupabaseClient } from '@/lib/db/serviceRole';
import { CAREERS_CV_BUCKET, CV_SIGNED_URL_TTL_SECONDS } from './constants';

// Mints a short-lived signed URL for an admin CV download. Returns null if the
// object is gone (e.g. already purged), so the caller can show a friendly
// "expired" message instead of a broken link.
export async function createCvSignedUrl(
  client: ServiceRoleSupabaseClient,
  path: string,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(CAREERS_CV_BUCKET)
    .createSignedUrl(path, CV_SIGNED_URL_TTL_SECONDS, { download: true });
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
