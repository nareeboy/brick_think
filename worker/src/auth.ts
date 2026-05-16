import type { IncomingMessage } from 'node:http';
import type { Pool } from 'pg';

import { verifyYjsToken } from '@/lib/yjs/jwt';

export interface VerifiedConnection {
  profileId: string;
  modelId: string;
}

export interface VerifyDeps {
  secret: string;
  pool: Pool;
  expectedModelId: string;
}

export class UpgradeRejected extends Error {
  constructor(
    public readonly status: number,
    public readonly reason: string,
  ) {
    super(`${status} ${reason}`);
  }
}

const MODEL_ID_PATTERN =
  /^\/yjs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\?|$)/i;

export function parseModelIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(MODEL_ID_PATTERN);
  return m?.[1] ?? null;
}

export function parseTokenFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const qIdx = url.indexOf('?');
  if (qIdx < 0) return null;
  const params = new URLSearchParams(url.slice(qIdx + 1));
  return params.get('token');
}

export async function verifyUpgradeRequest(
  request: IncomingMessage,
  deps: VerifyDeps,
): Promise<VerifiedConnection> {
  const token = parseTokenFromUrl(request.url);
  if (!token) throw new UpgradeRejected(401, 'missing token');

  let claims;
  try {
    claims = await verifyYjsToken({ token, secret: deps.secret });
  } catch {
    throw new UpgradeRejected(401, 'invalid token');
  }

  if (claims.modelId !== deps.expectedModelId) {
    throw new UpgradeRejected(401, 'token modelId mismatch');
  }

  const { rows } = await deps.pool.query<{ ok: boolean }>(
    'select public.can_read_model($1::uuid, $2::uuid) as ok',
    [claims.profileId, claims.modelId],
  );
  if (!rows[0]?.ok) throw new UpgradeRejected(403, 'not a member');

  return { profileId: claims.profileId, modelId: claims.modelId };
}
