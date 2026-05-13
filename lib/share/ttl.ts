export type ShareTtl = 'never' | '1d' | '7d' | '30d';

const TTL_MS: Record<Exclude<ShareTtl, 'never'>, number> = {
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function ttlToExpiresAt(ttl: ShareTtl, now: Date = new Date()): Date | null {
  if (ttl === 'never') return null;
  return new Date(now.getTime() + TTL_MS[ttl]);
}

export function isShareTtl(value: unknown): value is ShareTtl {
  return value === 'never' || value === '1d' || value === '7d' || value === '30d';
}
